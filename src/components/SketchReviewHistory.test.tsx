import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { swjtu894Pilot } from "../data/swjtu894";
import type { SketchReview } from "../services/sketchReview";
import * as vision from "../services/visionCritique";
import SketchReviewHistory from "./SketchReviewHistory";

test("checks selected revision issues and labels the other issues as unchecked", async () => {
  const image = { name: "fixture.png", size: 5, dataUrl: "data:image/png;base64,AAAA" };
  const missingReturn = "使用流程缺少归还确认";
  const missingScene = "缺少场景图";
  const initial: SketchReview = {
    id: "initial", parentId: null, sketch: swjtu894Pilot, image, createdAt: "2026-11-09T01:00:00.000Z",
    result: { score: 92, totalScore: 150, criteriaScores: [], strengths: [], issues: [missingReturn, missingScene], advice: [], nextTask: "补归还确认" },
  };
  const generated = vi.spyOn(vision, "generateVisionCritique").mockResolvedValue({
    ...initial.result, score: 103, issues: [missingScene],
    revisionNotes: [{ issue: missingReturn, status: "已改善", evidence: "流程图补上了归还确认" }],
  });
  let saved: SketchReview | null = null;
  vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
    const body = JSON.parse(options.body);
    let value = null;
    if (body.action === "read-report") value = body.reportId === initial.id ? initial : saved;
    if (body.action === "revision-draft" && body.parentId === initial.id) value = image;
    if (body.action === "save-report") {
      saved = { ...body.report, createdAt: "2026-11-09T02:00:00.000Z" };
      value = saved;
    }
    return { ok: true, json: async () => value };
  }));

  try {
    render(<SketchReviewHistory schoolId="swjtu" initialId={initial.id} />);
    const start = await screen.findByRole("button", { name: "开始同题复评" });
    expect(start).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: missingReturn }));
    expect(start).toBeEnabled();
    fireEvent.click(start);

    expect(await screen.findByText(`已改善 · ${missingReturn}`)).toBeInTheDocument();
    expect(screen.getByText(/分数来自两次整图评估/)).toBeInTheDocument();
    expect(screen.getByText("本轮未核对").parentElement).toHaveTextContent(missingScene);
    expect(generated).toHaveBeenCalledWith(expect.objectContaining({ previous: { imageDataUrl: image.dataUrl, issues: [missingReturn] } }));
  } finally {
    generated.mockRestore();
    vi.unstubAllGlobals();
  }
});
