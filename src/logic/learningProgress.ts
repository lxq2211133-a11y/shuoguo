import { calculateNextReview, type ReviewStatus } from "./studyEngine";

export type ReviewRecord = {
  rating: ReviewStatus;
  reviewedAt: string;
  nextReviewAt: string;
};

export type ReviewRecords = Record<string, ReviewRecord>;

const STORAGE_KEY = "sg-study-review-records-v1";

export function reviewKey(schoolId: string, taskId: string) {
  return `${schoolId}:${taskId}`;
}

export function readReviewRecords(): ReviewRecords {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => {
        if (!value || typeof value !== "object") return false;
        const record = value as Partial<ReviewRecord>;
        return ["熟悉", "模糊", "不会"].includes(record.rating ?? "")
          && typeof record.reviewedAt === "string"
          && typeof record.nextReviewAt === "string";
      }),
    ) as ReviewRecords;
  } catch {
    return {};
  }
}

export function saveReviewRecords(records: ReviewRecords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Private browsing may disable storage; the current session still works.
  }
}

export function makeReviewRecord(rating: ReviewStatus, reviewedAt = new Date()): ReviewRecord {
  const date = reviewedAt.toISOString();
  return { rating, reviewedAt: date, nextReviewAt: calculateNextReview(rating, date) };
}

export function reviewSummary(records: ReviewRecords, schoolId: string, taskIds: string[], now = new Date()) {
  const selected = taskIds.map((taskId) => records[reviewKey(schoolId, taskId)]).filter(Boolean);
  return {
    reviewed: selected.length,
    familiar: selected.filter((record) => record.rating === "熟悉").length,
    due: selected.filter((record) => new Date(record.nextReviewAt).getTime() <= now.getTime()).length,
    total: taskIds.length,
  };
}

export function reviewLabel(record: ReviewRecord | undefined, now = new Date()) {
  if (!record) return "尚未复习";
  const next = new Date(record.nextReviewAt);
  if (next.getTime() <= now.getTime()) return "待复习";
  return `${next.getMonth() + 1} 月 ${next.getDate()} 日复习`;
}
