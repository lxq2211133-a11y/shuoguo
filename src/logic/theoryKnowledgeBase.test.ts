import { describe, expect, it } from "vitest";
import {
  theoryBooks,
  theoryChapters,
  theoryKnowledgePoints,
  theorySourceReferences,
} from "../data/theoryKnowledgeBase";
import {
  getBookPriorityOutline,
  getCoreKnowledgePoints,
  getKnowledgePointsByPriority,
  getKnowledgePointsByBook,
  projectKnowledgePointsToTheoryTopics,
  validateTheoryKnowledgeBase,
} from "./theoryKnowledgeBase";

describe("validateTheoryKnowledgeBase", () => {
  it("keeps the seeded theory knowledge base valid", () => {
    expect(validateTheoryKnowledgeBase(theoryBooks, theoryChapters, theoryKnowledgePoints)).toEqual([]);
  });

  it("requires every book to have a source", () => {
    expect(
      validateTheoryKnowledgeBase(
        [{ ...theoryBooks[0], sourceIds: [] }],
        theoryChapters.filter((chapter) => chapter.bookId === theoryBooks[0].id),
        theoryKnowledgePoints.filter((point) => point.bookIds.includes(theoryBooks[0].id)),
      ),
    ).toContainEqual({
      code: "book-missing-source",
      message: "理论书目需要至少一个来源 ID。",
      itemId: theoryBooks[0].id,
    });
  });

  it("requires books and knowledge points to carry exam priority labels", () => {
    expect(
      validateTheoryKnowledgeBase(
        [
          {
            ...theoryBooks[0],
            studyPriority: "" as never,
            priorityReason: "",
          },
        ],
        theoryChapters.filter((chapter) => chapter.bookId === theoryBooks[0].id),
        [
          {
            ...theoryKnowledgePoints[0],
            examPriority: "" as never,
            priorityReason: "",
          },
        ],
        theorySourceReferences,
      ).map((issue) => issue.code),
    ).toEqual([
      "book-missing-priority",
      "book-missing-priority-reason",
      "point-missing-priority",
      "point-missing-priority-reason",
    ]);
  });

  it("requires book source ids to exist in the source index", () => {
    expect(
      validateTheoryKnowledgeBase(
        [{ ...theoryBooks[0], sourceIds: ["missing-source"] }],
        [],
        [],
        theorySourceReferences,
      ),
    ).toContainEqual({
      code: "book-unknown-source",
      message: "理论书目绑定了不存在的来源 ID。",
      itemId: theoryBooks[0].id,
    });
  });

  it("rejects chapters that reference missing books", () => {
    expect(
      validateTheoryKnowledgeBase(
        theoryBooks,
        [{ ...theoryChapters[0], bookId: "missing-book" }],
        [],
      ),
    ).toContainEqual({
      code: "chapter-missing-book",
      message: "理论章节绑定了不存在的书目。",
      itemId: theoryChapters[0].id,
    });
  });

  it("rejects knowledge points without answer material", () => {
    expect(
      validateTheoryKnowledgeBase(theoryBooks, theoryChapters, [
        {
          ...theoryKnowledgePoints[0],
          keywords: [],
          answerFrame: "",
          designTransfer: "",
        },
      ]),
    ).toEqual([
      {
        code: "point-missing-keywords",
        message: "考点需要记忆关键词。",
        itemId: theoryKnowledgePoints[0].id,
      },
      {
        code: "point-missing-answer-frame",
        message: "考点需要答题结构。",
        itemId: theoryKnowledgePoints[0].id,
      },
      {
        code: "point-missing-design-transfer",
        message: "考点需要产品设计迁移角度。",
        itemId: theoryKnowledgePoints[0].id,
      },
    ]);
  });

  it("requires knowledge point source ids to exist in the source index", () => {
    expect(
      validateTheoryKnowledgeBase(
        theoryBooks,
        theoryChapters,
        [{ ...theoryKnowledgePoints[0], sourceIds: ["missing-source"] }],
        theorySourceReferences,
      ),
    ).toContainEqual({
      code: "point-unknown-source",
      message: "考点绑定了不存在的来源 ID。",
      itemId: theoryKnowledgePoints[0].id,
    });
  });
});

describe("theory source references", () => {
  it("keeps the source index complete and unique", () => {
    const sourceIds = theorySourceReferences.map((source) => source.id);

    expect(new Set(sourceIds).size).toBe(sourceIds.length);
    expect(theorySourceReferences.every((source) => source.title && source.url && source.notes)).toBe(true);
    expect(theorySourceReferences.map((source) => source.id)).toEqual(
      expect.arrayContaining([
        "book-world-modern-design-history-google-books",
        "book-introduction-to-design-studies-google-books",
        "book-industrial-design-history-douban",
        "book-design-for-real-world-douban",
      ]),
    );
  });
});

describe("theory knowledge helpers", () => {
  it("finds knowledge points by book", () => {
    const points = getKnowledgePointsByBook("world-modern-design-history");

    expect(points.map((point) => point.id)).toContain("bauhaus");
    expect(points.every((point) => point.bookIds.includes("world-modern-design-history"))).toBe(true);
  });

  it("lists core knowledge points first", () => {
    const points = getCoreKnowledgePoints();

    expect(points.length).toBeGreaterThan(4);
    expect(points.every((point) => point.level === "核心必背")).toBe(true);
  });

  it("groups knowledge points by exam priority", () => {
    expect(getKnowledgePointsByPriority("重点").map((point) => point.id)).toEqual(
      expect.arrayContaining(["arts-and-crafts", "bauhaus", "design-studies-scope", "sustainable-design"]),
    );
    expect(getKnowledgePointsByPriority("一般考点").map((point) => point.id)).toContain("art-deco");
  });

  it("builds a book priority outline", () => {
    const outline = getBookPriorityOutline("world-modern-design-history");

    expect(outline).toMatchObject({
      bookId: "world-modern-design-history",
      bookTitle: "世界现代设计史",
      studyPriority: "重点",
    });
    expect(outline.priorityBuckets["重点"].map((point) => point.id)).toEqual(
      expect.arrayContaining(["arts-and-crafts", "bauhaus", "ulm"]),
    );
    expect(outline.priorityBuckets["一般考点"].map((point) => point.id)).toEqual(["art-deco"]);
  });

  it("projects knowledge points into existing theory topic cards", () => {
    expect(projectKnowledgePointsToTheoryTopics().slice(0, 2)).toEqual([
      {
        id: "arts-and-crafts",
        chapter: "现代设计史主干 / 工艺美术运动",
        title: "工艺美术运动",
        level: "核心必背",
        examPriority: "重点",
        examForms: ["名词解释", "简答", "论述"],
        productDesignAngle: "可迁移到产品设计中对手工价值、材料诚实、装饰与功能关系的讨论。",
        priorityReason: "它是现代设计史开端型考点，适合和工业化、手工艺、材料真实、现代设计伦理一起考。",
      },
      {
        id: "art-nouveau",
        chapter: "现代设计史主干 / 新艺术运动",
        title: "新艺术运动",
        level: "高频理解",
        examPriority: "次重点",
        examForms: ["名词解释", "比较题", "简答"],
        productDesignAngle: "可迁移到产品形态语言、自然曲线、装饰符号和品牌识别表达。",
        priorityReason: "常作为工艺美术运动、装饰艺术运动和现代主义之间的比较点，理解优先于大段背诵。",
      },
    ]);
  });
});
