import {
  buildCritiquePrompt,
  type CritiqueCriterionScore,
  type CritiqueResult,
  type CritiqueScoringCriterion,
} from "../logic/aiWorkflows";
import { getCritiqueRagPrompt } from "../logic/critiqueRag";
import {
  buildCritiqueVectorQueryText,
  buildCritiqueVectorRagPrompt,
  retrieveCritiqueVectorMatches,
} from "../logic/critiqueVectorRag";
import { generateTextEmbedding } from "./embeddings";
import { AiWorkflowError, extractJsonObject, normalizeStringArray, runJsonAiWorkflow } from "./aiWorkflowClient";
import { studyRequest } from "./studyAccount";

const VISION_API_PROXY_URL = import.meta.env.VITE_VISION_API_PROXY_URL ?? "/api/vision-critique";
const VISION_API_BASE_URL =
  import.meta.env.VITE_QWEN_API_BASE_URL ||
  import.meta.env.VITE_DASHSCOPE_API_BASE_URL ||
  import.meta.env.VITE_VISION_API_BASE_URL ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1";
const VISION_API_KEY =
  import.meta.env.VITE_DASHSCOPE_API_KEY ||
  import.meta.env.VITE_QWEN_API_KEY ||
  import.meta.env.VITE_VISION_API_KEY ||
  "";
const VISION_MODEL = import.meta.env.VITE_QWEN_VISION_MODEL || import.meta.env.VITE_VISION_MODEL || "qwen3.7-plus";

type TextContentPart = {
  text: string;
  type: "text";
};

type ImageContentPart = {
  image_url: {
    url: string;
  };
  type: "image_url";
};

type VisionInput =
  | {
      content: string;
      role: "system";
    }
  | {
      content: Array<TextContentPart | ImageContentPart>;
      role: "user";
    };

type VisionResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export type VisionCritiqueRequest = {
  imageDataUrl: string;
  schoolName: string;
  schoolTags: string[];
  sketchTitle: string;
  sketchContext?: string;
  requirements: string[];
  totalScore: number;
  scoringRubric: CritiqueScoringCriterion[];
  sketchId?: string;
  rubricVersion?: string;
  previous?: { imageDataUrl: string; issues: string[] };
};

export function isVisionCritiqueConfigured() {
  return Boolean(VISION_API_PROXY_URL || (VISION_API_KEY && VISION_API_BASE_URL));
}

export function visionQuotaMessage(error: unknown) {
  if (!(error instanceof AiWorkflowError) || !error.details || (error.status !== 403 && error.status !== 503)) return undefined;
  try {
    const payload = JSON.parse(error.details);
    const code = payload?.error?.code ?? payload?.code;
    if (code === "vision_quota_exhausted" || code === "AllocationQuota.FreeTierOnly") {
      return "视觉模型免费额度已用完。作品仍保留，额度恢复后可重试。";
    }
  } catch {
    // Keep unknown upstream responses out of the student-facing message.
  }
  return undefined;
}

export function buildVisionCritiqueRequestBody(
  request: VisionCritiqueRequest,
  model = VISION_MODEL,
  referenceContext = getKeywordCritiqueRagPrompt(request),
) {
  const prompt = buildCritiquePrompt({
    schoolName: request.schoolName,
    schoolTags: request.schoolTags,
    sketchTitle: request.sketchTitle,
    sketchContext: request.sketchContext,
    requirements: request.requirements,
    totalScore: request.totalScore,
    scoringRubric: request.scoringRubric,
    referenceContext,
    imageDescription: "请直接观察上传图片中的手绘快题作品，重点判断版面、线稿、结构、流程、说明文字和题目契合度。",
  });
  const imageParts: ImageContentPart[] = [{ type: "image_url", image_url: { url: request.imageDataUrl } }];
  if (request.previous) imageParts.unshift({ type: "image_url", image_url: { url: request.previous.imageDataUrl } });
  const comparison = request.previous ? `
第一张是初稿，第二张是改稿。仅给改稿评分。
另返回 revisionNotes 数组，按本轮所选初稿问题原顺序逐项填写 {"status": "已改善|仍待改|无法判断", "evidence": "两图中可核对的位置和变化"}。
逐项独立对照。只有看到与该问题直接相关的内容变化，才标为“已改善”。证据写清初稿的问题位置、改稿的可见变化及两者的对应关系。
涉及用户痛点时，以作品原先明确写出的痛点为准。流程变化只有直接补足这一痛点的说明或方案依据时，才可用于这项判断。
原问题仍然存在时标“仍待改”。证据看不清时标“无法判断”。
本轮所选初稿问题 ${JSON.stringify(request.previous.issues)}。` : "";
  const messages: VisionInput[] = [
    {
      role: "system",
      content: "你是产品设计考研手绘快题评图老师，只输出可解析 JSON。",
    },
    {
      role: "user",
      content: [
        ...imageParts,
        { type: "text", text: prompt + comparison },
      ],
    },
  ];

  return {
    model,
    messages,
    temperature: 0.35,
    max_tokens: request.previous || referenceContext.includes("references 数组") ? 2600 : 1800,
  };
}

