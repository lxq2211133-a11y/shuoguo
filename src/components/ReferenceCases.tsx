import { useState } from "react";
import type { CritiqueResult } from "../logic/aiWorkflows";
import { studyError, studyRequest } from "../services/studyAccount";
import type { TeachingCase } from "./TeachingDesk";

export default function ReferenceCases({ result }: { result: CritiqueResult }) {
  if (!result.references?.length) return null;
  return <section className="detail-card resume-card">
    <h3>本次参考的教研案例</h3>
    {result.references.map((reference, index) => <ReferenceCase key={`${reference.caseId}-${index}`} reference={reference}
      criterion={result.criteriaScores.find((item) => item.id === reference.criterionId)} />)}
  </section>;
}

function ReferenceCase({ reference, criterion }: {
  reference: NonNullable<CritiqueResult["references"]>[number];
  criterion: CritiqueResult["criteriaScores"][number] | undefined;
}) {
  const [source, setSource] = useState<TeachingCase | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function open() {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      setSource(await studyRequest<TeachingCase>("published-case", { id: reference.caseId }));
      setExpanded(true);
    } catch (error) {
      setNotice(studyError(error));
    } finally {
      setBusy(false);
    }
  }

  const mark = source?.marks.find((item) => item.id === reference.criterionId);
  return <article className="resume-card">
    <strong>{reference.title} · {criterion?.title}</strong>
    <p>{reference.comparison}</p>
    <button type="button" className="secondary-action" disabled={busy} onClick={() => void open()}>
      {expanded ? "收起案例" : "查看案例图片和老师点评"}
    </button>
    {notice && <p role="status">{notice}</p>}
    {expanded && <>
      {source?.image && <figure className="case-figure"><img src={source.image.dataUrl} alt={reference.title} /></figure>}
      {mark && <p>老师评分 {mark.score}/{criterion?.maxScore} · {mark.evidence}</p>}
    </>}
  </article>;
}
