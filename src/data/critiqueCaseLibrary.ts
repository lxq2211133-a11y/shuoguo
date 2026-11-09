export type CritiqueCaseQuality = "excellent" | "good" | "problem";

export type CritiqueCaseScores = {
  insight: number;
  layout: number;
  logic: number;
  school: number;
  visual: number;
};

export type CritiqueCase = {
  id: string;
  title: string;
  schoolName: string;
  sketchTitle: string;
  quality: CritiqueCaseQuality;
  imageUrl?: string;
  tags: string[];
  scores: CritiqueCaseScores;
  expertReview: string;
  strengths: string[];
  issues: string[];
  suggestions: string[];
};

export const critiqueCaseLibrary: CritiqueCase[] = [
  {
    id: "jiangnan-kitchen-excellent",
    title: "江南智能厨房小家电高分卷",
    schoolName: "江南大学",
    sketchTitle: "面向独居青年的智能厨房小家电设计",
    quality: "excellent",
    tags: ["方法完整", "用户洞察", "系统表达", "版面克制", "生活产品", "智能硬件", "用户旅程", "CMF"],
    scores: { insight: 27, logic: 32, visual: 30, layout: 27, school: 18 },
    expertReview:
      "这类高分卷的关键是先把独居青年备餐、收纳、清洁的真实痛点说清，再用功能模块、交互流程和生活方式场景形成闭环。版面不追求装饰密度，而是让推导链路稳定可读。",
    strengths: ["痛点、方案、流程和主效果图之间有连续关系。", "产品 CMF 与厨房场景气质统一，说明文字能补足设计价值。"],
    issues: ["如果结构爆炸图过少，评委会难以判断功能可信度。"],
    suggestions: ["保留一张用户旅程小图，再补一张功能模块或清洁维护细节。", "主效果图旁边用 3 个短标签标出核心卖点。"],
  },
  {
    id: "jiangnan-kitchen-problem",
    title: "江南厨房题常见失分卷",
    schoolName: "江南大学",
    sketchTitle: "面向独居青年的智能厨房小家电设计",
    quality: "problem",
    tags: ["用户洞察不足", "流程断裂", "版面拥挤", "功能堆叠", "生活产品", "智能硬件"],
    scores: { insight: 16, logic: 18, visual: 23, layout: 18, school: 11 },
    expertReview:
      "常见问题是把智能厨房题画成普通小家电造型题，只强调外形，不解释独居用户为什么需要、如何使用、清洁和收纳如何解决。版面中箭头很多但缺少明确流程节点。",
    strengths: ["主产品造型还能辨认，具备继续深化基础。"],
    issues: ["痛点来源不明确，功能模块像堆概念。", "流程箭头没有形成使用前、中、后的闭环。", "说明文字挤在角落，不能支撑方案推导。"],
    suggestions: ["重排信息层级：痛点洞察、方案定位、主效果图、使用流程、细节说明。", "删掉 1 到 2 个弱功能，把关键功能画透。"],
  },
  {
    id: "swjtu-mobility-excellent",
    title: "西南交大共享出行高分卷",
    schoolName: "西南交通大学",
    sketchTitle: "校园短途共享出行产品设计",
    quality: "excellent",
    tags: ["工程理性", "场景清楚", "结构可信", "功能闭环", "交通出行产品", "公共设施", "使用流程"],
    scores: { insight: 25, logic: 33, visual: 31, layout: 26, school: 19 },
    expertReview:
      "交通出行类快题要让评委相信产品能在真实校园环境运行。高分表达通常会包含停放、取用、骑行或推行、安全提醒、归还维护等节点，并用结构图解释承重、转向或折叠逻辑。",
    strengths: ["场景链条清楚，产品结构和公共设施系统能互相解释。", "工程细节服务于安全、效率和维护，而不是单纯增加复杂度。"],
    issues: ["若只画外观，会削弱西南交大偏好的工程可信度。"],
    suggestions: ["加入一条从取车到归还的流程带。", "用局部放大图解释锁止、照明、安全提醒或模块维护。"],
  },
  {
    id: "swjtu-mobility-problem",
    title: "西南交大出行题常见失分卷",
    schoolName: "西南交通大学",
    sketchTitle: "校园短途共享出行产品设计",
    quality: "problem",
    tags: ["结构不可信", "场景缺失", "流程不完整", "交通出行产品", "公共设施"],
    scores: { insight: 17, logic: 17, visual: 24, layout: 20, school: 10 },
    expertReview:
      "失分卷往往把出行产品画成概念交通工具，没有交代校园道路、停放管理、安全提醒和使用人群。结构线条看似复杂，但缺少承重、转向、折叠等核心逻辑。",
    strengths: ["题材方向正确，能看到交通工具雏形。"],
    issues: ["缺少真实校园场景，产品尺寸和使用方式不明确。", "结构细节与功能目标没有对应关系。"],
    suggestions: ["先补用户场景和尺寸关系，再画结构细节。", "把流程分成取用、行驶、临停、归还四段。"],
  },
  {
    id: "gafa-light-excellent",
    title: "广美岭南照明高分卷",
    schoolName: "广州美术学院",
    sketchTitle: "岭南文化主题便携照明产品设计",
    quality: "excellent",
    tags: ["概念鲜明", "形态大胆", "表现力强", "版面有记忆点", "文化符号转译", "色彩表现", "文创产品"],
    scores: { insight: 26, logic: 27, visual: 34, layout: 28, school: 19 },
    expertReview:
      "广美风格下，高分卷通常不是简单贴纹样，而是把文化符号转译为形态比例、开合方式、光影效果和材质语言。画面需要有一眼可记住的主视觉，但仍要保留产品逻辑。",
    strengths: ["文化元素转译到造型和光效中，主效果图有记忆点。", "色彩、材质和版面节奏能形成完整视觉故事。"],
    issues: ["如果细节图不足，概念会显得只停留在视觉层。"],
    suggestions: ["补一个光效场景图和一个结构开合细节。", "说明文字聚焦文化来源、转译方式和使用价值。"],
  },
  {
    id: "gafa-light-problem",
    title: "广美文创照明常见失分卷",
    schoolName: "广州美术学院",
    sketchTitle: "岭南文化主题便携照明产品设计",
    quality: "problem",
    tags: ["符号堆叠", "形态普通", "表现力不足", "文化符号转译", "色彩表现"],
    scores: { insight: 18, logic: 21, visual: 22, layout: 19, school: 11 },
    expertReview:
      "常见失分点是把岭南文化处理成纹样贴图，产品本身仍是普通台灯或手电。主视觉缺少形态张力，色彩也没有与地域文化、光影氛围建立关系。",
    strengths: ["有尝试使用文化元素，题目方向没有偏离。"],
    issues: ["文化符号停留在表面装饰，没有转化为产品结构或使用方式。", "主效果图不够突出，版面缺少视觉中心。"],
    suggestions: ["从一个核心符号出发，转译为轮廓、握持、开合或光影。", "提高主效果图尺寸，减少弱小装饰图。"],
  },
  {
    id: "whut-aging-excellent",
    title: "武汉理工适老健康监测高分卷",
    schoolName: "武汉理工大学",
    sketchTitle: "社区适老化健康监测产品设计",
    quality: "excellent",
    tags: ["功能扎实", "材料意识", "应用明确", "逻辑严谨", "适老化产品", "健康监测", "人机尺度", "制造可行性"],
    scores: { insight: 26, logic: 33, visual: 29, layout: 27, school: 19 },
    expertReview:
      "武汉理工相关题目要体现功能、材料、制造和应用落地。高分卷会明确老人、家属、社区服务人员之间的信息关系，并用人机尺度、材料选择和维护方式证明方案可实现。",
    strengths: ["健康监测流程完整，角色关系和数据反馈路径清晰。", "材料、结构和制造表达能够支撑产品可信度。"],
    issues: ["若人机尺度缺失，会影响适老化说服力。"],
    suggestions: ["补握持、读数、佩戴或放置的人机尺寸说明。", "用局部图解释传感器、充电、清洁或模块维护。"],
  },
  {
    id: "whut-aging-problem",
    title: "武汉理工适老题常见失分卷",
    schoolName: "武汉理工大学",
    sketchTitle: "社区适老化健康监测产品设计",
    quality: "problem",
    tags: ["材料意识不足", "应用不明确", "逻辑松散", "适老化产品", "健康监测"],
    scores: { insight: 18, logic: 19, visual: 24, layout: 20, school: 10 },
    expertReview:
      "失分卷常把适老健康产品画成普通智能设备，没有解释老人是否看得清、拿得稳、会不会误触，也没有说明社区场景下数据如何被使用。",
    strengths: ["健康监测方向明确，有基础功能设想。"],
    issues: ["缺少适老化的人机细节，用户角色关系不清。", "材料和制造可行性没有被表达出来。"],
    suggestions: ["增加大字体、握持、防误触、低维护等适老细节。", "画清老人、家属、社区端的信息反馈链路。"],
  },
];
