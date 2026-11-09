import { theoryChapters, theoryKnowledgePoints } from "./theoryKnowledgeBase";
import { swjtu894Pilot } from "./swjtu894";

export type SchoolId = "swjtu" | "jiangnan" | "gafa" | "whut";

export type Reliability = "official" | "reliable-secondary" | "experience" | "inference";

export type School = {
  id: SchoolId;
  name: string;
  shortName: string;
  city: string;
  positioning: string;
  theoryBias: string[];
  sketchBias: string[];
  styleTags: string[];
  reliability: Reliability;
};

export type TheoryTopic = {
  id: string;
  chapter: string;
  title: string;
  level: "核心必背" | "高频理解" | "拓展掌握";
  examPriority: "重点" | "次重点" | "一般考点";
  examForms: string[];
  productDesignAngle: string;
  priorityReason: string;
};

export type ExamPaperQuestion = {
  id: string;
  text: string;
  score: number;
};

export type ExamPaperSection = {
  id: string;
  title: string;
  description: string;
  score: number;
  questions: ExamPaperQuestion[];
};

export type ExamPaper = {
  id: string;
  schoolId: SchoolId;
  title: string;
  subject: string;
  stage: "基础" | "强化" | "冲刺" | "预测";
  duration: string;
  totalScore: number;
  instructions: string[];
  sections: ExamPaperSection[];
};

export type MemoryTask = {
  id: string;
  topic: string;
  status: "新学" | "1天复习" | "3天复习" | "7天复习" | "回炉";
  prompt: string;
};

export type SketchPrompt = {
  id: string;
  rubricVersion?: string;
  schoolId: SchoolId;
  title: string;
  duration: string;
  totalScore: number;
  brief?: { context: string; submission: string[] };
  requirements: string[];
  scoring: SketchScoringCriterion[];
};

export type SketchScoringCriterion = {
  id: string;
  title: string;
  score: number;
  description: string;
};

export const schools: School[] = [
  {
    id: "swjtu",
    name: "西南交通大学",
    shortName: "西南交大",
    city: "成都",
    positioning: "交通、公共设施与工程场景意识强，适合强调系统、结构与使用流程的产品方案。",
    theoryBias: ["现代主义与技术理性", "交通工具与工业文明", "功能主义", "设计服务社会"],
    sketchBias: ["交通出行产品", "公共设施", "结构表达", "使用流程"],
    styleTags: ["工程理性", "场景清楚", "结构可信", "功能闭环"],
    reliability: "inference",
  },
  {
    id: "jiangnan",
    name: "江南大学",
    shortName: "江南",
    city: "无锡",
    positioning: "产品系统、用户研究和创新表达并重，适合强调完整设计流程与生活方式洞察。",
    theoryBias: ["包豪斯", "乌尔姆设计学院", "系统设计", "设计方法论"],
    sketchBias: ["生活产品", "智能硬件", "用户旅程", "方案推导"],
    styleTags: ["方法完整", "用户洞察", "系统表达", "版面克制"],
    reliability: "inference",
  },
  {
    id: "gafa",
    name: "广州美术学院",
    shortName: "广美",
    city: "广州",
    positioning: "造型表现、视觉冲击和概念表达更重要，适合强化产品形态、画面张力与设计故事。",
    theoryBias: ["现代设计与艺术运动", "后现代设计", "消费文化", "设计审美"],
    sketchBias: ["创意产品", "文创产品", "造型语言", "色彩表现"],
    styleTags: ["概念鲜明", "形态大胆", "表现力强", "版面有记忆点"],
    reliability: "inference",
  },
  {
    id: "whut",
    name: "武汉理工大学",
    shortName: "武汉理工",
    city: "武汉",
    positioning: "工科与材料背景明显，适合强调产品功能、制造逻辑、可持续与产业应用。",
    theoryBias: ["工业化与现代设计", "设计与材料技术", "绿色设计", "设计伦理"],
    sketchBias: ["智能装备", "材料应用", "适老化产品", "可持续产品"],
    styleTags: ["功能扎实", "材料意识", "应用明确", "逻辑严谨"],
    reliability: "inference",
  },
];

