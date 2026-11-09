export type TheoryBookRole =
  | "history-core"
  | "theory-core"
  | "industrial-design"
  | "ethics-sustainability";

export type TheoryKnowledgeLevel = "核心必背" | "高频理解" | "拓展掌握";

export type TheoryExamPriority = "重点" | "次重点" | "一般考点";

export type TheorySourceReferenceType =
  | "book-metadata"
  | "exam-reference"
  | "knowledge-summary"
  | "inference";

export type TheorySourceReliability = "official" | "reliable-secondary" | "experience" | "inference";

export type TheorySourceReference = {
  id: string;
  type: TheorySourceReferenceType;
  title: string;
  url: string;
  reliability: TheorySourceReliability;
  notes: string;
};

export type TheoryBook = {
  id: string;
  title: string;
  authors: string[];
  publisher: string;
  edition?: string;
  publishedYear?: number;
  isbn?: string;
  role: TheoryBookRole;
  studyPriority: TheoryExamPriority;
  priorityReason: string;
  sourceIds: string[];
  notes: string;
};

export type TheoryChapter = {
  id: string;
  bookId: string;
  title: string;
  order: number;
  summary: string;
  coreQuestion: string;
};

export type TheoryKnowledgePoint = {
  id: string;
  bookIds: string[];
  chapterIds: string[];
  title: string;
  level: TheoryKnowledgeLevel;
  examPriority: TheoryExamPriority;
  examForms: string[];
  keywords: string[];
  recitation: string;
  answerFrame: string;
  designTransfer: string;
  priorityReason: string;
  sourceIds: string[];
};

export const theorySourceReferences: TheorySourceReference[] = [
  {
    id: "book-world-modern-design-history-google-books",
    type: "book-metadata",
    title: "Google Books《世界现代设计史》书目页",
    url: "https://books.google.com/books/about/%E4%B8%96%E7%95%8C%E7%8E%B0%E4%BB%A3%E8%AE%BE%E8%AE%A1%E5%8F%B2.html?id=Oj9HnQAACAAJ",
    reliability: "reliable-secondary",
    notes: "用于核对书名、作者、出版社和公开书目信息；知识摘要仍保持平台原创整理。",
  },
  {
    id: "book-introduction-to-design-studies-google-books",
    type: "book-metadata",
    title: "Google Books《设计学概论》书目页",
    url: "https://books.google.com/books/about/%E8%AE%BE%E8%AE%A1%E5%AD%A6%E6%A6%82%E8%AE%BA.html?id=SEUn0AEACAAJ",
    reliability: "reliable-secondary",
    notes: "用于核对书名、作者和公开书目信息；具体章节考点为备考摘要。",
  },
  {
    id: "book-industrial-design-history-douban",
    type: "book-metadata",
    title: "豆瓣《工业设计史》书目页",
    url: "https://book.douban.com/subject/1271638/",
    reliability: "reliable-secondary",
    notes: "旧版书目索引，用于通用考点的历史来源记录。",
  },
  {
    id: "book-industrial-design-history-hep-5",
    type: "book-metadata",
    title: "高等教育出版社《工业设计史》第 5 版",
    url: "https://xuanshu.hep.com.cn/front/h5Mobile/bookDetails?bookId=6322f67a938b7cc2960ef203",
    reliability: "official",
    notes: "用于核对版次、作者、出版年月和 ISBN。",
  },
  {
    id: "book-industrial-design-history-ouc-5",
    type: "book-metadata",
    title: "中国海洋大学图书馆《工业设计史》第 5 版目录",
    url: "https://opac.ouc.edu.cn/mspace/searchDetailLocal/mf08ee9d53d780c2d6abf301b3bc18a7b",
    reliability: "official",
    notes: "用于核对第八章与三节主题的归属。",
  },
  {
    id: "met-design-1925-1950",
    type: "knowledge-summary",
    title: "大都会艺术博物馆 1925–1950 年设计展",
    url: "https://www.metmuseum.org/exhibitions/listings/2000/century-of-design-part-ii",
    reliability: "official",
    notes: "馆藏展览提供装饰艺术与斯堪的纳维亚设计的背景、材料和作品实例。",
  },
  {
    id: "met-american-modern-1925-1940",
    type: "knowledge-summary",
    title: "大都会艺术博物馆 1925–1940 年美国现代设计展",
    url: "https://www.metmuseum.org/exhibitions/listings/2000/american-modern",
    reliability: "official",
    notes: "馆藏展览提供美国流线造型及其从交通工具延伸至家用产品的实例。",
  },
  {
    id: "met-aalto-armchair-31",
    type: "knowledge-summary",
    title: "大都会艺术博物馆藏 · 阿尔瓦·阿尔托 31 号扶手椅",
    url: "https://www.metmuseum.org/art/collection/search/483067",
    reliability: "official",
    notes: "馆藏记录提供椅面的悬挑结构、材料与使用特点。",
  },
  {
    id: "smithsonian-loewy-archive",
    type: "knowledge-summary",
    title: "史密森学会 · 雷蒙德·罗维档案",
    url: "https://www.si.edu/object/siris_sil_537697",
    reliability: "official",
    notes: "核对罗维的设计事务所、为西尔斯设计的 Coldspot 冰箱及其职业背景。",
  },
  {
    id: "cooper-hewitt-ekco-ad65",
    type: "knowledge-summary",
    title: "库珀·休伊特设计博物馆 · EKCO AD-65 收音机",
    url: "https://www.cooperhewitt.org/2019/04/17/radio-in-the-round/",
    reliability: "official",
    notes: "馆藏介绍核对科茨的竞标方案、圆形扬声器、模压酚醛塑料机壳及量产考虑。",
  },
  {
    id: "book-design-for-real-world-douban",
    type: "book-metadata",
    title: "豆瓣《为真实的世界设计》书目页",
    url: "https://book.douban.com/subject/35249954/",
    reliability: "reliable-secondary",
    notes: "用于核对中文译本作者、出版社、出版时间和 ISBN；伦理与可持续考点为平台原创备考整理。",
  },
];

