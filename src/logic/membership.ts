export type PlanId = "free" | "monthly" | "pro";

export type FeatureId =
  | "school-library"
  | "theory-topics"
  | "exam-generation"
  | "spaced-repetition"
  | "sketch-prompts"
  | "ai-critique"
  | "study-report"
  | "admin-intake";

export type MembershipPlan = {
  id: PlanId;
  headline: string;
  priceLabel: string;
  cta: string;
  featureLimits: Partial<Record<FeatureId, number>>;
};

export const membershipPlans: MembershipPlan[] = [
  {
    id: "free",
    headline: "免费体验版",
    priceLabel: "¥0",
    cta: "立即体验核心流程",
    featureLimits: {
      "school-library": 4,
      "theory-topics": 6,
      "exam-generation": 1,
      "spaced-repetition": 1,
      "sketch-prompts": 2,
      "ai-critique": 1,
    },
  },
  {
    id: "monthly",
    headline: "月度会员",
    priceLabel: "按月订阅",
    cta: "解锁每日训练闭环",
    featureLimits: {
      "school-library": Number.POSITIVE_INFINITY,
      "theory-topics": Number.POSITIVE_INFINITY,
      "exam-generation": 30,
      "spaced-repetition": Number.POSITIVE_INFINITY,
      "sketch-prompts": 30,
      "ai-critique": 20,
      "study-report": Number.POSITIVE_INFINITY,
    },
  },
  {
    id: "pro",
    headline: "冲刺 Pro 会员",
    priceLabel: "冲刺季订阅",
    cta: "开启院校冲刺模式",
    featureLimits: {
      "school-library": Number.POSITIVE_INFINITY,
      "theory-topics": Number.POSITIVE_INFINITY,
      "exam-generation": 120,
      "spaced-repetition": Number.POSITIVE_INFINITY,
      "sketch-prompts": 120,
      "ai-critique": 80,
      "study-report": Number.POSITIVE_INFINITY,
      "admin-intake": Number.POSITIVE_INFINITY,
    },
  },
];

export function getPlanSummary(planId: PlanId): MembershipPlan {
  return membershipPlans.find((plan) => plan.id === planId) ?? membershipPlans[0];
}

export function canUseFeature(planId: PlanId, featureId: FeatureId): boolean {
  return getFeatureLimit(planId, featureId) > 0;
}

export function getFeatureLimit(planId: PlanId, featureId: FeatureId): number {
  const plan = getPlanSummary(planId);
  return plan.featureLimits[featureId] ?? 0;
}

export function formatLimit(limit: number): string {
  return Number.isFinite(limit) ? `${limit} 次` : "不限次数";
}
