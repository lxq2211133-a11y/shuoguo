export type ReviewStatus = "熟悉" | "模糊" | "不会";

export type DailyPlanInput = {
  theoryMinutes: number;
  sketchMinutes: number;
  memoryCount: number;
};

const reviewIntervalsByStatus: Record<ReviewStatus, number> = {
  熟悉: 7,
  模糊: 3,
  不会: 1,
};

export function calculateNextReview(status: ReviewStatus, reviewedAt: string): string {
  const reviewedDate = new Date(reviewedAt);
  reviewedDate.setUTCDate(reviewedDate.getUTCDate() + reviewIntervalsByStatus[status]);
  return reviewedDate.toISOString();
}

export function generateDailyPlan(input: DailyPlanInput): string[] {
  return [
    `理论学习 ${input.theoryMinutes} 分钟：阅读并整理核心考点`,
    `手绘训练 ${input.sketchMinutes} 分钟：完成快题单体线稿练习`,
    `记忆复盘 ${input.memoryCount} 个：背诵并自测院校真题关键词`,
  ];
}

export function scoreCritiqueMatch(schoolTags: string[], detectedTags: string[]): number {
  if (schoolTags.length === 0) {
    return 0;
  }

  const detectedTagSet = new Set(detectedTags);
  const matchedCount = schoolTags.filter((tag) => detectedTagSet.has(tag)).length;

  return Math.round((matchedCount / schoolTags.length) * 100);
}
