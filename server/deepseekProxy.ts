const DEFAULT_DEEPSEEK_API_BASE_URL = "https://api.deepseek.com";
const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";

export type DeepSeekProxyEnv = Record<string, string | undefined>;

export type DeepSeekProxyConfig = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
};

export function resolveDeepSeekProxyConfig(env: DeepSeekProxyEnv): DeepSeekProxyConfig {
  return {
    apiBaseUrl: env.DEEPSEEK_API_BASE_URL || env.VITE_DEEPSEEK_API_BASE_URL || DEFAULT_DEEPSEEK_API_BASE_URL,
    apiKey: env.DEEPSEEK_API_KEY || env.VITE_DEEPSEEK_API_KEY || "",
    model: env.DEEPSEEK_MODEL || env.VITE_DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL,
  };
}

export function buildUpstreamDeepSeekRequest(rawBody: string, env: DeepSeekProxyEnv) {
  const config = resolveDeepSeekProxyConfig(env);
  if (!config.apiKey) {
    throw new Error("Missing DEEPSEEK_API_KEY.");
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const upstreamBody = {
    ...body,
    model: typeof body.model === "string" && body.model ? body.model : config.model,
  };

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
