import vectorData from "../data/critiqueCaseVectors.json";
import type { CritiqueScoringCriterion } from "./aiWorkflows";
import type { CritiqueRagInput } from "./critiqueRag";

export type CritiqueVectorCaseQuality = "excellent" | "good" | "problem";

export type CritiqueVectorCase = {
  id: string;
  imageUrl: string;
  title: string;
  schoolName: string;
  sketchTitle: string;
  quality: CritiqueVectorCaseQuality;
  tags: string[];
  expertReview: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
  embeddingText: string;
  embedding: number[];
};

export type CritiqueVectorMatch = {
  case: CritiqueVectorCase;
  similarity: number;
};

export type CritiqueVectorRagOptions = {
  maxMatches?: number;
  minSimilarity?: number;
};

const DEFAULT_MAX_MATCHES = 5;
const DEFAULT_MIN_SIMILARITY = 0.2;

const critiqueVectorCases = vectorData.items as CritiqueVectorCase[];

export function buildCritiqueVectorQueryText(input: CritiqueRagInput): string {
  return [
    `目标院校：${input.schoolName}`,
    `院校关键词：${joinList(input.schoolTags)}`,
    `当前题目：${input.sketchTitle}`,
    `设计要求：${joinList(input.requirements)}`,
    `评分维度：${formatRubric(input.scoringRubric)}`,
    "检索目标：寻找构图、版面、产品类型、表现技法、使用流程、结构表达和常见失分问题相似的产品手绘快题案例。",
  ].join("\n");
}

export function retrieveCritiqueVectorMatches(
  queryEmbedding: number[],
  cases: CritiqueVectorCase[] = critiqueVectorCases,
  options: CritiqueVectorRagOptions = {},
): CritiqueVectorMatch[] {
  const maxMatches = options.maxMatches ?? DEFAULT_MAX_MATCHES;
  const minSimilarity = options.minSimilarity ?? DEFAULT_MIN_SIMILARITY;

  if (queryEmbedding.length === 0) {
    return [];
  }

  return cases
    .map((critiqueCase) => ({
      case: critiqueCase,
      similarity: cosineSimilarity(queryEmbedding, critiqueCase.embedding),
    }))
    .filter((match) => match.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxMatches);
}

export function buildCritiqueVectorRagPrompt(matches: CritiqueVectorMatch[]): string {
  if (matches.length === 0) {
    return "";
  }

  return `专业评图向量 RAG 参考：
${matches.map(formatVectorMatch).join("\n")}

使用要求：
- 这些案例由向量相似度召回，用于校准评分尺度、版面诊断和改稿建议。
- 本地例图路径只用于说明案例来源，视觉模型无法直接读取本地参考图，请主要参考专家点评、标签和问题归纳。
- 如果上传作品与参考案例冲突，以上传图片中的真实内容为准。
- 不要照抄案例文字，要转化为针对当前作品的判断。`;
}

export function getCritiqueVectorCases() {
  return critiqueVectorCases;
}

export function cosineSimilarity(a: number[], b: number[]) {
  const length = Math.min(a.length, b.length);
  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < length; index++) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function formatVectorMatch(match: CritiqueVectorMatch) {
  const critiqueCase = match.case;
  const similarity = Math.round(match.similarity * 1000) / 1000;

  return `- ${critiqueCase.title}（相似度 ${similarity}，${qualityText(critiqueCase.quality)}，路径 ${critiqueCase.imageUrl}）。标签：${critiqueCase.tags.join("、")}。专家判断：${critiqueCase.expertReview} 可借鉴：${critiqueCase.strengths.join("；")}。常见风险：${critiqueCase.issues.join("；")}。改进动作：${critiqueCase.suggestions.join("；")}。`;
}

function formatRubric(rubric: CritiqueScoringCriterion[]) {
  return rubric.map((criterion) => `${criterion.title}${criterion.score}分：${criterion.description}`).join("；");
}

function joinList(items: string[]) {
  return items.length > 0 ? items.join("、") : "未提供";
}

function qualityText(quality: CritiqueVectorCaseQuality) {
  switch (quality) {
    case "excellent":
      return "高分参考";
    case "good":
      return "可参考";
    case "problem":
      return "失分案例";
  }
}
