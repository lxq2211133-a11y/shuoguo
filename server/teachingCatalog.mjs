import { createHash } from "node:crypto";
import { swjtu894Pilot } from "../src/data/swjtu894.ts";

const pilotRubric = {
  id: swjtu894Pilot.rubricVersion,
  title: "西南交大 894 试练评分表",
  totalScore: swjtu894Pilot.totalScore,
  scoring: swjtu894Pilot.scoring,
};

export function createTeachingCatalog(db, validateImage) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teaching_roles (student_id INTEGER PRIMARY KEY REFERENCES students(id));
    CREATE TABLE IF NOT EXISTS teaching_content (
      kind TEXT NOT NULL, id TEXT NOT NULL, sketch_id TEXT NOT NULL, version TEXT NOT NULL,
      status TEXT NOT NULL, updated_at TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY (kind, id)
    );
  `);
  const hasRole = db.prepare("SELECT 1 FROM teaching_roles WHERE student_id = ?");
  const find = db.prepare("SELECT * FROM teaching_content WHERE kind = ? AND id = ?");
  const publishedRubric = db.prepare(`SELECT * FROM teaching_content WHERE kind = 'rubric' AND sketch_id = ?
    AND status = 'published' ORDER BY updated_at DESC LIMIT 1`);
  const write = db.prepare(`INSERT INTO teaching_content VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (kind, id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at, data = excluded.data`);
  const otherPoolContains = db.prepare(`SELECT 1 FROM teaching_content
    WHERE kind = ? AND sketch_id = ? AND status <> 'draft' AND (
      (? <> '' AND json_extract(data, '$.workCode') = ?) OR
      (? <> '' AND (json_extract(data, '$.imageDigest') = ? OR
        (json_extract(data, '$.imageDigest') IS NULL AND json_extract(data, '$.image.dataUrl') = ?)))
    ) LIMIT 1`);

  function activeRubric(sketchId) {
    const row = publishedRubric.get(sketchId);
    return row ? JSON.parse(row.data) : sketchId === swjtu894Pilot.id ? pilotRubric : null;
  }

  function materialRubric(sketchId, version) {
    if (sketchId === swjtu894Pilot.id && version === pilotRubric.id) return pilotRubric;
    const active = activeRubric(sketchId);
    return active?.id === version ? active : null;
  }

  function handle(body, student) {
    const { action, sketchId } = body;
    if (action === "published-rubric") {
      return activeRubric(validateKey(sketchId));
    }
    if (action === "published-cases") {
      return db.prepare(`SELECT id, json_extract(data, '$.title') AS title, json_extract(data, '$.reviewer') AS reviewer,
        json_extract(data, '$.marks') AS marks, json_extract(data, '$.score') AS score
        FROM teaching_content WHERE kind = 'case' AND sketch_id = ? AND version = ? AND status = 'published'
        ORDER BY updated_at DESC LIMIT 60`).all(validateKey(sketchId), validateKey(body.version))
        .map((item) => ({ ...item, marks: JSON.parse(item.marks) }));
    }
    if (action === "published-case") {
      const row = find.get("case", validateKey(body.id));
      if (row?.status !== "published") throw failure(404, "案例未发布或已下架。");
      const { id, version, title, image, marks, score, reviewer, authorized } = JSON.parse(row.data);
      return { id, version, title, image, marks, score, reviewer, authorized };
    }
    if (!student || !hasRole.get(student.id)) throw failure(403, "此操作需要教研账号权限。");
    if (action === "teaching-list") {
      const rubric = activeRubric(validateKey(sketchId));
      const rows = db.prepare(`SELECT kind, id, version, status, json_extract(data, '$.title') AS title,
        json_extract(data, '$.workCode') AS workCode
        FROM teaching_content WHERE sketch_id = ? ORDER BY updated_at DESC LIMIT 80`).all(sketchId);
      return { rubric, entries: rows,
        pilotRubric: sketchId === swjtu894Pilot.id && rubric?.id !== pilotRubric.id ? pilotRubric : null };
    }
    if (action === "teaching-read") {
      const kind = validateKind(body.kind);
      const row = find.get(kind, validateKey(body.id));
      if (!row) throw failure(404, "找不到这份教研内容。");
      return JSON.parse(row.data);
    }
    if (action === "teaching-hide") {
      const kind = validateKind(body.kind);
      db.prepare("UPDATE teaching_content SET status = 'hidden' WHERE kind = ? AND id = ? AND status IN ('published', 'ready')")
        .run(kind, validateKey(body.id));
      return null;
    }
    if (action !== "teaching-save") throw failure(400, "教研操作无效。");

    const item = body.item;
    const kind = validateKind(body.kind);
    const id = validateKey(item?.id);
    validateKey(sketchId);
    const existing = find.get(kind, id);
    if (existing && (existing.status !== "draft" || existing.sketch_id !== sketchId)) {
      throw failure(409, "已发布内容请新建版本后修改。");
    }
    const status = body.publish ? (kind === "blind" ? "ready" : "published") : "draft";
    const now = new Date().toISOString();

    if (kind === "rubric") {
      if (id === pilotRubric.id) throw failure(409, "试练评分表已锁定。修改评分项请新建版本。");
      const scoring = item.scoring;
      if (!Array.isArray(scoring) || scoring.length !== 5 || new Set(scoring.map((item) => item?.id)).size !== 5
        || scoring.some((item) => !item || !["insight", "logic", "visual", "layout", "school"].includes(item.id)
          || !Number.isInteger(item.score) || item.score < 1 || !isText(item.title, 80) || !isText(item.description, 1200))
        || scoring.reduce((sum, item) => sum + item.score, 0) !== 150) {
        throw failure(400, "评分表需包含五个评分项和判断条件，分项满分合计 150 分。");
      }
      const rubric = { id, title: "快题评分表", totalScore: 150, scoring };
      if (body.publish) {
        db.exec("BEGIN IMMEDIATE");
        try {
          db.prepare("UPDATE teaching_content SET status = 'hidden' WHERE kind = 'rubric' AND sketch_id = ? AND status = 'published'").run(sketchId);
          write.run(kind, id, sketchId, id, status, now, JSON.stringify(rubric));
          db.exec("COMMIT");
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      } else write.run(kind, id, sketchId, id, status, now, JSON.stringify(rubric));
      return rubric;
    }

    const version = validateKey(item.version);
    const rubric = materialRubric(sketchId, version);
    if (!rubric) throw failure(409, "请使用本题的试练评分表或当前已发布版本。");

    const title = typeof item.title === "string" ? item.title.trim() : "";
    const workCode = typeof item.workCode === "string" ? item.workCode.trim().toLowerCase() : "";
    const authorized = item.authorized === true;
    const image = item.image ? validateImage(item.image) : null;
    if (title.length > 120 || (workCode && !/^[a-z0-9-]{1,40}$/.test(workCode))) {
      throw failure(400, "作品标题最多 120 字，作品编号使用 1 至 40 个字母、数字或短横线。");
    }
    if (body.publish && (!title || !image || !authorized || ((kind === "blind" || sketchId === swjtu894Pilot.id) && !workCode))) {
      throw failure(400, "请填写作品资料、上传原图并确认本次用途的授权。");
    }

    const material = { id, version, title, workCode, image, authorized,
      imageDigest: image ? createHash("sha256").update(Buffer.from(image.dataUrl.split(",")[1], "base64")).digest("hex") : "" };
    if (kind === "case") {
      const marks = validateMarks(item.marks, rubric.scoring, body.publish);
      Object.assign(material, { marks, score: marks.reduce((total, mark) => total + (mark.score ?? 0), 0), reviewer: student.username });
    }

    db.exec("BEGIN IMMEDIATE");
    try {
      if (!materialRubric(sketchId, version)) throw failure(409, "评分表已更新，请重新选择版本。");
      const current = find.get(kind, id);
      if (current && (current.status !== "draft" || current.sketch_id !== sketchId || current.version !== version)) {
        throw failure(409, "已登记内容请使用新的作品记录。");
      }
      if (otherPoolContains.get(kind === "case" ? "blind" : "case", sketchId, workCode, workCode,
        material.imageDigest, material.imageDigest, image?.dataUrl ?? "")) {
        throw failure(409, "该作品编号或图片已登记在另一组，请为同一作品的各版本保留同一用途。");
      }
      write.run(kind, id, sketchId, version, status, now, JSON.stringify(material));
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return material;
  }
  return { handle, isTeacher: (student) => Boolean(student && hasRole.get(student.id)) };
}

function validateKind(kind) {
  if (kind !== "rubric" && kind !== "case" && kind !== "blind") throw failure(400, "教研资料类型无效。");
  return kind;
}

function validateMarks(marks, scoring, publish) {
  if (!Array.isArray(marks) || marks.length !== scoring.length) throw failure(400, "请按评分表填写分项评语。");
  return marks.map((mark, index) => {
    const criterion = scoring[index];
    const scoreValid = mark?.score === null ? !publish : Number.isInteger(mark?.score) && mark.score >= 0 && mark.score <= criterion.score;
    const evidenceValid = typeof mark?.evidence === "string" && mark.evidence.length <= 1200 && (!publish || mark.evidence.trim());
    if (mark?.id !== criterion.id || !scoreValid || !evidenceValid) {
      throw failure(400, "案例发布前请填写每项分数和可在原图核对的依据。");
    }
    return { id: criterion.id, score: mark.score, evidence: mark.evidence.trim() };
  });
}

function validateKey(key) {
  if (typeof key !== "string" || !/^[a-z0-9-]{1,80}$/.test(key)) throw failure(400, "教研记录无效。");
  return key;
}

function isText(value, max) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function failure(status, message) {
  return Object.assign(new Error(message), { status });
}
