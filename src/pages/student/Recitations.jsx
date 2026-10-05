import {withSideLessonMetrics,storedSideLesson,formatSideLessonTotal} from "../../lib/sideLesson";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, CalendarClock, CalendarDays, Clock3, RefreshCw, Sparkles, Star, Target, UserRoundSearch } from "lucide-react";
import StudentPage from "../../components/student/StudentPage";
import { useStudentPortal } from "../../context/StudentPortalContext";
import { supabase } from "../../lib/supabase";
import {
  evaluationTone,
  facesToPretty,
  formatDailyAmount,
  formatGregorianDate,
  formatHijriDate,
  formatNumber,
} from "../../lib/studentPortalUtils";
import "./StudentPortal.css";

const SEGMENT_LABELS = {
  lesson: "الدرس",
  side_lesson: "جنب الدرس",
  revision: "المراجعة",
  stabilization_review: "مراجعة التثبيت",
};

const STATUS_LABELS = {
  exact: "أتم المطلوب",
  under: "أقل من المطلوب",
  over: "أكثر من المطلوب",
  repeat: "إعادة",
  skipped: "لم يُسمّع",
};

function rangeText(fromSurah, fromAyah, toSurah, toAyah) {
  if (!fromSurah || !fromAyah || !toSurah || !toAyah) return "—";
  if (fromSurah === toSurah) return `${fromSurah} ${fromAyah} ← ${toAyah}`;
  return `${fromSurah} ${fromAyah} ← ${toSurah} ${toAyah}`;
}

function ayahRangeText(startId, endId, ayahMap) {
  const start = ayahMap.get(Number(startId));
  const end = ayahMap.get(Number(endId));
  if (!start || !end) return "الموضع محفوظ وسيظهر بعد تحميل بيانات المصحف";
  return rangeText(start.sura_name_ar, start.aya_no, end.sura_name_ar, end.aya_no);
}

function assignmentLabel(type) {
  return SEGMENT_LABELS[type] || "مطلوب قرآني";
}

function dateState(date) {
  if (!date) return "";
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (date < todayKey) return "مطلوب قائم";
  if (date === todayKey) return "اليوم";
  return "الجلسة القادمة";
}

