import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import App from "./App";
import { readReviewRecords, saveReviewRecords } from "./logic/learningProgress";

function openJiangnan() {
  render(<App />);
  fireEvent.change(screen.getByRole("combobox", { name: "切换目标院校" }), { target: { value: "jiangnan" } });
}

describe("Mini program learning app", () => {
  test("shows the home dashboard and opens the critique upload workflow", () => {
    openJiangnan();

    expect(screen.getByRole("heading", { name: "硕果研习" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "今日学习计划" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "会员权益" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "上传评图" }));

    expect(screen.getByRole("heading", { name: "AI 评图" })).toBeInTheDocument();
    expect(screen.getByLabelText("上传手绘快题图片")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "使用示例评图" })).toBeInTheDocument();
  });

  test("navigates from home to a second-level page and back", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "理论重点 14 个高频考点" }));

    expect(screen.getByRole("heading", { name: "理论重点" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回首页" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "今日学习计划" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));

    expect(screen.getByRole("heading", { name: "今日学习计划" })).toBeInTheDocument();
  });

  test("opens the auto paper page as a formal 150-point exam", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "自动组卷 院校风格卷" }));

    expect(screen.getByRole("heading", { name: "自动组卷" })).toBeInTheDocument();
    expect(screen.getByText("设计理论")).toBeInTheDocument();
    expect(screen.getByText("满分 150 分")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "江南产品设计理论正式模拟卷" })).toBeInTheDocument();
    expect(screen.getByText("一、名词解释")).toBeInTheDocument();
    expect(screen.getByText("二、简答题")).toBeInTheDocument();
    expect(screen.getByText("三、论述题")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(11);
  });

  test("opens the sketch page with a formal 150-point scoring rubric", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "手绘快题 今日训练题" }));

    expect(screen.getByRole("heading", { name: "手绘快题" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "面向独居青年的智能厨房小家电设计" })).toBeInTheDocument();
    expect(screen.getByText("满分 150 分")).toBeInTheDocument();
    expect(screen.getByText("问题定义与创意方向")).toBeInTheDocument();
    expect(screen.getByText("功能流程与结构逻辑")).toBeInTheDocument();
    expect(screen.getByText("造型语言与表现技法")).toBeInTheDocument();
    expect(screen.getByText("版面组织与信息表达")).toBeInTheDocument();
    expect(screen.getByText("院校风格与题目契合")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上传 AI 评图" })).toBeInTheDocument();
  });

  test("keeps an uploaded sketch available for retry and opens a separate example", async () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "上传评图" }));

    const file = new File(["fake image"], "kitchen-sketch.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("上传手绘快题图片"), { target: { files: [file] } });

    expect(await screen.findByText("kitchen-sketch.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "开始 AI 评图" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "开始 AI 评图" }));

    await waitFor(() => expect(screen.getByText(/AI 评图暂未完成/)).toBeInTheDocument());
    expect(screen.getByText("kitchen-sketch.png")).toBeInTheDocument();
    expect(screen.queryByText("手绘快题评分")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "使用示例评图" }));
    expect(screen.getByText("/150")).toBeInTheDocument();
    expect(screen.getByText("分项评分")).toBeInTheDocument();
    expect(screen.getByText("问题定义与创意方向")).toBeInTheDocument();
    expect(screen.getByText("下一张训练")).toBeInTheDocument();
  });

  test("opens a theory knowledge point as a deeper detail page", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "理论重点 14 个高频考点" }));
    fireEvent.click(screen.getByRole("button", { name: "查看考点 包豪斯" }));

    expect(screen.getByRole("heading", { name: "包豪斯" })).toBeInTheDocument();
    expect(screen.getByText("答题结构")).toBeInTheDocument();
    expect(screen.getByText("产品设计迁移")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回理论重点" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "返回理论重点" }));

    expect(screen.getByRole("heading", { name: "理论重点" })).toBeInTheDocument();
  });

  test("marks theory answers and opens related knowledge links", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "理论重点 14 个高频考点" }));
    fireEvent.click(screen.getByRole("button", { name: "查看考点 工艺美术运动" }));

    expect(screen.getByText("考试答案标注")).toBeInTheDocument();
    expect(screen.getByText("背景")).toBeInTheDocument();
    expect(screen.getByText("主张")).toBeInTheDocument();
    expect(screen.getByText("评价")).toBeInTheDocument();
    expect(screen.getByText("关联知识")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "查看关联知识 新艺术运动" }));

    expect(screen.getByRole("heading", { name: "新艺术运动" })).toBeInTheDocument();
    expect(screen.getByText("考试答案标注")).toBeInTheDocument();
  });

  test("opens a memory task detail card from the memory plan", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "带背计划 艾宾浩斯复盘" }));
    fireEvent.click(screen.getByRole("button", { name: "查看带背卡片 包豪斯" }));

    expect(screen.getByRole("heading", { name: "包豪斯" })).toBeInTheDocument();
    expect(screen.getByText("回忆提问")).toBeInTheDocument();
    expect(screen.getByText("下一步动作")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回带背计划" })).toBeInTheDocument();
  });

  test("exposes source links on the school page", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "院校资料" }));

    const admissionGuide = screen.getByRole("link", { name: /江南大学 2026 年硕士研究生招生简章/ });
    const examOutline = screen.getByRole("link", { name: /江南大学 2026 年自命题科目考试大纲/ });

    expect(admissionGuide).toHaveAttribute("href", "https://yz.jiangnan.edu.cn/info/1029/3690.htm");
    expect(examOutline).toHaveAttribute("href", "https://yz.jiangnan.edu.cn/info/1012/3693.htm");
  });

  test("opens a paper question analysis and jumps to the matching theory point", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "自动组卷 院校风格卷" }));
    fireEvent.click(screen.getByRole("button", { name: "查看题目 包豪斯" }));

    expect(screen.getByRole("heading", { name: "包豪斯" })).toBeInTheDocument();
    expect(screen.getByText("审题提示")).toBeInTheDocument();
    expect(screen.getByText("答题路径")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开考点 包豪斯" }));

    expect(screen.getByText("答题结构")).toBeInTheDocument();
  });

  test("submits a mock exam answer and schedules review for a weak knowledge point", async () => {
    openJiangnan();
    fireEvent.click(screen.getByRole("button", { name: "自动组卷 院校风格卷" }));
    fireEvent.click(screen.getByRole("button", { name: "开始作答或查看交卷" }));
    const answer = await screen.findByRole("textbox", { name: /^工艺美术运动|^简述工艺美术运动/ });
    fireEvent.change(answer, { target: { value: "工艺美术运动提倡手工艺。" } });
    fireEvent.click(screen.getByRole("button", { name: "交卷并自评" }));
    fireEvent.click(screen.getByRole("button", { name: "薄弱点 · 加入带背「工艺美术运动」" }));
    fireEvent.click(screen.getByRole("button", { name: "返回首页" }));
    fireEvent.click(screen.getByRole("button", { name: "带背计划 艾宾浩斯复盘" }));
    expect(screen.getByRole("button", { name: "查看带背卡片 工艺美术运动" })).toBeInTheDocument();
  });

  test("opens a membership benefit detail and navigates to its feature", () => {
    openJiangnan();

    fireEvent.click(screen.getByRole("button", { name: "会员权益" }));
    fireEvent.click(screen.getByRole("button", { name: "查看权益 AI 手绘评图次数与修改建议" }));

    expect(screen.getByRole("heading", { name: "AI 手绘评图次数与修改建议" })).toBeInTheDocument();
    expect(screen.getByText("权益说明")).toBeInTheDocument();
    expect(screen.getByText("使用入口")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "打开 AI 评图" }));

    expect(screen.getByRole("heading", { name: "AI 评图" })).toBeInTheDocument();
  });
});