export const theoryTopics: TheoryTopic[] = [
  ...theoryKnowledgePoints.map((point) => {
    const chapter = theoryChapters.find((item) => item.id === point.chapterIds[0]);

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
  }),
];

export const examPapers: ExamPaper[] = [
  {
    id: "jiangnan-sprint-1",
    schoolId: "jiangnan",
    title: "江南产品设计理论正式模拟卷",
    subject: "设计理论",
    stage: "强化",
    duration: "180 分钟",
    totalScore: 150,
    instructions: [
      "本试卷满分 150 分，考试时间 180 分钟。",
      "答案写在答题纸上，论述题需结合设计史知识与产品设计案例。",
    ],
    sections: [
      {
        id: "jiangnan-terms",
        title: "一、名词解释",
        description: "每题 6 分，共 30 分。",
        score: 30,
        questions: [
          { id: "jiangnan-terms-1", text: "包豪斯", score: 6 },
          { id: "jiangnan-terms-2", text: "乌尔姆设计学院", score: 6 },
          { id: "jiangnan-terms-3", text: "系统设计", score: 6 },
          { id: "jiangnan-terms-4", text: "设计批评", score: 6 },
          { id: "jiangnan-terms-5", text: "可持续设计", score: 6 },
        ],
      },
      {
        id: "jiangnan-short",
        title: "二、简答题",
        description: "每题 15 分，共 60 分。",
        score: 60,
        questions: [
          { id: "jiangnan-short-1", text: "简述工艺美术运动的历史意义与局限。", score: 15 },
          { id: "jiangnan-short-2", text: "简述包豪斯设计教育体系的核心内容。", score: 15 },
          { id: "jiangnan-short-3", text: "简述设计的功能需求与心理需求之间的关系。", score: 15 },
          { id: "jiangnan-short-4", text: "简述乌尔姆设计学院对现代产品设计方法的影响。", score: 15 },
        ],
      },
      {
        id: "jiangnan-essay",
        title: "三、论述题",
        description: "每题 30 分，共 60 分。",
        score: 60,
        questions: [
          { id: "jiangnan-essay-1", text: "结合产品设计案例，论述现代设计教育如何影响当代产品创新。", score: 30 },
          { id: "jiangnan-essay-2", text: "结合具体案例，论述可持续设计如何转化为产品设计策略。", score: 30 },
        ],
      },
    ],
  },
  {
    id: "gafa-style-1",
    schoolId: "gafa",
    title: "广美设计理论正式模拟卷",
    subject: "设计理论",
    stage: "预测",
    duration: "180 分钟",
    totalScore: 150,
    instructions: [
      "本试卷满分 150 分，考试时间 180 分钟。",
      "作答需突出设计史脉络、风格比较和审美表达，可结合产品或视觉案例。",
    ],
    sections: [
      {
        id: "gafa-terms",
        title: "一、名词解释",
        description: "每题 6 分，共 30 分。",
        score: 30,
        questions: [
          { id: "gafa-terms-1", text: "新艺术运动", score: 6 },
          { id: "gafa-terms-2", text: "装饰艺术运动", score: 6 },
          { id: "gafa-terms-3", text: "后现代主义设计", score: 6 },
          { id: "gafa-terms-4", text: "设计批评", score: 6 },
          { id: "gafa-terms-5", text: "为真实需求而设计", score: 6 },
        ],
      },
      {
        id: "gafa-short",
        title: "二、简答题",
        description: "每题 15 分，共 60 分。",
        score: 60,
        questions: [
          { id: "gafa-short-1", text: "简述新艺术运动的形式特征及其局限。", score: 15 },
          { id: "gafa-short-2", text: "比较现代主义与后现代主义在设计观念上的差异。", score: 15 },
          { id: "gafa-short-3", text: "简述装饰艺术运动与商业消费审美的关系。", score: 15 },
          { id: "gafa-short-4", text: "简述设计批评应包含的主要评价维度。", score: 15 },
        ],
      },
      {
        id: "gafa-essay",
        title: "三、论述题",
        description: "每题 30 分，共 60 分。",
        score: 60,
        questions: [
          { id: "gafa-essay-1", text: "从消费文化角度分析产品形态与视觉符号的关系。", score: 30 },
          { id: "gafa-essay-2", text: "结合案例论述后现代主义设计对当代产品情感表达的启发。", score: 30 },
        ],
      },
    ],
  },
  {
    id: "swjtu-foundation-1",
    schoolId: "swjtu",
    title: "西南交大工业设计工程正式模拟卷",
    subject: "工业设计工程",
    stage: "基础",
    duration: "180 分钟",
    totalScore: 150,
    instructions: [
      "本试卷满分 150 分，考试时间 180 分钟。",
      "作答应体现工程场景、系统逻辑、功能效率与产品设计转化能力。",
    ],
    sections: [
      {
        id: "swjtu-terms",
        title: "一、名词解释",
        description: "每题 6 分，共 30 分。",
        score: 30,
        questions: [
          { id: "swjtu-terms-1", text: "工业设计职业化", score: 6 },
          { id: "swjtu-terms-2", text: "功能主义", score: 6 },
          { id: "swjtu-terms-3", text: "流线型风格", score: 6 },
          { id: "swjtu-terms-4", text: "人机工程", score: 6 },
          { id: "swjtu-terms-5", text: "产品系统", score: 6 },
        ],
      },
      {
        id: "swjtu-short",
        title: "二、简答题",
        description: "每题 15 分，共 60 分。",
        score: 60,
        questions: [
          { id: "swjtu-short-1", text: "简述现代交通工具设计为何强调结构、效率与安全。", score: 15 },
          { id: "swjtu-short-2", text: "简述流线型风格的技术来源、商业动机与审美特征。", score: 15 },
          { id: "swjtu-short-3", text: "简述人机工程在产品设计中的作用。", score: 15 },
          { id: "swjtu-short-4", text: "简述工业设计职业化形成的背景和意义。", score: 15 },
        ],
      },
      {
        id: "swjtu-essay",
        title: "三、论述题",
        description: "每题 30 分，共 60 分。",
        score: 60,
        questions: [
          { id: "swjtu-essay-1", text: "结合现代设计史，说明技术进步如何推动产品设计变革。", score: 30 },
          { id: "swjtu-essay-2", text: "结合公共交通或出行产品案例，论述产品系统设计的价值。", score: 30 },
        ],
      },
    ],
  },
  {
    id: "whut-green-1",
    schoolId: "whut",
    title: "武汉理工材料与可持续正式模拟卷",
    subject: "工业设计工程",
    stage: "冲刺",
    duration: "180 分钟",
    totalScore: 150,
    instructions: [
      "本试卷满分 150 分，考试时间 180 分钟。",
      "作答应联系材料、制造、生命周期和设计伦理，论述题需结合工业产品案例。",
    ],
    sections: [
      {
        id: "whut-terms",
        title: "一、名词解释",
        description: "每题 6 分，共 30 分。",
        score: 30,
        questions: [
          { id: "whut-terms-1", text: "可持续设计", score: 6 },
          { id: "whut-terms-2", text: "绿色设计", score: 6 },
          { id: "whut-terms-3", text: "人机工程", score: 6 },
          { id: "whut-terms-4", text: "设计伦理", score: 6 },
          { id: "whut-terms-5", text: "产品生命周期", score: 6 },
        ],
      },
      {
        id: "whut-short",
        title: "二、简答题",
        description: "每题 15 分，共 60 分。",
        score: 60,
        questions: [
          { id: "whut-short-1", text: "简述材料技术对现代产品设计的影响。", score: 15 },
          { id: "whut-short-2", text: "简述可持续设计在产品全生命周期中的主要策略。", score: 15 },
          { id: "whut-short-3", text: "简述为真实需求而设计的主要观点。", score: 15 },
          { id: "whut-short-4", text: "简述人机工程与产品安全性的关系。", score: 15 },
        ],
      },
      {
        id: "whut-essay",
        title: "三、论述题",
        description: "每题 30 分，共 60 分。",
        score: 60,
        questions: [
          { id: "whut-essay-1", text: "结合工业产品案例，谈设计伦理在当代产品开发中的作用。", score: 30 },
          { id: "whut-essay-2", text: "结合材料选择、结构设计和回收策略，论述可持续设计的产品化路径。", score: 30 },
        ],
      },
    ],
  },
];

