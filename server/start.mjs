import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createStudyApi } from "./studyApi.mjs";
import { buildUpstreamVisionRequest } from "./visionProxy.ts";
import { buildUpstreamEmbeddingRequest } from "./embeddingProxy.ts";
import { buildUpstreamDeepSeekRequest } from "./deepseekProxy.ts";

const assetsRoot = fileURLToPath(new URL("../dist", import.meta.url));
const app = createStudyApi({ secureCookies: process.env.STUDY_SECURE_COOKIE === "1" });
const proxyRoutes = new Map([
  ["/api/vision-critique", { build: buildUpstreamVisionRequest, maxBytes: 24 * 1024 * 1024, kind: "vision" }],
  ["/api/embeddings", { build: buildUpstreamEmbeddingRequest, maxBytes: 32 * 1024, kind: "embedding" }],
  ["/api/deepseek-chat", { build: buildUpstreamDeepSeekRequest, maxBytes: 64 * 1024, kind: "text" }],
]);
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"], [".js", "text/javascript; charset=utf-8"], [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"], [".png", "image/png"], [".jpeg", "image/jpeg"], [".webp", "image/webp"],
]);
const aiRequests = new Map();
const windowMs = 10 * 60 * 1000;

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "same-origin");
  let path = "/";
  try {
    path = new URL(request.url ?? "/", "http://localhost").pathname;
    if (path === "/api/study") return await app(request, response);
    if (path === "/api/health" && request.method === "GET") return json(response, 200, { status: "ok" });
    const proxy = proxyRoutes.get(path);
    if (proxy) return await runProxy(request, response, proxy);
    if (request.method !== "GET" && request.method !== "HEAD") return json(response, 405, { error: "请求方式无效。" });
    const file = resolve(assetsRoot, `.${decodeURIComponent(path === "/" ? "/index.html" : path)}`);
    if (!file.startsWith(`${assetsRoot}${sep}`)) return json(response, 404, { error: "页面不存在。" });
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) return json(response, 404, { error: "页面不存在。" });
    response.setHeader("Content-Type", mimeTypes.get(extname(file)) ?? "application/octet-stream");
    response.setHeader("Content-Length", info.size);
    response.setHeader("Cache-Control", path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache");
    if (request.method === "HEAD") return response.end();
    const stream = createReadStream(file);
    stream.on("error", () => response.destroy());
    stream.pipe(response);
  } catch (error) {
    console.error("[shuoguo]", request.method, path, error.name);
    json(response, 500, { error: "服务暂不可用，请重试。" });
  }
});

async function runProxy(request, response, { build, maxBytes, kind }) {
  if (request.method !== "POST") return json(response, 405, { error: "请求方式无效。" });
  if (request.headers["sec-fetch-site"] === "cross-site" || request.headers["sec-fetch-site"] === "same-site"
    || request.headers["content-type"]?.split(";")[0] !== "application/json") {
    return json(response, 415, { error: "请从硕果页面发起请求。" });
  }
  const studentId = app.studentId(request);
  if (!studentId) return json(response, 401, { error: "请先登录后进行评图。" });

  const now = Date.now();
  for (const [id, window] of aiRequests) {
    if (now - window.since >= windowMs) aiRequests.delete(id);
  }
  const window = aiRequests.get(studentId) ?? { since: now, count: 0 };
  if (window.count >= 24) return json(response, 429, { error: "评图请求较多，请稍后重试。" });
  window.count += 1;
  aiRequests.set(studentId, window);

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= maxBytes) chunks.push(chunk);
  }
  if (size > maxBytes) return json(response, 413, { error: "评图请求过大。" });
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  } catch {
    return json(response, 400, { error: "提交内容无法读取。" });
  }
  const payload = aiPayload(kind, body);
  if (!payload) return json(response, 400, { error: "AI 请求格式无效。" });

  try {
    const upstream = build(JSON.stringify(payload), process.env);
    const result = await fetch(upstream.url, { ...upstream.init, signal: AbortSignal.timeout(65_000) });
    if (!result.ok) {
      console.error("[shuoguo-ai]", result.status);
      if (kind === "vision" && result.status === 403) {
        const error = await result.json().catch(() => null);
        if ((error?.error?.code ?? error?.code) === "AllocationQuota.FreeTierOnly") {
          return json(response, 503, { code: "vision_quota_exhausted", error: "视觉模型免费额度已用完。" });
        }
      }
      return json(response, 502, { error: "AI 服务暂不可用，请稍后重试。" });
    }
    json(response, 200, await result.json());
  } catch (error) {
    console.error("[shuoguo-ai]", error.name);
    json(response, 502, { error: "AI 服务暂不可用，请稍后重试。" });
  }
}

function aiPayload(kind, body) {
  if (kind === "embedding") return typeof body.input === "string" && body.input.length <= 8000 ? { input: body.input } : null;
  if (!Array.isArray(body.messages) || body.messages.length > 8) return null;
  const messages = [];
  for (const message of body.messages) {
    if (!message || !["system", "user", "assistant"].includes(message.role)) return null;
    if (typeof message.content === "string" && message.content.length <= 32_000) {
      messages.push({ role: message.role, content: message.content });
      continue;
    }
    if (kind !== "vision" || message.role !== "user" || !Array.isArray(message.content) || message.content.length > 3) return null;
    const content = [];
    for (const part of message.content) {
      if (part?.type === "text" && typeof part.text === "string" && part.text.length <= 32_000) content.push({ type: "text", text: part.text });
      else if (part?.type === "image_url" && typeof part.image_url?.url === "string"
        && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(part.image_url.url)) {
        content.push({ type: "image_url", image_url: { url: part.image_url.url } });
      } else return null;
    }
    messages.push({ role: message.role, content });
  }
  return { messages, temperature: kind === "vision" ? 0.35 : 0.7, max_tokens: Math.max(200, Math.min(Number(body.max_tokens) || 1800, 4000)) };
}

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

const host = process.env.STUDY_HOST || "127.0.0.1";
const port = Number(process.env.STUDY_PORT ?? 5174);
server.listen(port, host, () => console.log(`硕果研习 · http://${host}:${server.address().port}`));
