import { afterEach, describe, expect, it, vi } from "vitest";
import { callDeepSeekChat } from "./deepseek";

describe("deepseek service", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the local proxy by default and keeps Authorization out of the browser request", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "模拟卷内容" } }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await callDeepSeekChat([{ role: "user", content: "生成一套模拟卷" }]);

    expect(result).toBe("模拟卷内容");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/deepseek-chat");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(init.body as string)).toMatchObject({
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 2000,
    });
  });
});
