import type { MemoryTask } from "./platformData";
import { theoryKnowledgePoints, type TheoryChapter, type TheoryKnowledgePoint } from "./theoryKnowledgeBase";

const chapter8: TheoryChapter = {
  id: "industrial-design-history-5-ch8",
  bookId: "industrial-design-history",
  order: 8,
  title: "第八章 · 20 世纪二三十年代的流行风格",
  summary: "用装饰艺术、流线型与斯堪的纳维亚风格三张卡片，比较同时期设计如何回应不同的市场、材料和使用需求。",
  coreQuestion: "三种风格分别怎样处理形式、材料与使用需求？",
};

const chapter9: TheoryChapter = {
  id: "industrial-design-history-5-ch9",
  bookId: "industrial-design-history",
  order: 9,
  title: "第九章 · 职业工业设计师的出现",
  summary: "用美国的家电设计委托和欧洲的收音机设计案例，练习从企业、设计师和制造三个角度解释职业化。",
  coreQuestion: "工业设计师如何参与产品开发，并在企业需求、制造和使用之间做取舍？",
};

const chapter8Fields = {
  bookIds: [chapter8.bookId],
  chapterIds: [chapter8.id],
  priorityReason: "用于第八章的风格对照练习，按背景、形式、材料和代表案例组织答案。",
};

const chapter8Points: TheoryKnowledgePoint[] = [
  ...theoryKnowledgePoints.filter((point) => point.id === "art-deco" || point.id === "streamline").map((point) => ({
    ...point,
    ...chapter8Fields,
    ...(point.id === "art-deco" ? {
      recitation: "以 1925 年巴黎博览会为记忆坐标。装饰艺术风格把几何化造型和精细装饰结合，常借材料与表面工艺表现都市消费中的现代感和奢华感。",
      answerFrame: "背景：以 1925 年巴黎博览会为记忆坐标。形式：几何构成与精细装饰。案例：鲁尔曼的餐边柜用乌木、象牙与银饰青铜表现奢华质感。比较：对照流线型风格，说明几何装饰和速度意象各自如何传达现代感。",
      sourceIds: ["book-industrial-design-history-ouc-5", "met-design-1925-1950"],
    } : {
      answerFrame: "背景：二三十年代美国的工业与消费市场。形式：圆滑曲面、连续轮廓与速度感。案例：德雷福斯设计的‘二十世纪特快’与鲁雷尔·吉尔德设计的 Electrolux 30 型吸尘器。区分：交通工具的造型可以回应减阻需求，吸尘器借用类似轮廓传达速度与现代感。",
      sourceIds: ["book-industrial-design-history-ouc-5", "met-american-modern-1925-1940"],
    }),
  })),
  {
    ...chapter8Fields,
    id: "scandinavian-design",
    title: "斯堪的纳维亚风格",
    level: "高频理解",
    examPriority: "次重点",
    examForms: ["名词解释", "比较题", "案例分析"],
    keywords: ["自然材料", "有机曲线", "模压胶合板", "使用舒适", "阿尔瓦·阿尔托"],
    recitation: "以 20 世纪 30 年代的北欧家具为例，这一风格把现代工艺、自然材料和使用舒适结合起来。阿尔瓦·阿尔托的 31 号扶手椅通过模压胶合板与弯木做出柔和曲线。",
    answerFrame: "背景：20 世纪 30 年代的北欧现代设计。形式：柔和曲线与贴合身体的形态。案例：阿尔瓦·阿尔托的 31 号扶手椅用弯木框架支撑曲面椅板，形成悬挑结构。比较：联系装饰艺术的表面工艺、流线型的速度感，指出三者追求的使用或视觉效果。",
    designTransfer: "设计座椅时，用接触部位和制造方式解释曲线与材料选择。",
    sourceIds: ["book-industrial-design-history-ouc-5", "met-design-1925-1950", "met-aalto-armchair-31"],
  },
];

