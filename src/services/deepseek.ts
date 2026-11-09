import { extractJsonObject, runJsonAiWorkflow } from "./aiWorkflowClient";

const API_BASE_URL = "https://api.deepseek.com";
const API_PROXY_URL = import.meta.env.VITE_DEEPSEEK_API_PROXY_URL ?? "/api/deepseek-chat";
const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || "";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export interface CritiqueResult {
  score: number;
  strengths: string[];
  issues: string[];
  advice: string[];
  nextTask: string;
}

export interface CritiqueRequest {
  schoolStyle: string;
  imageDescription?: string;
  sketchTitle?: string;
  requirements?: string[];
}

export async function callDeepSeekChat(messages: ChatMessage[], model = "deepseek-chat") {
  if (!API_PROXY_URL && !API_KEY) {
    throw new Error("缺少 VITE_DEEPSEEK_API_KEY，无法调用 DeepSeek API。");
  }

  const data = await runJsonAiWorkflow<DeepSeekResponse>({
    url: API_PROXY_URL || `${API_BASE_URL}/chat/completions`,
    workflowName: "DeepSeek 文本生成",
    headers: API_PROXY_URL ? undefined : { Authorization: `Bearer ${API_KEY}` },
    body: {
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
    },
  });

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek API 未返回有效内容。");
  }
  return content;
}

export async function generateCritique(request: CritiqueRequest): Promise<CritiqueResult> {
  const systemPrompt = `你是专业的产品设计考研评图老师。请结合目标院校风格评价学生手绘作品，并只返回 JSON：{"score": number, "strengths": string[], "issues": string[], "advice": string[], "nextTask": string}。目标院校风格：${request.schoolStyle}`;

  const userPrompt = `题目：${request.sketchTitle || "未提供"}
设计要求：${request.requirements?.join("；") || "未提供"}
作品描述：${request.imageDescription || "学生上传了一张产品手绘快题作品"}`;

  const content = await callDeepSeekChat([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);

  const jsonText = extractJsonObject(content);
  if (!jsonText) {
    return fallbackCritique(request.schoolStyle);
  }

  try {
    return JSON.parse(jsonText) as CritiqueResult;
  } catch {
    return fallbackCritique(request.schoolStyle);
  }
}

export async function generateExamPaper(schoolName: string, stage: string) {
  const prompt = `请为${schoolName}生成一份${stage}阶段的产品设计理论考研模拟卷，围绕《世界现代设计史》，包含名词解释、简答题、论述题，并给出答案要点。`;

  return callDeepSeekChat([
    { role: "system", content: "你是专业的设计考研理论命题老师。" },
    { role: "user", content: prompt },
  ]);
}

export async function theoryQA(question: string) {
  const prompt = `请用考研答题风格回答以下设计史问题：${question}。要求条理清晰，包含核心考点和可背诵要点。`;

  return callDeepSeekChat([
    { role: "system", content: "你是资深设计史考研辅导老师。" },
    { role: "user", content: prompt },
  ]);
}

function fallbackCritique(schoolStyle: string): CritiqueResult {
  return {
    score: 75,
    strengths: ["整体主题表达清楚", "产品功能框架基本完整"],
    issues: ["造型表现力还需要加强", "版面层级与使用流程关联不够清晰"],
    advice: [`下一版重点强化${schoolStyle}相关的院校风格`, "补充细节图、流程图和 80 字设计说明"],
    nextTask: "完成同主题二次优化版，并先画 6 个小草图再确定主方案。",
  };
}
