import { useEffect, useState } from "react";
import { getSchool, type SchoolId } from "../data/platformData";
import { getRevisionIssues, readSketch, type SketchReview, type SketchReviewSummary, type UploadedSketch } from "../services/sketchReview";
import { studyError, studyRequest } from "../services/studyAccount";
import { generateVisionCritique, visionQuotaMessage } from "../services/visionCritique";
import ReferenceCases from "./ReferenceCases";
import { RequestReportReview } from "./ReportReview";

export default function SketchReviewHistory({ schoolId, initialId }: { schoolId: SchoolId; initialId: string | null }) {
  const [reports, setReports] = useState<SketchReviewSummary[]>([]);
  const [selectedId, setSelectedId] = useState(initialId);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedId) return;
    let active = true;
    setLoading(true);
    setNotice("");
    void studyRequest<SketchReviewSummary[]>("list-reports", { schoolId }).then((list) => {
      if (active) setReports(list);
    }).catch((error) => {
      if (active) setNotice(studyError(error));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [schoolId, selectedId]);

  if (selectedId) return <ReviewDetail key={selectedId} id={selectedId} onBack={() => setSelectedId(null)} onRevision={setSelectedId} />;

  return <div className="detail-stack">
    {loading && <p role="status">正在读取评图记录…</p>}
    {notice && <p className="status-note" role="status">{notice}</p>}
    {!notice && !loading && reports.length === 0 && <p>完成一次真实评图后，作品和报告会出现在这里。</p>}
    {reports.map((report) => <article className="detail-card resume-card" key={report.id}>
      <h3>{report.title}</h3>
      <p>{report.parentId ? "改稿" : "初稿"} · {report.score}/{report.totalScore} · {new Date(report.createdAt).toLocaleDateString("zh-CN")}</p>
      <button className="secondary-action" type="button" onClick={() => setSelectedId(report.id)}>打开评图报告</button>
    </article>)}
  </div>;
}

