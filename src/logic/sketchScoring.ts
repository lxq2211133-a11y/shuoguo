import type { SketchPrompt } from "../data/platformData";

export type SketchPromptValidationIssue = {
  code: "criterion-score-missing" | "rubric-score-mismatch";
  message: string;
};

export function getSketchRubricScore(prompt: SketchPrompt) {
  return prompt.scoring.reduce((total, criterion) => total + criterion.score, 0);
}

export function formatSketchTaskSheet(prompt: SketchPrompt) {
  const bulletList = (items: string[]) => items.map((item) => `- ${item}`).join("\n");
  return [
    `# ${prompt.title}`,
    `硕果原创试练 · ${prompt.duration} · 满分 ${prompt.totalScore} 分`,
    prompt.rubricVersion && `评分表版本 \`${prompt.rubricVersion}\``,
    prompt.brief && `## 设计情境\n\n${prompt.brief.context}`,
    `## 交付要求\n\n${bulletList(prompt.requirements)}`,
    prompt.brief && `## 提交方式\n\n${bulletList(prompt.brief.submission)}`,
    `## 评分表\n\n${prompt.scoring.map((item) => `### ${item.title}（${item.score} 分）\n\n${item.description}`).join("\n\n")}`,
    "评分用于硕果训练反馈。",
  ].filter(Boolean).join("\n\n") + "\n";
}

export function validateSketchPrompt(prompt: SketchPrompt): SketchPromptValidationIssue[] {
  const issues: SketchPromptValidationIssue[] = [];

  for (const criterion of prompt.scoring) {
    if (!Number.isFinite(criterion.score) || criterion.score <= 0) {
      issues.push({
        code: "criterion-score-missing",
        message: `评分项“${criterion.title}”缺少有效分值。`,
      });
    }
  }

  const rubricScore = getSketchRubricScore(prompt);
  if (rubricScore !== prompt.totalScore) {
    issues.push({
      code: "rubric-score-mismatch",
      message: `评分维度合计 ${rubricScore} 分，与快题总分 ${prompt.totalScore} 分不一致。`,
    });
  }

  return issues;
}
