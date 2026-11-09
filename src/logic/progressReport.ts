export type ProgressReportInput = {
  totalTheoryTopics: number;
  masteredTheoryTopics: number;
  totalSketchPrompts: number;
  completedSketchPrompts: number;
  memoryDueCount: number;
  mockPaperScores: number[];
};

export type ProgressReport = {
  theoryMastery: number;
  sketchCompletion: number;
  averagePaperScore: number;
  reviewPressure: "正常" | "偏高";
  weakestArea: "理论掌握" | "手绘快题" | "模拟卷" | "整体稳定";
  riskLevel: "高风险" | "需关注" | "稳定";
  nextAction: string;
};

export function buildProgressReport(input: ProgressReportInput): ProgressReport {
  const theoryMastery = percent(input.masteredTheoryTopics, input.totalTheoryTopics);
  const sketchCompletion = percent(input.completedSketchPrompts, input.totalSketchPrompts);
  const averagePaperScore = average(input.mockPaperScores);
  const reviewPressure = input.memoryDueCount >= 6 ? "偏高" : "正常";
  const weakestArea = getWeakestArea(theoryMastery, sketchCompletion, averagePaperScore);
  const blendedScore = Math.round((theoryMastery + sketchCompletion + averagePaperScore) / 3);

  return {
    theoryMastery,
    sketchCompletion,
    averagePaperScore,
    reviewPressure,
    weakestArea,
    riskLevel: getRiskLevel(blendedScore),
    nextAction: getNextAction(weakestArea, input.memoryDueCount),
  };
}

export function getRiskLevel(score: number): ProgressReport["riskLevel"] {
  if (score < 50) {
    return "高风险";
  }
  if (score < 75) {
    return "需关注";
  }
  return "稳定";
}

function percent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function average(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getWeakestArea(
  theoryMastery: number,
  sketchCompletion: number,
  averagePaperScore: number,
): ProgressReport["weakestArea"] {
  const areas = [
    { label: "理论掌握" as const, score: theoryMastery },
    { label: "手绘快题" as const, score: sketchCompletion },
    { label: "模拟卷" as const, score: averagePaperScore },
  ];
  const weakest = areas.sort((a, b) => a.score - b.score)[0];

  return weakest.score >= 75 ? "整体稳定" : weakest.label;
}

function getNextAction(weakestArea: ProgressReport["weakestArea"], memoryDueCount: number): string {
  if (memoryDueCount === 0 && weakestArea !== "整体稳定") {
    return `先完成${weakestArea}的基础任务，再进入冲刺训练。`;
  }

  if (memoryDueCount >= 6) {
    return "先清理今日带背回炉队列，再追加一套院校模拟卷。";
  }

  if (weakestArea === "整体稳定") {
    return "保持每日带背节奏，并用高强度快题周练拉开差距。";
  }

  return `优先补强${weakestArea}，今天只保留一项主训练任务。`;
}