export default function MyRecitations() {
  const { profile, halaqa } = useStudentPortal();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [segmentsByRecitation, setSegmentsByRecitation] = useState(new Map());
  const [assignments, setAssignments] = useState([]);
  const [ayahMap, setAyahMap] = useState(new Map());

  

  async function load() {
    if (!profile?.id) return;

    try {
      setLoading(true);

      let assignmentQuery = supabase
        .from("quran_assignments").neq("segment_type","side_lesson")
        .select("id, student_id, halaqa_id, assignment_date, segment_type, sequence_no, start_ayah_id, end_ayah_id, target_amount, target_unit, source, status, generated_reason")
        .eq("student_id", profile.id)
        .eq("status", "planned")
        .order("assignment_date", { ascending: true })
        .order("sequence_no", { ascending: true })
        .limit(18);

      if (halaqa?.id) assignmentQuery = assignmentQuery.eq("halaqa_id", halaqa.id);

      const [quranResult, nooraniaResult, assignmentResult] = await Promise.all([
        supabase.from("recitations")
          .select("id, student_id, halaqa_id, recitation_date, from_surah, from_ayah, to_surah, to_ayah, review_surah, review_from_ayah, review_to_surah, review_to_ayah, lesson_amount_value, lesson_amount_unit, lesson_faces_manual, lesson_faces, lesson_evaluation, review_faces, review_evaluation, next_surah, next_from_ayah, next_to_surah, next_to_ayah, next2_surah, next2_from_ayah, next2_to_surah, next2_to_ayah, next_evaluation, side_lesson_faces, side_lesson_lines, points, notes")
          .eq("student_id", profile.id)
          .order("recitation_date", { ascending: false })
          .limit(80),
        supabase.from("noorania_recitations")
          .select("id, student_id, recitation_date, lesson, lesson_evaluation, lesson_faces, side_lesson, side_lesson_evaluation, side_lesson_faces, side_lesson_lines, revision, revision_evaluation, revision_faces, points, notes")
          .eq("student_id", profile.id)
          .order("recitation_date", { ascending: false })
          .limit(80),
        assignmentQuery,
      ]);

      if (quranResult.error) throw quranResult.error;
      if (nooraniaResult.error) throw nooraniaResult.error;
      if (assignmentResult.error) throw assignmentResult.error;

      const quranRows = await withSideLessonMetrics(supabase,quranResult.data || []);
      const quranIds = quranRows.map((row) => row.id);

      let segmentRows = [];
      if (quranIds.length) {
        const { data, error } = await supabase
          .from("recitation_segments")
          .select("id, recitation_id, segment_type, sequence_no, planned_start_ayah_id, planned_end_ayah_id, actual_start_ayah_id, actual_end_ayah_id, planned_amount, planned_unit, actual_quran_lines, actual_faces, evaluation, completion_status")
          .in("recitation_id", quranIds)
          .order("sequence_no", { ascending: true });
        if (error) throw error;
        segmentRows = data || [];
      }

      const nextAssignments = assignmentResult.data || [];
      const ayahIds = new Set();
      segmentRows.forEach((row) => {
        [row.planned_start_ayah_id, row.planned_end_ayah_id, row.actual_start_ayah_id, row.actual_end_ayah_id]
          .filter(Boolean)
          .forEach((id) => ayahIds.add(Number(id)));
      });
      nextAssignments.forEach((row) => {
        [row.start_ayah_id, row.end_ayah_id].filter(Boolean).forEach((id) => ayahIds.add(Number(id)));
      });

      const nextAyahMap = new Map();
      if (ayahIds.size) {
        const { data, error } = await supabase
          .from("quran_ayahs")
          .select("id, sura_no, sura_name_ar, aya_no, page")
          .in("id", [...ayahIds]);
        if (error) throw error;
        (data || []).forEach((row) => nextAyahMap.set(Number(row.id), row));
      }

      const byRecitation = new Map();
      segmentRows.forEach((row) => {
        const key = Number(row.recitation_id);
        if (!byRecitation.has(key)) byRecitation.set(key, []);
        byRecitation.get(key).push(row);
      });

      const quran = quranRows.map((row) => ({ ...row, kind: "quran" }));
      const noorania = (await withSideLessonMetrics(supabase,nooraniaResult.data || [],"noorania")).map((row) => ({ ...row, kind: "noorania" }));

      setRecords([...quran, ...noorania].sort((a, b) => new Date(b.recitation_date) - new Date(a.recitation_date)));
      setSegmentsByRecitation(byRecitation);
      setAssignments(nextAssignments);
      setAyahMap(nextAyahMap);
    } catch (error) {
      console.error("Student recitations:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [profile?.id, halaqa?.id]);

  const totalPoints = records.reduce((sum, row) => sum + Number(row.points || 0), 0);
  const nextDate = assignments[0]?.assignment_date || null;
  const nextAssignments = useMemo(
    () => nextDate ? assignments.filter((row) => row.assignment_date === nextDate) : [],
    [assignments, nextDate]
  );

  const latestEvaluation = useMemo(() => {
    const latest = records[0];
    if (!latest) return "—";
    if (latest.kind === "quran") {
      const segments = segmentsByRecitation.get(Number(latest.id)) || [];
      return segments.find((row) => row.segment_type === "lesson")?.evaluation
        || latest.lesson_evaluation
        || segments[0]?.evaluation
        || latest.review_evaluation
        || "—";
    }
    return latest.lesson_evaluation || latest.revision_evaluation || "—";
  }, [records, segmentsByRecitation]);

  return (
    <StudentPage
      eyebrow="يومي مع القرآن"
      title="تسميعي"
      description="المطلوب القادم أمامك بوضوح، وتحته سجل تسميعك الفعلي وما أنجزته في كل جلسة."
      icon={UserRoundSearch}
    >
      <section className="student-metrics">
        <Metric icon={Target} label="المطلوب القادم" value={nextAssignments.length ? formatNumber(nextAssignments.length) : "—"} note={nextDate ? dateState(nextDate) : "لا يوجد مطلوب مولّد بعد"} />
        <Metric icon={Star} label="نقاط التسميع" value={formatNumber(totalPoints)} note="ضمن السجلات المعروضة" />
        <Metric icon={Sparkles} label="آخر تقييم" value={latestEvaluation} note="أحدث جلسة" />
        <Metric icon={CalendarDays} label="آخر تسميع" value={records[0]?.recitation_date ? formatHijriDate(records[0].recitation_date) : "—"} note={records[0]?.recitation_date ? "" : "لا يوجد"} />
      </section>

      <NextAssignmentsPanel
        loading={loading}
        assignments={nextAssignments}
        nextDate={nextDate}
        ayahMap={ayahMap}
      />

      <section className="student-panel">
        <div className="student-panel-head">
          <div className="student-panel-title">
            <div className="student-panel-title-icon"><BookOpen size={19}/></div>
            <div><span>ما سبق</span><h3>سجل التسميع</h3></div>
          </div>
        </div>

        {loading ? (
          <div className="student-loading">جارٍ تحميل سجلاتك…</div>
        ) : !records.length ? (
          <div className="student-empty"><BookOpen size={29}/><strong>لا توجد جلسات تسميع بعد</strong><span>عندما يسجل المعلم تسميعك ستظهر الجلسة هنا.</span></div>
        ) : (
          <div className="student-journey">
            {records.map((record) => (
              <RecitationItem
                record={record}
                segments={record.kind === "quran" ? (segmentsByRecitation.get(Number(record.id)) || []) : []}
                ayahMap={ayahMap}
                key={`${record.kind}-${record.id}`}
              />
            ))}
          </div>
        )}
      </section>
    </StudentPage>
  );
}

function NextAssignmentsPanel({ loading, assignments, nextDate, ayahMap }) {
  return (
    <section className="student-panel" style={{ overflow: "hidden" }}>
      <div className="student-panel-head">
        <div className="student-panel-title">
          <div className="student-panel-title-icon"><CalendarClock size={19}/></div>
          <div>
            <span>المطلوب القادم</span>
            <h3>{nextDate ? `${dateState(nextDate)} • ${formatGregorianDate(nextDate)}` : "سيظهر بعد اعتماد المطلوب"}</h3>
          </div>
        </div>

      </div>

      {loading ? (
        <div className="student-loading">جارٍ تجهيز المطلوب القادم…</div>
      ) : !assignments.length ? (
        <div className="student-empty">
          <Clock3 size={29}/>
          <strong>لا يوجد مطلوب قادم مولّد حاليًا</strong>
          <span>بعد تسجيل التسميع سيبني الصديق المطلوب التالي تلقائيًا من آخر موضع فعلي.</span>
        </div>
      ) : (
        <div className="student-grid student-grid-2" style={{ padding: "0 2px 4px" }}>
          {assignments.map((assignment) => (
            <article className="student-feature-card" key={assignment.id}>
              <div className="icon"><Target size={20}/></div>
              <span>{assignmentLabel(assignment.segment_type)}</span>
              <strong>{ayahRangeText(assignment.start_ayah_id, assignment.end_ayah_id, ayahMap)}</strong>
              <p>
                {assignment.target_amount && assignment.target_unit
                  ? `المقدار المستهدف: ${formatDailyAmount(assignment.target_amount, assignment.target_unit)}`
                  : "الموضع محدد من خطة المعلم"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function RecitationItem({ record, segments, ayahMap }) {
  const quran = record.kind === "quran";
  const lessonSegment = segments.find((row) => row.segment_type === "lesson");
  const hasEngineSegments = quran && segments.length > 0;

  const legacyLessonAmount = quran
    ? record.lesson_amount_value
      ? formatDailyAmount(record.lesson_amount_value, record.lesson_amount_unit)
      : facesToPretty(record.lesson_faces_manual ?? record.lesson_faces ?? 0)
    : record.lesson || facesToPretty(record.lesson_faces);

  const legacyReviewAmount = quran
    ? facesToPretty(record.review_faces)
    : record.revision || facesToPretty(record.revision_faces);

  const evaluation = lessonSegment?.evaluation
    || record.lesson_evaluation
    || record.review_evaluation
    || record.revision_evaluation
    || "غير محدد";

  return (
    <article className="student-journey-item">
      <div className="student-journey-dot">{quran ? <BookOpen size={16}/> : <RefreshCw size={16}/>}</div>
      <div className="student-journey-copy" style={{ width: "100%" }}>
        <div className="student-panel-head" style={{ marginBottom: 8 }}>
          <div>
            <strong>{quran ? "القرآن الكريم" : "القاعدة النورانية"}</strong>
            <p>{formatHijriDate(record.recitation_date)}</p>
          </div>
          <span className={`student-eval-badge ${evaluationTone(evaluation)}`}>{evaluation}</span>
        </div>

        {hasEngineSegments ? (
          <div style={{ display: "grid", gap: 8 }}>
            {segments.filter(segment=>segment.segment_type!=="side_lesson").map((segment) => (
              <div
                key={segment.id}
                style={{
                  display: "grid",
                  gap: 4,
                  padding: "10px 12px",
                  border: "1px solid #e2ebe7",
                  borderRadius: 12,
                  background: "rgba(255,255,255,.68)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <strong>{assignmentLabel(segment.segment_type)}</strong>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#61756d" }}>
                    {STATUS_LABELS[segment.completion_status] || segment.completion_status}
                  </span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 900, color: "#193c35" }}>
                  {ayahRangeText(segment.actual_start_ayah_id, segment.actual_end_ayah_id, ayahMap)}
                </span>
                <small style={{ color: "#667a72" }}>
                  {Number(segment.actual_faces || 0) > 0 ? `المنجز: ${facesToPretty(segment.actual_faces)}` : ""}
                  {segment.evaluation ? `${Number(segment.actual_faces || 0) > 0 ? " • " : ""}التقييم: ${segment.evaluation}` : ""}
                </small>
              </div>
            ))}
          </div>
        ) : (
          <p>
            {quran && record.from_surah && record.to_surah
              ? `الدرس: ${rangeText(record.from_surah, record.from_ayah, record.to_surah, record.to_ayah)}`
              : `الدرس: ${legacyLessonAmount || "—"}`}
            {quran && record.review_surah && record.review_to_surah
              ? ` • المراجعة: ${rangeText(record.review_surah, record.review_from_ayah, record.review_to_surah, record.review_to_ayah)}`
              : ` • المراجعة: ${legacyReviewAmount || "—"}`}
            {!quran && record.side_lesson && !storedSideLesson(record,"noorania").totalLines ? ` • جنب الدرس: ${record.side_lesson}` : ""}
          </p>
        )}

        {storedSideLesson(record,quran?"quran":"noorania").totalLines>0 && <p>جنب الدرس: <strong>{formatSideLessonTotal(storedSideLesson(record,quran?"quran":"noorania").totalFaces,quran?15:10)}</strong> • {quran?record.next_evaluation:record.side_lesson_evaluation}</p>}
        {record.points ? <p>نقاط الجلسة: <strong>{formatNumber(record.points)}</strong></p> : null}
      </div>
    </article>
  );
}

function Metric({ icon: Icon, label, value, note }) {
  return <article className="student-metric"><div className="student-metric-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>;
}
