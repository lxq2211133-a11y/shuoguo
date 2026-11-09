import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { promisify } from "node:util";
import { createTeachingCatalog } from "./teachingCatalog.mjs";

const deriveKey = promisify(scrypt);
const schoolIds = new Set(["jiangnan", "swjtu", "gafa", "whut"]);
const stages = new Set(["基础", "强化", "冲刺"]);
const reviewDays = new Map([["不会", 1], ["模糊", 3], ["熟悉", 7]]);
const sessionSeconds = 30 * 24 * 60 * 60;
const cookieName = "sg_session";
const maxImageBytes = 8 * 1024 * 1024;
const loginWindow = 15 * 60 * 1000;

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createStudyApi({ databasePath = process.env.STUDY_DB_PATH || ".study-data/study.sqlite", database, secureCookies = false } = {}) {
  if (!database && databasePath !== ":memory:") mkdirSync(dirname(resolve(databasePath)), { recursive: true });
  const db = database ?? new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA busy_timeout = 5000;
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE,
      salt TEXT NOT NULL, password_hash TEXT NOT NULL, profile TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, student_id INTEGER NOT NULL REFERENCES students(id), expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS study_items (
      student_id INTEGER NOT NULL REFERENCES students(id), kind TEXT NOT NULL,
      item_id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (student_id, kind, item_id)
    );
  `);
  const getStudent = db.prepare("SELECT * FROM students WHERE username = ?");
  const getSession = db.prepare(`
    SELECT students.* FROM sessions JOIN students ON students.id = sessions.student_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `);
  const items = db.prepare("SELECT item_id, data FROM study_items WHERE student_id = ? AND kind = ?");
  const getItem = db.prepare("SELECT data FROM study_items WHERE student_id = ? AND kind = ? AND item_id = ?");
  const putItem = db.prepare(`
    INSERT INTO study_items (student_id, kind, item_id, data) VALUES (?, ?, ?, ?)
    ON CONFLICT (student_id, kind, item_id) DO UPDATE SET data = excluded.data
  `);
  const removeItem = db.prepare("DELETE FROM study_items WHERE student_id = ? AND kind = ? AND item_id = ?");
  const attempts = new Map();
  const teaching = createTeachingCatalog(db, validateDraft);

  function snapshot(student) {
    if (!student) return null;
    const reviewRecords = Object.fromEntries(items.all(student.id, "review").map((row) => [row.item_id, JSON.parse(row.data)]));
    const drafts = db.prepare(`
      SELECT item_id, json_extract(data, '$.name') AS name FROM study_items WHERE student_id = ? AND kind = 'draft'
    `).all(student.id);
    const recentReports = db.prepare(`SELECT item_id AS id, json_extract(data, '$.sketch.schoolId') AS schoolId
      FROM study_items WHERE student_id = ? AND kind = 'report' ORDER BY json_extract(data, '$.createdAt')`).all(student.id);
    return {
      username: student.username,
      isTeacher: teaching.isTeacher(student),
      profile: JSON.parse(student.profile),
      reviewRecords,
      draftNames: Object.fromEntries(drafts.map((draft) => [draft.item_id, draft.name])),
      latestReportIds: Object.fromEntries(recentReports.map((report) => [report.schoolId, report.id])),
    };
  }

  async function authenticate(action, body, request, response) {
    const username = typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    if (!/^[\p{L}\p{N}_.@-]{3,48}$/u.test(username) || typeof body.password !== "string"
      || body.password.length < 8 || body.password.length > 128) {
      throw new RequestError(400, "账号需为 3 至 48 个字母、数字或常用账号字符，密码需为 8 至 128 个字符。");
    }

    const now = Date.now();
    for (const [address, entry] of attempts) {
      if (now - entry.since >= loginWindow) attempts.delete(address);
    }
    const address = request.socket.remoteAddress ?? "local";
    const entry = attempts.get(address) ?? { since: now, count: 0 };
    if (entry.count >= 15) throw new RequestError(429, "尝试次数过多，请稍后再试。");
    entry.count += 1;
    attempts.set(address, entry);

    let student = getStudent.get(username);
    if (action === "signup") {
      if (student) throw new RequestError(409, "该账号已注册，请登录。");
      const profile = validateProfile(body.profile);
      const salt = randomBytes(16).toString("hex");
      const passwordHash = (await deriveKey(body.password, salt, 64)).toString("hex");
      if (getStudent.get(username)) throw new RequestError(409, "该账号已注册，请登录。");
      const initialRecords = Object.entries(body.reviewRecords ?? {}).slice(0, 250);

      db.exec("BEGIN IMMEDIATE");
      try {
        const result = db.prepare("INSERT OR IGNORE INTO students (username, salt, password_hash, profile) VALUES (?, ?, ?, ?)")
          .run(username, salt, passwordHash, JSON.stringify(profile));
        if (result.changes === 0) throw new RequestError(409, "该账号已注册，请登录。");
        student = getStudent.get(username);
        for (const [key, record] of initialRecords) {
          if (isReviewKey(key) && record && reviewDays.has(record.rating)
            && Number.isFinite(Date.parse(record.reviewedAt)) && Number.isFinite(Date.parse(record.nextReviewAt))) {
            putItem.run(student.id, "review", key, JSON.stringify(makeReview(record.rating, new Date(record.reviewedAt))));
          }
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    } else {
      const key = await deriveKey(body.password, student?.salt ?? "missing-student-account", 64);
      if (!student || !timingSafeEqual(key, Buffer.from(student.password_hash, "hex"))) {
        throw new RequestError(401, "账号或密码不正确。");
      }
    }

    attempts.delete(address);
    const token = randomBytes(32).toString("hex");
    db.prepare("DELETE FROM sessions WHERE token_hash = ? OR expires_at <= ?").run(tokenHash(readCookie(request)), now);
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(tokenHash(token), student.id, now + sessionSeconds * 1000);
    response.setHeader("Set-Cookie", sessionCookie(token, sessionSeconds, secureCookies));
    return snapshot(student);
  }

  async function handle(request, response) {
    const cookie = readCookie(request);
    if (request.method === "GET") return snapshot(cookie && getSession.get(tokenHash(cookie), Date.now()));
    if (request.method !== "POST") throw new RequestError(405, "请求方式无效。");

    const body = await readJson(request);
    const student = cookie && getSession.get(tokenHash(cookie), Date.now());
    if (typeof body.action === "string" && (body.action.startsWith("teaching-") || body.action.startsWith("published-"))) {
      return teaching.handle(body, student);
    }
    if (body.action === "signup" || body.action === "login") {
      return authenticate(body.action, body, request, response);
    }
    if (body.action === "logout") {
      if (cookie) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash(cookie));
      response.setHeader("Set-Cookie", sessionCookie("", 0, secureCookies));
      return null;
    }
    if (!student) throw new RequestError(401, "请重新登录后继续。");

    switch (body.action) {
      case "profile": {
        const profile = validateProfile({ ...JSON.parse(student.profile), ...body.profile });
        db.prepare("UPDATE students SET profile = ? WHERE id = ?").run(JSON.stringify(profile), student.id);
        return profile;
      }
      case "review": {
        if (!isReviewKey(body.key)) throw new RequestError(400, "复习任务无效。");
        if (body.rating === null) {
          removeItem.run(student.id, "review", body.key);
          return null;
        }
        if (!reviewDays.has(body.rating)) throw new RequestError(400, "请选择有效的复习结果。");
        const record = makeReview(body.rating, new Date());
        putItem.run(student.id, "review", body.key, JSON.stringify(record));
        return record;
      }
      case "paper": {
        if (typeof body.paperId !== "string" || !/^[a-z0-9-]{1,80}$/.test(body.paperId)) {
          throw new RequestError(400, "试卷无效。");
        }
        const row = getItem.get(student.id, "paper", body.paperId);
        const saved = row ? JSON.parse(row.data) : null;
        if (!body.attempt) return saved;
        const { answers, submitted } = body.attempt;
        const entries = Object.entries(answers ?? {});
        if (typeof submitted !== "boolean" || !answers || typeof answers !== "object" || Array.isArray(answers)
          || entries.length > 60 || entries.some(([key, answer]) => !/^[a-z0-9-]{1,80}$/.test(key)
            || typeof answer !== "string" || answer.length > 5000)
          || (submitted && !entries.some(([, answer]) => answer.trim()))) {
          throw new RequestError(400, "作答内容无效，请检查后重试。");
        }
        const attempt = { answers, submitted };
        if (saved?.submitted) {
          if (submitted && JSON.stringify(saved.answers) === JSON.stringify(answers)) return saved;
          throw new RequestError(409, "这份试卷已经交卷，请返回试卷重新打开复盘。");
        }
        putItem.run(student.id, "paper", body.paperId, JSON.stringify(attempt));
        return attempt;
      }
      case "list-reports": {
        if (!schoolIds.has(body.schoolId)) throw new RequestError(400, "目标院校无效。");
        return db.prepare(`SELECT item_id AS id, json_extract(data, '$.sketch.title') AS title,
          json_extract(data, '$.createdAt') AS createdAt, json_extract(data, '$.result.score') AS score,
          json_extract(data, '$.result.totalScore') AS totalScore, json_extract(data, '$.parentId') AS parentId
          FROM study_items WHERE student_id = ? AND kind = 'report' AND json_extract(data, '$.sketch.schoolId') = ?
          ORDER BY createdAt DESC LIMIT 30`).all(student.id, body.schoolId);
      }
      case "read-report": {
        const row = getItem.get(student.id, "report", validateReportId(body.reportId));
        if (!row) throw new RequestError(404, "找不到这份评图报告。");
        return JSON.parse(row.data);
      }
      case "remove-report": {
        const id = validateReportId(body.reportId);
        db.prepare(`WITH RECURSIVE branch(id) AS (
          SELECT item_id FROM study_items WHERE student_id = ? AND kind = 'report' AND item_id = ?
          UNION
          SELECT report.item_id FROM study_items report JOIN branch ON json_extract(report.data, '$.parentId') = branch.id
          WHERE report.student_id = ? AND report.kind = 'report'
        ) DELETE FROM study_items WHERE student_id = ? AND kind IN ('report', 'revision', 'review-request') AND item_id IN (SELECT id FROM branch)`)
          .run(student.id, id, student.id, student.id);
        return null;
      }
      case "report-review": {
        const id = validateReportId(body.reportId);
        if (!getItem.get(student.id, "report", id)) throw new RequestError(404, "找不到这份评图报告。");
        const existing = getItem.get(student.id, "review-request", id);
        if (existing) return JSON.parse(existing.data);
        if (body.reason === undefined) return null;
        if (typeof body.reason !== "string" || !body.reason.trim() || body.reason.length > 500 || body.share !== true) {
          throw new RequestError(400, "请填写复核原因并确认与教研人员共享本次作品和报告。");
        }
        const entry = { reason: body.reason.trim(), requestedAt: new Date().toISOString(), reply: null };
        putItem.run(student.id, "review-request", id, JSON.stringify(entry));
        return entry;
      }
      case "review-queue":
      case "review-detail":
      case "review-reply": {
        if (!teaching.isTeacher(student)) throw new RequestError(403, "此操作需要教研账号权限。");
        if (body.action === "review-queue") return db.prepare(`SELECT student_id AS studentId, item_id AS id,
          json_extract(data, '$.reason') AS reason, json_extract(data, '$.requestedAt') AS requestedAt
          FROM study_items WHERE kind = 'review-request' AND json_extract(data, '$.reply') IS NULL
          ORDER BY requestedAt LIMIT 40`).all();
        const id = validateReportId(body.reportId);
        if (!Number.isSafeInteger(body.studentId) || body.studentId <= 0) throw new RequestError(400, "复核任务无效。");
        const review = getItem.get(body.studentId, "review-request", id);
        const report = review && getItem.get(body.studentId, "report", id);
        if (!report) throw new RequestError(404, "复核任务已失效。");
        const entry = JSON.parse(review.data);
        if (body.action === "review-detail") return { report: JSON.parse(report.data), review: entry };
        if (entry.reply) throw new RequestError(409, "该任务已完成复核。");
        if (typeof body.reply !== "string" || !body.reply.trim() || body.reply.length > 1500) {
          throw new RequestError(400, "请填写复核结论与理由。");
        }
        entry.reply = { text: body.reply.trim(), reviewer: student.username, repliedAt: new Date().toISOString() };
        putItem.run(body.studentId, "review-request", id, JSON.stringify(entry));
        return entry;
      }
      case "revision-draft": {
        const parentId = validateReportId(body.parentId);
        if (!getItem.get(student.id, "report", parentId)) throw new RequestError(404, "找不到初稿报告。");
        if (!body.draft) {
          const row = getItem.get(student.id, "revision", parentId);
          return row ? JSON.parse(row.data) : null;
        }
        const draft = validateDraft(body.draft);
        putItem.run(student.id, "revision", parentId, JSON.stringify(draft));
        return draft;
      }
      case "save-report": {
        const id = validateReportId(body.report?.id);
        const existing = getItem.get(student.id, "report", id);
        if (existing) return JSON.parse(existing.data);
        const parentId = body.report.parentId ? validateReportId(body.report.parentId) : null;
        const parent = parentId && getItem.get(student.id, "report", parentId);
        if (parentId && !parent) throw new RequestError(404, "找不到初稿报告。");
        const sketch = parent ? JSON.parse(parent.data).sketch : body.report.sketch;
        const { result } = body.report;
        if (!sketch || !schoolIds.has(sketch.schoolId) || typeof sketch.title !== "string" || !Array.isArray(sketch.scoring)
          || !Array.isArray(sketch.requirements) || !Array.isArray(result?.criteriaScores) || result.totalScore !== sketch.totalScore
          || result.criteriaScores.length !== sketch.scoring.length || result.criteriaScores.some((criterion, index) => {
            const standard = sketch.scoring[index];
            return !criterion || !standard || criterion.id !== standard.id || criterion.maxScore !== standard.score
              || !Number.isInteger(criterion.score) || criterion.score < 0 || criterion.score > standard.score
              || typeof criterion.comment !== "string" || !criterion.comment.trim();
          }) || result.criteriaScores.reduce((total, criterion) => total + criterion.score, 0) !== result.score
          || ![result.issues, result.advice, result.strengths].every((list) => Array.isArray(list) && list.every((item) => typeof item === "string"))) {
          throw new RequestError(400, "评分报告缺少有效的评分项或证据。");
        }
        const image = validateDraft(body.report.image);
        const report = { id, parentId, sketch, image, result, createdAt: new Date().toISOString() };
        const draftKind = parentId ? "revision" : "draft";
        const draftId = parentId ?? sketch.schoolId;
        db.exec("BEGIN IMMEDIATE");
        try {
          putItem.run(student.id, "report", id, JSON.stringify(report));
          const draft = getItem.get(student.id, draftKind, draftId);
          if (draft && JSON.parse(draft.data).dataUrl === image.dataUrl) removeItem.run(student.id, draftKind, draftId);
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
        return report;
      }
      case "read-draft":
      case "save-draft":
      case "remove-draft": {
        if (!schoolIds.has(body.schoolId)) throw new RequestError(400, "目标院校无效。");
        if (body.action === "read-draft") {
          const row = getItem.get(student.id, "draft", body.schoolId);
          return row ? JSON.parse(row.data) : null;
        }
        if (body.action === "remove-draft") {
          removeItem.run(student.id, "draft", body.schoolId);
          return null;
        }
        const draft = validateDraft(body.draft);
        putItem.run(student.id, "draft", body.schoolId, JSON.stringify(draft));
        return draft.name;
      }
      default:
        throw new RequestError(400, "请求操作无效。");
    }
  }

  function studentId(request) {
    const token = readCookie(request);
    return token ? getSession.get(tokenHash(token), Date.now())?.id : undefined;
  }

  const middleware = async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("X-Content-Type-Options", "nosniff");
    try {
      response.end(JSON.stringify(await handle(request, response)));
    } catch (error) {
      const status = error?.status;
      response.statusCode = Number.isInteger(status) && status >= 400 && status < 500 ? status : 500;
      if (response.statusCode === 500) console.error("[study-api]", error.message);
      response.end(JSON.stringify({ error: response.statusCode < 500 ? error.message : "学习记录服务暂不可用，请重试。" }));
    }
  };
  return Object.assign(middleware, { studentId });
}

function validateProfile(profile) {
  if (!profile || !schoolIds.has(profile.schoolId) || !stages.has(profile.stage)
    || !Number.isInteger(profile.dailyMinutes) || profile.dailyMinutes < 15 || profile.dailyMinutes > 480) {
    throw new RequestError(400, "请选择目标院校、备考阶段和每天 15 至 480 分钟的学习时间。");
  }
  return { schoolId: profile.schoolId, stage: profile.stage, dailyMinutes: profile.dailyMinutes };
}

function isReviewKey(key) {
  if (typeof key !== "string") return false;
  const [school, task, extra] = key.split(":");
  return schoolIds.has(school) && /^[a-z0-9-]{1,80}$/.test(task ?? "") && extra === undefined;
}

function makeReview(rating, date) {
  const reviewedAt = date.toISOString();
  date.setUTCDate(date.getUTCDate() + reviewDays.get(rating));
  return { rating, reviewedAt, nextReviewAt: date.toISOString() };
}

function validateDraft(draft) {
  const match = typeof draft?.dataUrl === "string" && /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(draft.dataUrl);
  if (!match || typeof draft.name !== "string" || !draft.name.trim() || draft.name.length > 255) {
    throw new RequestError(400, "请选择有效的 JPG、PNG 或 WEBP 图片。");
  }
  const bytes = Buffer.from(match[2], "base64");
  const size = bytes.length;
  if (size > maxImageBytes) throw new RequestError(413, "图片不能超过 8 MB。");
  const imageType = match[1];
  const validHeader = imageType === "png" ? bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))
    : imageType === "jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!validHeader) throw new RequestError(400, "图片内容无法读取，请重新导出后上传。");
  return { name: draft.name, dataUrl: draft.dataUrl, size };
}

function validateReportId(id) {
  if (typeof id !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id)) {
    throw new RequestError(400, "评图报告无效。");
  }
  return id;
}

function readCookie(request) {
  return request.headers.cookie?.match(/(?:^|;\s*)sg_session=([a-f0-9]{64})(?:;|$)/)?.[1] ?? "";
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function sessionCookie(token, maxAge, secureCookies) {
  return `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? "; Secure" : ""}`;
}

async function readJson(request) {
  if (request.headers["sec-fetch-site"] === "cross-site" || request.headers["sec-fetch-site"] === "same-site"
    || request.headers["content-type"]?.split(";")[0] !== "application/json") {
    throw new RequestError(415, "请从硕果页面发起请求。");
  }
  const maxBytes = Math.ceil(maxImageBytes * 4 / 3) + 4096;
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= maxBytes) chunks.push(chunk);
  }
  if (size > maxBytes) throw new RequestError(413, "提交内容超过大小限制。");
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body && typeof body === "object" && !Array.isArray(body)) return body;
  } catch {
    // Return the same response for all malformed request bodies.
  }
  throw new RequestError(400, "提交内容无法读取。");
}
