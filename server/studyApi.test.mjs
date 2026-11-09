// @vitest-environment node
import { Readable } from "node:stream";
import { DatabaseSync } from "node:sqlite";
import { expect, test } from "vitest";
import { swjtu894Pilot } from "../src/data/swjtu894.ts";
import { createStudyApi } from "./studyApi.mjs";

const image = { name: "draft.png", dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jv1sAAAAASUVORK5CYII=" };

test("keeps profile, review and image data tied to the account across separate sessions", async () => {
  const api = createStudyApi({ databasePath: ":memory:" });
  const profile = { schoolId: "gafa", stage: "强化", dailyMinutes: 90 };
  const credentials = { username: "student-a", password: "test-pass-a" };

  const registration = await request(api, { action: "signup", ...credentials, profile });
  expect(registration.cookie).toMatch(/HttpOnly/);
  expect(registration.data.profile).toEqual(profile);
  expect(await request(api, { action: "review", key: "gafa:m1", rating: "不会" }, registration.cookie))
    .toMatchObject({ data: { rating: "不会" }, status: 200 });
  expect(await request(api, { action: "save-draft", schoolId: "gafa", draft: image }, registration.cookie))
    .toMatchObject({ data: "draft.png", status: 200 });

  await request(api, { action: "logout" }, registration.cookie);
  expect((await request(api, undefined, registration.cookie)).data).toBeNull();

  const another = await request(api, { action: "signup", ...credentials, username: "student-b", profile });
  expect(another.data).toMatchObject({ reviewRecords: {}, draftNames: {} });
  expect((await request(api, { action: "read-draft", schoolId: "gafa" }, another.cookie)).data).toBeNull();

  const newSession = await request(api, { action: "login", ...credentials });
  expect(newSession.data).toMatchObject({ profile, reviewRecords: { "gafa:m1": { rating: "不会" } }, draftNames: { gafa: "draft.png" } });
  expect((await request(api, { action: "read-draft", schoolId: "gafa" }, newSession.cookie)).data).toMatchObject(image);
});

test("publishes authorized case evidence and exposes private reports only through a consented review", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const api = createStudyApi({ database: db });
    const profile = { schoolId: "jiangnan", stage: "基础", dailyMinutes: 60 };
    const signup = { action: "signup", password: "test-account-pass", profile };
    const teacher = await request(api, { ...signup, username: "teacher-test" });
    const student = await request(api, { ...signup, username: "student-test" });
    db.exec("INSERT INTO teaching_roles SELECT id FROM students WHERE username = 'teacher-test'");
    const scoring = ["insight", "logic", "visual", "layout", "school"].map((id) => ({ id, title: id, score: 30, description: "判断是否有明确图面证据" }));
    const sketchId = "sketch-test";
    const rubric = { action: "teaching-save", kind: "rubric", sketchId, item: { id: "rubric-test", scoring }, publish: true };
    expect((await request(api, rubric, student.cookie)).status).toBe(403);
    expect((await request(api, rubric, teacher.cookie)).status).toBe(200);
    const marks = scoring.map(({ id }) => ({ id, score: 20, evidence: "图面有明确证据" }));
    const item = { id: "case-test", version: "rubric-test", title: "测试案例", marks, image };
    const publishCase = { action: "teaching-save", kind: "case", sketchId, item, publish: true };
    expect((await request(api, publishCase, teacher.cookie)).status).toBe(400);
    expect((await request(api, { ...publishCase, item: { ...item, authorized: true } }, teacher.cookie)).status).toBe(200);
    const cases = (await request(api, { action: "published-cases", sketchId, version: "rubric-test" })).data;
    expect(cases).toMatchObject([{ id: item.id, score: 100, marks }]);
    expect(cases[0]).not.toHaveProperty("image");

    const reportId = "33158d9a-97b0-43e2-8c62-2c16732c43a1";
    const result = { score: 100, totalScore: 150, criteriaScores: scoring.map(({ id, title }) => ({ id, title, maxScore: 30, score: 20, comment: "图面有明确证据" })), issues: [], strengths: [], advice: [] };
    const sketch = { id: sketchId, title: "测试快题", schoolId: "jiangnan", totalScore: 150, scoring, requirements: [] };
    const saved = await request(api, { action: "save-report", report: { id: reportId, image, result, sketch } }, student.cookie);
    expect(saved.status).toBe(200);
    const revisionId = "7217129a-5528-483a-97d8-1e3727be748a";
    const revision = { id: revisionId, parentId: reportId, image, result, sketch: { ...sketch, title: "不同题目" } };
    const updated = await request(api, { action: "save-report", report: revision }, student.cookie);
    expect(updated.data).toMatchObject({ parentId: reportId, sketch });
    expect((await request(api, { action: "read-report", reportId }, teacher.cookie)).status).toBe(404);
    expect((await request(api, { action: "review-queue" }, teacher.cookie)).data).toEqual([]);
    expect((await request(api, { action: "report-review", reportId, reason: "需要核对结构评分", share: true }, student.cookie)).status).toBe(200);
    const [{ studentId }] = (await request(api, { action: "review-queue" }, teacher.cookie)).data;
    expect((await request(api, { action: "review-reply", reportId, studentId, reply: "请补充结构关系。" }, teacher.cookie)).status).toBe(200);
    expect((await request(api, { action: "report-review", reportId }, student.cookie)).data.reply.text).toBe("请补充结构关系。");
    expect((await request(api, { action: "remove-report", reportId }, student.cookie)).status).toBe(200);
    expect((await request(api, { action: "read-report", reportId: revisionId }, student.cookie)).status).toBe(404);
    expect((await request(api, { action: "review-detail", reportId, studentId }, teacher.cookie)).status).toBe(404);
  } finally {
    db.close();
  }
});

