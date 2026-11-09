import {
  theoryBooks,
  TheoryBook,
  theoryChapters,
  TheoryChapter,
  TheoryExamPriority,
  theoryKnowledgePoints,
  TheoryKnowledgePoint,
  theorySourceReferences,
  TheorySourceReference,
} from "../data/theoryKnowledgeBase";
import type { TheoryTopic } from "../data/platformData";

export type TheoryKnowledgeBaseIssueCode =
  | "book-missing-source"
  | "chapter-missing-book"
  | "point-missing-book"
  | "point-missing-chapter"
  | "point-missing-keywords"
  | "point-missing-exam-forms"
  | "point-missing-answer-frame"
  | "point-missing-design-transfer"
  | "point-missing-source"
  | "book-unknown-source"
  | "point-unknown-source"
  | "source-reference-duplicate"
  | "book-missing-priority"
  | "book-missing-priority-reason"
  | "point-missing-priority"
  | "point-missing-priority-reason";

export type TheoryKnowledgeBaseIssue = {
  code: TheoryKnowledgeBaseIssueCode;
  message: string;
  itemId: string;
};

export type BookPriorityOutline = {
  bookId: string;
  bookTitle: string;
  studyPriority: TheoryExamPriority;
  priorityReason: string;
  priorityBuckets: Record<TheoryExamPriority, TheoryKnowledgePoint[]>;
};

const EXAM_PRIORITIES: TheoryExamPriority[] = ["重点", "次重点", "一般考点"];

function isExamPriority(value: unknown): value is TheoryExamPriority {
  return EXAM_PRIORITIES.includes(value as TheoryExamPriority);
}

export function validateTheoryKnowledgeBase(
  books: TheoryBook[] = theoryBooks,
  chapters: TheoryChapter[] = theoryChapters,
  points: TheoryKnowledgePoint[] = theoryKnowledgePoints,
  sourceReferences: TheorySourceReference[] = theorySourceReferences,
): TheoryKnowledgeBaseIssue[] {
  const bookIds = new Set(books.map((book) => book.id));
  const chapterIds = new Set(chapters.map((chapter) => chapter.id));
  const sourceReferenceIds = new Set(sourceReferences.map((source) => source.id));
  const issues: TheoryKnowledgeBaseIssue[] = [];
  const seenSourceReferenceIds = new Set<string>();

  sourceReferences.forEach((source) => {
    if (seenSourceReferenceIds.has(source.id)) {
      issues.push({
        code: "source-reference-duplicate",
        message: "理论来源索引 ID 不能重复。",
        itemId: source.id,
      });
    }

    seenSourceReferenceIds.add(source.id);
  });

  books.forEach((book) => {
    if (!isExamPriority(book.studyPriority)) {
      issues.push({
        code: "book-missing-priority",
        message: "理论书目需要标注重点、次重点或一般考点。",
        itemId: book.id,
      });
    }

    if (!book.priorityReason.trim()) {
      issues.push({
        code: "book-missing-priority-reason",
        message: "理论书目需要说明优先级依据。",
        itemId: book.id,
      });
    }

    if (book.sourceIds.length === 0) {
      issues.push({
        code: "book-missing-source",
        message: "理论书目需要至少一个来源 ID。",
        itemId: book.id,
      });
    }

    if (book.sourceIds.some((sourceId) => !sourceReferenceIds.has(sourceId))) {
      issues.push({
        code: "book-unknown-source",
        message: "理论书目绑定了不存在的来源 ID。",
        itemId: book.id,
      });
    }
  });

  chapters.forEach((chapter) => {
    if (!bookIds.has(chapter.bookId)) {
      issues.push({
        code: "chapter-missing-book",
        message: "理论章节绑定了不存在的书目。",
        itemId: chapter.id,
      });
    }
  });

  points.forEach((point) => {
    if (!isExamPriority(point.examPriority)) {
      issues.push({
        code: "point-missing-priority",
        message: "考点需要标注重点、次重点或一般考点。",
        itemId: point.id,
      });
    }

    if (!point.priorityReason.trim()) {
      issues.push({
        code: "point-missing-priority-reason",
        message: "考点需要说明优先级依据。",
        itemId: point.id,
      });
    }

    if (point.bookIds.length === 0 || point.bookIds.some((bookId) => !bookIds.has(bookId))) {
      issues.push({
        code: "point-missing-book",
        message: "考点需要绑定存在的理论书目。",
        itemId: point.id,
      });
    }

    if (point.chapterIds.length === 0 || point.chapterIds.some((chapterId) => !chapterIds.has(chapterId))) {
      issues.push({
        code: "point-missing-chapter",
        message: "考点需要绑定存在的理论章节。",
        itemId: point.id,
      });
    }

    if (point.keywords.length === 0) {
      issues.push({
        code: "point-missing-keywords",
        message: "考点需要记忆关键词。",
        itemId: point.id,
      });
    }

    if (point.examForms.length === 0) {
      issues.push({
        code: "point-missing-exam-forms",
        message: "考点需要常见考法。",
        itemId: point.id,
      });
    }

    if (!point.answerFrame.trim()) {
      issues.push({
        code: "point-missing-answer-frame",
        message: "考点需要答题结构。",
        itemId: point.id,
      });
    }

    if (!point.designTransfer.trim()) {
      issues.push({
        code: "point-missing-design-transfer",
        message: "考点需要产品设计迁移角度。",
        itemId: point.id,
      });
    }

    if (point.sourceIds.length === 0) {
      issues.push({
        code: "point-missing-source",
        message: "考点需要来源 ID。",
        itemId: point.id,
      });
    }

    if (point.sourceIds.some((sourceId) => !sourceReferenceIds.has(sourceId))) {
      issues.push({
        code: "point-unknown-source",
        message: "考点绑定了不存在的来源 ID。",
        itemId: point.id,
      });
    }
  });

  return issues;
}

export function getKnowledgePointsByBook(bookId: string) {
  return theoryKnowledgePoints.filter((point) => point.bookIds.includes(bookId));
}

export function getCoreKnowledgePoints() {
  return theoryKnowledgePoints.filter((point) => point.level === "核心必背");
}

export function getKnowledgePointsByPriority(priority: TheoryExamPriority) {
  return theoryKnowledgePoints.filter((point) => point.examPriority === priority);
}

export function getBookPriorityOutline(bookId: string): BookPriorityOutline {
  const book = theoryBooks.find((item) => item.id === bookId);
  const points = getKnowledgePointsByBook(bookId);

  if (!book) {
    throw new Error(`Unknown theory book: ${bookId}`);
  }

  return {
    bookId: book.id,
    bookTitle: book.title,
    studyPriority: book.studyPriority,
    priorityReason: book.priorityReason,
    priorityBuckets: {
      重点: points.filter((point) => point.examPriority === "重点"),
      次重点: points.filter((point) => point.examPriority === "次重点"),
      一般考点: points.filter((point) => point.examPriority === "一般考点"),
    },
  };
}

export function projectKnowledgePointsToTheoryTopics(
  points: TheoryKnowledgePoint[] = theoryKnowledgePoints,
  chapters: TheoryChapter[] = theoryChapters,
): TheoryTopic[] {
  return points.map((point) => {
    const chapter = chapters.find((item) => item.id === point.chapterIds[0]);

    return {
      id: point.id,
      chapter: chapter ? `${chapter.title} / ${point.title}` : point.title,
      title: point.title,
      level: point.level,
      examPriority: point.examPriority,
      examForms: point.examForms,
      productDesignAngle: point.designTransfer,
      priorityReason: point.priorityReason,
    };
  });
}
