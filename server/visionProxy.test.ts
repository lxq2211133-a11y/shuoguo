import { describe, expect, it } from "vitest";
import { buildUpstreamVisionRequest, resolveVisionProxyConfig } from "./visionProxy";

describe("vision proxy", () => {
  it("builds a server-side Qwen chat completions request with the default vision model", () => {
    const upstream = buildUpstreamVisionRequest(
      JSON.stringify({
        messages: [{ role: "user", content: [{ type: "text", text: "score this sketch" }] }],
      }),
      { DASHSCOPE_API_KEY: "sk-test" },
    );

    expect(upstream.url).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    expect(upstream.init.method).toBe("POST");
    expect(upstream.init.headers).toMatchObject({
      "Content-Type": "application/json",
      Authorization: "Bearer sk-test",
    });
    expect(JSON.parse(upstream.init.body as string).model).toBe("qwen3.7-plus");
  });

  it("uses custom provider base URL and model when configured", () => {
    const config = resolveVisionProxyConfig({
      DASHSCOPE_API_BASE_URL: "https://example.com/openai-compatible",
      DASHSCOPE_API_KEY: "provider-key",
      QWEN_VISION_MODEL: "custom-vision-model",
    });

    expect(config).toEqual({
      apiBaseUrl: "https://example.com/openai-compatible",
      apiKey: "provider-key",
      model: "custom-vision-model",
    });
  });

  it("requests direct JSON from DashScope for a structured Qwen critique", () => {
    const raw = JSON.stringify({
      messages: [{ role: "system", content: "你是快题评图老师，只输出可解析 JSON。" }],
      max_tokens: 1800,
    });
    const official = buildUpstreamVisionRequest(raw, { DASHSCOPE_API_KEY: "sk-test" });
    expect(JSON.parse(official.init.body)).toMatchObject({
      model: "qwen3.7-plus",
      enable_thinking: false,
      response_format: { type: "json_object" },
      max_tokens: 1800,
    });

    const compatible = buildUpstreamVisionRequest(raw, {
      DASHSCOPE_API_KEY: "sk-test",
      DASHSCOPE_API_BASE_URL: "https://example.com/openai-compatible",
    });
    expect(JSON.parse(compatible.init.body)).not.toHaveProperty("enable_thinking");
    expect(JSON.parse(compatible.init.body)).not.toHaveProperty("response_format");
  });

  it("lets the server-side configured model override the browser default", () => {
    const upstream = buildUpstreamVisionRequest(
      JSON.stringify({
        model: "browser-default-model",
        messages: [],
      }),
      { DASHSCOPE_API_KEY: "sk-test", QWEN_VISION_MODEL: "server-configured-model" },
    );

    expect(JSON.parse(upstream.init.body as string).model).toBe("server-configured-model");
  });
});
