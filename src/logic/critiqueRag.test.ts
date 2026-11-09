import { describe, expect, it } from "vitest";
import { buildCritiqueRagPrompt, retrieveCritiqueRagContext, type CritiqueRagInput } from "./critiqueRag";

const jiangnanInput: CritiqueRagInput = {
  schoolName: "江南大学",
  schoolTags: ["方法完整", "用户洞察", "系统表达", "版面克制"],
  sketchTitle: "面向独居青年的智能厨房小家电设计",
  requirements: ["提出用户痛点", "展示功能模块和交互流程", "表现产品 CMF 与生活方式"],
  scoringRubric: [
    { id: "insight", title: "问题定义与创意方向", score: 30, description: "痛点真实，概念清晰。" },
    { id: "logic", title: "功能流程与结构逻辑", score: 35, description: "功能闭环完整，结构可信。" },
    { id: "visual", title: "造型语言与表现技法", score: 35, description: "主效果图清楚。" },
    { id: "layout", title: "版面组织与信息表达", score: 30, description: "图文层级清晰。" },
    { id: "school", title: "院校风格与题目契合", score: 20, description: "贴合目标院校偏好。" },
  ],
};

describe("critique RAG retrieval", () => {
  it("retrieves high-score and problem cases for the current school and sketch prompt", () => {
    const context = retrieveCritiqueRagContext(jiangnanInput);

    expect(context.referenceCases[0].case.id).toBe("jiangnan-kitchen-excellent");
    expect(context.issueCases[0].case.id).toBe("jiangnan-kitchen-problem");
    expect(context.referenceCases[0].matchedSignals).toContain("院校：江南大学");
    expect(context.referenceCases[0].score).toBeGreaterThan(0);
  });

  it("formats a compact prompt section for the vision critique model", () => {
    const prompt = buildCritiqueRagPrompt(retrieveCritiqueRagContext(jiangnanInput, undefined, {
      issueCaseCount: 1,
      referenceCaseCount: 1,
    }));

    expect(prompt).toContain("专业评图 RAG 参考");
    expect(prompt).toContain("优秀参考案例");
    expect(prompt).toContain("江南智能厨房小家电高分卷");
    expect(prompt).toContain("相似失分案例");
    expect(prompt).toContain("江南厨房题常见失分卷");
    expect(prompt).toContain("不要照抄案例表述");
  });
});