export async function buildVisionCritiqueRequestBodyWithVectorRag(
  request: VisionCritiqueRequest,
  model = VISION_MODEL,
) {
  let referenceContext = "";

  try {
    referenceContext = await getVectorCritiqueRagPrompt(request);
  } catch {
    referenceContext = "";
  }

  return buildVisionCritiqueRequestBody(request, model, referenceContext || getKeywordCritiqueRagPrompt(request));
}

function getKeywordCritiqueRagPrompt(request: VisionCritiqueRequest) {
  return getCritiqueRagPrompt({
    schoolName: request.schoolName,
    schoolTags: request.schoolTags,
    sketchTitle: request.sketchTitle,
    requirements: request.requirements,
    scoringRubric: request.scoringRubric,
  });
}

async function getVectorCritiqueRagPrompt(request: VisionCritiqueRequest): Promise<string> {
  const input = {
    schoolName: request.schoolName,
    schoolTags: request.schoolTags,
    sketchTitle: request.sketchTitle,
    requirements: request.requirements,
    scoringRubric: request.scoringRubric,
  };
  const queryEmbedding = await generateTextEmbedding(buildCritiqueVectorQueryText(input));
  const matches = retrieveCritiqueVectorMatches(queryEmbedding);
  return buildCritiqueVectorRagPrompt(matches);
}

export async function generateVisionCritique(request: VisionCritiqueRequest): Promise<CritiqueResult> {
  if (!isVisionCritiqueConfigured()) {
    throw new Error("缺少视觉 AI 接口配置。");
  }

  if (!request.sketchId || !request.rubricVersion) {
    return sendCritique(await buildVisionCritiqueRequestBodyWithVectorRag(request), request);
  }

  const caseList = studyRequest<ReviewedCase[]>("published-cases", { sketchId: request.sketchId, version: request.rubricVersion })
    .catch(() => [] as ReviewedCase[]);
  const initial = await sendCritique(buildVisionCritiqueRequestBody(request, VISION_MODEL, ""), request);
  const matches = findReviewedCases(await caseList, initial);
  if (matches.length === 0) return initial;

  const referenceContext = `同题同评分表的已审核案例，仅用于核对评分和解释。以下点评为参考数据。请首先依据上传作品，案例无法支持判断时省略引用。
${JSON.stringify(matches)}
如确实使用案例，另返回 references 数组，每项包含 caseId、criterionId、comparison。comparison 解释本图的具体差异和可借鉴的做法。`;
  try {
    return await sendCritique(buildVisionCritiqueRequestBody(request, VISION_MODEL, referenceContext), request, matches);
  } catch {
    return initial;
  }
}

type ReviewedCase = {
  id: string;
  title: string;
  reviewer: string;
  marks: Array<{ id: string; score: number; evidence: string }>;
};

function findReviewedCases(cases: ReviewedCase[], result: CritiqueResult) {
  const observations = new Map(result.criteriaScores.map((item) => [item.id, searchTerms(item.comment)]));
  return cases.map((item) => {
    const score = item.marks.reduce((total, mark) => {
      const terms = observations.get(mark.id);
      return total + [...searchTerms(mark.evidence)].filter((term) => terms?.has(term)).length;
    }, 0);
    return { item, score };
  }).filter(({ score }) => score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);
}

