import { useEffect, useState } from "react";
import type { SketchPrompt } from "../data/platformData";
import { readSketch, type UploadedSketch } from "../services/sketchReview";
import { studyError, studyRequest } from "../services/studyAccount";
import { TeacherReviewQueue } from "./ReportReview";

export type PublishedRubric = Pick<SketchPrompt, "totalScore" | "scoring"> & { id: string };
export type TeachingMark = { id: string; score: number; evidence: string };
export type TeachingCase = { id: string; version: string; title: string; image: UploadedSketch | null; marks: TeachingMark[]; authorized: boolean };
type MaterialKind = "case" | "blind";
type MaterialDraft = Omit<TeachingCase, "marks"> & {
  kind: MaterialKind;
  workCode: string;
  marks: Array<Omit<TeachingMark, "score"> & { score: number | null }>;
};
type Entry = { kind: "rubric" | MaterialKind; id: string; title: string; workCode: string | null; status: "draft" | "published" | "ready" | "hidden" };
type Catalog = { rubric: PublishedRubric | null; pilotRubric: PublishedRubric | null; entries: Entry[] };

const entryGroups = [
  { kind: "case", title: "RAG 案例库", empty: "还没有已登记的案例。" },
  { kind: "blind", title: "盲评样本", empty: "还没有已登记的盲评作品。" },
  { kind: "rubric", title: "评分表管理", empty: "使用内置评分表或新建评分表版本。" },
] as const;
const entryStatusText = { published: "已发布", draft: "草稿", ready: "已登记 · 仅教研可见", hidden: "已移出" };

