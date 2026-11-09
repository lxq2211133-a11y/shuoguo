import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildVisionCritiqueRequestBodyWithVectorRag,
  buildVisionCritiqueRequestBody,
  generateVisionCritique,
  isVisionCritiqueConfigured,
  parseVisionCritiqueResponse,
  visionQuotaMessage,
  type VisionCritiqueRequest,
} from "./visionCritique";
import { getCritiqueVectorCases } from "../logic/critiqueVectorRag";
import { AiWorkflowError } from "./aiWorkflowClient";

const request: VisionCritiqueRequest = {
  imageDataUrl: "data:image/png;base64,abc123",
  schoolName: "江南大学",
  schoolTags: ["方法完整", "用户洞察"],
  sketchTitle: "面向独居青年的智能厨房小家电设计",
  requirements: ["提出用户痛点", "展示功能模块和交互流程"],
  totalScore: 150,
  scoringRubric: [
    { id: "insight", title: "问题定义与创意方向", score: 30, description: "痛点真实，概念清晰。" },
    { id: "logic", title: "功能流程与结构逻辑", score: 35, description: "功能闭环完整，结构可信。" },
  ],
};

describe("vision critique service", () => {
  it("reports a known quota outage without exposing arbitrary upstream text", () => {
    const quota = (status: number, details: string) => new AiWorkflowError("评图调用失败", { code: "http_error", status, details });
    const message = "视觉模型免费额度已用完。作品仍保留，额度恢复后可重试。";
    expect(visionQuotaMessage(quota(503, '{"code":"vision_quota_exhausted"}'))).toBe(message);
    expect(visionQuotaMessage(quota(403, '{"error":{"code":"AllocationQuota.FreeTierOnly"}}'))).toBe(message);
    expect(visionQuotaMessage(quota(403, '{"error":{"code":"Model.AccessDenied","message":"upstream details"}}'))).toBeUndefined();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a Qwen OpenAI-compatible chat vision request with the uploaded image", () => {
    const body = buildVisionCritiqueRequestBody(request, "vision-model");

    expect(body.model).toBe("vision-model");
    expect(body.messages[0]).toMatchObject({
      role: "system",
      content: expect.stringContaining("只输出可解析 JSON"),
    });
    expect(JSON.stringify(body.messages)).toContain("data:image/png;base64,abc123");
    expect(JSON.stringify(body.messages)).toContain("image_url");
    expect(JSON.stringify(body.messages)).toContain("满分 150 分");
    expect(JSON.stringify(body.messages)).toContain("criteriaScores");
    expect(JSON.stringify(body.messages)).toContain("问题定义与创意方向：30 分");
    expect(JSON.stringify(body.messages)).toContain("专业评图 RAG 参考");
    expect(JSON.stringify(body.messages)).toContain("江南智能厨房小家电高分卷");
    expect(body.max_tokens).toBe(1800);
  });

  it("uses the default Qwen vision-capable model", () => {
    const body = buildVisionCritiqueRequestBody(request);

    expect(body.model).toBe("qwen3.7-plus");
  });

  it("can build a vision request with vector RAG context", async () => {
    const vectorCase = getCritiqueVectorCases()[7];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [{ embedding: vectorCase.embedding }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const body = await buildVisionCritiqueRequestBodyWithVectorRag(request, "vision-model");
    const messagesText = JSON.stringify(body.messages);

    expect(fetchMock).toHaveBeenCalledWith("/api/embeddings", expect.any(Object));
    expect(messagesText).toContain("专业评图向量 RAG 参考");
    expect(messagesText).toContain("高速护卫道路安全轨道系统");
    expect(messagesText).toContain("/cases/critique-example-008.png");
  });

  it("uses the local proxy by default so the API key stays out of the browser request", async () => {
    const vectorCase = getCritiqueVectorCases()[0];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          output: [
            {
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    score: 120,
                    criteriaScores: [
                      { id: "insight", title: "insight", score: 25, maxScore: 30, comment: "clear" },
                      { id: "logic", title: "logic", score: 30, maxScore: 35, comment: "complete" },
                    ],
                    strengths: [],
                    issues: [],
                    advice: [],
                    nextTask: "next",
                  }),
                },
              ],
            },
          ],
          output_text: JSON.stringify({
                score: 120,
                criteriaScores: [
                  { id: "insight", title: "insight", score: 25, maxScore: 30, comment: "clear" },
                  { id: "logic", title: "logic", score: 30, maxScore: 35, comment: "complete" },
                ],
                strengths: [],
                issues: [],
                advice: [],
                nextTask: "next",
              }),
        }),
    });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [{ embedding: vectorCase.embedding }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(isVisionCritiqueConfigured()).toBe(true);
    await generateVisionCritique(request);

    const [embeddingUrl, embeddingInit] = fetchMock.mock.calls[0];
    expect(embeddingUrl).toBe("/api/embeddings");
    expect(embeddingInit).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/vision-critique");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    expect(init.headers).not.toHaveProperty("Authorization");
    expect(JSON.parse(init.body as string).model).toBe("qwen3.7-plus");
    expect(JSON.parse(init.body as string).messages[1].content[0].type).toBe("image_url");
  });

  it("parses a Responses API output_text critique response", () => {
    const result = parseVisionCritiqueResponse(
      {
        output_text: JSON.stringify({
          score: 119,
          totalScore: 150,
          criteriaScores: [
            { id: "insight", title: "问题定义与创意方向", score: 24, maxScore: 30, comment: "痛点明确。" },
            { id: "logic", title: "功能流程与结构逻辑", score: 29, maxScore: 35, comment: "流程完整。" },
          ],
          strengths: ["主视图清晰"],
          issues: ["说明文字偏少"],
          advice: ["补充流程节点"],
          nextTask: "重画使用流程。",
        }),
      },
      request,
    );

    expect(result.score).toBe(53);
    expect(result.criteriaScores[1]).toMatchObject({ score: 29, maxScore: 35 });
    expect(result.nextTask).toBe("重画使用流程。");
  });

  it("parses a JSON critique response into a 150-point result", () => {
    const result = parseVisionCritiqueResponse(
      JSON.stringify({
        score: 118,
        totalScore: 150,
        criteriaScores: [
          { id: "insight", title: "问题定义与创意方向", score: 24, maxScore: 30, comment: "痛点较明确。" },
          { id: "logic", title: "功能流程与结构逻辑", score: 28, maxScore: 35, comment: "流程基本完整。" },
        ],
        strengths: ["主题明确"],
        issues: ["细节图不足"],
        advice: ["补充结构说明"],
        nextTask: "重画一版流程图。",
      }),
      request,
    );

    expect(result.score).toBe(52);
    expect(result.totalScore).toBe(150);
    expect(result.criteriaScores).toHaveLength(2);
    expect(result.criteriaScores[0]).toMatchObject({
      title: "问题定义与创意方向",
      score: 24,
      maxScore: 30,
    });
  });

  it("matches approved cases after observing the work and drops invented citations", async () => {
    const marks = [
      { id: "insight", score: 24, evidence: "左侧用户画像没有明确痛点" },
      { id: "logic", score: 29, evidence: "右下角归还流程缺少锁止确认" },
    ];
    const modelResult = {
      criteriaScores: marks.map(({ id, score, evidence }) => ({ id, score, comment: evidence })),
      issues: ["缺少锁止确认"],
    };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: "case-reviewed", title: "老师标注的同题案例", marks }] })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ output_text: JSON.stringify(modelResult) }) })
      .mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({ output_text: JSON.stringify({
        ...modelResult,
        references: [
          { caseId: "case-reviewed", criterionId: "logic", comparison: "右下角可补锁止确认。" },
          { caseId: "invented", criterionId: "logic", comparison: "未知案例。" },
        ],
      }) }) });
    vi.stubGlobal("fetch", fetchMock);
    const result = await generateVisionCritique({ ...request, sketchId: "sketch-test", rubricVersion: "rubric-test" });
    expect(fetchMock.mock.calls[1][1].body).not.toContain("case-reviewed");
    expect(fetchMock.mock.calls[2][1].body).toContain("case-reviewed");
    expect(result.references).toEqual([{ caseId: "case-reviewed", title: "老师标注的同题案例", criterionId: "logic", comparison: "右下角可补锁止确认。" }]);
  });

  it("uses both versions of the work and maps revision evidence to the original issues", () => {
    const revision = { ...request, previous: { imageDataUrl: "data:image/png;base64,initial", issues: ["流程缺少归还", "文字过密"] } };
    const prompt = JSON.stringify(buildVisionCritiqueRequestBody(revision));
    expect(prompt.indexOf(revision.previous.imageDataUrl)).toBeLessThan(prompt.indexOf(request.imageDataUrl));
    expect(prompt).toContain("只有看到与该问题直接相关的内容变化");
    expect(prompt).toContain("以作品原先明确写出的痛点为准");
    const result = parseVisionCritiqueResponse(JSON.stringify({
      criteriaScores: [
        { id: "insight", score: 24, comment: "左侧标出用户痛点。" },
        { id: "logic", score: 30, comment: "右下角流程图补齐归还。" },
      ],
      revisionNotes: [{ status: "已改善", evidence: "右下角新增归还步骤。" }],
    }), revision);
    expect(result.score).toBe(54);
    expect(result.revisionNotes).toMatchObject([
      { issue: "流程缺少归还", status: "已改善" }, { issue: "文字过密", status: "无法判断" },
    ]);
  });
});