export const theoryBooks: TheoryBook[] = [
  {
    id: "world-modern-design-history",
    title: "世界现代设计史",
    authors: ["王受之"],
    publisher: "中国青年出版社",
    publishedYear: 2015,
    role: "history-core",
    studyPriority: "重点",
    priorityReason: "覆盖现代设计史主线，常用于名词解释、简答和论述题建立时间线与流派比较。",
    sourceIds: ["book-world-modern-design-history-google-books"],
    notes: "作为现代设计史主干书，支撑工艺美术运动、新艺术、装饰艺术、现代主义、包豪斯、乌尔姆、美国工业设计和后现代设计等考点。",
  },
  {
    id: "introduction-to-design-studies",
    title: "设计学概论",
    authors: ["尹定邦", "邵宏"],
    publisher: "湖南科学技术出版社",
    publishedYear: 2016,
    role: "theory-core",
    studyPriority: "重点",
    priorityReason: "覆盖设计学学科框架、设计分类、设计批评和设计史等基础理论，是论述题搭框架的主书。",
    sourceIds: ["book-introduction-to-design-studies-google-books"],
    notes: "作为设计学理论框架书，支撑设计学研究范围、设计分类、设计批评、社会科技商业关系和新媒介设计等考点。",
  },
  {
    id: "industrial-design-history",
    title: "工业设计史",
    authors: ["何人可"],
    publisher: "高等教育出版社",
    edition: "第 5 版",
    publishedYear: 2019,
    isbn: "9787040508840",
    role: "industrial-design",
    studyPriority: "次重点",
    priorityReason: "西南交大 337 训练以该版参考书为依据。",
    sourceIds: ["book-industrial-design-history-hep-5", "book-industrial-design-history-ouc-5"],
    notes: "全书从工业革命前的设计讲到信息时代。337 已开放第八、九章的章节试练。",
  },
  {
    id: "design-for-the-real-world",
    title: "为真实的世界设计",
    authors: ["维克多·帕帕奈克"],
    publisher: "北京日报出版社",
    publishedYear: 2020,
    isbn: "9787547737651",
    role: "ethics-sustainability",
    studyPriority: "次重点",
    priorityReason: "偏伦理、社会责任和可持续热点，适合作为论述题拔高材料和当代议题补充。",
    sourceIds: ["book-design-for-real-world-douban"],
    notes: "作为设计伦理和社会责任补充书，支撑真实需求、弱势群体、可持续和资源限制等热点论述。",
  },
];

