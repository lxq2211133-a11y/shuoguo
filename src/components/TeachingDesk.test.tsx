import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { swjtu894Pilot } from "../data/swjtu894";
import TeachingDesk from "./TeachingDesk";

test("registers a private blind sample from the built-in 894 rubric", async () => {
  const rubric = { id: swjtu894Pilot.rubricVersion, totalScore: swjtu894Pilot.totalScore, scoring: swjtu894Pilot.scoring };
  const catalog = { rubric, pilotRubric: null, entries: [] as object[] };
  const save = vi.fn((item, kind, publish) => {
    catalog.entries.push({ kind, id: item.id, title: item.title, workCode: item.workCode, status: publish ? "ready" : "draft" });
  });
  vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
    const body = JSON.parse(options.body);
    if (body.action === "teaching-save") save(body.item, body.kind, body.publish);
    const data = body.action === "teaching-list" ? catalog : [];
    return { ok: true, json: async () => data };
  }));

  try {
    render(<TeachingDesk sketch={swjtu894Pilot} onPublish={vi.fn()} />);
    await screen.findByText(`当前评分表版本 ${rubric.id}`);
    fireEvent.click(screen.getByRole("button", { name: "标注专家案例" }));
    expect(screen.getAllByRole("spinbutton")).toHaveLength(rubric.scoring.length);
    expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(null);

    fireEvent.click(screen.getByRole("button", { name: "登记盲评作品" }));
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("作品编号"), { target: { value: "894-s013" } });
    fireEvent.change(screen.getByLabelText("作品标题"), { target: { value: "盲评原图" } });
    fireEvent.click(screen.getByLabelText("已获授权，可提交作品至视觉服务用于内部评分验证"));
    const file = new File(["fixture"], "blind.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("作品图片"), { target: { files: [file] } });
    await screen.findByText(file.name);
    fireEvent.click(screen.getByRole("button", { name: "存入盲评集" }));

    expect(await screen.findByText("已存入盲评集，仅教研可见。")).toBeInTheDocument();
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      version: rubric.id, workCode: "894-s013", title: "盲评原图", authorized: true,
      image: expect.objectContaining({ name: file.name }),
    }), "blind", true);
    expect(screen.getByRole("region", { name: "盲评样本" })).toHaveTextContent("894-s013 · 已登记 · 仅教研可见");
  } finally {
    vi.unstubAllGlobals();
  }
});