test("locks the 894 rubric and keeps authorized blind works out of the published case pool", async () => {
  const db = new DatabaseSync(":memory:");
  try {
    const api = createStudyApi({ database: db });
    const profile = { schoolId: "swjtu", stage: "基础", dailyMinutes: 60 };
    const teacher = await request(api, { action: "signup", username: "teacher-894", password: "test-894-pass", profile });
    db.exec("INSERT INTO teaching_roles SELECT id FROM students WHERE username = 'teacher-894'");
    const sketchId = swjtu894Pilot.id;
    const version = swjtu894Pilot.rubricVersion;
    const scoring = swjtu894Pilot.scoring;
    const readCatalog = () => request(api, { action: "teaching-list", sketchId }, teacher.cookie);
    const save = (kind, item, publish = true) => request(api, { action: "teaching-save", sketchId, kind, item, publish }, teacher.cookie);
    const publicCases = () => request(api, { action: "published-cases", sketchId, version });

    expect((await readCatalog()).data.rubric).toMatchObject({ id: version, scoring });
    expect((await save("rubric", { id: version, scoring })).status).toBe(409);
    expect((await save("rubric", { id: "alternate-894", scoring })).status).toBe(200);
    expect((await readCatalog()).data).toMatchObject({ rubric: { id: "alternate-894" }, pilotRubric: { id: version } });

    const blind = { id: "blind-894-1", version, workCode: "894-s001", title: "盲评测试图", image };
    expect((await save("blind", blind)).status).toBe(400);
    expect((await save("blind", { ...blind, authorized: true })).status).toBe(200);
    expect((await publicCases()).data).toEqual([]);
    expect((await request(api, { action: "published-case", id: blind.id })).status).toBe(404);
    expect((await request(api, { action: "teaching-read", kind: "blind", id: blind.id })).status).toBe(403);
    expect((await request(api, { action: "teaching-read", kind: "blind", id: blind.id }, teacher.cookie)).data.image)
      .toMatchObject(image);

    const otherImage = { name: "second.png", dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" };
    const marks = scoring.map(({ id }) => ({ id, score: 0, evidence: "图面依据测试" }));
    const material = { id: "case-894-1", version, workCode: "894-s002", title: "案例测试图", image: otherImage, marks, authorized: true };
    expect((await save("case", { ...material, workCode: " 894-S001 " })).status).toBe(409);
    expect((await save("case", { ...material, image })).status).toBe(409);

    const draft = { ...material, title: "", image: null, authorized: false, marks: marks.map((mark) => ({ ...mark, score: null, evidence: "" })) };
    expect((await save("case", draft, false)).status).toBe(200);
    expect((await save("case", { ...material, marks: draft.marks })).status).toBe(400);
    expect((await save("case", material)).status).toBe(200);
    expect((await publicCases()).data).toMatchObject([{ id: material.id, score: 0 }]);
    const published = (await request(api, { action: "published-case", id: material.id })).data;
    expect(published).not.toHaveProperty("workCode");
    expect(published).not.toHaveProperty("imageDigest");
    expect((await readCatalog()).data.entries).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: blind.id, kind: "blind", status: "ready" }),
      expect.objectContaining({ id: material.id, kind: "case", status: "published" }),
    ]));
    await request(api, { action: "teaching-hide", kind: "case", id: material.id }, teacher.cookie);
    expect((await publicCases()).data).toEqual([]);
    expect((await save("blind", { ...blind, id: "blind-894-2", image: otherImage, workCode: "894-s003", authorized: true })).status).toBe(409);
  } finally {
    db.close();
  }
});

async function request(api, body, cookie = "") {
  const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
  req.method = body ? "POST" : "GET";
  req.headers = { "content-type": "application/json", cookie: cookie.split(";")[0] };
  req.socket = { remoteAddress: "127.0.0.1" };
  const headers = new Map();
  const response = {
    statusCode: 200,
    setHeader: (name, value) => headers.set(name, value),
    end: (value) => { response.data = JSON.parse(value); },
  };
  await api(req, response);
  return { data: response.data, status: response.statusCode, cookie: headers.get("Set-Cookie") };
}