export const theoryChapters: TheoryChapter[] = [
  {
    id: "modern-design-history-mainline",
    bookId: "world-modern-design-history",
    title: "现代设计史主干",
    order: 1,
    summary: "梳理从工艺美术运动到后现代设计的核心脉络，建立设计史答题的时间线和概念对照。",
    coreQuestion: "现代设计如何从反工业化的手工理想，转向功能主义、系统方法和多元符号表达？",
  },
  {
    id: "bauhaus-and-modernism",
    bookId: "world-modern-design-history",
    title: "包豪斯与现代主义",
    order: 2,
    summary: "集中理解包豪斯、现代主义、乌尔姆设计学院和战后系统设计方法的连续关系。",
    coreQuestion: "现代设计教育如何把艺术、技术、工业生产和社会需求整合为可教学的方法？",
  },
  {
    id: "design-studies-framework",
    bookId: "introduction-to-design-studies",
    title: "设计学理论框架",
    order: 1,
    summary: "建立设计学对象、分类、功能、批评和社会关系的基础框架。",
    coreQuestion: "设计学如何解释设计活动与人、物、社会、技术和商业之间的关系？",
  },
  {
    id: "industrial-design-system",
    bookId: "industrial-design-history",
    title: "工业设计制度与产品系统",
    order: 1,
    summary: "从机器生产、职业化、企业设计制度和人机工程角度理解工业设计的发展逻辑。",
    coreQuestion: "工业设计如何在生产体系、企业竞争和用户需求之间形成专业方法？",
  },
  {
    id: "real-world-design-ethics",
    bookId: "design-for-the-real-world",
    title: "真实需求与设计伦理",
    order: 1,
    summary: "围绕社会责任、弱势群体、资源限制和可持续设计建立热点论述素材。",
    coreQuestion: "设计如何从商业消费转向真实需求、社会责任和可持续价值？",
  },
];