export default function TeachingDesk({ sketch, onPublish }: { sketch: SketchPrompt; onPublish: (rubric: PublishedRubric | null) => void }) {
  const [catalog, setCatalog] = useState<Catalog>({ rubric: null, pilotRubric: null, entries: [] });
  const [rubric, setRubric] = useState<PublishedRubric | null>(null);
  const [reference, setReference] = useState<MaterialDraft | null>(null);
  const [blindPreview, setBlindPreview] = useState<Pick<MaterialDraft, "title" | "workCode" | "image"> | null>(null);
  const [newMaterialVersion, setNewMaterialVersion] = useState("");
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const labelingRubrics = [catalog.rubric, catalog.pilotRubric].filter((item): item is PublishedRubric => Boolean(item));
  const newMaterialRubric = labelingRubrics.find((item) => item.id === newMaterialVersion) ?? catalog.rubric;
  const materialRubric = labelingRubrics.find((item) => item.id === reference?.version);

  useEffect(() => {
    let active = true;
    void studyRequest<Catalog>("teaching-list", { sketchId: sketch.id }).then((result) => {
      if (active) setCatalog(result);
    }).catch((error) => { if (active) setNotice(studyError(error)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [sketch.id]);

  async function perform(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(studyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function refresh(published: boolean) {
    const next = await studyRequest<Catalog>("teaching-list", { sketchId: sketch.id });
    setCatalog(next);
    if (published) onPublish(next.rubric);
  }

  async function save(publish: boolean) {
    await perform(async () => {
      const item = rubric ?? reference;
      if (!item) return;
      await studyRequest("teaching-save", { sketchId: sketch.id, kind: reference?.kind ?? "rubric", item, publish });
      setRubric(null);
      setReference(null);
      await refresh(Boolean(rubric && publish));
      setNotice(!publish ? "草稿已保存。" : reference?.kind === "blind" ? "已存入盲评集，仅教研可见。" : "已发布。");
    });
  }

  function startMaterial(kind: MaterialKind) {
    if (!newMaterialRubric) return;
    setRubric(null);
    setReference({ kind, id: crypto.randomUUID(), version: newMaterialRubric.id, title: "", workCode: "", image: null, authorized: false,
      marks: kind === "case" ? newMaterialRubric.scoring.map((item) => ({ id: item.id, score: null, evidence: "" })) : [] });
  }

  async function editDraft(entry: Entry) {
    await perform(async () => {
      const fields = { kind: entry.kind, id: entry.id };
      if (entry.kind === "rubric") {
        setRubric(await studyRequest<PublishedRubric>("teaching-read", fields));
        setReference(null);
      } else {
        const item = await studyRequest<Omit<MaterialDraft, "kind">>("teaching-read", fields);
        if (!labelingRubrics.some((version) => version.id === item.version)) throw new Error("评分表已更新，请按可用版本重新录入。");
        setReference({ ...item, kind: entry.kind, workCode: item.workCode ?? "", marks: item.marks ?? [] });
        setRubric(null);
      }
    });
  }

  async function hideEntry(entry: Entry) {
    await perform(async () => {
      await studyRequest("teaching-hide", { kind: entry.kind, id: entry.id });
      setBlindPreview(null);
      await refresh(entry.kind === "rubric");
      setNotice(entry.kind === "blind" ? "已移出盲评集。" : "已下架。");
    });
  }

  return <div className="detail-stack">
    <TeacherReviewQueue />
    <article className="detail-card hero-detail-card"><span>快题教研</span><h3>{sketch.title}</h3>
      <p>{catalog.rubric ? `当前评分表版本 ${catalog.rubric.id}` : "请先发布本题的评分表。"}</p>
    </article>
    {labelingRubrics.length > 1 && <div className="study-form">
      <label>新录入作品使用的评分表<select value={newMaterialRubric?.id ?? ""} disabled={busy} onChange={(event) => setNewMaterialVersion(event.target.value)}>
        {labelingRubrics.map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
      </select></label>
    </div>}
    <div className="detail-actions">
      <button className="secondary-action" type="button" disabled={busy} onClick={() => {
        setReference(null);
        setRubric({ id: crypto.randomUUID(), totalScore: 150, scoring: catalog.rubric?.scoring ?? sketch.scoring });
      }}>新建评分表版本</button>
      <button className="secondary-action" type="button" disabled={busy || !newMaterialRubric} onClick={() => startMaterial("case")}>标注专家案例</button>
      <button className="secondary-action" type="button" disabled={busy || !newMaterialRubric} onClick={() => startMaterial("blind")}>登记盲评作品</button>
    </div>
    {rubric && <fieldset className="detail-card teaching-form" disabled={busy}>
      <legend>评分表 · 满分 150 分</legend>
      {rubric.scoring.map((item, index) => <div className="paper-answer" key={item.id}>
        <strong>{item.title}</strong>
        <label>满分<input type="number" min={1} max={150} value={item.score} onChange={(event) => {
          const score = Number(event.target.value);
          setRubric({ ...rubric, scoring: rubric.scoring.map((mark, i) => i === index ? { ...mark, score } : mark) });
        }} /></label>
        <label>判断条件与得分档位<textarea className="study-answer" rows={4} maxLength={1200} value={item.description} onChange={(event) => {
          const description = event.target.value;
          setRubric({ ...rubric, scoring: rubric.scoring.map((mark, i) => i === index ? { ...mark, description } : mark) });
        }} /></label>
      </div>)}
      <p>当前合计 {rubric.scoring.reduce((sum, item) => sum + item.score, 0)} 分</p>
    </fieldset>}
    {reference && materialRubric && <fieldset className="detail-card teaching-form" disabled={busy}>
      <legend>{reference.kind === "case" ? "RAG 案例标注" : "盲评样本登记"}</legend>
      <p>评分表版本 {reference.version}</p>
      <label>作品编号<input maxLength={40} placeholder="例如 894-s013" value={reference.workCode} onChange={(event) => setReference({ ...reference, workCode: event.target.value })} /></label>
      <p>同一件作品的初稿和改稿使用同一个编号。</p>
      <label>作品标题<input maxLength={120} value={reference.title} onChange={(event) => setReference({ ...reference, title: event.target.value })} /></label>
      <label>作品图片<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void perform(async () => setReference({ ...reference, image: await readSketch(file) }));
      }} /></label>
      {reference.image && <p>{reference.image.name}</p>}
      {reference.marks.map((mark, index) => <div className="paper-answer" key={mark.id}>
        <strong>{materialRubric.scoring[index]?.title}</strong>
        <label>老师评分<input type="number" min={0} max={materialRubric.scoring[index]?.score} value={mark.score ?? ""} onChange={(event) => {
          const score = event.target.value === "" ? null : Number(event.target.value);
          setReference({ ...reference, marks: reference.marks.map((item, i) => i === index ? { ...item, score } : item) });
        }} /></label>
        <label>图上位置、观察与理由<textarea className="study-answer" rows={3} maxLength={1200} value={mark.evidence} onChange={(event) => {
          const evidence = event.target.value;
          setReference({ ...reference, marks: reference.marks.map((item, i) => i === index ? { ...item, evidence } : item) });
        }} /></label>
      </div>)}
      <label className="study-checkbox"><input type="checkbox" checked={reference.authorized} onChange={(event) => setReference({ ...reference, authorized: event.target.checked })} />
        {reference.kind === "case" ? "已获授权，可将作品用作评图检索案例并向学生展示" : "已获授权，可提交作品至视觉服务用于内部评分验证"}
      </label>
    </fieldset>}
    {(rubric || reference) && <div className="detail-actions">
      <button className="secondary-action" type="button" disabled={busy} onClick={() => void save(false)}>保存草稿</button>
      <button className="secondary-action dark-action" type="button" disabled={busy} onClick={() => void save(true)}>
        {reference?.kind === "blind" ? "存入盲评集" : "确认发布"}
      </button>
    </div>}
    {notice && <p className="status-note" role="status">{notice}</p>}
    {blindPreview && <section className="detail-card resume-card" aria-label="盲评作品预览">
      <h3>{blindPreview.title}</h3>
      <p>{blindPreview.workCode} · 仅教研可见</p>
      {blindPreview.image && <figure className="case-figure"><img src={blindPreview.image.dataUrl} alt="盲评作品原图" /></figure>}
      <button className="secondary-action" type="button" onClick={() => setBlindPreview(null)}>关闭预览</button>
    </section>}
    {entryGroups.map((group) => <section className="detail-stack" aria-label={group.title} key={group.kind}>
      <h3>{group.title}</h3>
      {!catalog.entries.some((entry) => entry.kind === group.kind) && <p>{group.empty}</p>}
      {catalog.entries.filter((entry) => entry.kind === group.kind).map((entry) => <article className="detail-card resume-card" key={entry.id}>
        <h3>{entry.title || "未命名作品"}</h3>
        <p>{entry.workCode && `${entry.workCode} · `}{entryStatusText[entry.status]}</p>
        {entry.status === "draft" && <button className="secondary-action" type="button" disabled={busy} onClick={() => void editDraft(entry)}>继续编辑</button>}
        {entry.kind === "blind" && entry.status === "ready" && <button className="secondary-action" type="button" disabled={busy} onClick={() => void perform(async () => {
          setBlindPreview(await studyRequest<Pick<MaterialDraft, "title" | "workCode" | "image">>("teaching-read", { kind: entry.kind, id: entry.id }));
        })}>查看盲评作品</button>}
        {(entry.status === "published" || entry.status === "ready") && <button className="secondary-action" type="button" disabled={busy}
          onClick={() => void hideEntry(entry)}>{entry.kind === "blind" ? "移出盲评集" : "下架"}</button>}
      </article>)}
    </section>)}
  </div>;
}
