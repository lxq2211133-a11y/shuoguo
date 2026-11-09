import { FormEvent, useMemo, useState } from "react";
import {
  BookOpenCheck,
  FileSearch,
  GraduationCap,
  Layers3,
  ListChecks,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import type { SourceContentTarget, SourceType } from "../data/sourceRegistry";
import "./ContentIntake.css";

type IntakeType = "theory" | "source" | "sketch";
type Credibility = SourceType;

type PendingRecord = {
  id: number;
  type: IntakeType;
  title: string;
  summary: string;
  meta: string;
  credibility: Credibility;
  createdAt: string;
  sourceUrl?: string;
  year?: string;
  contentTargets: SourceContentTarget[];
};

type FormState = {
  type: IntakeType;
  title: string;
  school: string;
  chapter: string;
  sourceUrl: string;
  duration: string;
  summary: string;
  credibility: Credibility;
  year: string;
  contentTargets: SourceContentTarget[];
};

const intakeTypes: Array<{
  id: IntakeType;
  label: string;
  detail: string;
  icon: typeof BookOpenCheck;
}> = [
  {
    id: "theory",
    label: "理论知识点",
    detail: "教材章节、考点解释、答题角度",
    icon: BookOpenCheck,
  },
  {
    id: "source",
    label: "院校资料来源",
    detail: "招生目录、参考书、公开通知、访谈回忆",
    icon: GraduationCap,
  },
  {
    id: "sketch",
    label: "手绘快题题目",
    detail: "题干、时长、限制条件、评分关注点",
    icon: PenLine,
  },
];

const credibilityOptions: Array<{ value: Credibility; label: string; note: string }> = [
  { value: "official", label: "官方", note: "学校、学院或考试机构直接发布" },
  { value: "reliable-secondary", label: "二级资料", note: "机构整理、公开报道或多处转载资料" },
  { value: "experience", label: "经验来源", note: "上岸经验、回忆版、师兄师姐口述" },
  { value: "inference", label: "推断", note: "基于趋势、题型或院校偏好推演" },
];

const contentTargetOptions: Array<{ value: SourceContentTarget; label: string }> = [
  { value: "school", label: "院校资料" },
  { value: "theory", label: "理论知识" },
  { value: "sketch", label: "快题训练" },
  { value: "training", label: "学习任务" },
];

const typeText: Record<IntakeType, string> = {
  theory: "理论知识点",
  source: "院校资料来源",
  sketch: "手绘快题题目",
};

const credibilityText: Record<Credibility, string> = {
  official: "官方",
  "reliable-secondary": "二级资料",
  experience: "经验来源",
  inference: "推断",
};

const initialForm: FormState = {
  type: "theory",
  title: "",
  school: "",
  chapter: "",
  sourceUrl: "",
  duration: "",
  summary: "",
  credibility: "official",
  year: "",
  contentTargets: ["school"],
};

function getMeta(form: FormState) {
  if (form.type === "theory") {
    return form.chapter.trim() || "未填写章节";
  }

  if (form.type === "source") {
    return form.school.trim() || "未填写院校";
  }

  const school = form.school.trim() || "未填写院校";
  const duration = form.duration.trim() || "未填写时长";
  return `${school} / ${duration}`;
}

function getPlaceholder(type: IntakeType) {
  if (type === "theory") {
    return "例如：包豪斯教育体系的核心主张、产品设计答题角度、常见考法。";
  }

  if (type === "source") {
    return "例如：资料覆盖年份、发布主体、能支撑哪些院校字段、仍需复核的疑点。";
  }

  return "例如：题干背景、目标用户、必须呈现的草图内容、评分时重点关注的表现项。";
}

export default function ContentIntake() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [records, setRecords] = useState<PendingRecord[]>([]);

  const activeType = useMemo(
    () => intakeTypes.find((item) => item.id === form.type) ?? intakeTypes[0],
    [form.type],
  );
  const ActiveIcon = activeType.icon;

  const updateForm = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleContentTarget = (target: SourceContentTarget) => {
    setForm((current) => {
      const nextTargets = current.contentTargets.includes(target)
        ? current.contentTargets.filter((item) => item !== target)
        : [...current.contentTargets, target];

      return {
        ...current,
        contentTargets: nextTargets.length === 0 ? current.contentTargets : nextTargets,
      };
    });
  };

  const submitRecord = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextRecord: PendingRecord = {
      id: Date.now(),
      type: form.type,
      title: form.title.trim(),
      summary: form.summary.trim(),
      meta: getMeta(form),
      credibility: form.credibility,
      createdAt: new Intl.DateTimeFormat("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
      sourceUrl: form.type === "source" ? form.sourceUrl.trim() : undefined,
      year: form.type === "source" ? form.year.trim() : undefined,
      contentTargets: form.type === "source" ? form.contentTargets : [],
    };

    setRecords((current) => [nextRecord, ...current]);
    setForm((current) => ({
      ...initialForm,
      type: current.type,
      credibility: current.credibility,
    }));
  };

  return (
    <section className="content-intake" aria-label="内容录入表单">
      <header className="content-intake__header">
        <div>
          <p className="content-intake__eyebrow">Content intake</p>
          <h2>内容录入工作台</h2>
          <p>
            将理论考点、院校资料来源和手绘快题题目先进入待审核队列，后续可接入真实数据服务与审核流。
          </p>
        </div>
        <div className="content-intake__status" aria-label="待审核记录数量">
          <ListChecks size={18} />
          <span>{records.length} 条待审核</span>
        </div>
      </header>

      <div className="content-intake__layout">
        <form className="content-intake__form" onSubmit={submitRecord}>
          <div className="content-intake__section-title">
            <Layers3 size={18} />
            <h3>选择录入类型</h3>
          </div>

          <div className="content-intake__type-grid" role="radiogroup" aria-label="录入类型">
            {intakeTypes.map((item) => {
              const Icon = item.icon;
              const isActive = form.type === item.id;

              return (
                <button
                  aria-checked={isActive}
                  className={
                    isActive
                      ? "content-intake__type-card content-intake__type-card--active"
                      : "content-intake__type-card"
                  }
                  key={item.id}
                  onClick={() => updateForm("type", item.id)}
                  role="radio"
                  type="button"
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </button>
              );
            })}
          </div>

          <div className="content-intake__section-title">
            <ActiveIcon size={18} />
            <h3>{activeType.label}</h3>
          </div>

          <div className="content-intake__fields">
            <label className="content-intake__field">
              <span>标题</span>
              <input
                onChange={(event) => updateForm("title", event.target.value)}
                placeholder="输入待录入内容标题"
                required
                type="text"
                value={form.title}
              />
            </label>

            {form.type === "theory" && (
              <label className="content-intake__field">
                <span>章节或知识模块</span>
                <input
                  onChange={(event) => updateForm("chapter", event.target.value)}
                  placeholder="例如：世界现代设计史 / 包豪斯"
                  required
                  type="text"
                  value={form.chapter}
                />
              </label>
            )}

            {form.type !== "theory" && (
              <label className="content-intake__field">
                <span>关联院校</span>
                <input
                  onChange={(event) => updateForm("school", event.target.value)}
                  placeholder="例如：江南大学"
                  required
                  type="text"
                  value={form.school}
                />
              </label>
            )}

            {form.type === "source" && (
              <>
                <label className="content-intake__field content-intake__field--wide">
                  <span>资料链接或出处</span>
                  <input
                    onChange={(event) => updateForm("sourceUrl", event.target.value)}
                    placeholder="https:// 或书名、公告标题、访谈出处"
                    required
                    type="text"
                    value={form.sourceUrl}
                  />
                </label>

                <label className="content-intake__field">
                  <span>资料年份</span>
                  <input
                    onChange={(event) => updateForm("year", event.target.value)}
                    placeholder="例如：2026"
                    type="text"
                    value={form.year}
                  />
                </label>

                <fieldset className="content-intake__field content-intake__field--wide">
                  <legend>支撑内容</legend>
                  <div className="content-intake__target-options">
                    {contentTargetOptions.map((option) => (
                      <label key={option.value}>
                        <input
                          checked={form.contentTargets.includes(option.value)}
                          onChange={() => toggleContentTarget(option.value)}
                          type="checkbox"
                        />
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </>
            )}

            {form.type === "sketch" && (
              <label className="content-intake__field">
                <span>作答时长</span>
                <input
                  onChange={(event) => updateForm("duration", event.target.value)}
                  placeholder="例如：3 小时"
                  required
                  type="text"
                  value={form.duration}
                />
              </label>
            )}

            <label className="content-intake__field content-intake__field--wide">
              <span>内容摘要</span>
              <textarea
                onChange={(event) => updateForm("summary", event.target.value)}
                placeholder={getPlaceholder(form.type)}
                required
                rows={5}
                value={form.summary}
              />
            </label>

            <label className="content-intake__field content-intake__field--wide">
              <span>可信度</span>
              <select
                onChange={(event) => updateForm("credibility", event.target.value as Credibility)}
                value={form.credibility}
              >
                {credibilityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="content-intake__credibility-list" aria-label="可信度说明">
            {credibilityOptions.map((option) => (
              <article
                className={`content-intake__credibility content-intake__credibility--${option.value}`}
                key={option.value}
              >
                <ShieldCheck size={15} />
                <div>
                  <strong>{option.label}</strong>
                  <span>{option.note}</span>
                </div>
              </article>
            ))}
          </div>

          <button className="content-intake__submit" type="submit">
            <FileSearch size={18} />
            新增待审核记录
          </button>
        </form>

        <aside className="content-intake__queue" aria-label="待审核记录">
          <div className="content-intake__section-title">
            <ListChecks size={18} />
            <h3>待审核记录</h3>
          </div>

          {records.length === 0 ? (
            <div className="content-intake__empty">
              <FileSearch size={34} />
              <p>提交表单后，记录会在这里以待审核状态暂存。</p>
            </div>
          ) : (
            <div className="content-intake__record-list">
              {records.map((record) => (
                <article className="content-intake__record" key={record.id}>
                  <div className="content-intake__record-head">
                    <span>{typeText[record.type]}</span>
                    <small>{record.createdAt}</small>
                  </div>
                  <h4>{record.title}</h4>
                  <p>{record.summary}</p>
                  <div className="content-intake__record-meta">
                    <span>{record.meta}</span>
                    <strong className={`content-intake__badge content-intake__badge--${record.credibility}`}>
                      {credibilityText[record.credibility]}
                    </strong>
                    {record.type === "source" && record.contentTargets.length > 0 && (
                      <span>
                        {record.contentTargets
                          .map((target) => contentTargetOptions.find((option) => option.value === target)?.label)
                          .join(" / ")}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
