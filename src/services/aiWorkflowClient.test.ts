import { afterEach, describe, expect, it, vi } from "vitest";
import { AiWorkflowError, extractJsonObject, runJsonAiWorkflow } from "./aiWorkflowClient";

describe("ai workflow client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts JSON and parses a JSON response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ output: "ok" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await runJsonAiWorkflow<{ output: string }>({
      url: "/api/workflow",
      workflowName: "测试工作流",
      body: { prompt: "hello" },
    });

    expect(result.output).toBe("ok");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/workflow",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "hello" }),
      }),
    );
  });

  it("throws a typed error for non-2xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "upstream failed",
      }),
    );

    await expect(
      runJsonAiWorkflow({
        url: "/api/workflow",
        workflowName: "测试工作流",
        body: {},
      }),
    ).rejects.toMatchObject({
      code: "http_error",
      details: "upstream failed",
      status: 500,
    } satisfies Partial<AiWorkflowError>);
  });

  it("throws a typed error for invalid JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "not json",
      }),
    );

    await expect(
      runJsonAiWorkflow({
        url: "/api/workflow",
        workflowName: "测试工作流",
        body: {},
      }),
    ).rejects.toMatchObject({
      code: "invalid_json",
      status: 200,
    } satisfies Partial<AiWorkflowError>);
  });

  it("extracts the first JSON object from model text", () => {
    expect(extractJsonObject("说明：{\"score\":120}")).toBe("{\"score\":120}");
  });
});
