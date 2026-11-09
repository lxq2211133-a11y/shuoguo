import { describe, expect, it } from "vitest";
import { schools } from "../data/platformData";
import { sourceRegistry, SourceRegistryItem } from "../data/sourceRegistry";
import { getResearchDatabaseSummary, validateSourceRegistry } from "./researchDatabase";

const validSource: SourceRegistryItem = {
  schoolId: "jiangnan",
  title: "江南大学 2026 年自命题科目考试大纲",
  url: "https://yz.jiangnan.edu.cn/info/1012/3693.htm",
  type: "official",
  summary: "可确认 337 工业设计工程、705 设计理论、911 综合设计等科目。",
  needsVerification: false,
  year: 2026,
  contentTargets: ["school", "theory"],
};

describe("validateSourceRegistry", () => {
  it("accepts a complete official source", () => {
    expect(validateSourceRegistry([validSource], schools)).toEqual([]);
  });

  it("rejects missing required source fields", () => {
    const issues = validateSourceRegistry(
      [
        {
          ...validSource,
          title: "",
          url: "",
          summary: "",
          contentTargets: [],
        },
      ],
      schools,
    );

    expect(issues.map((issue) => issue.code)).toEqual([
      "missing-title",
      "missing-url",
      "missing-summary",
      "missing-content-targets",
    ]);
  });

  it("requires non-official school facts to stay marked for verification", () => {
    const issues = validateSourceRegistry(
      [
        {
          ...validSource,
          type: "experience",
          needsVerification: false,
          contentTargets: ["school"],
        },
      ],
      schools,
    );

    expect(issues).toContainEqual({
      code: "unsafe-school-fact",
      message: "非官方来源支撑院校事实时必须保持待核验。",
      schoolId: "jiangnan",
      sourceTitle: validSource.title,
    });
  });

  it("rejects orphaned school ids", () => {
    const issues = validateSourceRegistry(
      [
        {
          ...validSource,
          schoolId: "missing-school" as SourceRegistryItem["schoolId"],
        },
      ],
      schools,
    );

    expect(issues).toContainEqual({
      code: "unknown-school",
      message: "来源绑定了不存在的院校 ID。",
      schoolId: "missing-school",
      sourceTitle: validSource.title,
    });
  });

  it("keeps the current seed registry valid", () => {
    expect(validateSourceRegistry(sourceRegistry, schools)).toEqual([]);
  });
});

describe("getResearchDatabaseSummary", () => {
  it("summarizes source reliability and school coverage", () => {
    expect(getResearchDatabaseSummary([validSource], schools)).toEqual({
      totalSources: 1,
      verifiedSources: 1,
      sourcesNeedingVerification: 0,
      officialSources: 1,
      schoolCoverage: [
        {
          schoolId: "swjtu",
          schoolName: "西南交大",
          sourceCount: 0,
          verifiedCount: 0,
        },
        {
          schoolId: "jiangnan",
          schoolName: "江南",
          sourceCount: 1,
          verifiedCount: 1,
        },
        {
          schoolId: "gafa",
          schoolName: "广美",
          sourceCount: 0,
          verifiedCount: 0,
        },
        {
          schoolId: "whut",
          schoolName: "武汉理工",
          sourceCount: 0,
          verifiedCount: 0,
        },
      ],
    });
  });
});