describe("西南交大 337 章节试练", () => {
  test("shows the pilot chapter and opens a card with matching study notes", () => {
    render(<App />);

    expect(screen.getByRole("combobox", { name: "切换目标院校" })).toHaveValue("swjtu");
    fireEvent.click(screen.getByRole("button", { name: "理论重点 337 · 章节试练" }));
    expect(screen.getByText("337 工业设计工程 · 何人可《工业设计史》第 5 版")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: /^第八章/ })).getAllByRole("button", { name: /^查看考点/ })).toHaveLength(3);
    expect(within(screen.getByRole("region", { name: /^第九章/ })).getAllByRole("button", { name: /^查看考点/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "查看考点 斯堪的纳维亚风格" }));
    fireEvent.click(screen.getByRole("button", { name: "练这张带背卡" }));
    expect(screen.getByRole("heading", { name: "斯堪的纳维亚风格" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "参考要点" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "查看参考要点" }));
    expect(screen.getByText(/阿尔瓦·阿尔托的 31 号扶手椅/)).toBeInTheDocument();
  });

  test("restores a rating after reopening and prioritizes that card when due", () => {
    const originalRecords = readReviewRecords();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T09:00:00+08:00"));
    saveReviewRecords({
      "swjtu:m4": { rating: "熟悉", reviewedAt: "2026-11-08T01:00:00.000Z", nextReviewAt: "2026-11-15T01:00:00.000Z" },
      "swjtu:m1": { rating: "不会", reviewedAt: "2026-11-08T01:00:00.000Z", nextReviewAt: "2026-11-09T01:00:00.000Z" },
    });
    try {
      const first = render(<App />);
      expect(screen.getByText("1/5")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "开始今日复习" }));
      expect(screen.getByRole("heading", { name: "装饰艺术运动" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "不会 · 明天再练" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "查看参考要点" }));
      fireEvent.click(screen.getByRole("button", { name: "不会 · 明天再练" }));
      expect(readReviewRecords()["swjtu:theory-art-deco"]).toMatchObject({ nextReviewAt: "2026-11-10T01:00:00.000Z" });
      fireEvent.click(screen.getByRole("button", { name: "返回带背计划" }));
      expect(screen.getByRole("heading", { name: "补充复习记录" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "查看带背卡片 包豪斯" })).toBeInTheDocument();
      first.unmount();

      vi.setSystemTime(new Date("2026-11-10T09:01:00+08:00"));
      render(<App />);
      expect(screen.getByText("2/5")).toBeInTheDocument();
      expect(screen.getByText(/有 1 张卡片待复习/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "开始今日复习" }));
      expect(screen.getByRole("heading", { name: "装饰艺术运动" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "熟悉 · 7 天后" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "查看参考要点" }));
      fireEvent.click(screen.getByRole("button", { name: "熟悉 · 7 天后" }));
      expect(readReviewRecords()["swjtu:theory-art-deco"]).toMatchObject({ rating: "熟悉", nextReviewAt: "2026-11-17T01:01:00.000Z" });
    } finally {
      vi.useRealTimers();
      saveReviewRecords(originalRecords);
    }
  });

  test("continues from chapter eight into chapter nine and revisits its due card first", () => {
    const originalRecords = readReviewRecords();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T09:00:00+08:00"));
    const completed = { rating: "熟悉" as const, reviewedAt: "2026-11-09T01:00:00.000Z", nextReviewAt: "2026-11-16T01:00:00.000Z" };
    saveReviewRecords({
      "swjtu:theory-art-deco": completed,
      "swjtu:m4": completed,
      "swjtu:theory-scandinavian-design": completed,
    });
    try {
      const first = render(<App />);
      expect(screen.getByText("3/5")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "开始今日复习" }));
      expect(screen.getByRole("heading", { name: "美国工业设计的职业化" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "查看参考要点" }));
      expect(screen.getByText(/Coldspot 冰箱，把专业设计带入/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "模糊 · 3 天后" }));
      expect(readReviewRecords()["swjtu:theory-industrial-design-professionalization"]).toMatchObject({ nextReviewAt: "2026-11-12T01:00:00.000Z" });
      first.unmount();

      vi.setSystemTime(new Date("2026-11-12T09:01:00+08:00"));
      render(<App />);
      expect(screen.getByText("4/5")).toBeInTheDocument();
      expect(screen.getByText(/有 1 张卡片待复习/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "开始今日复习" }));
      expect(screen.getByRole("heading", { name: "美国工业设计的职业化" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
      saveReviewRecords(originalRecords);
    }
  });
});

test("shows the 894 handout and opens grading with the same rubric version", () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "手绘快题 894 · 原创快题" }));

  expect(screen.getByRole("heading", { name: "校园短途共享出行产品设计" })).toBeInTheDocument();
  expect(screen.getByText("评分表版本 swjtu-894-v1")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "题目契合与交付规范" })).toBeInTheDocument();
  const download = screen.getByRole("link", { name: "下载任务单" });
  expect(decodeURIComponent(download.getAttribute("href") ?? "")).toContain("用流程图展示取用、通行、停放和归还");

  fireEvent.click(screen.getByRole("button", { name: "上传 AI 评图" }));
  expect(screen.getByText("当前评分表版本 swjtu-894-v1")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "查看任务与评分表" }));
  expect(screen.getByRole("heading", { name: "校园短途共享出行产品设计" })).toBeInTheDocument();
});