export const theoryKnowledgePoints: TheoryKnowledgePoint[] = [
  {
    id: "arts-and-crafts",
    bookIds: ["world-modern-design-history"],
    chapterIds: ["modern-design-history-mainline"],
    title: "工艺美术运动",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["名词解释", "简答", "论述"],
    keywords: ["莫里斯", "反对粗劣机器制品", "手工艺", "材料诚实", "装饰与生活"],
    recitation: "工艺美术运动是 19 世纪英国面对工业化粗劣产品和历史复古风格时出现的设计改良运动。答题时抓住莫里斯、手工艺价值、材料诚实和设计服务日常生活四个关键词，同时指出它反对机器生产的局限。",
    answerFrame: "背景：工业化产品质量与审美问题。主张：重视手工艺、材料真实、生活化设计。代表：莫里斯及相关实践。评价：提升设计伦理和审美意识，但对机器生产态度保守。",
    designTransfer: "可迁移到产品设计中对手工价值、材料诚实、装饰与功能关系的讨论。",
    priorityReason: "它是现代设计史开端型考点，适合和工业化、手工艺、材料真实、现代设计伦理一起考。",
    sourceIds: ["book-world-modern-design-history-google-books"],
  },
  {
    id: "art-nouveau",
    bookIds: ["world-modern-design-history"],
    chapterIds: ["modern-design-history-mainline"],
    title: "新艺术运动",
    level: "高频理解",
    examPriority: "次重点",
    examForms: ["名词解释", "比较题", "简答"],
    keywords: ["自然曲线", "反历史主义", "整体艺术", "装饰语言", "平面与产品"],
    recitation: "新艺术运动强调摆脱历史复古样式，借助植物曲线、女性形象和有机装饰建立新的视觉语言。答题时要说明它在建筑、平面、家具和产品中的整体设计倾向，也要指出其装饰性强、工业适应性有限。",
    answerFrame: "背景：反对复古装饰。特征：自然曲线、有机形态、整体设计。范围：建筑、家具、平面和产品。评价：创造现代装饰语言，但未彻底解决工业化生产问题。",
    designTransfer: "可迁移到产品形态语言、自然曲线、装饰符号和品牌识别表达。",
    priorityReason: "常作为工艺美术运动、装饰艺术运动和现代主义之间的比较点，理解优先于大段背诵。",
    sourceIds: ["book-world-modern-design-history-google-books"],
  },
  {
    id: "art-deco",
    bookIds: ["world-modern-design-history"],
    chapterIds: ["modern-design-history-mainline"],
    title: "装饰艺术运动",
    level: "高频理解",
    examPriority: "一般考点",
    examForms: ["名词解释", "比较题", "案例分析"],
    keywords: ["几何装饰", "现代材料", "商业审美", "奢华感", "机器时代"],
    recitation: "装饰艺术运动用几何化装饰、现代材料和商业化审美表达机器时代的速度与都市生活。它不像现代主义那样排斥装饰，而是把装饰、消费和现代材料结合起来。",
    answerFrame: "背景：都市消费和机器时代审美。特征：几何化、装饰性、材料更新。价值：连接现代生活与商业传播。比较：区别于现代主义的反装饰和功能主义立场。",
    designTransfer: "可迁移到产品 CMF、几何造型、奢华感塑造和消费电子外观策略。",
    priorityReason: "适合作为风格识别和案例补充，常与新艺术、现代主义作比较，但独立大题优先级较低。",
    sourceIds: ["book-world-modern-design-history-google-books"],
  },
  {
    id: "bauhaus",
    bookIds: ["world-modern-design-history"],
    chapterIds: ["bauhaus-and-modernism"],
    title: "包豪斯",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["名词解释", "简答", "论述"],
    keywords: ["格罗皮乌斯", "艺术与技术统一", "基础课程", "功能主义", "现代设计教育"],
    recitation: "包豪斯是现代设计教育的核心节点。答题时先交代格罗皮乌斯创办背景，再说明艺术与技术统一、基础课程、工作坊教学和面向工业生产的设计观，最后评价它对现代主义、产品设计和设计教育体系的深远影响。",
    answerFrame: "背景：工业生产与艺术教育整合需求。理念：艺术与技术新的统一。教学：基础课、材料实验、工作坊。影响：功能主义、标准化、现代设计教育。评价：奠定现代设计教育范式。",
    designTransfer: "可迁移到产品造型、功能主义、材料工艺与现代设计教育。",
    priorityReason: "几乎能贯穿现代主义、设计教育、功能主义、工业化生产和产品设计方法，是最高频核心节点。",
    sourceIds: ["book-world-modern-design-history-google-books"],
  },
  {
    id: "ulm",
    bookIds: ["world-modern-design-history"],
    chapterIds: ["bauhaus-and-modernism"],
    title: "乌尔姆设计学院",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["简答", "论述", "比较题"],
    keywords: ["系统设计", "科学方法", "理性分析", "布劳恩", "设计方法论"],
    recitation: "乌尔姆设计学院继承包豪斯的现代设计教育方向，但更强调科学方法、系统分析、信息理论和产品系统。答题时要抓住它从艺术中心转向理性方法的变化，并联系布劳恩产品和现代产品设计方法。",
    answerFrame: "继承：延续现代设计教育。转向：科学、理性、系统方法。实践：产品系统、信息设计、企业合作。影响：推动设计方法论和现代工业产品语言。",
    designTransfer: "适合解释产品设计中理性分析、模块化、用户与系统关系。",
    priorityReason: "是包豪斯之后的设计方法论关键节点，尤其适合产品设计、系统设计和理性方法论题目。",
    sourceIds: ["book-world-modern-design-history-google-books"],
  },
  {
    id: "streamline",
    bookIds: ["world-modern-design-history", "industrial-design-history"],
    chapterIds: ["modern-design-history-mainline", "industrial-design-system"],
    title: "流线型风格",
    level: "高频理解",
    examPriority: "次重点",
    examForms: ["名词解释", "比较题"],
    keywords: ["美国工业设计", "速度感", "空气动力学意象", "商业促销", "消费社会"],
    recitation: "流线型风格是美国工业设计中常见的商业化造型语言。它借用速度、空气动力学和未来感符号，使产品具有现代感和消费吸引力。答题时要区分真实功能优化与商业造型包装。",
    answerFrame: "背景：美国消费市场与工业竞争。特征：速度感、圆滑外形、未来感。动机：商业促销和产品更新。评价：推动工业设计职业化，也可能流于形式主义。",
    designTransfer: "可用于讨论工业产品造型、消费欲望与市场驱动设计。",
    priorityReason: "常用于说明美国工业设计、消费社会和商业造型，不如包豪斯系统性强，但比较题价值高。",
    sourceIds: ["book-world-modern-design-history-google-books", "book-industrial-design-history-douban"],
  },
  {
    id: "postmodern",
    bookIds: ["world-modern-design-history"],
    chapterIds: ["modern-design-history-mainline"],
    title: "后现代主义设计",
    level: "高频理解",
    examPriority: "次重点",
    examForms: ["简答", "论述", "案例分析"],
    keywords: ["反现代主义单一理性", "多元符号", "历史隐喻", "孟菲斯", "情感与游戏"],
    recitation: "后现代主义设计反对现代主义单一的功能理性和普遍形式，强调符号、多元、隐喻、装饰和情感体验。答题时可用孟菲斯说明其色彩、形态和反严肃的视觉策略。",
    answerFrame: "背景：现代主义理性范式受到质疑。特征：多元、符号、装饰、隐喻。代表：孟菲斯。评价：拓展设计表达和情感价值，也可能削弱功能秩序。",
    designTransfer: "帮助产品快题建立差异化造型、符号表达和情绪价值。",
    priorityReason: "适合与现代主义做观念对比，也能服务消费文化、符号和情感化产品论述。",
    sourceIds: ["book-world-modern-design-history-google-books"],
  },
  {
    id: "design-studies-scope",
    bookIds: ["introduction-to-design-studies"],
    chapterIds: ["design-studies-framework"],
    title: "设计学的研究范围",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["简答", "论述"],
    keywords: ["设计现象", "设计历史", "设计批评", "设计方法", "跨学科"],
    recitation: "设计学研究的不只是造型结果，还包括设计历史、设计理论、设计方法、设计批评以及设计与社会文化技术的关系。答题时要体现它的跨学科属性和对实践的解释能力。",
    answerFrame: "对象：设计现象与设计活动。内容：历史、理论、方法、批评。属性：跨学科。意义：为设计实践、教育和评价提供理论支撑。",
    designTransfer: "可用于产品方案说明中的研究方法、设计定位和评价维度建构。",
    priorityReason: "这是设计学概论的总纲考点，能帮助所有论述题先搭出学科对象和研究范围。",
    sourceIds: ["book-introduction-to-design-studies-google-books"],
  },
  {
    id: "design-function-psychology",
    bookIds: ["introduction-to-design-studies"],
    chapterIds: ["design-studies-framework"],
    title: "设计的功能需求与心理需求",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["简答", "论述", "案例分析"],
    keywords: ["实用功能", "审美功能", "情感需求", "符号价值", "用户体验"],
    recitation: "设计既要满足实用功能，也要回应审美、情感、身份和符号需求。答题时可以用产品设计说明功能价值和心理价值如何共同影响用户体验。",
    answerFrame: "功能层：可用性、效率、安全。心理层：审美、情感、身份、符号。关系：功能是基础，心理需求提升体验和价值。案例：结合具体产品分析。",
    designTransfer: "可迁移到用户洞察、情绪化设计、品牌识别和产品体验设计。",
    priorityReason: "连接设计理论与产品分析，能稳定迁移到用户体验、情感化设计和案例分析题。",
    sourceIds: ["book-introduction-to-design-studies-google-books"],
  },
  {
    id: "design-criticism",
    bookIds: ["introduction-to-design-studies"],
    chapterIds: ["design-studies-framework"],
    title: "设计批评",
    level: "高频理解",
    examPriority: "次重点",
    examForms: ["名词解释", "简答", "论述"],
    keywords: ["评价标准", "社会语境", "功能审美", "伦理责任", "案例分析"],
    recitation: "设计批评是对设计作品、设计现象和设计价值的分析评价。它不只判断好看与否，还要结合功能、审美、技术、社会语境和伦理责任建立评价标准。",
    answerFrame: "定义：对设计现象的分析评价。维度：功能、审美、技术、社会、伦理。方法：结合语境和案例。意义：推动设计改进和公众理解。",
    designTransfer: "可用于评图、方案复盘和论述题中的评价框架。",
    priorityReason: "它是评价类和案例类题目的框架工具，独立背诵量适中，但使用场景很广。",
    sourceIds: ["book-introduction-to-design-studies-google-books"],
  },
  {
    id: "industrial-design-professionalization",
    bookIds: ["industrial-design-history"],
    chapterIds: ["industrial-design-system"],
    title: "工业设计职业化",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["简答", "论述"],
    keywords: ["机器生产", "企业竞争", "职业设计师", "产品开发", "市场需求"],
    recitation: "工业设计职业化来自机器生产、市场竞争和企业产品开发的共同推动。设计师开始在造型、功能、制造、品牌和用户需求之间承担专业整合角色。",
    answerFrame: "背景：工业生产和市场竞争。角色：职业设计师介入产品开发。内容：造型、功能、制造、品牌、用户。意义：推动现代工业产品质量和企业竞争力。",
    designTransfer: "可迁移到产品开发流程、企业设计策略和设计师角色论述。",
    priorityReason: "对产品设计方向尤其重要，能解释工业设计从造型到企业产品开发的专业化过程。",
    sourceIds: ["book-industrial-design-history-douban"],
  },
  {
    id: "human-factors-product-system",
    bookIds: ["industrial-design-history", "introduction-to-design-studies"],
    chapterIds: ["industrial-design-system", "design-studies-framework"],
    title: "人机工程与产品系统",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["名词解释", "简答", "案例分析"],
    keywords: ["人体尺度", "操作效率", "安全性", "产品系统", "用户场景"],
    recitation: "人机工程关注人与产品、环境之间的尺度、操作、安全和效率关系。产品系统则要求把单一产品放入用户流程、服务和环境中理解。",
    answerFrame: "人机工程：尺度、操作、安全、效率。产品系统：产品、用户、环境、服务流程。关系：从单点功能走向系统体验。案例：结合具体产品说明。",
    designTransfer: "直接服务快题中的尺寸推导、使用流程、交互细节和场景表达。",
    priorityReason: "既是理论题高频概念，也是快题方案推导的基础，适合重点掌握并反复迁移。",
    sourceIds: ["book-industrial-design-history-douban", "book-introduction-to-design-studies-google-books"],
  },
  {
    id: "real-world-design",
    bookIds: ["design-for-the-real-world"],
    chapterIds: ["real-world-design-ethics"],
    title: "为真实需求而设计",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["论述", "案例分析", "热点题"],
    keywords: ["真实需求", "社会责任", "弱势群体", "反消费主义", "设计伦理"],
    recitation: "为真实需求而设计强调设计不能只服务商业消费和形式更新，还要回应人的真实问题、弱势群体和社会责任。答题时要把伦理立场转化为具体产品策略。",
    answerFrame: "问题：过度消费和形式主义。主张：真实需求、社会责任、弱势群体。方法：低成本、可获得、可持续。评价：拓展设计价值和公共意义。",
    designTransfer: "可迁移到适老化、无障碍、公共服务、低成本医疗和可持续产品设计。",
    priorityReason: "适合当代设计伦理、公共服务、弱势群体和社会责任题，是论述题拔高材料。",
    sourceIds: ["book-design-for-real-world-douban"],
  },
  {
    id: "sustainable-design",
    bookIds: ["design-for-the-real-world", "introduction-to-design-studies"],
    chapterIds: ["real-world-design-ethics", "design-studies-framework"],
    title: "可持续设计",
    level: "核心必背",
    examPriority: "重点",
    examForms: ["简答", "论述", "热点题"],
    keywords: ["生命周期", "资源限制", "可维修", "低碳材料", "循环利用"],
    recitation: "可持续设计强调在产品全生命周期中降低资源消耗和环境负担。答题时不要只写环保口号，要落到材料、结构、制造、运输、使用、维护和回收策略。",
    answerFrame: "定义：面向资源和环境约束的设计。维度：材料、制造、使用、维护、回收。策略：低碳、耐用、可维修、循环。案例：结合产品生命周期展开。",
    designTransfer: "可迁移到材料选择、结构简化、模块维修、包装减量和服务系统设计。",
    priorityReason: "可持续是稳定热点，容易与材料、生命周期、社会责任和产品策略合并成大题。",
    sourceIds: ["book-design-for-real-world-douban", "book-introduction-to-design-studies-google-books"],
  },
];