export const memoryTasks: MemoryTask[] = [
  {
    id: "m1",
    topic: "包豪斯",
    status: "1天复习",
    prompt: "用 90 秒说清包豪斯的成立背景、教育理念、代表人物与考试答题角度。",
  },
  {
    id: "m2",
    topic: "乌尔姆设计学院",
    status: "3天复习",
    prompt: "复述乌尔姆与包豪斯的区别，并补充它对产品设计方法的意义。",
  },
  {
    id: "m3",
    topic: "绿色设计",
    status: "新学",
    prompt: "整理绿色设计的定义、原则和一个产品设计案例。",
  },
  {
    id: "m4",
    topic: "流线型风格",
    status: "回炉",
    prompt: "重新区分流线型风格的技术来源、商业动机和审美特征。",
  },
];

const formalSketchRubric: SketchScoringCriterion[] = [
  { id: "insight", title: "问题定义与创意方向", score: 30, description: "24–30：明确画出目标用户、场景和痛点，关键功能能逐项回应。15–23：用户及场景可辨，部分功能缺少对应的需求依据。0–14：图上难以识别具体问题，或概念偏离目标人群。" },
  { id: "logic", title: "功能流程与结构逻辑", score: 35, description: "28–35：关键使用步骤完整，并用结构或局部图说明如何实现。18–27：流程可跟随，部分步骤或结构关系缺乏说明。0–17：核心操作路径断裂，或关键功能缺少可辨认的实现方式。" },
  { id: "visual", title: "造型语言与表现技法", score: 35, description: "28–35：主视图比例与透视稳定，必要视图一致，材质和结构表达清楚。18–27：主体可辨认，局部透视、线条或材质表现影响理解。0–17：多处结构冲突或缺少可读的主体视图。" },
  { id: "layout", title: "版面组织与信息表达", score: 30, description: "24–30：主图、流程与细节层级明确，图文有清晰阅读顺序。15–23：关键信息齐全，部分标注拥挤或关系不明。0–14：阅读顺序混乱，主要信息难以找到或辨认。" },
  { id: "school", title: "院校风格与题目契合", score: 20, description: "16–20：明确回应题目中的目标、场景和交付要求。10–15：方向符合题目，遗漏部分约束或交付项。0–9：主要方案偏题，或多数必交内容缺失。院校风格提示用于训练对照。" },
];

