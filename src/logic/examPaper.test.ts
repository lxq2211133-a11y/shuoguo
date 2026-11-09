import { describe, expect, it } from "vitest";
import { examPapers, ExamPaper } from "../data/platformData";
import { getExamPaperScore, validateExamPaper } from "./examPaper";

const validFormalPaper: ExamPaper = {
  id: "formal-paper",
  schoolId: "jiangnan",
  title: "江南产品设计理论正式模拟卷",
  subject: "设计理论",
  stage: "强化",
  duration: "180 分钟",
  totalScore: 150,
  instructions: ["本试卷满分 150 分，考试时间 180 分钟。", "请按题号顺序作答，论述题需结合设计案例。"],
  sections: [
    {
      id: "terms",
      title: "一、名词解释",
      description: "每题 6 分，共 30 分。",
      score: 30,
      questions: [
        { id: "terms-1", text: "包豪斯", score: 6 },
        { id: "terms-2", text: "乌尔姆设计学院", score: 6 },
        { id: "terms-3", text: "系统设计", score: 6 },
        { id: "terms-4", text: "设计批评", score: 6 },
        { id: "terms-5", text: "可持续设计", score: 6 },
      ],
    },
    {
      id: "short",
      title: "二、简答题",
      description: "每题 15 分，共 60 分。",
      score: 60,
      questions: [
        { id: "short-1", text: "简述工艺美术运动的历史意义与局限。", score: 15 },
        { id: "short-2", text: "简述包豪斯设计教育体系的核心内容。", score: 15 },
        { id: "short-3", text: "简述设计的功能需求与心理需求之间的关系。", score: 15 },
        { id: "short-4", text: "简述乌尔姆设计学院对现代产品设计方法的影响。", score: 15 },
      ],
    },
    {
      id: "essay",
      title: "三、论述题",
      description: "每题 30 分，共 60 分。",
      score: 60,
      questions: [
        { id: "essay-1", text: "结合产品设计案例，论述现代设计教育如何影响当代产品创新。", score: 30 },
        { id: "essay-2", text: "结合具体案例，论述可持续设计如何转化为产品设计策略。", score: 30 },
      ],
    },
  ],
};

describe("formal exam paper data", () => {
  it("keeps every seeded paper at 150 points", () => {
    expect(examPapers.map((paper) => [paper.id, validateExamPaper(paper)])).toEqual(
      examPapers.map((paper) => [paper.id, []]),
    );
    expect(examPapers.every((paper) => getExamPaperScore(paper) === 150)).toBe(true);
  });

  it("accepts a formal 150-point structure", () => {
    expect(validateExamPaper(validFormalPaper)).toEqual([]);
    expect(getExamPaperScore(validFormalPaper)).toBe(150);
  });

  it("rejects papers whose section scores do not add up", () => {
    expect(
      validateExamPaper({
        ...validFormalPaper,
        sections: [{ ...validFormalPaper.sections[0], score: 31 }],
      }).map((issue) => issue.code),
    ).toEqual(["section-question-score-mismatch", "paper-total-score-mismatch"]);
  });

  it("requires formal sections and question scores", () => {
    expect(
      validateExamPaper({
        ...validFormalPaper,
        sections: [
          {
            ...validFormalPaper.sections[0],
            questions: [{ ...validFormalPaper.sections[0].questions[0], score: 0 }],
          },
        ],
      }).map((issue) => issue.code),
    ).toEqual(["question-missing-score", "section-question-score-mismatch", "paper-total-score-mismatch"]);
  });
});
