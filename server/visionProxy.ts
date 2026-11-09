const DEFAULT_VISION_API_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_VISION_MODEL = "qwen3.7-plus";

export type VisionProxyEnv = Record<string, string | undefined>;

export type VisionProxyConfig = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
};

export function resolveVisionProxyConfig(env: VisionProxyEnv): VisionProxyConfig {
  return {
    apiBaseUrl:
      env.QWEN_API_BASE_URL ||
      env.DASHSCOPE_API_BASE_URL ||
      env.VISION_API_BASE_URL ||
      env.VITE_QWEN_API_BASE_URL ||
      env.VITE_DASHSCOPE_API_BASE_URL ||
      env.VITE_VISION_API_BASE_URL ||
      DEFAULT_VISION_API_BASE_URL,
    apiKey:
      env.DASHSCOPE_API_KEY ||
      env.QWEN_API_KEY ||
      env.VISION_API_KEY ||
      env.VITE_DASHSCOPE_API_KEY ||
      env.VITE_QWEN_API_KEY ||
      env.VITE_VISION_API_KEY ||
      "",
    model: env.QWEN_VISION_MODEL || env.VISION_MODEL || env.VITE_QWEN_VISION_MODEL || env.VITE_VISION_MODEL || DEFAULT_VISION_MODEL,
  };
}

export function buildUpstreamVisionRequest(rawBody: string, env: VisionProxyEnv) {
  const config = resolveVisionProxyConfig(env);
  if (!config.apiKey) {
    throw new Error("Missing DASHSCOPE_API_KEY, QWEN_API_KEY, or VISION_API_KEY.");
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const upstreamBody: Record<string, unknown> = {
    ...body,
    model: config.model,
  };
  const officialDashScope = /^https:\/\/dashscope(?:-intl)?\.aliyuncs\.com(?:\/|$)/i.test(config.apiBaseUrl);
  if (officialDashScope && /^qwen3\.7-plus(?:-\d{4}-\d{2}-\d{2})?$/.test(config.model)) {
    upstreamBody.enable_thinking = false;
    if (Array.isArray(body.messages) && body.messages.some((message) =>
      message?.role === "system" && typeof message.content === "string" && /\bJSON\b/i.test(message.content))) {
      upstreamBody.response_format = { type: "json_object" };
    }
  }

  return {
    url: `${config.apiBaseUrl.replace(/\/$/, "")}/chat/completions`,
    init: {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(upstreamBody),
    },
  };
}

export async function readRequestBody(request: { on: (event: string, listener: (chunk?: unknown) => void) => void }) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk ?? "")));
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", (error) => reject(error));
  });
}
