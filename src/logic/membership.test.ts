import { describe, expect, it } from "vitest";
import { canUseFeature, getFeatureLimit, getPlanSummary, membershipPlans } from "./membership";

describe("membership entitlement rules", () => {
  it("allows free users to try limited core features", () => {
    expect(canUseFeature("free", "school-library")).toBe(true);
    expect(canUseFeature("free", "ai-critique")).toBe(true);
    expect(getFeatureLimit("free", "ai-critique")).toBe(1);
    expect(getFeatureLimit("free", "exam-generation")).toBe(1);
  });

  it("unlocks repeated study workflows for monthly members", () => {
    expect(canUseFeature("monthly", "spaced-repetition")).toBe(true);
    expect(canUseFeature("monthly", "admin-intake")).toBe(false);
    expect(getFeatureLimit("monthly", "ai-critique")).toBe(20);
    expect(getFeatureLimit("monthly", "sketch-prompts")).toBe(30);
  });

  it("unlocks higher limits and admin intake for pro members", () => {
    expect(canUseFeature("pro", "admin-intake")).toBe(true);
    expect(getFeatureLimit("pro", "ai-critique")).toBe(80);
    expect(getFeatureLimit("pro", "exam-generation")).toBe(120);
  });

  it("summarizes each plan with upgrade copy", () => {
    expect(membershipPlans).toHaveLength(3);
    expect(getPlanSummary("free").cta).toContain("体验");
    expect(getPlanSummary("monthly").headline).toContain("月度");
    expect(getPlanSummary("pro").headline).toContain("冲刺");
  });
});
