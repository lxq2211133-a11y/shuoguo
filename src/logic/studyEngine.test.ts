import { describe, expect, it } from "vitest";
import { calculateNextReview, generateDailyPlan, scoreCritiqueMatch } from "./studyEngine";

describe("calculateNextReview", () => {
  it.each([
    ["熟悉", "2026-05-08T08:00:00.000Z"],
    ["模糊", "2026-05-04T08:00:00.000Z"],
    ["不会", "2026-05-02T08:00:00.000Z"],
  ] as const)("schedules %s reviews from the reviewed time", (status, expected) => {
    expect(calculateNextReview(status, "2026-05-01T08:00:00.000Z")).toBe(expected);
  });
});

describe("generateDailyPlan", () => {
  it("creates three Chinese study blocks from the provided workload", () => {
    expect(
      generateDailyPlan({
        theoryMinutes: 45,
        sketchMinutes: 60,
        memoryCount: 20,
      }),
    ).toEqual([
      "理论学习 45 分钟：阅读并整理核心考点",
      "手绘训练 60 分钟：完成快题单体线稿练习",
      "记忆复盘 20 个：背诵并自测院校真题关键词",
    ]);
  });
});

describe("scoreCritiqueMatch", () => {
  it("scores the percentage of school tags found in detected tags", () => {
    expect(scoreCritiqueMatch(["结构", "色彩", "版式", "创意"], ["色彩", "版式"])).toBe(50);
  });

  it("returns full score when every school tag is detected", () => {
    expect(scoreCritiqueMatch(["空间", "材料"], ["材料", "空间", "光影"])).toBe(100);
  });
});
