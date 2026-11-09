import { useEffect, useState } from "react";
import type { ExamPaper } from "../data/platformData";
import type { TheoryKnowledgePoint } from "../data/theoryKnowledgeBase";
import { studyError, studyRequest } from "../services/studyAccount";

type Attempt = { answers: Record<string, string>; submitted: boolean };
const emptyAttempt: Attempt = { answers: {}, submitted: false };

export default function PaperPractice({ paper, signedIn, findPoint, onBack, onQueueReview, isQueued, reviewPending }: {
  paper: ExamPaper;
  signedIn: boolean;
  findPoint: (text: string) => TheoryKnowledgePoint | undefined;
  onBack: () => void;
  onQueueReview: (point: TheoryKnowledgePoint) => void;
  isQueued: (point: TheoryKnowledgePoint) => boolean;
  reviewPending: boolean;
}) {
  const [attempt, setAttempt] = useState(emptyAttempt);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const storageKey = `sg-paper-${paper.id}-v1`;
  const hasAnswers = Object.values(attempt.answers).some((answer) => answer.trim());

  useEffect(() => {
    let active = true;
    const read = async () => {
      try {
        const saved = signedIn ? await studyRequest<Attempt | null>("paper", { paperId: paper.id })
          : JSON.parse(localStorage.getItem(storageKey) ?? "null") as Attempt | null;
        if (active) setAttempt(saved ?? emptyAttempt);
      } catch (error) {
        if (active) {
          setNotice(studyError(error));
          setLoadError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void read();
    return () => { active = false; };
  }, [paper.id, signedIn, storageKey]);

  async function save(submitted: boolean) {
    if (busy || (submitted && !hasAnswers)) return;
    setBusy(true);
    setNotice("");
    try {
      const next = { answers: attempt.answers, submitted };
      if (signedIn) await studyRequest("paper", { paperId: paper.id, attempt: next });
      else localStorage.setItem(storageKey, JSON.stringify(next));
      setAttempt(next);
      setNotice(submitted ? "已交卷。对照参考要点，把薄弱考点加入带背。" : "作答草稿已保存。");
    } catch (error) {
      setNotice(studyError(error));
    } finally {
      setBusy(false);
    }
  }

  return <div className="detail-stack">
    <button className="text-action" type="button" onClick={onBack}>返回试卷</button>
    <div className="detail-card hero-detail-card">
      <span>{attempt.submitted ? "交卷复盘" : "模拟作答"}</span>
      <h3>{paper.title}</h3>
      <p>{attempt.submitted ? "按题对照参考要点，并安排后续复习。" : `${paper.duration} · 满分 ${paper.totalScore} 分 · 可先保存草稿`}</p>
    </div>
    {loading && <p role="status">正在读取作答记录…</p>}
    {!loading && !loadError && paper.sections.map((section) => (
      <section className="detail-card paper-practice" key={section.id}>
        <h3>{section.title}</h3>
        {section.questions.map((question) => {
          const point = attempt.submitted ? findPoint(question.text) : null;
          return <div className="paper-answer" key={question.id}>
            <label htmlFor={`answer-${question.id}`}>{question.text}（{question.score} 分）</label>
            <textarea id={`answer-${question.id}`} className="study-answer" rows={4} maxLength={5000}
              disabled={busy} readOnly={attempt.submitted} placeholder="在这里写下你的答案"
              value={attempt.answers[question.id] ?? ""} onChange={(event) => {
                const answer = event.target.value;
                setAttempt((current) => ({ ...current, answers: { ...current.answers, [question.id]: answer } }));
              }} />
            {attempt.submitted && <div className="answer-reference">
              <strong>{point ? "参考考点与自评" : "通用自评提示"}</strong>
              <p>{point?.answerFrame ?? "检查自己是否准确回应题干、解释核心概念、使用相关案例并说明设计意义。"}</p>
              {point && <button className="secondary-action" type="button" disabled={reviewPending || isQueued(point)}
                onClick={() => onQueueReview(point)}>{isQueued(point) ? "已加入带背" : `薄弱点 · 加入带背「${point.title}」`}</button>}
            </div>}
          </div>;
        })}
      </section>
    ))}
    {notice && <p className="status-note" role="status">{notice}</p>}
    {!loading && !loadError && !attempt.submitted && <div className="detail-actions">
      <button className="secondary-action" type="button" disabled={busy} onClick={() => void save(false)}>保存作答草稿</button>
      <button className="secondary-action dark-action" type="button" disabled={busy || !hasAnswers} onClick={() => void save(true)}>交卷并自评</button>
    </div>}
  </div>;
}
