import { describe, expect, it } from "vitest";
import { sketchPrompts, type SketchPrompt } from "../data/platformData";
import { swjtu894Pilot } from "../data/swjtu894";
import swjtu894TaskSheet from "../../docs/product/swjtu-894-task.md?raw";
import { formatSketchTaskSheet, getSketchRubricScore, validateSketchPrompt } from "./sketchScoring";

const validFormalSketchPrompt: SketchPrompt = {
  id: "formal-sketch",
  schoolId: "jiangnan",
  title: "面向青年租住人群的模块化收纳产品设计",
  duration: "3 小时",
  totalScore: 150,
  requirements: ["明确用户痛点", "展示结构与使用流程", "完成效果图、细节图和设计说明"],
  scoring: [
    { id: "insight", title: "问题定义与创意方向", score: 30, description: "痛点真实，概念清晰，方案有差异化。" },
    { id: "logic", title: "功能流程与结构逻辑", score: 35, description: "功能闭环完整，结构关系可信，使用流程明确。" },
    { id: "visual", title: "造型语言与表现技法", score: 35, description: "主效果图清楚，线稿、透视、细节表达稳定。" },
    { id: "layout", title: "版面组织与信息表达", score: 30, description: "图文层级清晰，说明文字有效支撑方案。" },
    { id: "school", title: "院校风格与题目契合", score: 20, description: "贴合目标院校偏好，并回应题目限定。" },
  ],
};

describe("sketch scoring rubric", () => {
  it("keeps the 894 handout aligned with the app's versioned task and rubric", () => {
    const pilot = sketchPrompts.find((prompt) => prompt.schoolId === "swjtu");
    expect(pilot).toBe(swjtu894Pilot);
    expect(pilot?.rubricVersion).toBe("swjtu-894-v1");
    expect(formatSketchTaskSheet(swjtu894Pilot)).toBe(swjtu894TaskSheet.replace(/\r\n/g, "\n"));
  });
  it("accepts a formal 150-point sketch scoring rubric", () => {
    expect(getSketchRubricScore(validFormalSketchPrompt)).toBe(150);
    expect(validateSketchPrompt(validFormalSketchPrompt)).toEqual([]);
  });

  it("keeps every seeded sketch prompt on a 150-point total", () => {
    for (const prompt of sketchPrompts) {
      expect(validateSketchPrompt(prompt)).toEqual([]);
      expect(getSketchRubricScore(prompt)).toBe(150);
      expect(prompt.totalScore).toBe(150);
    }
  });

  it("rejects scoring rubrics that do not add up to the prompt total", () => {
    const brokenPrompt = {
      ...validFormalSketchPrompt,
      scoring: validFormalSketchPrompt.scoring.map((item) =>
        item.id === "school" ? { ...item, score: 10 } : item,
      ),
    };

    expect(validateSketchPrompt(brokenPrompt)).toContainEqual({
      code: "rubric-score-mismatch",
      message: "评分维度合计 140 分，与快题总分 150 分不一致。",
    });
  });

  it("requires each scoring criterion to have a positive score", () => {
    const brokenPrompt = {
      ...validFormalSketchPrompt,
      scoring: validFormalSketchPrompt.scoring.map((item) =>
        item.id === "insight" ? { ...item, score: 0 } : item,
      ),
    };

    expect(validateSketchPrompt(brokenPrompt)).toContainEqual({
      code: "criterion-score-missing",
      message: "评分项“问题定义与创意方向”缺少有效分值。",
    });
  });
});
