const DEFAULT_EMBEDDING_API_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-v4";

export type EmbeddingProxyEnv = Record<string, string | undefined>;

export type EmbeddingProxyConfig = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
};

export function resolveEmbeddingProxyConfig(env: EmbeddingProxyEnv): EmbeddingProxyConfig {
  return {
    apiBaseUrl:
      env.EMBEDDING_API_BASE_URL ||
      env.DASHSCOPE_API_BASE_URL ||
      env.QWEN_API_BASE_URL ||
      env.VITE_EMBEDDING_API_BASE_URL ||
      env.VITE_DASHSCOPE_API_BASE_URL ||
      DEFAULT_EMBEDDING_API_BASE_URL,
    apiKey:
      env.EMBEDDING_API_KEY ||
      env.DASHSCOPE_API_KEY ||
      env.QWEN_API_KEY ||
      env.VITE_EMBEDDING_API_KEY ||
      env.VITE_DASHSCOPE_API_KEY ||
      env.VITE_QWEN_API_KEY ||
      "",
    model: env.EMBEDDING_MODEL || env.VITE_EMBEDDING_MODEL || DEFAULT_EMBEDDING_MODEL,
  };
}

export function buildUpstreamEmbeddingRequest(rawBody: string, env: EmbeddingProxyEnv) {
  const config = resolveEmbeddingProxyConfig(env);
  if (!config.apiKey) {
    throw new Error("Missing EMBEDDING_API_KEY, DASHSCOPE_API_KEY, or QWEN_API_KEY.");
  }

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const upstreamBody = {
    ...body,
    model: config.model,
  };

  return {
    url: `${config.apiBaseUrl.replace(/\/$/, "")}/embeddings`,
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
