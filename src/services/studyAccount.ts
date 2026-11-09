import type { SchoolId } from "../data/platformData";
import type { ReviewRecords } from "../logic/learningProgress";

export const studyStages = ["基础", "强化", "冲刺"] as const;

export type StudyProfile = {
  schoolId: SchoolId;
  stage: typeof studyStages[number];
  dailyMinutes: number;
};

export type StudyAccount = {
  username: string;
  isTeacher: boolean;
  profile: StudyProfile;
  reviewRecords: ReviewRecords;
  draftNames: Partial<Record<SchoolId, string>>;
  latestReportIds: Partial<Record<SchoolId, string>>;
};

export const defaultStudyProfile: StudyProfile = { schoolId: "swjtu", stage: "基础", dailyMinutes: 60 };

export async function studyRequest<T>(action?: string, fields: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch("/api/study", action ? {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...fields, action }),
  } : undefined);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "学习记录服务暂不可用，请重试。");
  return result as T;
}

export function studyError(error: unknown) {
  return error instanceof Error && /[\u3400-\u9fff]/.test(error.message)
    ? error.message
    : "学习记录服务暂不可用，请重试。";
}
