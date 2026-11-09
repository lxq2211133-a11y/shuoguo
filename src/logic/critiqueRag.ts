import { critiqueCaseLibrary, type CritiqueCase, type CritiqueCaseQuality } from "../data/critiqueCaseLibrary";
import type { CritiqueScoringCriterion } from "./aiWorkflows";

export type CritiqueRagInput = {
  schoolName: string;
  schoolTags: string[];
  sketchTitle: string;
  requirements: string[];
  scoringRubric: CritiqueScoringCriterion[];
};

export type CritiqueRagOptions = {
  issueCaseCount?: number;
  referenceCaseCount?: number;
};

export type CritiqueRagMatch = {
  case: CritiqueCase;
  matchedSignals: string[];
  score: number;
};

export type CritiqueRagContext = {
  issueCases: CritiqueRagMatch[];
  referenceCases: CritiqueRagMatch[];
};

const DEFAULT_REFERENCE_CASE_COUNT = 3;
const DEFAULT_ISSUE_CASE_COUNT = 2;
const MIN_MATCH_SCORE = 3;

export function retrieveCritiqueRagContext(
  input: CritiqueRagInput,
  library: CritiqueCase[] = critiqueCaseLibrary,
  options: CritiqueRagOptions = {},
): CritiqueRagContext {
  const matches = library
    .map((critiqueCase) => scoreCritiqueCase(input, critiqueCase))
    .filter((match) => match.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score || qualityRank(b.case.quality) - qualityRank(a.case.quality));

  const referenceCases = matches
    .filter((match) => match.case.quality !== "problem")
    .slice(0, options.referenceCaseCount ?? DEFAULT_REFERENCE_CASE_COUNT);
  const issueCases = matches
    .filter((match) => match.case.quality === "problem")
    .slice(0, options.issueCaseCount ?? DEFAULT_ISSUE_CASE_COUNT);

  return { referenceCases, issueCases };
}

export function buildCritiqueRagPrompt(context: CritiqueRagContext): string {
  const sections = [
    formatCaseSection("优秀参考案例", context.referenceCases),
    formatCaseSection("相似失分案例", context.issueCases),
  ].filter(Boolean);

  if (sections.length === 0) {
    return "";
  }

  return `专业评图 RAG 参考：
${sections.join("\n\n")}

使用要求：
- 参考案例只用于校准评分尺度和问题诊断，不要照抄案例表述。
- 如果上传作品与参考案例冲突，以上传图片中的真实内容为准。
- 评分必须仍按当前题目和评分标准执行。`;
}

export function getCritiqueRagPrompt(input: CritiqueRagInput, options?: CritiqueRagOptions): string {
  return buildCritiqueRagPrompt(retrieveCritiqueRagContext(input, critiqueCaseLibrary, options));
}

function scoreCritiqueCase(input: CritiqueRagInput, critiqueCase: CritiqueCase): CritiqueRagMatch {
  const queryText = normalizeText([
    input.schoolName,
    input.sketchTitle,
    ...input.schoolTags,
    ...input.requirements,
    ...input.scoringRubric.flatMap((criterion) => [criterion.id ?? "", criterion.title, criterion.description]),
  ]);
  const caseText = normalizeText([
    critiqueCase.schoolName,
    critiqueCase.sketchTitle,
    critiqueCase.title,
    critiqueCase.expertReview,
    ...critiqueCase.tags,
    ...critiqueCase.strengths,
    ...critiqueCase.issues,
    ...critiqueCase.suggestions,
  ]);
  const matchedSignals: string[] = [];
  let score = 0;

  if (critiqueCase.schoolName === input.schoolName) {
    score += 8;
    matchedSignals.push(`院校：${critiqueCase.schoolName}`);
  }

  if (critiqueCase.sketchTitle === input.sketchTitle) {
    score += 6;
    matchedSignals.push("同题案例");
  }

  for (const tag of input.schoolTags) {
    if (includesSignal(caseText, tag)) {
      score += 3;
      matchedSignals.push(tag);
    }
  }

  for (const requirement of input.requirements) {
    const tokens = tokenizeSignal(requirement);
    const tokenMatches = tokens.filter((token) => caseText.includes(token)).length;

    if (tokenMatches > 0) {
      score += Math.min(4, tokenMatches);
      matchedSignals.push(requirement);
    }
  }

  for (const tag of critiqueCase.tags) {
    if (includesSignal(queryText, tag)) {
      score += 2;
      matchedSignals.push(tag);
    }
  }

  return {
    case: critiqueCase,
    matchedSignals: [...new Set(matchedSignals)].slice(0, 6),
    score,
  };
}

function formatCaseSection(title: string, matches: CritiqueRagMatch[]) {
  if (matches.length === 0) {
    return "";
  }

  return `${title}：
${matches.map(formatCase).join("\n")}`;
}

function formatCase(match: CritiqueRagMatch) {
  const critiqueCase = match.case;
  const scoreText = `洞察${critiqueCase.scores.insight}/30、逻辑${critiqueCase.scores.logic}/35、表现${critiqueCase.scores.visual}/35、版面${critiqueCase.scores.layout}/30、契合${critiqueCase.scores.school}/20`;
  const signals = match.matchedSignals.length > 0 ? `匹配信号：${match.matchedSignals.join("、")}。` : "";

  return `- ${critiqueCase.title}（${qualityText(critiqueCase.quality)}，${scoreText}）。${signals}专家判断：${critiqueCase.expertReview} 可借鉴：${critiqueCase.strengths.join("；")}。常见风险：${critiqueCase.issues.join("；")}。改进动作：${critiqueCase.suggestions.join("；")}。`;
}

function includesSignal(text: string, signal: string) {
  const normalizedSignal = normalizeText([signal]);
  return Boolean(normalizedSignal) && text.includes(normalizedSignal);
}

function normalizeText(parts: string[]) {
  return parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenizeSignal(signal: string) {
  return normalizeText([signal])
    .split(/[^\p{Script=Han}a-z0-9]+/u)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function qualityRank(quality: CritiqueCaseQuality) {
  switch (quality) {
    case "excellent":
      return 3;
    case "good":
      return 2;
    case "problem":
      return 1;
  }
}

function qualityText(quality: CritiqueCaseQuality) {
  switch (quality) {
    case "excellent":
      return "高分参考";
    case "good":
      return "可参考";
    case "problem":
      return "失分案例";
  }
}
