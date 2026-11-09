import { type ChangeEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, Brain, Brush, ChevronRight, ClipboardCheck,
  ExternalLink, FilePenLine, ImageUp, LoaderCircle, LockKeyhole, PenTool, RotateCcw,
  School, ShieldCheck, X, type LucideIcon,
} from "lucide-react";
import {
  examPapers, getSchool, membershipBenefits, memoryTasks, type SchoolId,
  schools, sketchPrompts,
} from "./data/platformData";
import {
  theoryBooks, theoryChapters, theoryKnowledgePoints, theorySourceReferences, type TheoryKnowledgePoint,
} from "./data/theoryKnowledgeBase";
import { swjtu337MemoryTasks, swjtu337TheoryPoints, swjtu337Units } from "./data/swjtu337";
import { getSourcesBySchool, type SourceRegistryItem, type SourceType } from "./data/sourceRegistry";
import { createMockCritique, type CritiqueResult } from "./logic/aiWorkflows";
import { formatLimit, membershipPlans } from "./logic/membership";
import { formatSketchTaskSheet } from "./logic/sketchScoring";
import { makeReviewRecord, readReviewRecords, reviewKey, reviewLabel, reviewSummary, saveReviewRecords, type ReviewRecords } from "./logic/learningProgress";
import { type ReviewStatus } from "./logic/studyEngine";
import { generateVisionCritique, isVisionCritiqueConfigured, visionQuotaMessage } from "./services/visionCritique";
import StudyProfilePanel from "./components/StudyProfilePanel";
import PaperPractice from "./components/PaperPractice";
import SketchReviewHistory from "./components/SketchReviewHistory";
import TeachingDesk, { type PublishedRubric } from "./components/TeachingDesk";
import ReferenceCases from "./components/ReferenceCases";
import { readSketch, type SketchReview, type SketchReviewSummary, type UploadedSketch } from "./services/sketchReview";
import { defaultStudyProfile, studyError, studyRequest, type StudyAccount, type StudyProfile } from "./services/studyAccount";

type PageId = "home" | "theory" | "paper" | "practice" | "memory" | "sketch" | "critique" | "history" | "member" | "school" | "profile" | "teaching";

type ModuleCard = {
  id: "theory" | "paper" | "memory" | "sketch";
  title: string;
  meta: string;
  icon: LucideIcon;
};

type CritiqueStatus = "idle" | "reading" | "ready" | "loading" | "done" | "mock" | "error";

const sourceTypeText: Record<SourceType, string> = {
  official: "官方", "reliable-secondary": "二级", experience: "经验", inference: "推断",
};

const moduleCards: ModuleCard[] = [
  { id: "theory", title: "理论重点", meta: `${theoryKnowledgePoints.length} 个高频考点`, icon: BookOpen },
  { id: "paper", title: "自动组卷", meta: "院校风格卷", icon: ClipboardCheck },
  { id: "memory", title: "带背计划", meta: "艾宾浩斯复盘", icon: Brain },
  { id: "sketch", title: "手绘快题", meta: "今日训练题", icon: Brush },
];

