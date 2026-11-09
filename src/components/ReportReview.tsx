import { useEffect, useState } from "react";
import type { SketchReview } from "../services/sketchReview";
import { studyError, studyRequest } from "../services/studyAccount";

type Review = { reason: string; reply: { text: string; reviewer: string } | null };
type QueueItem = { id: string; studentId: number; reason: string };
type ReviewDetail = { report: SketchReview; review: Review };

export function RequestReportReview({ reportId }: { reportId: string }) {
  const [review, setReview] = useState<Review | null>(null);
  const [reason, setReason] = useState("");
  const [share, setShare] = useState(false);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    void studyRequest<Review | null>("report-review", { reportId }).then((result) => {
      if (active) setReview(result);
    }).catch((error) => { if (active) setNotice(studyError(error)); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [reportId]);

  async function submit() {
    setBusy(true);
    setNotice("");
    try {
      setReview(await studyRequest<Review>("report-review", { reportId, reason, share }));
    } catch (error) {
      setNotice(studyError(error));
    } finally {
      setBusy(false);
    }
  }

  return <details className="detail-card">
    <summary>{review ? review.reply ? "查看教研复核结果" : "已提交教研复核" : "申请教研复核"}</summary>
    <div className="study-form">
      {review ? <>
        <p>复核问题　{review.reason}</p>
        <p>{review.reply ? `教研回复　${review.reply.text}` : "等待教研人员处理。"}</p>
      </> : <>
        <label>希望复核的评分项或依据<textarea className="study-answer" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        <label className="study-checkbox"><input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} />同意向教研人员共享这份作品和报告</label>
        <button className="secondary-action" type="button" disabled={busy || !reason.trim() || !share} onClick={() => void submit()}>提交复核请求</button>
      </>}
      {notice && <p role="status">{notice}</p>}
    </div>
  </details>;
}

export function TeacherReviewQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [notice, setNotice] = useState("");

  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try { await action(); } catch (error) { setNotice(studyError(error)); } finally { setBusy(false); }
  }

  return <section className="detail-card resume-card">
    <h3>学生评分复核</h3>
    <button className="secondary-action" type="button" disabled={busy} onClick={() => void perform(async () => {
      setQueue(await studyRequest<QueueItem[]>("review-queue"));
      setLoaded(true);
    })}>查看待复核作品</button>
    {loaded && !queue.length && <p>暂无待复核作品。</p>}
    {queue.map((item) => <button className="secondary-action" type="button" key={`${item.studentId}-${item.id}`} disabled={busy} onClick={() => void perform(async () => {
      setDetail(await studyRequest<ReviewDetail>("review-detail", { studentId: item.studentId, reportId: item.id }));
      setSelected(item);
      setReply("");
    })}>{item.reason}</button>)}
    {detail && selected && <div className="study-form">
      <strong>{detail.report.sketch.title} · {detail.report.result.score}/{detail.report.result.totalScore}</strong>
      <figure className="case-figure"><img src={detail.report.image.dataUrl} alt="学生授权复核的作品" /></figure>
      <p>复核问题　{detail.review.reason}</p>
      {detail.report.result.criteriaScores.map((item) => <p key={item.id}>{item.title} {item.score}/{item.maxScore} · {item.comment}</p>)}
      <label>复核结论与理由<textarea className="study-answer" rows={4} maxLength={1500} value={reply} onChange={(event) => setReply(event.target.value)} /></label>
      <button className="secondary-action dark-action" type="button" disabled={busy || !reply.trim()} onClick={() => void perform(async () => {
        await studyRequest("review-reply", { studentId: selected.studentId, reportId: selected.id, reply });
        setQueue((items) => items.filter((item) => item.id !== selected.id || item.studentId !== selected.studentId));
        setDetail(null);
        setSelected(null);
        setNotice("复核结论已回传给学生。");
      })}>回复学生</button>
    </div>}
    {notice && <p className="status-note" role="status">{notice}</p>}
  </section>;
}
