export type CritiquePromptInput = {
  schoolName: string;
  schoolTags: string[];
  sketchTitle: string;
  sketchContext?: string;
  requirements: string[];
  totalScore?: number;
  scoringRubric?: CritiqueScoringCriterion[];
  referenceContext?: string;
  imageDescription: string;
};

export type CritiqueScoringCriterion = {
  id?: string;
  title: string;
  score: number;
  description: string;
};

export type ExamPromptInput = {
  schoolName: string;
  stage: string;
  topics: string[];
};

export type MockCritiqueInput = {
  schoolName: string;
  schoolTags: string[];
  detectedTags: string[];
  sketchTitle?: string;
  totalScore?: number;
  scoringRubric?: CritiqueScoringCriterion[];
};

export type CritiqueResult = {
  score: number;
  totalScore: number;
  criteriaScores: CritiqueCriterionScore[];
  strengths: string[];
  issues: string[];
  advice: string[];
  nextTask: string;
  revisionNotes?: Array<{ issue: string; status: "已改善" | "仍待改" | "无法判断"; evidence: string }>;
  references?: Array<{ caseId: string; title: string; criterionId: string; comparison: string }>;
};

export type CritiqueCriterionScore = {
  id: string;
  title: string;
  score: number;
  maxScore: number;
  comment: string;
};

export function buildCritiquePrompt(input: CritiquePromptInput): string {
  const totalScore = input.totalScore ?? 150;
  const rubric = formatRubric(input.scoringRubric);

  return `你是设计考研产品手绘快题评图老师，请根据题面和评分表给出可执行反馈。院校关键词供训练参考。
目标院校：${input.schoolName}
院校关键词：${formatList(input.schoolTags)}
题目：${input.sketchTitle}${input.sketchContext ? `\n设计情境 ${input.sketchContext}` : ""}
设计要求：${formatList(input.requirements)}
评分标准：满分 ${totalScore} 分
${rubric}
${formatReferenceContext(input.referenceContext)}
作品描述：${input.imageDescription}

请只返回 JSON，不要输出 Markdown、解释或多余文本。JSON 字段必须包含：
{
  "score": number,
  "totalScore": number,
  "criteriaScores": [{"id": string, "title": string, "score": number, "maxScore": number, "comment": string}],
  "strengths": string[],
  "issues": string[],
  "advice": string[],
  "nextTask": string
}

评分时重点判断题目要求、产品逻辑与表达完整度。每项 comment 写出作品上可核对的位置、观察到的事实及对评分的影响。关键区域模糊或超出画面时，返回 {"needsRetake": true}，便于提示补拍。`;
}

export function buildExamPrompt(input: ExamPromptInput): string {
  return `请为${input.schoolName}${input.stage}阶段生成一套产品设计考研理论模拟试卷。
范围必须围绕《世界现代设计史》。重点主题：${formatList(input.topics)}

试卷结构必须包含：
1. 名词解释
2. 简答
3. 论述
4. 每道题后的答案要点

要求题目贴近目标院校命题风格，答案要点使用中文分点列出，便于背诵和自测。`;
}

export function createMockCritique(input: MockCritiqueInput): CritiqueResult {
  const totalScore = input.totalScore ?? 150;
  const matchedTags = getMatchedTags(input.schoolTags, input.detectedTags);
  const missingTags = input.schoolTags.filter((tag) => !matchedTags.includes(tag));
  const matchedRatio = getMatchedRatio(input.schoolTags, input.detectedTags);
  const score = Math.round(matchedRatio * totalScore);
  const criteriaScores = buildMockCriteriaScores(input.scoringRubric, matchedRatio);
  const workTitle = input.sketchTitle || "当前作品";

  if (score === totalScore) {
    return {
      score,
      totalScore,
      criteriaScores,
      strengths: [
        `作品已经覆盖${input.schoolName}关注的${formatList(matchedTags)}，院校适配度很高。`,
        "主题表达完整，能够支撑进一步打磨表现细节。",
      ],
      issues: ["整体方向成立，继续提升线稿精度、信息层级和最终版面完成度。"],
      advice: [
        `按${input.schoolName}高分卷标准补强细节标注、使用流程和设计说明。`,
        "保留当前核心方案，下一轮重点压缩表达噪音并强化主视觉。",
      ],
      nextTask: `将${workTitle}整理为高分完整稿，并补一版 80 字设计说明。`,
    };
  }

  return {
    score,
    totalScore,
    criteriaScores,
    strengths:
      matchedTags.length > 0
        ? [`已体现${formatList(matchedTags)}，说明作品具备一定的院校风格基础。`]
        : ["基础题意能够辨认，但院校风格特征还不够明确。"],
    issues:
      missingTags.length > 0
        ? [`还缺少${formatList(missingTags)}，与${input.schoolName}常见评价重点存在差距。`]
        : ["需要继续提高表现完整度和答卷稳定性。"],
    advice: [
      `下一版请优先补强${input.schoolName}偏好的${formatList(missingTags.length > 0 ? missingTags : input.schoolTags)}。`,
      "用小草图先重排主视图、流程图和说明文字，再进入完整稿。",
    ],
    nextTask: `重做${workTitle}的 6 个小草图方案，并选择最贴合院校标签的一版深化。`,
  };
}

function getMatchedRatio(schoolTags: string[], detectedTags: string[]): number {
  if (schoolTags.length === 0) {
    return 0;
  }

  return getMatchedTags(schoolTags, detectedTags).length / schoolTags.length;
}

function getMatchedTags(schoolTags: string[], detectedTags: string[]): string[] {
  const detectedTagSet = new Set(detectedTags);
  return schoolTags.filter((tag) => detectedTagSet.has(tag));
}

function formatList(items: string[]): string {
  return items.length > 0 ? items.join("、") : "未提供";
}

function formatRubric(rubric?: CritiqueScoringCriterion[]): string {
  if (!rubric || rubric.length === 0) {
    return "评分维度：按问题定义、功能流程、造型表现、版面表达和院校契合度综合判断。";
  }

  return rubric
    .map((item) => `${item.title}：${item.score} 分。${item.description}`)
    .join("\n");
}

function formatReferenceContext(referenceContext?: string): string {
  return referenceContext?.trim() ? `\n${referenceContext.trim()}` : "";
}

function buildMockCriteriaScores(rubric: CritiqueScoringCriterion[] | undefined, ratio: number): CritiqueCriterionScore[] {
  if (!rubric || rubric.length === 0) {
    return [];
  }

  return rubric.map((item, index) => {
    const score = Math.round(item.score * ratio);

    return {
      id: item.id ?? `criterion-${index + 1}`,
      title: item.title,
      score,
      maxScore: item.score,
      comment: score >= item.score * 0.8
        ? "这一项已经比较贴合目标院校要求，后续重点打磨完成度。"
        : `这一项还有提升空间，建议围绕“${item.description}”补强。`,
    };
  });
}
