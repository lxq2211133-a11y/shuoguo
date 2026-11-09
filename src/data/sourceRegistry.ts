import type { SchoolId } from "./platformData";

export type SourceType = "official" | "reliable-secondary" | "experience" | "inference";

export type SourceContentTarget = "school" | "theory" | "sketch" | "training";

export type SourceRegistryItem = {
  schoolId: SchoolId;
  title: string;
  url: string;
  type: SourceType;
  summary: string;
  needsVerification: boolean;
  year?: number;
  contentTargets: SourceContentTarget[];
};

export const sourceRegistry: SourceRegistryItem[] = [
  {
    schoolId: "swjtu",
    title: "西南交通大学 2027 年硕士研究生招生专业目录",
    url: "https://yz.swjtu.edu.cn/vatuu/PlanMasterMajorAction?key1=014&setAction=intro&type=zszyml",
    type: "official",
    summary: "049 设计艺术学院 085507 工业设计工程（全日制）01 工业设计方向，专业课为 337 工业设计工程和 894 命题设计与专业综合能力（3 小时）。",
    needsVerification: false,
    year: 2027,
    contentTargets: ["school", "theory", "sketch"],
  },
  {
    schoolId: "swjtu",
    title: "西南交通大学 2027 年硕士研究生招生考试科目参考书目",
    url: "https://yz.swjtu.edu.cn/vatuu/PlanMasterMajorAction?setAction=intro&type=book&year=970DF23C0FBB587E",
    type: "official",
    summary: "337 工业设计工程列出的参考书为《工业设计史》（第 5 版），何人可，高等教育出版社，2019 年。",
    needsVerification: false,
    year: 2027,
    contentTargets: ["school", "theory"],
  },
  {
    schoolId: "swjtu",
    title: "西南交通大学设计艺术学院工业设计工程页面",
    url: "https://design.swjtu.edu.cn/jyjx/ssxwd/gysjgc.htm",
    type: "official",
    summary: "可确认培养内容涉及人机工程、设计思维、材料、交互、用户体验、人工智能、交通工具设计等。",
    needsVerification: false,
    contentTargets: ["school", "sketch", "training"],
  },
  {
    schoolId: "swjtu",
    title: "西南交大原型风格推断",
    url: "docs/research/school-research-notes.md#西南交通大学",
    type: "inference",
    summary: "工程理性、交通出行产品、公共设施等标签是产品原型推断，需用真题或多来源经验继续核实。",
    needsVerification: true,
    year: 2026,
    contentTargets: ["sketch", "training"],
  },
  {
    schoolId: "jiangnan",
    title: "江南大学 2026 年硕士研究生招生简章",
    url: "https://yz.jiangnan.edu.cn/info/1029/3690.htm",
    type: "official",
    summary: "可确认设计学院及相关学院包含设计学、设计、工业设计工程等相关方向。",
    needsVerification: false,
    year: 2026,
    contentTargets: ["school"],
  },
  {
    schoolId: "jiangnan",
    title: "江南大学 2026 年自命题科目考试大纲",
    url: "https://yz.jiangnan.edu.cn/info/1012/3693.htm",
    type: "official",
    summary: "可确认自命题科目列表中包含 337 工业设计工程、705 设计理论、911 综合设计等科目。",
    needsVerification: false,
    year: 2026,
    contentTargets: ["school", "theory"],
  },
  {
    schoolId: "jiangnan",
    title: "江南大学设计学院导师与研究方向页面",
    url: "https://yz.jiangnan.edu.cn/dsjs/sjxy.htm",
    type: "official",
    summary: "可见产品系统设计理论、交互与体验设计、服务设计、用户研究、系统创新等研究方向。",
    needsVerification: false,
    contentTargets: ["school", "theory", "training"],
  },
  {
    schoolId: "jiangnan",
    title: "江南大学原型风格推断",
    url: "docs/research/school-research-notes.md#江南大学",
    type: "inference",
    summary: "方法完整、用户洞察、系统表达等标签需通过公开真题、高分案例或多来源经验继续核实。",
    needsVerification: true,
    year: 2026,
    contentTargets: ["sketch", "training"],
  },
  {
    schoolId: "gafa",
    title: "广州美术学院产品设计官网页",
    url: "https://www.gzarts.edu.cn/zydzbps/cpsj.htm",
    type: "official",
    summary: "可确认课程与方向涉及解析表达、构成、人机工程、材料工艺、智能产品、生活方式、CMF 等。",
    needsVerification: false,
    contentTargets: ["school", "sketch", "training"],
  },
  {
    schoolId: "gafa",
    title: "中国考研网转载广州美术学院 703 设计理论参考书目信息",
    url: "https://m.chinakaoyan.com/info/article/id/654169.shtml",
    type: "reliable-secondary",
    summary: "二级来源称 2026 年 703 设计理论参考书目已公布，需与广美官方招生或大纲页面交叉验证。",
    needsVerification: true,
    year: 2026,
    contentTargets: ["theory"],
  },
  {
    schoolId: "gafa",
    title: "机构公开文章中的广美 2025 专业设计真题回忆",
    url: "https://fbsjedu.com/schoolnews/8595.html",
    type: "experience",
    summary: "机构文章提到以包豪斯瓦西里椅为元素改良产品设计；只适合作为训练提示，不作为官方真题结论。",
    needsVerification: true,
    year: 2025,
    contentTargets: ["sketch", "training"],
  },
  {
    schoolId: "gafa",
    title: "广州美术学院原型风格推断",
    url: "docs/research/school-research-notes.md#广州美术学院",
    type: "inference",
    summary: "概念鲜明、形态大胆、表现力强等标签需通过真题、高分卷和多来源经验继续核实。",
    needsVerification: true,
    year: 2026,
    contentTargets: ["sketch", "training"],
  },
  {
    schoolId: "whut",
    title: "机构整理的武汉理工大学 337 工业设计工程大纲",
    url: "https://www.fbsjedu.com/schoolnews/7654.html",
    type: "reliable-secondary",
    summary: "二级来源称大纲涉及常用材料、人机工程、产品结构设计、工程制图等；需官方页面验证。",
    needsVerification: true,
    year: 2025,
    contentTargets: ["school", "theory"],
  },
  {
    schoolId: "whut",
    title: "新东方在线武汉理工工业设计工程初试科目信息",
    url: "https://news.koolearn.com/kaopei/yxxx/99473/",
    type: "reliable-secondary",
    summary: "二级来源称初试科目包含 337 工业设计工程、506 工业产品命题设计；需与最新官方招生目录交叉验证。",
    needsVerification: true,
    contentTargets: ["school"],
  },
  {
    schoolId: "whut",
    title: "武汉理工大学原型风格推断",
    url: "docs/research/school-research-notes.md#武汉理工大学",
    type: "inference",
    summary: "功能扎实、材料意识、工程应用等标签是当前训练假设，需继续核实官方大纲与公开真题。",
    needsVerification: true,
    year: 2026,
    contentTargets: ["sketch", "training"],
  },
];

export function getSourcesBySchool(schoolId: SchoolId) {
  return sourceRegistry.filter((source) => source.schoolId === schoolId);
}