function ReviewDetail({ id, onBack, onRevision }: { id: string; onBack: () => void; onRevision: (id: string) => void }) {
  const [report, setReport] = useState<SketchReview | null>(null);
  const [previous, setPrevious] = useState<SketchReview | null>(null);
  const [draft, setDraft] = useState<UploadedSketch | null>(null);
  const [pendingReport, setPendingReport] = useState<Pick<SketchReview, "id" | "parentId" | "sketch" | "image" | "result"> | null>(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedIssueIndexes, setSelectedIssueIndexes] = useState<ReadonlySet<number>>(() => new Set());
  const candidateIssues = getRevisionIssues(report?.result.issues ?? []);
  const selectedIssues = getRevisionIssues(candidateIssues, selectedIssueIndexes);
  const revisionNotes = report?.result.revisionNotes ?? [];
  const uncheckedIssues = getRevisionIssues(previous?.result.issues ?? [])
    .filter((issue) => !revisionNotes.some((note) => note.issue === issue));
  const needsSelection = candidateIssues.length > 0 && selectedIssues.length === 0;

  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const saved = await studyRequest<SketchReview>("read-report", { reportId: id });
        if (!active) return;
        setReport(saved);
        const [parent, currentDraft] = await Promise.all([
          saved.parentId ? studyRequest<SketchReview>("read-report", { reportId: saved.parentId }) : null,
          studyRequest<UploadedSketch | null>("revision-draft", { parentId: id }),
        ]);
        if (!active) return;
        setPrevious(parent);
        setDraft(currentDraft);
      } catch (error) {
        if (active) setNotice(studyError(error));
      } finally {
        if (active) setBusy(false);
      }
    };
    void read();
    return () => { active = false; };
  }, [id]);

  async function selectRevision(file?: File) {
    if (!file || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const image = await readSketch(file);
      setDraft(await studyRequest<UploadedSketch>("revision-draft", { parentId: id, draft: image }));
      setPendingReport(null);
      setNotice("改稿已保存。");
    } catch (error) {
      setNotice(studyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function reviewRevision() {
    if (!report || !draft || busy || needsSelection) return;
    setBusy(true);
    setNotice("");
    try {
      let next = pendingReport;
      if (!next) {
        const { sketch } = report;
        const school = getSchool(sketch.schoolId);
        const result = await generateVisionCritique({
          imageDataUrl: draft.dataUrl,
          previous: { imageDataUrl: report.image.dataUrl, issues: selectedIssues },
          schoolName: school.name, schoolTags: school.styleTags, sketchTitle: sketch.title,
          sketchContext: sketch.brief?.context,
          sketchId: sketch.id, rubricVersion: sketch.rubricVersion,
          requirements: sketch.requirements, totalScore: sketch.totalScore, scoringRubric: sketch.scoring,
        });
        next = { id: crypto.randomUUID(), parentId: id, sketch, image: draft, result };
        setPendingReport(next);
      }
      const saved = await studyRequest<SketchReview>("save-report", { report: next });
      onRevision(saved.id);
    } catch (error) {
      setNotice(visionQuotaMessage(error) ?? studyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function deleteReport() {
    setBusy(true);
    setNotice("");
    try {
      await studyRequest("remove-report", { reportId: id });
      onBack();
    } catch (error) {
      setNotice(studyError(error));
      setBusy(false);
    }
  }

  return <div className="detail-stack">
    <button className="text-action" type="button" disabled={busy && !!report} onClick={onBack}>返回评图记录</button>
    {busy && <p role="status">{report ? "正在处理作品与报告…" : "正在读取报告…"}</p>}
    {notice && <p className="status-note" role="status">{notice}</p>}
    {report && <>
      <article className="detail-card hero-detail-card">
        <span>{report.parentId ? "同题复评" : "首次评图"} · AI 训练反馈</span>
        <h3>{report.sketch.title}</h3>
        <p>{previous && `${previous.result.score} → `}{report.result.score}/{report.result.totalScore}</p>
        {previous && <p>分数来自两次整图评估。具体改动以下方的画面对照为准。</p>}
        {report.sketch.rubricVersion && <p>本报告评分表版本 {report.sketch.rubricVersion}</p>}
      </article>
      <div className={previous ? "review-comparison" : "detail-stack"}>
        {previous && <figure><img src={previous.image.dataUrl} alt="修改前的作品" /><figcaption>修改前 · {previous.image.name}</figcaption></figure>}
        <figure><img src={report.image.dataUrl} alt="当前评图作品" /><figcaption>{previous ? "修改后" : "初稿"} · {report.image.name}</figcaption></figure>
      </div>
      {(revisionNotes.length > 0 || uncheckedIssues.length > 0) && <section className="detail-card resume-card">
        <h3>上次问题处理情况</h3>
        {revisionNotes.map((note, index) => <div key={index}>
          <strong>{note.status} · {note.issue}</strong><p>{note.evidence}</p>
        </div>)}
        {uncheckedIssues.length > 0 && <div>
          <strong>本轮未核对</strong>
          <ul>{uncheckedIssues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
        </div>}
      </section>}
      <section className="detail-card resume-card">
        <h3>分项依据</h3>
        {report.result.criteriaScores.map((item) => {
          const before = previous?.result.criteriaScores.find((criterion) => criterion.id === item.id);
          return <div key={item.id}><strong>{item.title} · {before && `${before.score} → `}{item.score}/{item.maxScore}</strong><p>{item.comment}</p></div>;
        })}
        <h3>下一步</h3><p>{report.result.nextTask}</p>
      </section>
      <ReferenceCases result={report.result} />
      <RequestReportReview reportId={id} />
      <section className="detail-card study-form">
        <h3>提交同题改稿</h3>
        <p>复评沿用这份报告的题目和评分表。选择本轮修改的问题，查看逐条对照。</p>
        {candidateIssues.length > 0 && <fieldset disabled={busy || Boolean(pendingReport)}>
          <legend>本轮核对的问题</legend>
          {candidateIssues.map((issue, index) => <label className="study-checkbox" key={index}>
            <input type="checkbox" checked={selectedIssueIndexes.has(index)} onChange={(event) => {
              const checked = event.target.checked;
              setSelectedIssueIndexes((current) => {
                const next = new Set(current);
                if (checked) next.add(index);
                else next.delete(index);
                return next;
              });
            }} />{issue}
          </label>)}
        </fieldset>}
        {draft && <p>已保存改稿 · {draft.name}</p>}
        <label>上传改稿图片<input aria-label="上传改稿图片" type="file" accept="image/png,image/jpeg,image/webp" disabled={busy}
          onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void selectRevision(file); }} /></label>
        <button className="secondary-action dark-action" type="button" disabled={!draft || busy || needsSelection} onClick={() => void reviewRevision()}>
          {pendingReport ? "重新保存复评报告" : "开始同题复评"}
        </button>
      </section>
      {confirmDelete ? <section className="detail-card resume-card">
        <p>删除这份作品、评图报告和从它继续提交的改稿？</p>
        <button className="secondary-action" type="button" disabled={busy} onClick={() => void deleteReport()}>确认删除</button>
        <button className="secondary-action" type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>取消</button>
      </section> : <button className="text-action" type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>删除这份作品</button>}
    </>}
  </div>;
}