export const sketchPrompts: SketchPrompt[] = [
  swjtu894Pilot,
  {
    id: "jiangnan-home",
    schoolId: "jiangnan",
    title: "面向独居青年的智能厨房小家电设计",
    duration: "3 小时",
    totalScore: 150,
    requirements: ["提出用户痛点", "展示功能模块和交互流程", "表现产品 CMF 与生活方式"],
    scoring: formalSketchRubric,
  },
  {
    id: "gafa-culture",
    schoolId: "gafa",
    title: "岭南文化主题便携照明产品设计",
    duration: "3 小时",
    totalScore: 150,
    requirements: ["体现文化符号转译", "强化产品造型记忆点", "完成主效果图、细节图和设计说明"],
    scoring: formalSketchRubric,
  },
  {
    id: "whut-aging",
    schoolId: "whut",
    title: "社区适老化健康监测产品设计",
    duration: "3 小时",
    totalScore: 150,
    requirements: ["说明人机尺度和使用流程", "体现材料与制造可行性", "包含产品爆炸图或功能结构图"],
    scoring: formalSketchRubric,
  },
];

export const membershipBenefits = [
  "四校院校资料库与可信度标注",
  "《世界现代设计史》重点库与背诵卡片",
  "每日艾宾浩斯带背计划",
  "院校风格理论模拟卷生成",
  "产品快题周练题库",
  "AI 手绘评图次数与修改建议",
  "个人学习报告和冲刺薄弱项提醒",
];

export function getSchool(id: SchoolId) {
  return schools.find((school) => school.id === id) ?? schools[0];
}
