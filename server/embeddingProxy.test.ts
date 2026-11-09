import { describe, expect, it } from "vitest";
import { buildUpstreamEmbeddingRequest, resolveEmbeddingProxyConfig } from "./embeddingProxy";

describe("embedding proxy", () => {
  it("resolves embedding config from DashScope-compatible env vars", () => {
    expect(
      resolveEmbeddingProxyConfig({
        DASHSCOPE_API_BASE_URL: "https://example.com/openai-compatible",
        DASHSCOPE_API_KEY: "sk-test",
        EMBEDDING_MODEL: "custom-embedding",
      }),
    ).toEqual({
      apiBaseUrl: "https://example.com/openai-compatible",
      apiKey: "sk-test",
      model: "custom-embedding",
    });
  });

  it("builds an upstream embeddings request with Authorization kept server-side", () => {
    const upstream = buildUpstreamEmbeddingRequest(
      JSON.stringify({
        input: "产品快题案例检索",
      }),
      { DASHSCOPE_API_KEY: "sk-test", EMBEDDING_MODEL: "text-embedding-v4" },
    );

    expect(upstream.url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings");
    expect(upstream.init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer sk-test",
    });
    expect(JSON.parse(upstream.init.body).model).toBe("text-embedding-v4");
  });

  it("lets the server-side configured model override the browser request body", () => {
    const upstream = buildUpstreamEmbeddingRequest(
      JSON.stringify({
        model: "browser-model",
        input: "query",
      }),
      { DASHSCOPE_API_KEY: "sk-test", EMBEDDING_MODEL: "server-model" },
    );

    expect(JSON.parse(upstream.init.body).model).toBe("server-model");
  });
});