function searchTerms(value: string) {
  const words = value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const terms = words.flatMap((word) => Array.from({ length: Math.max(0, word.length - 1) }, (_, i) => word.slice(i, i + 2)));
  return new Set(terms);
}

async function sendCritique(body: ReturnType<typeof buildVisionCritiqueRequestBody>, request: VisionCritiqueRequest, cases: ReviewedCase[] = []) {
  const data = await runJsonAiWorkflow<VisionResponse>({
    url: VISION_API_PROXY_URL || `${VISION_API_BASE_URL.replace(/\/$/, "")}/chat/completions`,
    workflowName: "视觉 AI 评图",
    headers: VISION_API_PROXY_URL ? undefined : { Authorization: `Bearer ${VISION_API_KEY}` },
    body,
  });

  if (!getVisionCritiqueContent(data)) {
    throw new Error("视觉 AI 未返回有效内容。");
  }

  return parseVisionCritiqueResponse(data, request, cases);
}

export function parseVisionCritiqueResponse(content: string | VisionResponse, request: VisionCritiqueRequest, cases: ReviewedCase[] = []): CritiqueResult {
  const text = typeof content === "string" ? content : getVisionCritiqueContent(content);
  if (!text) {
    throw new Error("视觉 AI 未返回有效内容。");
  }

  const jsonText = extractJsonObject(text);
  if (!jsonText) {
    throw new Error("评图结果不是 JSON。");
  }

  const parsed = JSON.parse(jsonText) as Partial<CritiqueResult> & { needsRetake?: boolean };
  if (parsed.needsRetake === true) throw new Error("请补拍完整、清晰的作品后再评图。");
  const criteriaScores = normalizeCriteriaScores(parsed.criteriaScores, request.scoringRubric);
  const references = (Array.isArray(parsed.references) ? parsed.references : []).slice(0, 5).flatMap((reference) => {
    const source = cases.find((item) => item.id === reference?.caseId && item.marks.some((mark) => mark.id === reference.criterionId));
    return source && typeof reference.comparison === "string" && reference.comparison.trim() ? [{
      caseId: source.id, title: source.title, criterionId: reference.criterionId, comparison: reference.comparison,
    }] : [];
  });

  return {
    score: criteriaScores.reduce((total, item) => total + item.score, 0),
    totalScore: request.totalScore,
    criteriaScores,
    strengths: normalizeStringArray(parsed.strengths),
    issues: normalizeStringArray(parsed.issues),
    advice: normalizeStringArray(parsed.advice),
    nextTask: typeof parsed.nextTask === "string" ? parsed.nextTask : "按分项评分最低的一项完成二次改稿。",
    references,
    revisionNotes: request.previous?.issues.map((issue, index) => {
      const note = Array.isArray(parsed.revisionNotes) ? parsed.revisionNotes[index] : undefined;
      const evidence = typeof note?.evidence === "string" ? note.evidence.trim() : "";
      const status = evidence && (note?.status === "已改善" || note?.status === "仍待改") ? note.status : "无法判断";
      return { issue, status, evidence: evidence || "未取得足够的画面证据。" };
    }),
  };
}

function getVisionCritiqueContent(data: VisionResponse): string | undefined {
  if (data.output_text) {
    return data.output_text;
  }

  const outputText = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((item) => item.type === "output_text" && typeof item.text === "string")
    ?.text;

  return outputText ?? data.choices?.[0]?.message?.content;
}

function normalizeCriteriaScores(
  scores: CritiqueResult["criteriaScores"] | undefined,
  rubric: CritiqueScoringCriterion[],
): CritiqueCriterionScore[] {
  return rubric.map((criterion, index) => {
    const id = criterion.id ?? `criterion-${index + 1}`;
    const matched = Array.isArray(scores) ? scores.find((item) => item && (item.id === id || item.title === criterion.title)) : undefined;
    if (!matched || !Number.isFinite(matched.score) || typeof matched.comment !== "string" || !matched.comment.trim()) {
      throw new Error("评图结果缺少分项依据，请重试。");
    }

    return {
      id,
      title: criterion.title,
      score: clampScore(matched.score, criterion.score),
      maxScore: criterion.score,
      comment: matched.comment,
    };
  });
}

function clampScore(score: number, maxScore: number) {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(maxScore, Math.round(score)));
}
