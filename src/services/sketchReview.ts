import type { SketchPrompt } from "../data/platformData";
import type { CritiqueResult } from "../logic/aiWorkflows";

export type UploadedSketch = { dataUrl: string; name: string; size: number };

export type SketchReview = {
  id: string;
  parentId: string | null;
  sketch: SketchPrompt;
  image: UploadedSketch;
  result: CritiqueResult;
  createdAt: string;
};

export type SketchReviewSummary = Pick<SketchReview, "id" | "parentId" | "createdAt"> & {
  title: string;
  score: number;
  totalScore: number;
};

export function getRevisionIssues(issues: string[], selectedIndexes?: ReadonlySet<number>) {
  const candidates = issues.slice(0, 5);
  return selectedIndexes ? candidates.filter((_, index) => selectedIndexes.has(index)) : candidates;
}

export function readSketch(file: File): Promise<UploadedSketch> {
  return new Promise((resolve, reject) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > 8 * 1024 * 1024) {
      reject(new Error("请选择 8 MB 以内的 JPG、PNG 或 WEBP 图片。"));
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve({ dataUrl: String(reader.result), name: file.name, size: file.size }));
    reader.addEventListener("error", () => reject(new Error("图片读取失败，请重新选择。")));
    reader.readAsDataURL(file);
  });
}
