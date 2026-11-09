import { describe, expect, it } from "vitest";
import { buildUpstreamDeepSeekRequest, resolveDeepSeekProxyConfig } from "./deepseekProxy";

describe("deepseek proxy", () => {
  it("resolves DeepSeek config from server-side env vars", () => {
    expect(
      resolveDeepSeekProxyConfig({
        DEEPSEEK_API_BASE_URL: "https://example.com",
        DEEPSEEK_API_KEY: "sk-test",
        DEEPSEEK_MODEL: "deepseek-reasoner",
      }),
    ).toEqual({
      apiBaseUrl: "https://example.com",
      apiKey: "sk-test",
      model: "deepseek-reasoner",
    });
  });

  it("builds an upstream DeepSeek chat request with Authorization kept server-side", () => {
    const upstream = buildUpstreamDeepSeekRequest(
      JSON.stringify({
        messages: [{ role: "user", content: "生成一套模拟卷" }],
        temperature: 0.7,
      }),
      { DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_MODEL: "deepseek-chat" },
    );

    expect(upstream.url).toBe("https://api.deepseek.com/chat/completions");
    expect(upstream.init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer sk-test",
    });
    expect(JSON.parse(upstream.init.body).model).toBe("deepseek-chat");
  });

  it("lets the request body override the default model", () => {
    const upstream = buildUpstreamDeepSeekRequest(
      JSON.stringify({
        model: "custom-model",
        messages: [],
      }),
      { DEEPSEEK_API_KEY: "sk-test", DEEPSEEK_MODEL: "deepseek-chat" },
    );

    expect(JSON.parse(upstream.init.body).model).toBe("custom-model");
  });
});
