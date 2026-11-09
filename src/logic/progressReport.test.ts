import { describe, expect, it } from "vitest";
import { buildProgressReport, getRiskLevel } from "./progressReport";

describe("buildProgressReport", () => {
  it("calculates mastery, sketch completion, and review pressure", () => {
    const report = buildProgressReport({
      totalTheoryTopics: 20,
      masteredTheoryTopics: 12,
      totalSketchPrompts: 10,
      completedSketchPrompts: 4,
      memoryDueCount: 8,
      mockPaperScores: [72, 80, 88],
    });

    expect(report.theoryMastery).toBe(60);
    expect(report.sketchCompletion).toBe(40);
    expect(report.averagePaperScore).toBe(80);
    expect(report.reviewPressure).toBe("偏高");
    expect(report.weakestArea).toBe("手绘快题");
  });

  it("handles empty scores and zero totals without NaN", () => {
    const report = buildProgressReport({
      totalTheoryTopics: 0,
      masteredTheoryTopics: 0,
      totalSketchPrompts: 0,
      completedSketchPrompts: 0,
      memoryDueCount: 0,
      mockPaperScores: [],
    });

    expect(report.theoryMastery).toBe(0);
    expect(report.sketchCompletion).toBe(0);
    expect(report.averagePaperScore).toBe(0);
    expect(report.reviewPressure).toBe("正常");
    expect(report.nextAction).toContain("先完成");
  });
});

describe("getRiskLevel", () => {
  it("maps low progress to high risk", () => {
    expect(getRiskLevel(35)).toBe("高风险");
    expect(getRiskLevel(64)).toBe("需关注");
    expect(getRiskLevel(85)).toBe("稳定");
  });
});
