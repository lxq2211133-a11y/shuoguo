import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  Database,
  FilePenLine,
  GraduationCap,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import {
  examPapers,
  membershipBenefits,
  Reliability,
  schools,
  sketchPrompts,
  theoryTopics,
} from "../data/platformData";
import { sourceRegistry } from "../data/sourceRegistry";
import { getResearchDatabaseSummary, validateSourceRegistry } from "../logic/researchDatabase";
import "./AdminPreview.css";

const reliabilityText: Record<Reliability, string> = {
  official: "官方资料",
  "reliable-secondary": "可信二级资料",
  experience: "经验回忆",
  inference: "运营推断",
};

const reliabilityTone: Record<Reliability, "ok" | "warn" | "risk"> = {
  official: "ok",
  "reliable-secondary": "ok",
  experience: "warn",
  inference: "risk",
};

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function AdminPreview() {
  const pendingSchools = schools.filter((school) => school.reliability !== "official");
  const databaseSummary = getResearchDatabaseSummary(sourceRegistry, schools);
  const validationIssues = validateSourceRegistry(sourceRegistry, schools);
  const verifiedSources = databaseSummary.verifiedSources;
  const officialCoverage =
    databaseSummary.totalSources === 0 ? 0 : databaseSummary.verifiedSources / databaseSummary.totalSources;
  const totalSketchQuestions = sketchPrompts.length;
  const totalPaperQuestions = examPapers.reduce(
    (count, paper) =>
      count + paper.sections.reduce((sectionCount, section) => sectionCount + section.questions.length, 0),
    0,
  );

  const stats = [
    {
      label: "待核实院校资料",
      value: databaseSummary.sourcesNeedingVerification,
      detail: `${formatPercent(officialCoverage)} 来源已可展示`,
      icon: ShieldAlert,
    },
    {
      label: "理论知识点数量",
      value: theoryTopics.length,
      detail: "已进入背诵与组卷池",
      icon: GraduationCap,
    },
    {
      label: "快题题目数量",
      value: totalSketchQuestions,
      detail: `${totalPaperQuestions} 道卷面题同步可用`,
      icon: FilePenLine,
    },
    {
      label: "会员权益数量",
      value: membershipBenefits.length,
      detail: "可用于订阅页与权限校验",
      icon: Sparkles,
    },
  ];

  const queue = [
    {
      title: "院校资料补证",
      meta: `${pendingSchools.length} 所院校仍需补充官方或多来源证据`,
      progress: verifiedSources,
      total: databaseSummary.totalSources,
    },
    {
      title: "理论知识点审核",
      meta: `${theoryTopics.length} 条知识点等待统一标签`,
      progress: theoryTopics.filter((topic) => topic.examForms.length >= 3).length,
      total: theoryTopics.length,
    },
    {
      title: "快题题库入库",
      meta: `${totalSketchQuestions} 条快题题目，${examPapers.length} 套模拟卷`,
      progress: sketchPrompts.filter((prompt) => prompt.scoring.length >= 4).length,
      total: totalSketchQuestions,
    },
  ];

  const reliabilityCounts = schools.reduce<Record<Reliability, number>>(
    (counts, school) => {
      counts[school.reliability] += 1;
      return counts;
    },
    {
      official: 0,
      "reliable-secondary": 0,
      experience: 0,
      inference: 0,
    },
  );

  return (
    <section className="admin-preview" aria-label="内容后台预览">
      <header className="admin-preview__header">
        <div>
          <p className="admin-preview__eyebrow">Admin content preview</p>
          <h2>内容后台预览</h2>
          <p>
            面向运营和教研维护，快速查看院校资料、理论知识、快题题库和会员权益的入库状态。
          </p>
        </div>
        <div className="admin-preview__health">
          <CheckCircle2 size={18} />
          <span>{validationIssues.length === 0 ? "资料库校验通过" : `${validationIssues.length} 条资料需修正`}</span>
        </div>
      </header>

      <div className="admin-preview__stats" aria-label="核心数据概览">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="admin-preview__stat" key={stat.label}>
              <div className="admin-preview__stat-icon">
                <Icon size={20} />
              </div>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.detail}</p>
            </article>
          );
        })}
      </div>

      <div className="admin-preview__grid">
        <section className="admin-preview__panel admin-preview__panel--queue">
          <PanelTitle icon={ClipboardList} title="内容录入队列" />
          <div className="admin-preview__queue">
            {queue.map((item) => {
              const ratio = item.total === 0 ? 0 : item.progress / item.total;
              return (
                <article className="admin-preview__queue-item" key={item.title}>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.meta}</p>
                  </div>
                  <div className="admin-preview__meter" aria-label={`${item.title}完成度`}>
                    <span style={{ width: formatPercent(ratio) }} />
                  </div>
                  <small>
                    {item.progress}/{item.total} 已完成
                  </small>
                </article>
              );
            })}
          </div>
        </section>

        <section className="admin-preview__panel">
          <PanelTitle icon={AlertTriangle} title="资料可信度提醒" />
          <div className="admin-preview__trust-list">
            {schools.map((school) => (
              <article
                className={`admin-preview__trust-item admin-preview__trust-item--${reliabilityTone[school.reliability]}`}
                key={school.id}
              >
                <div>
                  <h3>{school.shortName}</h3>
                  <p>{school.city}</p>
                </div>
                <span>{reliabilityText[school.reliability]}</span>
              </article>
            ))}
          </div>
          <div className="admin-preview__trust-summary">
            {Object.entries(reliabilityCounts).map(([key, count]) => (
              <span key={key}>
                {reliabilityText[key as Reliability]} {count}
              </span>
            ))}
          </div>
        </section>

        <section className="admin-preview__panel admin-preview__panel--ai">
          <PanelTitle icon={Bot} title="AI 服务配置提示" />
          <div className="admin-preview__ai-stack">
            <ConfigTip
              title="评图服务"
              state="待绑定"
              text="接入后可把快题作品、院校风格标签和评分维度组合成评图提示词。"
            />
            <ConfigTip
              title="组卷生成"
              state="建议灰度"
              text="理论知识点和模拟卷题目已具备基础素材，适合先做后台预览生成。"
            />
            <ConfigTip
              title="权益校验"
              state="需联调"
              text="会员权益数量已入库，后续接入账号体系后可映射到功能开关。"
            />
          </div>
        </section>
      </div>
    </section>
  );
}

function PanelTitle({ icon: Icon, title }: { icon: typeof Database; title: string }) {
  return (
    <div className="admin-preview__panel-title">
      <Icon size={18} />
      <h2>{title}</h2>
    </div>
  );
}

function ConfigTip({ title, state, text }: { title: string; state: string; text: string }) {
  return (
    <article className="admin-preview__config-tip">
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <span>{state}</span>
    </article>
  );
}
