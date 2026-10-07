import CalendarInput from "./CalendarInput";
import { useEffect, useState } from "react";
import { Pause, Play, Loader2 } from "lucide-react";
import { latestLearningPolicyDate, learningDate, saveLearningPolicy } from "../lib/effectiveLearning";
import { surahs } from "../data/surahList";
import { formatDate } from "../lib/calendar";
import { showToast } from "./Toast";
import "./StudentLessonActivity.css";

function normalizePolicyDate(value, minimum = "") {
  const today = learningDate();
  let next = value && value <= today ? value : today;
  if (minimum && next < minimum) next = minimum;
  return next;
}

export default function StudentLessonActivity({ studentId, halaqaId, policy, plan, onSaved, disabled = false, effectiveDate = learningDate() }) {
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState(false);
  const [minimumDate, setMinimumDate] = useState(policy?.effective_from || "");
  const [date, setDate] = useState(() => normalizePolicyDate(effectiveDate, policy?.effective_from || ""));
  const [startSurah, setStartSurah] = useState(policy?.lesson_start_surah || plan?.memorization_from_surah || "");
  const [startAyah, setStartAyah] = useState(policy?.lesson_start_ayah || plan?.memorization_from_ayah || 1);
  const [amount, setAmount] = useState(policy?.lesson_daily_amount ?? plan?.memorization_daily_amount ?? "");
  const [unit, setUnit] = useState(policy?.lesson_daily_unit || plan?.memorization_daily_unit || "lines");
  const dailyAmount = policy?.lesson_daily_amount ?? plan?.memorization_daily_amount;
  const hasDailyAmount = Number(dailyAmount ?? 0) > 0;
  const enabled = (policy?.lesson_enabled ?? (dailyAmount != null ? hasDailyAmount : Number(plan?.memorization_target_faces || 0) > 0))
    && !["stabilization_full", "pause"].includes(plan?.interventionType);
  const needsSetup = !enabled && (!hasDailyAmount || !(policy?.lesson_start_surah || plan?.memorization_from_surah));

  useEffect(() => {
    let active = true;
    const fallback = policy?.effective_from || "";
    setMinimumDate(fallback);
    setDate(normalizePolicyDate(effectiveDate, fallback));

    if (!studentId || !halaqaId) return () => { active = false; };

    latestLearningPolicyDate(studentId, halaqaId)
      .then((savedDate) => {
        if (!active) return;
        const latestDate = savedDate || fallback;
        setMinimumDate(latestDate);
        setDate((current) => {
          if (!current || current < latestDate || current > learningDate()) {
            return normalizePolicyDate(effectiveDate, latestDate);
          }
          return current;
        });
      })
      .catch(() => {
        // Keep the historical policy as a safe fallback if the latest lookup is unavailable.
      });

    return () => { active = false; };
  }, [studentId, halaqaId, effectiveDate, policy?.effective_from]);

  async function change() {
    if (!studentId || !halaqaId || busy) return;
    if (!plan) { showToast("حدد خطة الطالب الشهرية أولًا", "info"); return; }
    const days = plan.days?.length ? plan.days : plan.recitation_days_snapshot?.length
      ? plan.recitation_days_snapshot : plan.recitation_days;
    if (!enabled && !days?.length) { showToast("حدد أيام التسميع للطالب قبل تشغيل الدرس", "info"); return; }
    if (needsSetup && !details) { setDetails(true); return; }
    if (needsSetup && (!startSurah || Number(startAyah) < 1 || Number(amount) <= 0)) {
      showToast("حدد بداية الدرس والمقدار اليومي مرة واحدة", "info"); return;
    }
    setBusy(true);
    try {
      const savedDate = await latestLearningPolicyDate(studentId, halaqaId);
      const latestDate = savedDate || minimumDate || policy?.effective_from || "";
      if (latestDate && date < latestDate) {
        setMinimumDate(latestDate);
        setDate(latestDate);
        showToast(`آخر تغيير محفوظ هو ${formatDate(latestDate, { month: "long" })}. تم ضبط التاريخ عليه.`, "info");
        return;
      }

      const patch = { lesson_enabled: !enabled };
      if (needsSetup) Object.assign(patch, {
        lesson_start_surah: startSurah, lesson_start_ayah: Number(startAyah),
        lesson_daily_amount: Number(amount), lesson_daily_unit: unit,
      });
      await saveLearningPolicy(studentId, halaqaId, patch, date);
      showToast(enabled ? "تم إيقاف الدرس مع استمرار المراجعة" : "تم تشغيل الدرس من التاريخ المحدد", "success");
      setDetails(false);
      await onSaved?.();
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("POLICY_DATE")) {
        try {
          const savedDate = await latestLearningPolicyDate(studentId, halaqaId);
          const latestDate = savedDate || minimumDate || policy?.effective_from || "";
          if (latestDate) {
            setMinimumDate(latestDate);
            setDate(normalizePolicyDate(date, latestDate));
            showToast(`اختر تاريخًا من ${formatDate(latestDate, { month: "long" })} حتى اليوم`, "error");
          } else {
            showToast("اختر تاريخًا من آخر تغيير حتى اليوم", "error");
          }
        } catch {
          showToast("اختر تاريخًا من آخر تغيير حتى اليوم", "error");
        }
      } else {
        showToast(message.includes("LESSON_DAYS") ? "حدد أيام التسميع للطالب قبل تشغيل الدرس" : "تعذر تغيير حالة الدرس", "error");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="student-lesson-activity">
      <div className="student-lesson-activity-main">
        <span><strong>{enabled ? "الدرس مستمر" : "الدرس موقوف"}</strong><small>حساب الحفظ حسب فترات التشغيل</small></span>
        <button type="button" onClick={change} disabled={busy || disabled || plan?.interventionType === "pause"}>
          {busy ? <Loader2 size={15} className="spin" /> : enabled ? <Pause size={15} /> : <Play size={15} />}
          {enabled ? "إيقاف الدرس" : "استئناف الدرس"}
        </button>
        <button type="button" className="lesson-date-toggle" onClick={() => setDetails(!details)} disabled={busy}>التاريخ والبداية</button>
      </div>
      {details && <div className="student-lesson-activity-details">
        <label>يسري من<CalendarInput value={date} max={learningDate()} min={minimumDate || undefined} onChange={(e) => setDate(e.target.value)} /></label>
        {needsSetup && <>
          <label>بداية الحفظ<select value={startSurah} onChange={(e) => setStartSurah(e.target.value)}><option value="">السورة</option>{surahs.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>الآية<input type="number" min="1" value={startAyah} onChange={(e) => setStartAyah(e.target.value)} /></label>
          <label>المقدار اليومي<input type="number" min="0.25" step={unit === "lines" ? 1 : 0.25} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
          <label>الوحدة<select value={unit} onChange={(e) => setUnit(e.target.value)}><option value="lines">سطر</option><option value="faces">وجه</option></select></label>
        </>}
        <small>{minimumDate
          ? `آخر تغيير محفوظ: ${formatDate(minimumDate, { month: "long" })}. لا يمكن اختيار تاريخ أقدم منه، وتستمر المراجعة عند إيقاف الدرس.`
          : "يُحفظ تاريخ التغيير وتستمر المراجعة."}</small>
      </div>}
    </div>
  );
}