export default function App() {
  const [account, setAccount] = useState<StudyAccount | null>(null);
  const accountChanged = useRef(false);
  useEffect(() => {
    let active = true;
    void studyRequest<StudyAccount | null>().then((current) => {
      if (active && !accountChanged.current) setAccount(current);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return <StudyApp key={account?.username ?? ""} account={account} onAccountChange={(next) => {
    accountChanged.current = true;
    setAccount(next);
  }} />;
}

function StudyApp({ account, onAccountChange }: { account: StudyAccount | null; onAccountChange: (next: StudyAccount | null) => void }) {
  const [profile, setProfile] = useState(account?.profile ?? defaultStudyProfile);
  const schoolId = profile.schoolId;
  const [studyNotice, setStudyNotice] = useState("");
  const [profilePending, setProfilePending] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);
  const [page, setPage] = useState<PageId>("home");
  const [hasUpload, setHasUpload] = useState(false);
  const [selectedTheoryPointId, setSelectedTheoryPointId] = useState<string | null>(null);
  const [selectedMemoryTaskId, setSelectedMemoryTaskId] = useState<string | null>(null);
  const [selectedPaperQuestionId, setSelectedPaperQuestionId] = useState<string | null>(null);
  const [selectedMembershipBenefit, setSelectedMembershipBenefit] = useState<string | null>(null);
  const [uploadedSketch, setUploadedSketch] = useState<UploadedSketch | null>(null);
  const [critiqueResult, setCritiqueResult] = useState<CritiqueResult | null>(null);
  const [critiqueStatus, setCritiqueStatus] = useState<CritiqueStatus>("idle");
  const [critiqueMessage, setCritiqueMessage] = useState<string | null>(null);
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [historyInitialId, setHistoryInitialId] = useState<string | null>(null);
  const pendingReport = useRef<Omit<SketchReview, "createdAt"> | null>(null);
  const [reviewRecords, setReviewRecords] = useState<ReviewRecords>(() => account?.reviewRecords ?? readReviewRecords());
  const [draftNames, setDraftNames] = useState(account?.draftNames ?? {});
  const [latestReportIds, setLatestReportIds] = useState(account?.latestReportIds ?? {});
  const critiqueOperation = useRef(0);
  const school = getSchool(schoolId);

  useEffect(() => {
    if (!account) saveReviewRecords(reviewRecords);
  }, [account, reviewRecords]);

  const studyMemoryTasks = useMemo(() => [...memoryTasks, ...theoryKnowledgePoints.flatMap((point) => {
    const id = memoryTaskId(point);
    return id.startsWith("theory-") && reviewRecords[reviewKey(schoolId, id)]
      ? [{ id, topic: point.title, status: "回炉" as const, prompt: `尝试复述「${point.title}」的核心概念、答题要点和设计实例。` }]
      : [];
  })], [reviewRecords, schoolId]);
  const scheduledMemoryTasks = schoolId === "swjtu" ? swjtu337MemoryTasks : studyMemoryTasks;
  const learning = reviewSummary(reviewRecords, schoolId, scheduledMemoryTasks.map((task) => task.id));

  const updateReview = async (taskId: string, rating: ReviewStatus | null) => {
    const key = reviewKey(schoolId, taskId);
    setReviewPending(true);
    setStudyNotice("");
    try {
      const record = account
        ? await studyRequest<ReviewRecords[string] | null>("review", { key, rating })
        : rating && makeReviewRecord(rating);
      setReviewRecords((current) => {
        const next = { ...current };
        if (record) next[key] = record;
        else delete next[key];
        return next;
      });
    } catch (error) {
      setStudyNotice(studyError(error));
    } finally {
      setReviewPending(false);
    }
  };

  const baseSketch = useMemo(() => sketchPrompts.find((prompt) => prompt.schoolId === schoolId) ?? sketchPrompts[0], [schoolId]);
  const [publishedRubric, setPublishedRubric] = useState<{ sketchId: string; rubric: PublishedRubric } | null>(null);
  const activeRubric = publishedRubric?.sketchId === baseSketch.id ? publishedRubric.rubric : null;
  const sketch = activeRubric ? { ...baseSketch, rubricVersion: activeRubric.id, scoring: activeRubric.scoring, totalScore: activeRubric.totalScore } : baseSketch;
  useEffect(() => {
    let active = true;
    void studyRequest<PublishedRubric | null>("published-rubric", { sketchId: baseSketch.id }).then((rubric) => {
      if (active) setPublishedRubric(rubric ? { sketchId: baseSketch.id, rubric } : null);
    }).catch(() => {});
    return () => { active = false; };
  }, [baseSketch.id]);
  const paper = useMemo(() => examPapers.find((item) => item.schoolId === schoolId) ?? examPapers[0], [schoolId]);
  const sources = useMemo(() => getSourcesBySchool(schoolId), [schoolId]);
  const detectedTags = useMemo(() => [school.styleTags[0], school.styleTags[2], "版面完整"].filter((tag): tag is string => Boolean(tag)), [school.styleTags]);
  const mockCritique = useMemo(() => createMockCritique({
      schoolName: school.name,
      schoolTags: school.styleTags,
      detectedTags,
      sketchTitle: sketch.title,
      totalScore: sketch.totalScore,
      scoringRubric: sketch.scoring,
    }), [detectedTags, school.name, school.styleTags, sketch.title, sketch.totalScore, sketch.scoring]);
    
  const monthlyPlan = membershipPlans.find((plan) => plan.id === "monthly") ?? membershipPlans[0];
  const verifiedSources = sources.filter((source) => !source.needsVerification).length;

  const resetNestedDetails = () => {
    setSelectedTheoryPointId(null);
    setSelectedMemoryTaskId(null);
    setSelectedPaperQuestionId(null);
    setSelectedMembershipBenefit(null);
  };
  const openPage = (nextPage: PageId) => {
    if (account && page === "history" && nextPage === "home") {
      void studyRequest<SketchReviewSummary[]>("list-reports", { schoolId }).then(([latest]) => {
        setLatestReportIds((current) => ({ ...current, [schoolId]: latest?.id }));
      }).catch(() => {});
    }
    resetNestedDetails();
    setHistoryInitialId(null);
    setPage(nextPage);
  };
  const openSavedReport = (id: string | null) => {
    setHistoryInitialId(id);
    setPage("history");
  };
  const openTheoryPoint = (pointId: string) => {
    setSelectedTheoryPointId(pointId);
    setSelectedMemoryTaskId(null);
    setSelectedPaperQuestionId(null);
    setSelectedMembershipBenefit(null);
    setPage("theory");
  };
  const openCritiquePage = async () => {
    resetNestedDetails();
    setPage("critique");
    if (!account || uploadedSketch || critiqueStatus === "reading" || !draftNames[schoolId]) return;
    const operation = ++critiqueOperation.current;
    setCritiqueStatus("reading");
    setCritiqueMessage(null);
    try {
      const draft = await studyRequest<UploadedSketch | null>("read-draft", { schoolId });
      if (operation !== critiqueOperation.current) return;
      setUploadedSketch(draft);
      setCritiqueStatus(draft ? "ready" : "idle");
      if (!draft) setDraftNames((current) => ({ ...current, [schoolId]: undefined }));
    } catch (error) {
      if (operation !== critiqueOperation.current) return;
      setCritiqueStatus("error");
      setCritiqueMessage(studyError(error));
    }
  };
  const chooseSketchFile = async (file: File | null) => {
    if (!file) return;

    const operation = ++critiqueOperation.current;
    setCritiqueStatus("reading");
    setCritiqueMessage(null);
    try {
      const draft = await readSketch(file);
      if (operation !== critiqueOperation.current) return;
      if (account) {
        await studyRequest("save-draft", { schoolId, draft });
        setDraftNames((current) => ({ ...current, [schoolId]: draft.name }));
      }
      if (operation !== critiqueOperation.current) return;
      setUploadedSketch(draft);
      setCritiqueResult(null);
      setSavedReportId(null);
      pendingReport.current = null;
      setHasUpload(false);
      setCritiqueStatus("ready");
      if (account) setCritiqueMessage("作品已保存到账号，可以稍后继续评图。");
    } catch (error) {
      if (operation !== critiqueOperation.current) return;
      setCritiqueStatus("error");
      setCritiqueMessage(studyError(error));
    }
  };
  const clearSketchFile = async () => {
    if (critiqueStatus === "reading" || critiqueStatus === "loading") return;
    if (critiqueStatus === "mock") {
      setCritiqueResult(null);
      setHasUpload(false);
      setCritiqueStatus(uploadedSketch ? "ready" : "idle");
      setCritiqueMessage(null);
      return;
    }
    const operation = ++critiqueOperation.current;
    setCritiqueStatus("reading");
    try {
      if (account && draftNames[schoolId]) {
        await studyRequest("remove-draft", { schoolId });
        setDraftNames((current) => ({ ...current, [schoolId]: undefined }));
      }
      if (operation !== critiqueOperation.current) return;
      setUploadedSketch(null);
      setCritiqueResult(null);
      setSavedReportId(null);
      pendingReport.current = null;
      setHasUpload(false);
      setCritiqueStatus("idle");
      setCritiqueMessage(null);
    } catch (error) {
      if (operation !== critiqueOperation.current) return;
      setCritiqueStatus("error");
      setCritiqueMessage(studyError(error));
    }
  };
  const runCritique = async (mode: "sample" | "uploaded") => {
    if (mode === "sample") {
      setCritiqueResult(mockCritique);
      setCritiqueStatus("mock");
      setCritiqueMessage("示例评图由预设规则生成，用于体验反馈形式。");
      setHasUpload(true);
      return;
    }
    const operation = ++critiqueOperation.current;
    setCritiqueStatus("loading");
    setCritiqueMessage(null);

    try {
      if (uploadedSketch && isVisionCritiqueConfigured()) {
        const result = pendingReport.current?.result ?? await generateVisionCritique({
          imageDataUrl: uploadedSketch.dataUrl,
          schoolName: school.name,
          schoolTags: school.styleTags,
          sketchTitle: sketch.title,
          sketchContext: sketch.brief?.context,
          sketchId: sketch.id,
          rubricVersion: sketch.rubricVersion,
          requirements: sketch.requirements,
          totalScore: sketch.totalScore,
          scoringRubric: sketch.scoring,
        });

        if (operation !== critiqueOperation.current) return;
        if (account) {
          const report = pendingReport.current ?? { id: crypto.randomUUID(), parentId: null, sketch, image: uploadedSketch, result };
          pendingReport.current = report;
          const saved = await studyRequest<SketchReview>("save-report", { report });
          setDraftNames((current) => ({ ...current, [schoolId]: undefined }));
          if (operation !== critiqueOperation.current) return;
          pendingReport.current = null;
          setSavedReportId(saved.id);
          setLatestReportIds((current) => ({ ...current, [schoolId]: saved.id }));
        }
        setCritiqueResult(result);
        setCritiqueStatus("done");
        setHasUpload(true);
        return;
      }

      throw new Error("Vision unavailable");
    } catch (error) {
      if (operation !== critiqueOperation.current) return;
      setCritiqueStatus("error");
      const retake = error instanceof Error && /请补拍|请先登录/.test(error.message) ? error.message : "";
      const retry = pendingReport.current ? "评分已生成，报告保存失败。再次点击开始评图即可重试保存。" : "AI 评图暂未完成。作品仍在此处，可重新开始评图。";
      setCritiqueMessage(visionQuotaMessage(error) ?? (retake || retry));
    }
  };
  const saveProfile = async (changes: Partial<StudyProfile>, returnHome = false) => {
    setProfilePending(true);
    setStudyNotice("");
    try {
      const next = account ? await studyRequest<StudyProfile>("profile", { profile: changes }) : { ...profile, ...changes };
      if (next.schoolId !== schoolId) {
        critiqueOperation.current += 1;
        setHasUpload(false);
        setUploadedSketch(null);
        setCritiqueResult(null);
        setSavedReportId(null);
        pendingReport.current = null;
        setCritiqueStatus("idle");
        setCritiqueMessage(null);
        resetNestedDetails();
      }
      setProfile(next);
      if (returnHome) setPage("home");
    } finally {
      setProfilePending(false);
    }
  };
  const startToday = () => {
    const due = scheduledMemoryTasks.find((task) => reviewLabel(reviewRecords[reviewKey(schoolId, task.id)]) === "待复习");
    const unreviewed = scheduledMemoryTasks.find((task) => !reviewRecords[reviewKey(schoolId, task.id)]);
    const task = due ?? unreviewed;
    if (task) {
      openPage("memory");
      setSelectedMemoryTaskId(task.id);
    } else if (draftNames[schoolId]) void openCritiquePage();
    else openPage(profile.stage === "冲刺" ? "paper" : "sketch");
  };

  return (
    <main className="mini-shell">
      <section className="phone-frame" aria-label="硕果研习小程序">
        <header className="app-topbar">
          <div className="brand-info">
            <div className="brand-mark" aria-hidden="true">SG</div>
            <h1>硕果研习</h1>
          </div>
          <label className="school-picker">
            <select aria-label="切换目标院校" disabled={profilePending} value={schoolId} onChange={(event) => {
              void saveProfile({ schoolId: event.target.value as SchoolId }, true).catch((error) => setStudyNotice(studyError(error)));
            }}>
              {schools.map((item) => (
                <option key={item.id} value={item.id}>{item.shortName}</option>
              ))}
            </select>
          </label>
        </header>
        {studyNotice && <p className="study-notice status-note" role="status">{studyNotice}</p>}

        {page === "home" ? (
          <HomePage
            onOpenCritique={openCritiquePage} onOpenPage={openPage}
            learning={learning} school={school} sketchTitle={sketch.title}
            accountName={account?.username} profile={profile} draftName={draftNames[schoolId]}
            onResumeReport={latestReportIds[schoolId] ? () => openSavedReport(latestReportIds[schoolId] ?? null) : undefined}
            onStartToday={startToday}
            sourceCount={sources.length} verifiedSources={verifiedSources}
          />
        ) : page === "teaching" && account?.isTeacher ? (
          <section className="detail-page">
            <div className="detail-topbar"><button type="button" onClick={() => openPage("home")}><ArrowLeft size={16} /> 返回首页</button></div>
            <DetailSection eyebrow="TEACHING" title="教研工作台">
              <TeachingDesk key={sketch.id} sketch={sketch} onPublish={(rubric) => {
                setPublishedRubric(rubric ? { sketchId: sketch.id, rubric } : null);
              }} />
            </DetailSection>
          </section>
        ) : page === "history" ? (
          <section className="detail-page">
            <div className="detail-topbar"><button type="button" onClick={() => openPage("home")}><ArrowLeft size={16} /> 返回首页</button></div>
            <DetailSection eyebrow="HISTORY" title="快题复盘">
              {account ? <SketchReviewHistory key={schoolId} schoolId={schoolId} initialId={historyInitialId} /> : (
                <button className="secondary-action" type="button" onClick={() => openPage("profile")}>登录后保存和回看评图</button>
              )}
            </DetailSection>
          </section>
        ) : page === "profile" ? (
          <section className="detail-page">
            <div className="detail-topbar"><button type="button" onClick={() => openPage("home")}><ArrowLeft size={16} /> 返回首页</button></div>
            <DetailSection eyebrow="PROFILE" title="我的备考档案">
              <StudyProfilePanel account={account} profile={profile} reviewRecords={reviewRecords}
                onAccountChange={onAccountChange} onSaveProfile={saveProfile} />
              {account?.isTeacher && <button className="secondary-action" type="button" onClick={() => openPage("teaching")}>打开教研工作台</button>}
            </DetailSection>
          </section>
        ) : (
          <DetailPage
            critique={critiqueResult ?? mockCritique} critiqueMessage={critiqueMessage} critiqueStatus={critiqueStatus}
            hasUpload={hasUpload} monthlyPlan={monthlyPlan}
            onBack={() => openPage("home")} onClearMembershipBenefit={() => setSelectedMembershipBenefit(null)}
            onClearMemoryTask={() => setSelectedMemoryTaskId(null)}
            onClearPaperQuestion={() => setSelectedPaperQuestionId(null)}
            onChooseSketchFile={chooseSketchFile} onClearSketchFile={clearSketchFile}
            onClearTheoryPoint={() => setSelectedTheoryPointId(null)} onNavigate={openPage}
            onSelectMembershipBenefit={setSelectedMembershipBenefit}
            onOpenTheoryPoint={openTheoryPoint} onSelectMemoryTask={setSelectedMemoryTaskId}
            onSelectPaperQuestion={setSelectedPaperQuestionId} onSelectTheoryPoint={setSelectedTheoryPointId}
            onClearReview={(taskId) => void updateReview(taskId, null)} onRecordReview={(taskId, rating) => void updateReview(taskId, rating)}
            reviewRecords={reviewRecords} reviewPending={reviewPending} signedIn={Boolean(account)} studyMemoryTasks={studyMemoryTasks}
            onRunCritique={runCritique} onUpload={openCritiquePage} page={page}
            onOpenSavedReport={savedReportId ? () => openSavedReport(savedReportId) : undefined}
            paper={paper} school={school} sketch={sketch} sources={sources} verifiedSources={verifiedSources}
            selectedMembershipBenefit={selectedMembershipBenefit} selectedMemoryTaskId={selectedMemoryTaskId}
            selectedPaperQuestionId={selectedPaperQuestionId} selectedTheoryPointId={selectedTheoryPointId}
            uploadedSketch={uploadedSketch}
          />
        )}
      </section>
    </main>
  );
}

function HomePage({
  accountName, draftName, learning, onOpenCritique, onOpenPage, onResumeReport, onStartToday, profile, school, sketchTitle, sourceCount, verifiedSources,
}: {
  learning: ReturnType<typeof reviewSummary>; onOpenCritique: () => void; onOpenPage: (page: PageId) => void;
  school: ReturnType<typeof getSchool>;
  sketchTitle: string; sourceCount: number; verifiedSources: number;
  accountName?: string; draftName?: string; profile: StudyProfile; onStartToday: () => void;
  onResumeReport?: () => void;
}) {
  const hasReview = learning.due > 0 || learning.reviewed < learning.total;
  return (
    <div className="home-page">
      <section className="today-card" aria-labelledby="today-title">
        <div>
          <span className="eyebrow">{school.shortName} / {profile.stage}阶段 / {profile.dailyMinutes} 分钟</span>
          <h2 id="today-title">今日学习计划</h2>
          {school.id === "swjtu" && <p>337 工业设计工程 · {swjtu337Units.length} 章试练</p>}
          <p>{learning.reviewed === 0
            ? "先完成一张带背卡片，建立你的学习记录。"
            : learning.due > 0
              ? `有 ${learning.due} 张卡片待复习，先完成回忆再安排下一步。`
              : `已复习 ${learning.reviewed} 张卡片，继续巩固或开始快题训练。`}</p>
        </div>
        <button className="primary-action" type="button" onClick={onStartToday}>
          <span>{hasReview ? "开始今日复习" : draftName ? "继续快题草稿" : profile.stage === "冲刺" ? "打开模拟卷" : "开始快题训练"}</span>
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </section>

      {draftName && <section className="detail-card resume-card" aria-label="待继续的快题草稿">
        <div><h3>继续上次的快题</h3><p>{draftName}</p></div>
        <button className="secondary-action" type="button" onClick={onOpenCritique}>打开草稿</button>
      </section>}
      {!draftName && onResumeReport && <section className="detail-card resume-card" aria-label="继续上次的快题训练">
        <div><h3>回看上次快题</h3><p>从上次的反馈继续改稿，或查看修改前后的变化。</p></div>
        <button className="secondary-action" type="button" onClick={onResumeReport}>打开上次报告</button>
      </section>}

      <section className="metric-grid" aria-label="学习状态">
        <MetricTile label="已复习卡片" value={`${learning.reviewed}/${learning.total}`} />
        <MetricTile label="待复习" value={String(learning.due)} />
        <MetricTile label="自评熟悉" value={String(learning.familiar)} />
      </section>

      <section className="module-grid" aria-label="一级功能入口">
        {moduleCards.map((item) => {
          const Icon = item.icon;
          const meta = school.id === "swjtu"
            ? { theory: "337 · 章节试练", memory: `337 · ${swjtu337MemoryTasks.length} 张章节卡`, paper: "专业课补充练习", sketch: "894 · 原创快题" }[item.id]
            : item.meta;
          return (
            <button key={item.id} aria-label={`${item.title} ${meta}`} className="module-card" type="button" onClick={() => onOpenPage(item.id)}>
              <div className="module-icon"><Icon size={24} strokeWidth={1.5} /></div>
              <div>
                <strong>{item.title}</strong><br />
                <small>{meta}</small>
              </div>
            </button>
          );
        })}
      </section>

      <section className="home-link-grid" aria-label="更多页面">
        <button type="button" onClick={() => onOpenPage("member")}><LockKeyhole size={20} strokeWidth={1.5} /> 会员权益</button>
        <button type="button" onClick={() => onOpenPage("school")}><School size={20} strokeWidth={1.5} /> 院校资料</button>
        <button type="button" aria-label="上传评图" onClick={onOpenCritique}><PenTool size={20} strokeWidth={1.5} /> AI 评图</button>
        <button type="button" onClick={() => onOpenPage("profile")}><Brain size={20} strokeWidth={1.5} /> 我的备考档案</button>
        <button type="button" onClick={() => onOpenPage("history")}><ClipboardCheck size={20} strokeWidth={1.5} /> 快题复盘</button>
      </section>

      <p className="prototype-note">{accountName ? `已登录 ${accountName}，带背记录和快题草稿保存在账号中。` : "访客带背记录保存在当前浏览器，注册时可导入账号。"}</p>

      <section className="report-card" aria-label="今日研习报告">
        <span>下一步建议</span>
        <h3>{learning.reviewed === 0 ? "从第一张带背卡片开始" : learning.due > 0 ? "先完成待复习卡片" : "保持复习，再练一张快题"}</h3>
        <dl>
          <div><dt>下一张快题</dt><dd>{sketchTitle}</dd></div>
          <div><dt>资料可信度</dt><dd>{verifiedSources}/{sourceCount} 已核实</dd></div>
        </dl>
      </section>
    </div>
  );
}

function DetailPage({
  critique, critiqueMessage, critiqueStatus, hasUpload, monthlyPlan, onBack, onChooseSketchFile,
  onClearMembershipBenefit, onClearMemoryTask, onClearPaperQuestion, onClearSketchFile,
  onClearTheoryPoint, onNavigate, onOpenTheoryPoint, onRunCritique, onSelectMembershipBenefit, onSelectMemoryTask,
  onSelectPaperQuestion, onSelectTheoryPoint, onUpload, page, paper, school, selectedMembershipBenefit,
  selectedMemoryTaskId, selectedPaperQuestionId, selectedTheoryPointId, sketch, sources, verifiedSources,
  uploadedSketch, onClearReview, onRecordReview, reviewRecords, reviewPending, signedIn, studyMemoryTasks, onOpenSavedReport,
}: {
  critique: CritiqueResult; critiqueMessage: string | null; critiqueStatus: CritiqueStatus;
  hasUpload: boolean; monthlyPlan: typeof membershipPlans[number];
  onBack: () => void; onChooseSketchFile: (file: File | null) => void; onClearMembershipBenefit: () => void;
  onClearMemoryTask: () => void; onClearPaperQuestion: () => void; onClearSketchFile: () => void;
  onClearTheoryPoint: () => void; onNavigate: (page: PageId) => void; onOpenTheoryPoint: (pointId: string) => void;
  onRunCritique: (mode: "sample" | "uploaded") => void;
  onSelectMembershipBenefit: (benefit: string) => void; onSelectMemoryTask: (taskId: string) => void;
  onSelectPaperQuestion: (questionId: string) => void; onSelectTheoryPoint: (pointId: string) => void;
  onUpload: () => void; page: Exclude<PageId, "home">;
  onClearReview: (taskId: string) => void;
  onRecordReview: (taskId: string, rating: ReviewStatus) => void; reviewRecords: ReviewRecords; reviewPending: boolean;
  signedIn: boolean; studyMemoryTasks: typeof memoryTasks;
  onOpenSavedReport?: () => void;
  paper: typeof examPapers[number]; school: ReturnType<typeof getSchool>; sketch: typeof sketchPrompts[number];
  selectedMembershipBenefit: string | null; selectedMemoryTaskId: string | null;
  selectedPaperQuestionId: string | null; selectedTheoryPointId: string | null;
  sources: ReturnType<typeof getSourcesBySchool>; uploadedSketch: UploadedSketch | null; verifiedSources: number;
}) {
  const isSwjtu337 = school.id === "swjtu";
  const selectedPilotPoint = isSwjtu337 ? swjtu337TheoryPoints.find((point) => point.id === selectedTheoryPointId) : undefined;
  const selectedTheoryPoint = selectedPilotPoint ?? theoryKnowledgePoints.find((point) => point.id === selectedTheoryPointId);
  const chapterTask = isSwjtu337 ? swjtu337MemoryTasks.find((task) => task.id === selectedMemoryTaskId) : undefined;
  const selectedMemoryTask = chapterTask ?? studyMemoryTasks.find((task) => task.id === selectedMemoryTaskId);
  const otherMemoryTasks = isSwjtu337 ? studyMemoryTasks.filter((task) =>
    reviewRecords[reviewKey(school.id, task.id)] && !swjtu337MemoryTasks.some((chapterCard) => chapterCard.id === task.id),
  ) : [];
  const selectedPaperQuestion = findPaperQuestion(paper, selectedPaperQuestionId);
  const sketchSources = sources.filter((source) => source.contentTargets.includes("sketch") || source.contentTargets.includes("training"));

  return (
    <section className="detail-page" aria-live="polite">
      <div className="detail-topbar">
        <button type="button" onClick={onBack}><ArrowLeft size={16} strokeWidth={2} /> 返回首页</button>
        <span>{school.shortName}</span>
      </div>

      {page === "theory" && (
        <DetailSection eyebrow="THEORY" title="理论重点">
          {selectedTheoryPoint ? (
            <TheoryPointDetail
              onBack={onClearTheoryPoint}
              onSelectTheoryPoint={onSelectTheoryPoint}
              point={selectedTheoryPoint}
              pilot={Boolean(selectedPilotPoint)}
              onPractice={selectedPilotPoint ? () => {
                onNavigate("memory");
                onSelectMemoryTask(memoryTaskId(selectedPilotPoint));
              } : undefined}
            />
          ) : isSwjtu337 ? (
            <div className="detail-stack">
              <p>337 工业设计工程 · 何人可《工业设计史》第 5 版</p>
              {swjtu337Units.map(({ chapter, points }) => <section className="detail-stack" key={chapter.id} aria-label={chapter.title}>
                <DetailBlock title={chapter.title}><p>{chapter.summary}</p></DetailBlock>
                <TheoryPointList points={points} onSelect={onSelectTheoryPoint} pilot />
              </section>)}
            </div>
          ) : <TheoryPointList points={theoryKnowledgePoints} onSelect={onSelectTheoryPoint} />}
        </DetailSection>
      )}

      {page === "paper" && (
        <DetailSection eyebrow="PAPER" title="自动组卷">
          {selectedPaperQuestion ? (
            <PaperQuestionDetail
              context={selectedPaperQuestion}
              onBack={onClearPaperQuestion}
              onOpenTheoryPoint={onOpenTheoryPoint}
            />
          ) : (
          <div className="paper-layout">
            <div className="paper-head">
              <span>{paper.subject}</span>
              <h3>{paper.title}</h3>
              {isSwjtu337 && <p className="status-note">硕果补充练习 · 337 章节带背请从「理论重点」进入。</p>}
              <div className="paper-meta">
                <span>{paper.stage}</span>
                <strong>满分 {paper.totalScore} 分</strong>
                <span>{paper.duration}</span>
              </div>
            </div>
            <div className="paper-instructions">
              {paper.instructions.map((instruction) => <p key={instruction}>{instruction}</p>)}
            </div>
            <div className="paper-sections">
              {paper.sections.map((section) => (
                <section key={section.id} className="paper-section" aria-label={section.title}>
                  <div className="paper-section-head">
                    <h4>{section.title}</h4>
                    <span>{section.description}</span>
                  </div>
                  <ol>
                    {section.questions.map((question) => {
                      const relatedPoint = findTheoryPointForText(question.text);

                      return (
                        <li key={question.id}>
                          <span>{question.text}</span>
                          <strong>{question.score} 分</strong>
                          <div className="question-actions">
                            <button
                              aria-label={`查看题目 ${getQuestionActionTitle(question.text)}`}
                              className="question-open"
                              type="button"
                              onClick={() => onSelectPaperQuestion(question.id)}
                            >
                              拆题
                            </button>
                            {relatedPoint && (
                              <button
                                aria-label={`打开考点 ${relatedPoint.title}`}
                                className="question-link"
                                type="button"
                                onClick={() => onOpenTheoryPoint(relatedPoint.id)}
                              >
                                考点
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
            <div className="detail-actions">
              <button className="secondary-action dark-action" type="button" onClick={() => onNavigate("practice")}>开始作答或查看交卷</button>
              <button className="secondary-action" type="button" onClick={() => onNavigate("theory")}>补理论考点</button>
              <button className="secondary-action" type="button" onClick={() => onNavigate("school")}>查看院校资料</button>
            </div>
          </div>
          )}
        </DetailSection>
      )}

      {page === "practice" && <DetailSection eyebrow="PRACTICE" title="理论模拟作答">
        <PaperPractice key={paper.id} paper={paper} signedIn={signedIn} findPoint={findTheoryPointForText}
          onBack={() => onNavigate("paper")} reviewPending={reviewPending}
          onQueueReview={(point) => onRecordReview(memoryTaskId(point), "不会")}
          isQueued={(point) => reviewRecords[reviewKey(school.id, memoryTaskId(point))]?.rating === "不会"} />
      </DetailSection>}

      {page === "memory" && (
        <DetailSection eyebrow="MEMORY" title="带背计划">
          {selectedMemoryTask ? (
            <MemoryTaskDetail
              key={selectedMemoryTask.id}
              onBack={onClearMemoryTask}
              onClearReview={onClearReview}
              onOpenTheoryPoint={onOpenTheoryPoint}
              onRecordReview={onRecordReview}
              record={reviewRecords[reviewKey(school.id, selectedMemoryTask.id)]}
              pending={reviewPending}
              task={selectedMemoryTask}
              chapterPoint={chapterTask ? swjtu337TheoryPoints.find((point) => point.title === chapterTask.topic) : undefined}
            />
          ) : (
            <div className="detail-stack">
              {isSwjtu337 ? swjtu337Units.map(({ chapter, tasks }) => (
                <section className="detail-stack" key={chapter.id} aria-label={chapter.title}>
                  <h3>{chapter.title}</h3>
                  <MemoryCardList tasks={tasks} schoolId={school.id} reviewRecords={reviewRecords} onSelect={onSelectMemoryTask} />
                </section>
              )) : <MemoryCardList tasks={studyMemoryTasks} schoolId={school.id}
                reviewRecords={reviewRecords} onSelect={onSelectMemoryTask} />}
              {otherMemoryTasks.length > 0 && <>
                <h3>补充复习记录</h3>
                <MemoryCardList tasks={otherMemoryTasks} schoolId={school.id} reviewRecords={reviewRecords} onSelect={onSelectMemoryTask} />
              </>}
            </div>
          )}
        </DetailSection>
      )}

      {page === "sketch" && (
        <DetailSection eyebrow="SKETCH" title="手绘快题">
          <div className="sketch-brief">
            <div className="sketch-meta">
              <span>{sketch.duration}</span>
              <strong>满分 {sketch.totalScore} 分</strong>
            </div>
            <h3>{sketch.title}</h3>
            {sketch.brief && <div className="sketch-task-section">
              <p className="status-note">硕果原创试练 · 评分用于训练反馈</p>
              <h4>设计情境</h4>
              <p>{sketch.brief.context}</p>
              <h4>交付要求</h4>
            </div>}
            <ul>{sketch.requirements.map((item) => <li key={item}>{item}</li>)}</ul>
            {sketch.brief && <div className="sketch-task-section">
              <h4>提交方式</h4>
              <ul>{sketch.brief.submission.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>}
            {sketch.rubricVersion && <p className="status-note">评分表版本 {sketch.brief ? sketch.rubricVersion : sketch.rubricVersion.slice(0, 8)}</p>}
            <div className="rubric-list" aria-label="快题评分标准">
              {sketch.scoring.map((criterion) => (
                <article key={criterion.id}>
                  <div>
                    <h4>{criterion.title}</h4>
                    <strong>{criterion.score} 分</strong>
                  </div>
                  <p>{criterion.description}</p>
                </article>
              ))}
            </div>
            <SourceLinks sources={sketchSources} title="快题相关来源" />
            <div className="detail-actions">
              <button className="secondary-action" type="button" onClick={onUpload}>上传 AI 评图</button>
              {sketch.brief && <a className="secondary-action" download={`${sketch.title}-任务单.md`}
                href={`data:text/markdown;charset=utf-8,${encodeURIComponent(formatSketchTaskSheet(sketch))}`}>下载任务单</a>}
              <button className="secondary-action" type="button" onClick={() => onNavigate("school")}>查看院校风格</button>
            </div>
          </div>
        </DetailSection>
      )}

      {page === "critique" && (
        <DetailSection eyebrow="CRITIQUE" title="AI 评图">
          {sketch.brief && <div className="detail-card resume-card">
            <strong>{sketch.title}</strong>
            {!hasUpload && <p>当前评分表版本 {sketch.rubricVersion}</p>}
            <button className="secondary-action" type="button" onClick={() => onNavigate("sketch")}>查看任务与评分表</button>
          </div>}
          {hasUpload ? (
            <div className="critique-result">
              {uploadedSketch && critiqueStatus !== "mock" && <SketchPreviewCard uploadedSketch={uploadedSketch} onClear={onClearSketchFile} compact />}
              <div className="score-badge">
                <strong>{critique.score}</strong>
                <em>/{critique.totalScore}</em>
                <span>手绘快题评分</span>
              </div>
              {critiqueMessage && <p className="status-note">{critiqueMessage}</p>}
              <CritiqueCriteriaScores items={critique.criteriaScores} />
              <ReferenceCases result={critique} />
              <CritiqueBlock title="优点" items={critique.strengths} />
              <CritiqueBlock title="需要改" items={critique.issues} />
              <CritiqueBlock title="下一张训练" items={[...critique.advice, critique.nextTask]} />
              {critiqueStatus === "done" && onOpenSavedReport && (
                <button className="secondary-action dark-action" type="button" onClick={onOpenSavedReport}>打开报告并提交改稿</button>
              )}
              <button className="secondary-action" disabled={critiqueStatus === "reading"} type="button" onClick={onClearSketchFile}>
                <RotateCcw size={16} strokeWidth={1.8} /> {critiqueStatus === "mock" ? "关闭示例" : "重新上传"}
              </button>
            </div>
          ) : (
            <CritiqueUploadPanel
              critiqueMessage={critiqueMessage}
              critiqueStatus={critiqueStatus}
              onChooseSketchFile={onChooseSketchFile}
              onClearSketchFile={onClearSketchFile}
              onRunCritique={onRunCritique}
              uploadedSketch={uploadedSketch}
              canEvaluate={signedIn || !import.meta.env.PROD}
              onSignIn={() => onNavigate("profile")}
            />
          )}
        </DetailSection>
      )}

      {page === "member" && (
        <DetailSection eyebrow="MEMBER" title="会员权益">
          {selectedMembershipBenefit ? (
            <MembershipBenefitDetail
              benefit={selectedMembershipBenefit}
              onBack={onClearMembershipBenefit}
              onNavigate={onNavigate}
            />
          ) : (
            <>
              <div className="member-panel">
                <span>{monthlyPlan.priceLabel}</span>
                <h3>{monthlyPlan.headline}</h3>
                <p>{monthlyPlan.cta}</p>
                <div className="member-limits">
                  <span>评图额度: {formatLimit(monthlyPlan.featureLimits["ai-critique"] ?? 0)}</span>
                  <span>组卷额度: {formatLimit(monthlyPlan.featureLimits["exam-generation"] ?? 0)}</span>
                </div>
              </div>
              <div className="benefit-list benefit-grid">
                {membershipBenefits.map((benefit) => (
                  <button
                    key={benefit}
                    aria-label={`查看权益 ${benefit}`}
                    className="benefit-card"
                    type="button"
                    onClick={() => onSelectMembershipBenefit(benefit)}
                  >
                    <span>{benefit}</span>
                    <ChevronRight size={15} color="var(--muted)" />
                  </button>
                ))}
              </div>
            </>
          )}
        </DetailSection>
      )}

      {page === "school" && (
        <DetailSection eyebrow="SCHOOL" title="院校资料">
          <div className="school-profile">
            <span>{school.city} / 产品设计</span>
            <h3>{school.name}</h3>
            <p>{school.positioning}</p>
            <div className="tag-row">{school.styleTags.map((tag) => <span key={tag}>{tag}</span>)}</div>
            <div className="source-summary">
              <ShieldCheck size={18} color="var(--accent-green)" />
              <span>{verifiedSources}/{sources.length} 条来源已核实</span>
            </div>
            <SourceLinks sources={sources} />
          </div>
        </DetailSection>
      )}
    </section>
  );
}

function CritiqueUploadPanel({
  critiqueMessage, critiqueStatus, onChooseSketchFile, onClearSketchFile, onRunCritique, uploadedSketch, canEvaluate, onSignIn,
}: {
  critiqueMessage: string | null;
  critiqueStatus: CritiqueStatus;
  onChooseSketchFile: (file: File | null) => void;
  onClearSketchFile: () => void;
  onRunCritique: (mode: "sample" | "uploaded") => void;
  uploadedSketch: UploadedSketch | null;
  canEvaluate: boolean;
  onSignIn: () => void;
}) {
  const loading = critiqueStatus === "loading" || critiqueStatus === "reading";

  return (
    <div className="upload-panel">
      {canEvaluate && <label className="upload-dropzone">
        <input
          aria-label="上传手绘快题图片"
          accept="image/png,image/jpeg,image/webp"
          disabled={loading}
          type="file"
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0] ?? null;
            event.target.value = "";
            onChooseSketchFile(file);
          }}
        />
        <ImageUp size={32} strokeWidth={1.5} color="var(--accent-gold)" />
        <span>选择草图图片</span>
        <small>JPG / PNG / WEBP</small>
      </label>}

      {uploadedSketch ? (
        <SketchPreviewCard uploadedSketch={uploadedSketch} onClear={onClearSketchFile} />
      ) : (
        <div className="upload-placeholder">
          <FilePenLine size={24} strokeWidth={1.5} color="var(--accent-green)" />
          <p>{canEvaluate ? "提交评图后，图片会发送给视觉模型，用于生成训练反馈。" : "登录后可以上传作品、保存报告和提交同题改稿。"}</p>
        </div>
      )}

      {critiqueMessage && <p className="status-note">{critiqueMessage}</p>}

      <div className="detail-actions">
        {canEvaluate ? <button
          className="secondary-action dark-action"
          disabled={!uploadedSketch || loading}
          type="button"
          onClick={() => onRunCritique("uploaded")}
        >
          {loading ? <LoaderCircle size={16} strokeWidth={1.8} /> : <PenTool size={16} strokeWidth={1.8} />}
          开始 AI 评图
        </button> : <button className="secondary-action dark-action" type="button" onClick={onSignIn}>登录或注册</button>}
        <button
          className="secondary-action"
          disabled={loading}
          type="button"
          onClick={() => onRunCritique("sample")}
        >
          使用示例评图
        </button>
      </div>
    </div>
  );
}

function SketchPreviewCard({
  compact = false, onClear, uploadedSketch,
}: {
  compact?: boolean;
  onClear: () => void;
  uploadedSketch: UploadedSketch;
}) {
  return (
    <article className={compact ? "sketch-preview compact-preview" : "sketch-preview"}>
      <img alt="已上传手绘快题预览" src={uploadedSketch.dataUrl} />
      <div>
        <strong>{uploadedSketch.name}</strong>
        <span>{formatFileSize(uploadedSketch.size)}</span>
      </div>
      {!compact && (
        <button aria-label="移除已上传图片" type="button" onClick={onClear}>
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </article>
  );
}

function CritiqueCriteriaScores({ items }: { items: CritiqueResult["criteriaScores"] }) {
  if (items.length === 0) return null;

  return (
    <article className="critique-criteria">
      <h3>分项评分</h3>
      <div>
        {items.map((item) => (
          <section key={item.id}>
            <header>
              <span>{item.title}</span>
              <strong>{item.score}/{item.maxScore}</strong>
            </header>
            <p>{item.comment}</p>
          </section>
        ))}
      </div>
    </article>
  );
}

function PaperQuestionDetail({
  context, onBack, onOpenTheoryPoint,
}: {
  context: NonNullable<ReturnType<typeof findPaperQuestion>>;
  onBack: () => void;
  onOpenTheoryPoint: (pointId: string) => void;
}) {
  const { question, relatedPoint, section } = context;
  const displayTitle = getQuestionDisplayTitle(question.text, relatedPoint);

  return (
    <div className="detail-stack paper-question-detail">
      <button className="text-action" type="button" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} /> 返回试卷
      </button>
      <article className="detail-card hero-detail-card">
        <span>{section.title} / {question.score} 分</span>
        <h3>{displayTitle}</h3>
        <p>{question.text}</p>
      </article>
      <DetailBlock title="审题提示">
        <p>{buildQuestionReviewHint(section.title, question.text, relatedPoint)}</p>
      </DetailBlock>
      <DetailBlock title="答题路径">
        <ul>
          <li>先用 1 句话给出定义或中心观点，避免直接堆材料。</li>
          <li>再补背景、核心主张、代表案例或产品设计迁移。</li>
          <li>最后加一句评价，说明它对当代产品设计训练的意义。</li>
        </ul>
      </DetailBlock>
      {relatedPoint && (
        <button className="secondary-action" type="button" onClick={() => onOpenTheoryPoint(relatedPoint.id)}>
          打开考点 {relatedPoint.title}
        </button>
      )}
    </div>
  );
}

function MembershipBenefitDetail({
  benefit, onBack, onNavigate,
}: {
  benefit: string;
  onBack: () => void;
  onNavigate: (page: PageId) => void;
}) {
  const detail = getMembershipBenefitDetail(benefit);

  return (
    <div className="detail-stack benefit-detail">
      <button className="text-action" type="button" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} /> 返回会员权益
      </button>
      <article className="detail-card hero-detail-card">
        <span>会员功能</span>
        <h3>{benefit}</h3>
        <p>{detail.summary}</p>
      </article>
      <DetailBlock title="权益说明">
        <p>{detail.description}</p>
      </DetailBlock>
      <DetailBlock title="使用入口">
        <p>{detail.entryDescription}</p>
      </DetailBlock>
      <button className="secondary-action" type="button" onClick={() => onNavigate(detail.page)}>
        {detail.actionLabel}
      </button>
    </div>
  );
}

function TheoryPointList({ points, onSelect, pilot = false }: {
  points: TheoryKnowledgePoint[]; onSelect: (pointId: string) => void; pilot?: boolean;
}) {
  return <div className="line-list">
    {points.map((point, index) => (
      <button key={point.id} aria-label={`查看考点 ${point.title}`} className="line-card" type="button"
        onClick={() => onSelect(point.id)}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <div>
          <h3>{point.title}</h3>
          <p>{point.designTransfer}</p>
          <div className="tag-row compact-tags">
            {pilot ? <span>章节练习</span> : <><span>{point.level}</span><span>{point.examPriority}</span></>}
          </div>
        </div>
        <ChevronRight size={16} color="var(--muted)" />
      </button>
    ))}
  </div>;
}

function TheoryPointDetail({
  onBack, onSelectTheoryPoint, point, pilot, onPractice,
}: {
  onBack: () => void;
  onSelectTheoryPoint: (pointId: string) => void;
  point: TheoryKnowledgePoint;
  pilot: boolean;
  onPractice?: () => void;
}) {
  const books = point.bookIds
    .map((bookId) => theoryBooks.find((book) => book.id === bookId))
    .filter((book): book is typeof theoryBooks[number] => Boolean(book));
  const pilotUnit = pilot ? swjtu337Units.find(({ chapter }) => point.chapterIds.includes(chapter.id)) : undefined;
  const chapters = pilotUnit ? [pilotUnit.chapter] : theoryChapters.filter((chapter) => point.chapterIds.includes(chapter.id));
  const sources = point.sourceIds
    .map((sourceId) => theorySourceReferences.find((source) => source.id === sourceId))
    .filter((source): source is typeof theorySourceReferences[number] => Boolean(source));
  const relatedPoints = getRelatedTheoryPoints(point, pilotUnit?.points ?? theoryKnowledgePoints);

  return (
    <div className="detail-stack theory-point-detail">
      <button className="text-action" type="button" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} /> 返回理论重点
      </button>
      <article className="detail-card hero-detail-card">
        <span>{pilotUnit ? `337 · 第 ${pilotUnit.chapter.order} 章` : `${point.level} / ${point.examPriority}`}</span>
        <h3>{point.title}</h3>
        <p>{point.recitation}</p>
        <div className="tag-row">{point.examForms.map((form) => <span key={form}>{form}</span>)}</div>
      </article>
      {onPractice && <button className="secondary-action dark-action" type="button" onClick={onPractice}>练这张带背卡</button>}
      <DetailBlock title="答题结构">
        <span className="answer-mark-title">考试答案标注</span>
        <AnswerFrameMarks answerFrame={point.answerFrame} />
      </DetailBlock>
      <DetailBlock title="产品设计迁移">
        <p>{point.designTransfer}</p>
      </DetailBlock>
      <DetailBlock title="关键词">
        <div className="tag-row">{point.keywords.map((keyword) => <span key={keyword}>{keyword}</span>)}</div>
      </DetailBlock>
      <DetailBlock title="对应书目与章节">
        <ul>
          {books.map((book) => <li key={book.id}>{book.title} {pilot ? book.edition : `/ ${book.studyPriority}`}</li>)}
          {chapters.map((chapter) => <li key={chapter.id}>{chapter.title}: {chapter.coreQuestion}</li>)}
        </ul>
      </DetailBlock>
      <DetailBlock title={pilot ? "本章训练目标" : "为什么重点"}>
        <p>{point.priorityReason}</p>
      </DetailBlock>
      <DetailBlock title="关联知识">
        <div className="related-knowledge-list">
          {relatedPoints.map((relatedPoint) => (
            <button
              key={relatedPoint.id}
              aria-label={`查看关联知识 ${relatedPoint.title}`}
              type="button"
              onClick={() => onSelectTheoryPoint(relatedPoint.id)}
            >
              <span>{pilot ? "本章比较" : relatedPoint.examPriority}</span>
              <strong>{relatedPoint.title}</strong>
              <small>{getRelatedReason(point, relatedPoint)}</small>
            </button>
          ))}
        </div>
      </DetailBlock>
      <div className="source-list">
        {sources.map((source) => (
          <a
            key={source.id}
            className="source-link"
            href={source.url}
            rel="noreferrer"
            target="_blank"
          >
            <span>{sourceTypeText[source.reliability]}</span>
            <p>{source.title}<small>{source.notes}</small></p>
            <ExternalLink size={15} color="var(--muted)" />
          </a>
        ))}
      </div>
    </div>
  );
}

function MemoryCardList({ tasks, schoolId, reviewRecords, onSelect }: {
  tasks: typeof memoryTasks; schoolId: SchoolId; reviewRecords: ReviewRecords; onSelect: (taskId: string) => void;
}) {
  return <div className="memory-grid">
    {tasks.map((task) => <button key={task.id} aria-label={`查看带背卡片 ${task.topic}`} className="memory-card"
      type="button" onClick={() => onSelect(task.id)}>
      <span>{reviewLabel(reviewRecords[reviewKey(schoolId, task.id)])}</span>
      <h3>{task.topic}</h3>
      <p>{task.prompt}</p>
      <ChevronRight size={16} color="var(--muted)" />
    </button>)}
  </div>;
}

function MemoryTaskDetail({
  onBack, onClearReview, onOpenTheoryPoint, onRecordReview, record, task, pending, chapterPoint,
}: {
  onBack: () => void; onClearReview: (taskId: string) => void;
  onOpenTheoryPoint: (pointId: string) => void;
  onRecordReview: (taskId: string, rating: ReviewStatus) => void;
  record?: ReviewRecords[string]; task: typeof memoryTasks[number]; pending: boolean;
  chapterPoint?: TheoryKnowledgePoint;
}) {
  const [showAnswer, setShowAnswer] = useState(false);
  const relatedPoint = chapterPoint ?? theoryKnowledgePoints.find((point) => point.title === task.topic);
  const canRate = !pending && (!chapterPoint || showAnswer);

  return (
    <div className="detail-stack memory-detail">
      <button className="text-action" type="button" onClick={onBack}>
        <ArrowLeft size={15} strokeWidth={2} /> 返回带背计划
      </button>
      <article className="detail-card hero-detail-card">
        <span>{reviewLabel(record)}</span>
        <h3>{task.topic}</h3>
        <p>{task.prompt}</p>
      </article>
      <DetailBlock title="回忆提问">
        {chapterPoint ? <p>先用 90 秒独立复述上方问题，再对照要点找出漏掉的内容。</p> : <ul>
          <li>先用 30 秒写下关键词，不翻资料。</li>
          <li>再用 90 秒口述定义、背景、代表观点和产品设计迁移。</li>
          <li>最后对照答题结构，标出漏掉的层级。</li>
        </ul>}
      </DetailBlock>
      {chapterPoint ? (
        showAnswer ? <DetailBlock title="参考要点"><AnswerFrameMarks answerFrame={chapterPoint.answerFrame} /></DetailBlock>
          : <button className="secondary-action" type="button" onClick={() => setShowAnswer(true)}>查看参考要点</button>
      ) : <DetailBlock title="下一步动作">
        <ul>
          <li>把今天漏掉的关键词加入明天复习。</li>
          <li>用一道名词解释和一道简答题做即时输出。</li>
          <li>如果能稳定复述，再进入 3 天或 7 天复习。</li>
        </ul>
      </DetailBlock>}
      <section className="detail-card review-checkin" aria-label="记录本次复习">
        <h4>这次回忆得怎么样？</h4>
        <p>{chapterPoint ? "对照要点后自评。系统会根据结果安排下次复习。" : "先独立复述，再选一个最接近的结果。系统会安排下次复习。"}</p>
        <div className="review-choice">
          <button type="button" disabled={!canRate} onClick={() => onRecordReview(task.id, "不会")}>不会 · 明天再练</button>
          <button type="button" disabled={!canRate} onClick={() => onRecordReview(task.id, "模糊")}>模糊 · 3 天后</button>
          <button type="button" disabled={!canRate} onClick={() => onRecordReview(task.id, "熟悉")}>熟悉 · 7 天后</button>
        </div>
        {record && <>
          <p role="status">已记录“{record.rating}”，{reviewLabel(record)}。返回首页可查看学习状态。</p>
          <button className="review-undo" type="button" disabled={pending} onClick={() => onClearReview(task.id)}>撤销这次记录</button>
        </>}
      </section>
      {relatedPoint && (!chapterPoint || showAnswer) && (
        <button className="secondary-action" type="button" onClick={() => onOpenTheoryPoint(relatedPoint.id)}>
          打开理论详情
        </button>
      )}
    </div>
  );
}

function AnswerFrameMarks({ answerFrame }: { answerFrame: string }) {
  const marks = parseAnswerFrame(answerFrame);

  return (
    <div className="answer-mark-list">
      {marks.map((mark) => (
        <article key={`${mark.label}-${mark.text}`}>
          <span>{mark.label}</span>
          <p>{mark.text}</p>
        </article>
      ))}
    </div>
  );
}

function DetailBlock({ children, title }: { children: ReactNode; title: string }) {
  return (
    <article className="detail-card">
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function SourceLinks({ sources, title }: { sources: SourceRegistryItem[]; title?: string }) {
  if (sources.length === 0) return null;

  return (
    <div className="source-list source-link-list" aria-label={title}>
      {title && <span className="eyebrow">{title}</span>}
      {sources.map((source) => {
        const external = isExternalUrl(source.url);

        return (
          <a
            key={`${source.schoolId}-${source.title}`}
            className="source-link"
            href={source.url}
            rel={external ? "noreferrer" : undefined}
            target={external ? "_blank" : undefined}
          >
            <span>{sourceTypeText[source.type]}</span>
            <p>{source.title}<small>{source.summary}</small></p>
            <ExternalLink size={15} color="var(--muted)" />
          </a>
        );
      })}
    </div>
  );
}

function findPaperQuestion(paper: typeof examPapers[number], questionId: string | null) {
  if (!questionId) return null;

  for (const section of paper.sections) {
    const question = section.questions.find((item) => item.id === questionId);

    if (question) {
      return {
        question,
        relatedPoint: findTheoryPointForText(question.text) ?? null,
        section,
      };
    }
  }

  return null;
}

function memoryTaskId(point: TheoryKnowledgePoint) {
  return memoryTasks.find((task) => task.topic === point.title)?.id ?? `theory-${point.id}`;
}

function findTheoryPointForText(text: string) {
  return theoryKnowledgePoints.find((point) => text.includes(point.title) || point.keywords.some((keyword) => text.includes(keyword)));
}

function getQuestionDisplayTitle(text: string, relatedPoint?: TheoryKnowledgePoint | null) {
  return relatedPoint?.title ?? text.replace(/[，。！？；：,.!?;:]/g, "").slice(0, 18);
}

function getQuestionActionTitle(text: string) {
  return text.replace(/[，。！？；：,.!?;:]/g, "").slice(0, 22);
}

function parseAnswerFrame(answerFrame: string) {
  const matches = [...answerFrame.matchAll(/([^：。]+)：([^。]+)(?:。|$)/g)];

  if (matches.length === 0) {
    return [{ label: "答案", text: answerFrame }];
  }

  return matches.map((match) => ({
    label: match[1].trim(),
    text: match[2].trim(),
  }));
}

function getRelatedTheoryPoints(point: TheoryKnowledgePoint, points: TheoryKnowledgePoint[]) {
  return points
    .filter((candidate) => candidate.id !== point.id)
    .map((candidate) => ({
      point: candidate,
      score: getRelatedScore(point, candidate),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => item.point);
}

function getRelatedScore(point: TheoryKnowledgePoint, candidate: TheoryKnowledgePoint) {
  const sharedChapterCount = candidate.chapterIds.filter((chapterId) => point.chapterIds.includes(chapterId)).length;
  const sharedBookCount = candidate.bookIds.filter((bookId) => point.bookIds.includes(bookId)).length;
  const sharedKeywordCount = candidate.keywords.filter((keyword) => point.keywords.includes(keyword)).length;

  return sharedChapterCount * 4 + sharedBookCount * 2 + sharedKeywordCount;
}

function getRelatedReason(point: TheoryKnowledgePoint, relatedPoint: TheoryKnowledgePoint) {
  if (relatedPoint.chapterIds.some((chapterId) => point.chapterIds.includes(chapterId))) {
    return "同一章节脉络";
  }

  if (relatedPoint.bookIds.some((bookId) => point.bookIds.includes(bookId))) {
    return "同一参考书主线";
  }

  return "关键词相邻";
}

function buildQuestionReviewHint(sectionTitle: string, questionText: string, relatedPoint?: TheoryKnowledgePoint | null) {
  const pointText = relatedPoint ? `，核心考点是“${relatedPoint.title}”` : "";
  return `${sectionTitle}${pointText}。作答时先判断题型分值，再把题干中的关键词转成可展开的历史背景、概念定义、评价和产品设计应用。题目原文：${questionText}`;
}

function getMembershipBenefitDetail(benefit: string): {
  actionLabel: string;
  description: string;
  entryDescription: string;
  page: PageId;
  summary: string;
} {
  if (benefit.includes("院校资料库")) {
    return {
      actionLabel: "打开院校资料",
      description: "集中查看目标院校定位、风格标签、公开来源和可信度标注，便于判断训练方向是否有证据支撑。",
      entryDescription: "从这里进入院校资料页，继续打开招生简章、大纲、导师方向和训练假设来源。",
      page: "school",
      summary: "把院校信息从零散链接整理成可复查的备考资料层。",
    };
  }

  if (benefit.includes("重点库")) {
    return {
      actionLabel: "打开理论重点",
      description: "理论重点库按考频、答题结构、产品设计迁移和书目章节组织，适合背诵前先建立答题框架。",
      entryDescription: "从这里进入理论重点页，继续点开单个考点查看答题结构和来源。",
      page: "theory",
      summary: "把设计史知识点拆成可背、可答、可迁移的考点卡。",
    };
  }

  if (benefit.includes("带背计划")) {
    return {
      actionLabel: "打开带背计划",
      description: "每日按复习间隔安排核心考点，帮助你从会看材料变成能闭卷复述。",
      entryDescription: "从这里进入带背计划页，点开单张卡片完成回忆提问和下一步动作。",
      page: "memory",
      summary: "用艾宾浩斯节奏把理论考点压进长期记忆。",
    };
  }

  if (benefit.includes("模拟卷")) {
    return {
      actionLabel: "打开自动组卷",
      description: "根据目标院校风格生成 150 分正式结构试卷，并把题目链接到对应理论考点。",
      entryDescription: "从这里进入自动组卷页，点开题目拆解或跳转关联考点。",
      page: "paper",
      summary: "把理论复习转成考试题型和分值训练。",
    };
  }

  if (benefit.includes("快题")) {
    return {
      actionLabel: "打开手绘快题",
      description: "快题页提供 3 小时训练题、正式 150 分评分表和院校风格来源，帮助你按考试标准练画。",
      entryDescription: "从这里进入手绘快题页，查看评分维度后再上传评图。",
      page: "sketch",
      summary: "把快题训练从单纯画图变成按评分维度复盘。",
    };
  }

  if (benefit.includes("AI 手绘评图")) {
    return {
      actionLabel: "打开 AI 评图",
      description: "AI 评图按目标院校关键词和 150 分快题评分表给出优点、问题、修改建议和下一张训练任务。",
      entryDescription: "从这里进入 AI 评图页，模拟上传草图后查看评分与修改方向。",
      page: "critique",
      summary: "把草图反馈整理成可执行的改稿任务。",
    };
  }

  return {
    actionLabel: "回到今日报告",
    description: "学习报告会汇总理论掌握、快题进度、模拟均分和下一步薄弱项。",
    entryDescription: "从这里回到首页查看今日研习报告和下一步学习计划。",
    page: "home",
    summary: "把每天的训练结果收束成下一步行动。",
  };
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function isExternalUrl(url: string) {
  return /^https?:\/\//.test(url);
}

function DetailSection({ children, eyebrow, title }: { children: ReactNode; eyebrow: string; title: string; }) {
  return (
    <section className="detail-section" aria-labelledby={`${eyebrow}-title`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2 id={`${eyebrow}-title`}>{title}</h2>
      {children}
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function CritiqueBlock({ items, title }: { items: string[]; title: string }) {
  return (
    <article className="critique-block">
      <h3>{title}</h3>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </article>
  );
}
