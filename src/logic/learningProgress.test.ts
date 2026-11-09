import { describe, expect, it } from "vitest";
import { makeReviewRecord, reviewKey, reviewSummary } from "./learningProgress";

describe("learning progress", () => {
  it("schedules review from the learner's rating", () => {
    const reviewedAt = new Date("2026-11-05T04:00:00.000Z");
    expect(makeReviewRecord("不会", reviewedAt).nextReviewAt).toBe("2026-11-06T04:00:00.000Z");
    expect(makeReviewRecord("模糊", reviewedAt).nextReviewAt).toBe("2026-11-08T04:00:00.000Z");
    expect(makeReviewRecord("熟悉", reviewedAt).nextReviewAt).toBe("2026-11-12T04:00:00.000Z");
  });

  it("keeps each school's progress separate and counts only due cards", () => {
    const records = {
      [reviewKey("jiangnan", "m1")]: makeReviewRecord("熟悉", new Date("2026-11-01T04:00:00.000Z")),
      [reviewKey("swjtu", "m1")]: makeReviewRecord("不会", new Date("2026-11-01T04:00:00.000Z")),
    };
    expect(reviewSummary(records, "jiangnan", ["m1", "m2"], new Date("2026-11-05T04:00:00.000Z"))).toEqual({
      reviewed: 1, familiar: 1, due: 0, total: 2,
    });
    expect(reviewSummary(records, "swjtu", ["m1", "m2"], new Date("2026-11-05T04:00:00.000Z"))).toEqual({
      reviewed: 1, familiar: 0, due: 1, total: 2,
    });
  });
});
