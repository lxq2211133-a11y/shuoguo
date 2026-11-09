import type { ExamPaper } from "../data/platformData";

export type ExamPaperIssueCode =
  | "paper-total-score-mismatch"
  | "paper-missing-sections"
  | "section-question-score-mismatch"
  | "question-missing-score";

export type ExamPaperIssue = {
  code: ExamPaperIssueCode;
  message: string;
  itemId: string;
};

export function getExamPaperScore(paper: ExamPaper) {
  return paper.sections.reduce((total, section) => total + section.score, 0);
}

export function validateExamPaper(paper: ExamPaper): ExamPaperIssue[] {
  const issues: ExamPaperIssue[] = [];

  if (paper.sections.length === 0) {
    issues.push({
      code: "paper-missing-sections",
      message: "试卷需要正式题型分区。",
      itemId: paper.id,
    });
  }

  paper.sections.forEach((section) => {
    section.questions.forEach((question) => {
      if (question.score <= 0) {
        issues.push({
          code: "question-missing-score",
          message: "每道题需要明确分值。",
          itemId: question.id,
        });
      }
    });

    const questionScore = section.questions.reduce((total, question) => total + question.score, 0);

    if (questionScore !== section.score) {
      issues.push({
        code: "section-question-score-mismatch",
        message: "题型总分需要等于本题型下各小题分值之和。",
        itemId: section.id,
      });
    }
  });

  if (getExamPaperScore(paper) !== paper.totalScore || paper.totalScore !== 150) {
    issues.push({
      code: "paper-total-score-mismatch",
      message: "正式模拟卷满分必须为 150 分，且各题型分值相加等于满分。",
      itemId: paper.id,
    });
  }

  return issues;
}
