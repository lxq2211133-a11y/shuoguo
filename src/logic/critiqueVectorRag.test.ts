import { describe, expect, it } from "vitest";
import {
  buildCritiqueVectorQueryText,
  buildCritiqueVectorRagPrompt,
  cosineSimilarity,
  getCritiqueVectorCases,
  retrieveCritiqueVectorMatches,
} from "./critiqueVectorRag";
import type { CritiqueRagInput } from "./critiqueRag";

const input: CritiqueRagInput = {
  schoolName: "西南交通大学",
  schoolTags: ["工程理性", "场景清楚", "结构可信", "功能闭环"],
  sketchTitle: "道路安全轨道系统设计",
  requirements: ["明确交通场景", "展示产品结构与使用流程"],
  scoringRubric: [
    { id: "insight", title: "问题定义与创意方向", score: 30, description: "痛点真实，概念清晰。" },
    { id: "logic", title: "功能流程与结构逻辑", score: 35, description: "功能闭环完整，结构可信。" },
  ],
};

describe("critique vector RAG", () => {
  it("builds a query text from the current critique context", () => {
    const text = buildCritiqueVectorQueryText(input);

    expect(text).toContain("西南交通大学");
    expect(text).toContain("道路安全轨道系统设计");
    expect(text).toContain("工程理性");
    expect(text).toContain("寻找构图、版面");
  });

  it("retrieves the source case when queried with its own embedding", () => {
    const cases = getCritiqueVectorCases();
    const first = cases[0];
    const matches = retrieveCritiqueVectorMatches(first.embedding, cases, { maxMatches: 1, minSimilarity: 0 });

    expect(matches[0].case.id).toBe(first.id);
    expect(matches[0].similarity).toBeCloseTo(1, 5);
  });

  it("formats vector matches for prompt injection", () => {
    const cases = getCritiqueVectorCases();
    const matches = retrieveCritiqueVectorMatches(cases[7].embedding, cases, { maxMatches: 1, minSimilarity: 0 });
    const prompt = buildCritiqueVectorRagPrompt(matches);

    expect(prompt).toContain("专业评图向量 RAG 参考");
    expect(prompt).toContain("高速护卫道路安全轨道系统");
    expect(prompt).toContain("/cases/critique-example-008.png");
    expect(prompt).toContain("不要照抄案例文字");
  });

  it("computes cosine similarity defensively", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([], [1, 0])).toBe(0);
  });
});
