import { useState, type FormEvent } from "react";
import { schools, type SchoolId } from "../data/platformData";
import type { ReviewRecords } from "../logic/learningProgress";
import { studyError, studyRequest, studyStages, type StudyAccount, type StudyProfile } from "../services/studyAccount";

type Props = {
  account: StudyAccount | null;
  profile: StudyProfile;
  reviewRecords: ReviewRecords;
  onAccountChange: (account: StudyAccount | null) => void;
  onSaveProfile: (profile: StudyProfile) => Promise<void>;
};

export default function StudyProfilePanel({ account, profile, reviewRecords, onAccountChange, onSaveProfile }: Props) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const hasGuestRecords = Object.keys(reviewRecords).length > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setNotice("");
    try {
      if (account) {
        await onSaveProfile(readProfile(data));
        setNotice("备考档案已保存。");
        return;
      }
      const fields = { username: data.get("username"), password: data.get("password") };
      onAccountChange(await studyRequest<StudyAccount>(mode, mode === "signup" ? {
        ...fields, profile: readProfile(data), reviewRecords: data.get("importReviews") ? reviewRecords : {},
      } : fields));
    } catch (error) {
      setNotice(studyError(error));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setNotice("");
    try {
      await studyRequest("logout");
      onAccountChange(null);
    } catch (error) {
      setNotice(studyError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="study-form" onSubmit={submit}>
      <p>{account ? `当前账号 ${account.username}` : "登录后，可在其他设备找回目标、带背记录和快题草稿。"}</p>
      <fieldset disabled={busy}>
        {!account && <>
          <label>账号<input name="username" autoComplete="username" required minLength={3} maxLength={48} /></label>
          <label>密码<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={8} maxLength={128} /></label>
        </>}
        {(account || mode === "signup") && <>
          <label>目标院校<select name="schoolId" defaultValue={profile.schoolId}>
            {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
          </select></label>
          <label>备考阶段<select name="stage" defaultValue={profile.stage}>
            {studyStages.map((stage) => <option key={stage}>{stage}</option>)}
          </select></label>
          <label>每天可用时间（分钟）<input name="dailyMinutes" type="number" min={15} max={480} required defaultValue={profile.dailyMinutes} /></label>
        </>}
        {!account && mode === "signup" && hasGuestRecords && (
          <label className="study-checkbox"><input type="checkbox" name="importReviews" />导入此浏览器的带背记录</label>
        )}
        <button type="submit" className="secondary-action dark-action">
          {busy ? "正在处理…" : account ? "保存备考档案" : mode === "signup" ? "创建账号" : "登录"}
        </button>
        {account ? (
          <button type="button" className="secondary-action" onClick={() => void logout()}>退出登录</button>
        ) : (
          <button type="button" className="secondary-action" onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setNotice("");
          }}>{mode === "login" ? "注册新账号" : "已有账号，返回登录"}</button>
        )}
      </fieldset>
      {notice && <p className="status-note" role="status">{notice}</p>}
    </form>
  );
}

function readProfile(data: FormData): StudyProfile {
  return {
    schoolId: data.get("schoolId") as SchoolId,
    stage: data.get("stage") as StudyProfile["stage"],
    dailyMinutes: Number(data.get("dailyMinutes")),
  };
}