const chapter8Tasks: MemoryTask[] = [
  { id: "theory-art-deco", topic: "装饰艺术运动", status: "新学", prompt: "用一件作品说明装饰艺术如何结合几何形式、材料工艺和现代消费。" },
  { id: "m4", topic: "流线型风格", status: "新学", prompt: "用一个交通工具和一个家用品解释流线造型，分别说明减阻与速度意象的作用。" },
  { id: "theory-scandinavian-design", topic: "斯堪的纳维亚风格", status: "新学", prompt: "用阿尔托的家具说明材料、工艺、曲线和使用舒适之间的关系。" },
];

const chapter9Fields = {
  bookIds: [chapter9.bookId],
  chapterIds: [chapter9.id],
  level: "高频理解" as const,
  examPriority: "次重点" as const,
  examForms: ["简答", "比较题", "案例分析"],
  priorityReason: "用于第九章的案例练习，按企业需求、设计决策和产品影响组织答案。",
};

const chapter9Points: TheoryKnowledgePoint[] = [
  {
    ...chapter9Fields,
    id: "industrial-design-professionalization",
    title: "美国工业设计的职业化",
    keywords: ["雷蒙德·罗维", "设计事务所", "西尔斯", "Coldspot", "企业委托"],
    recitation: "美国的职业工业设计师可以通过独立事务所为企业提供产品设计服务。雷蒙德·罗维于 1929 年在纽约创办事务所，1934 年为西尔斯设计的 Coldspot 冰箱是家电领域的例子。",
    answerFrame: "背景：工业化生产和消费市场推动企业寻求专门的设计服务。组织方式：罗维在纽约创办设计事务所，承接企业委托。案例：西尔斯的 Coldspot 冰箱，把专业设计带入面向大众市场的家电。意义：设计师通过持续的商业项目参与产品开发，职业角色逐步明确。",
    designTransfer: "分析今天的家电改款时，分开讨论企业目标、使用场景与具体设计决策。",
    sourceIds: ["book-industrial-design-history-ouc-5", "smithsonian-loewy-archive", "met-american-modern-1925-1940"],
  },
  {
    ...chapter9Fields,
    id: "european-industrial-designers",
    title: "欧洲的工业设计师",
    keywords: ["威尔斯·科茨", "EKCO AD-65", "圆形扬声器", "模压酚醛塑料", "设计竞标"],
    recitation: "英国制造商 EKCO 通过设计竞赛选择了威尔斯·科茨的圆形收音机方案，并在 1934 年推出 AD-65。科茨把圆形扬声器、机壳材料和面板布局纳入同一套设计。",
    answerFrame: "背景：英国收音机制造商希望采用塑料机壳。合作方式：科茨通过企业举办的设计竞赛获得委托。方案：圆形机壳顺应扬声器形状，表盘和旋钮分区布置。制造：圆壳适于模压酚醛塑料，也减少了模具需求。比较：科茨的案例可与罗维的企业委托对照，分析设计师如何介入产品开发。",
    designTransfer: "为电子设备做外壳时，从内部部件、操作布局和制造工艺解释外形。",
    sourceIds: ["book-industrial-design-history-ouc-5", "cooper-hewitt-ekco-ad65"],
  },
];

const chapter9Tasks: MemoryTask[] = [
  { id: "theory-industrial-design-professionalization", topic: "美国工业设计的职业化", status: "新学", prompt: "用罗维和西尔斯的 Coldspot 冰箱说明独立设计事务所怎样参与企业产品开发。" },
  { id: "theory-european-industrial-designers", topic: "欧洲的工业设计师", status: "新学", prompt: "用科茨的 EKCO AD-65 收音机说明企业如何委托设计，圆壳如何回应内部部件和制造工艺。" },
];

export const swjtu337Units = [
  { chapter: chapter8, points: chapter8Points, tasks: chapter8Tasks },
  { chapter: chapter9, points: chapter9Points, tasks: chapter9Tasks },
];

export const swjtu337TheoryPoints = swjtu337Units.flatMap((unit) => unit.points);
export const swjtu337MemoryTasks = swjtu337Units.flatMap((unit) => unit.tasks);
