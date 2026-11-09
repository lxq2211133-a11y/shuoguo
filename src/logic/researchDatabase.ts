import { School, schools } from "../data/platformData";
import {
  SourceContentTarget,
  sourceRegistry,
  SourceRegistryItem,
  SourceType,
} from "../data/sourceRegistry";

export type ResearchDatabaseIssueCode =
  | "missing-title"
  | "missing-url"
  | "missing-summary"
  | "missing-content-targets"
  | "unknown-source-type"
  | "unknown-school"
  | "unsafe-school-fact";

export type ResearchDatabaseIssue = {
  code: ResearchDatabaseIssueCode;
  message: string;
  schoolId: string;
  sourceTitle: string;
};

export type SchoolSourceCoverage = {
  schoolId: string;
  schoolName: string;
  sourceCount: number;
  verifiedCount: number;
};

export type ResearchDatabaseSummary = {
  totalSources: number;
  verifiedSources: number;
  sourcesNeedingVerification: number;
  officialSources: number;
  schoolCoverage: SchoolSourceCoverage[];
};

const SCHOOL_FACT_TARGET: SourceContentTarget = "school";
const APPROVED_SOURCE_TYPES: SourceType[] = ["official", "reliable-secondary", "experience", "inference"];

export function validateSourceRegistry(
  sources: SourceRegistryItem[] = sourceRegistry,
  schoolList: School[] = schools,
): ResearchDatabaseIssue[] {
  const schoolIds = new Set(schoolList.map((school) => school.id));

  return sources.flatMap((source) => {
    const issues: ResearchDatabaseIssue[] = [];
    const sourceTitle = source.title || "未命名来源";
    const schoolId = source.schoolId;
    const contentTargets = source.contentTargets ?? [];

    if (!source.title.trim()) {
      issues.push({
        code: "missing-title",
        message: "来源缺少标题。",
        schoolId,
        sourceTitle,
      });
    }

    if (!source.url.trim()) {
      issues.push({
        code: "missing-url",
        message: "来源缺少链接或出处。",
        schoolId,
        sourceTitle,
      });
    }

    if (!source.summary.trim()) {
      issues.push({
        code: "missing-summary",
        message: "来源缺少可进入产品的摘要。",
        schoolId,
        sourceTitle,
      });
    }

    if (contentTargets.length === 0) {
      issues.push({
        code: "missing-content-targets",
        message: "来源需要标注可支撑的内容类型。",
        schoolId,
        sourceTitle,
      });
    }

    if (!schoolIds.has(source.schoolId)) {
      issues.push({
        code: "unknown-school",
        message: "来源绑定了不存在的院校 ID。",
        schoolId,
        sourceTitle,
      });
    }

    if (
      source.type !== "official" &&
      contentTargets.includes(SCHOOL_FACT_TARGET) &&
      !source.needsVerification
    ) {
      issues.push({
        code: "unsafe-school-fact",
        message: "非官方来源支撑院校事实时必须保持待核验。",
        schoolId,
        sourceTitle,
      });
    }

    if (!APPROVED_SOURCE_TYPES.includes(source.type)) {
      issues.push({
        code: "unknown-source-type",
        message: "来源类型不在允许范围内。",
        schoolId,
        sourceTitle,
      });
    }

    return issues;
  });
}

export function getResearchDatabaseSummary(
  sources: SourceRegistryItem[] = sourceRegistry,
  schoolList: School[] = schools,
): ResearchDatabaseSummary {
  const verifiedSources = sources.filter((source) => !source.needsVerification).length;

  return {
    totalSources: sources.length,
    verifiedSources,
    sourcesNeedingVerification: sources.length - verifiedSources,
    officialSources: sources.filter((source) => source.type === "official").length,
    schoolCoverage: schoolList.map((school) => {
      const schoolSources = sources.filter((source) => source.schoolId === school.id);

      return {
        schoolId: school.id,
        schoolName: school.shortName,
        sourceCount: schoolSources.length,
        verifiedCount: schoolSources.filter((source) => !source.needsVerification).length,
      };
    }),
  };
}
