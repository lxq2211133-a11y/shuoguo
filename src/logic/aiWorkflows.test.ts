import { describe, expect, it } from "vitest";
import { buildCritiquePrompt, buildExamPrompt, createMockCritique } from "./aiWorkflows";

describe("buildCritiquePrompt", () => {
  it("builds a Chinese JSON-only critique prompt with required result fields", () => {
    const prompt = buildCritiquePrompt({
      schoolName: "江南大学",
      schoolTags: ["产品逻辑", "人机交互", "版式"],
      sketchTitle: "智能药盒快题",
      requirements: ["突出使用流程", "包含三视图"],
      totalScore: 150,
      scoringRubric: [
        { title: "问题定义与创意方向", score: 30, description: "痛点真实，概念清晰。" },
        { title: "功能流程与结构逻辑", score: 35, description: "功能闭环完整，结构可信。" },
      ],
      imageDescription: "画面包含药盒主体、使用场景和流程箭头。",
    });

    expect(prompt).toContain("江南大学");
    expect(prompt).toContain("产品逻辑");
    expect(prompt).toContain("智能药盒快题");
    expect(prompt).toContain("突出使用流程");
    expect(prompt).toContain("画面包含药盒主体");
    expect(prompt).toContain("满分 150 分");
    expect(prompt).toContain("问题定义与创意方向：30 分");
    expect(prompt).toContain("只返回 JSON");
    expect(prompt).toContain("score");
    expect(prompt).toContain("criteriaScores");
    expect(prompt).toContain("strengths");
    expect(prompt).toContain("issues");
    expect(prompt).toContain("advice");
    expect(prompt).toContain("nextTask");
  });

  it("includes optional RAG reference context before the image description", () => {
    const prompt = buildCritiquePrompt({
      schoolName: "江南大学",
      schoolTags: ["方法完整"],
      sketchTitle: "智能药盒快题",
      requirements: ["突出使用流程"],
      referenceContext: "专业评图 RAG 参考：优秀参考案例 A。",
      imageDescription: "画面包含药盒主体。",
    });

    expect(prompt).toContain("专业评图 RAG 参考");
    expect(prompt.indexOf("专业评图 RAG 参考")).toBeLessThan(prompt.indexOf("作品描述"));
    expect(prompt).toContain("请只返回 JSON");
  });
});

describe("buildExamPrompt", () => {
  it("builds a theory exam prompt for modern design history with answer points", () => {
    const prompt = buildExamPrompt({
      schoolName: "江南大学",
      stage: "冲刺",
      topics: ["包豪斯", "乌尔姆设计学院"],
    });

    expect(prompt).toContain("江南大学");
    expect(prompt).toContain("冲刺");
    expect(prompt).toContain("包豪斯");
    expect(prompt).toContain("乌尔姆设计学院");
    expect(prompt).toContain("《世界现代设计史》");
    expect(prompt).toContain("名词解释");
    expect(prompt).toContain("简答");
    expect(prompt).toContain("论述");
    expect(prompt).toContain("答案要点");
  });
});

describe("createMockCritique", () => {
  it("scores matched detected tags as a rounded percentage of school tags", () => {
    const result = createMockCritique({
      schoolName: "同济大学",
      schoolTags: ["系统思维", "交互流程", "版式", "场景表达"],
      detectedTags: ["交互流程", "版式", "线稿"],
      sketchTitle: "校园服务终端",
      scoringRubric: [
        { id: "logic", title: "功能流程与结构逻辑", score: 35, description: "流程完整。" },
        { id: "layout", title: "版面组织与信息表达", score: 30, description: "版式清楚。" },
      ],
    });

    expect(result.score).toBe(75);
    expect(result.totalScore).toBe(150);
    expect(result.criteriaScores).toHaveLength(2);
    expect(result.criteriaScores[0]).toMatchObject({ id: "logic", maxScore: 35 });
    expect(result.strengths.join("")).toContain("交互流程");
    expect(result.issues.join("")).toContain("系统思维");
    expect(result.advice.join("")).toContain("同济大学");
    expect(result.nextTask).toContain("校园服务终端");
  });

  it("returns a full score and positive next task when every school tag is detected", () => {
    const result = createMockCritique({
      schoolName: "广州美术学院",
      schoolTags: ["造型", "色彩"],
      detectedTags: ["色彩", "造型", "材质"],
      scoringRubric: [
        { id: "visual", title: "造型语言与表现技法", score: 35, description: "造型明确。" },
      ],
    });

    expect(result.score).toBe(150);
    expect(result.totalScore).toBe(150);
    expect(result.criteriaScores[0]).toMatchObject({ score: 35, maxScore: 35 });
    expect(result.issues.join("")).toContain("继续");
    expect(result.nextTask).toContain("高分");
  });
});
