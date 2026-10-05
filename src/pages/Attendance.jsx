import {calendarLocale} from "../lib/calendar";
import CalendarInput from "../components/CalendarInput";
import { OrnamentScene } from '../components/ornaments/Ornament';
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, FileCheck2, Filter, Loader2, RefreshCw, Search, Users, UserRound, X, XCircle, CircleSlash2, ClipboardCheck, Activity, AlertTriangle, BookOpen, Building2, Eye, History, ListChecks, ShieldCheck, Target, UserCheck } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";

export default function Attendance() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [halaqat, setHalaqat] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [selectedHalaqa, setSelectedHalaqa] =
    useState("");

  const [selectedDate, setSelectedDate] =
    useState(getLocalDate());

  const [search, setSearch] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const [savingStudentId, setSavingStudentId] =
    useState(null);

  const [bulkSaving, setBulkSaving] =
    useState(false);

  const [showOnlyUnrecorded, setShowOnlyUnrecorded] =
    useState(false);

  useEffect(() => {
    loadHalaqat();
  }, []);

  useEffect(() => {
    if (halaqat.length > 0) {
      loadAttendanceData();
    }
  }, [selectedDate, halaqat]);

  // ==========================================
  // DATE
  // ==========================================

  function getLocalDate(date = new Date()) {
    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatDateArabic(dateString) {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    return date.toLocaleDateString(calendarLocale(),
      {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    );
  }

  function formatShortDate(dateString) {
    const date = new Date(
      `${dateString}T00:00:00`
    );

    return date.toLocaleDateString(calendarLocale(),
      {
        day: "numeric",
        month: "short",
      }
    );
  }

  // ==========================================
  // LOAD HALAQAT
  // ==========================================

  async function loadHalaqat() {
    setInitialLoading(true);

    try {
      const { data, error } =
        await supabase
          .from("halaqat")
          .select("*")
          .order("id");

      if (error) {
        throw error;
      }

      const halaqatData = data || [];

      setHalaqat(halaqatData);

      if (
        halaqatData.length > 0 &&
        !selectedHalaqa
      ) {
        setSelectedHalaqa(
          String(halaqatData[0].id)
        );
      }
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "تعذر تحميل الحلقات",
        "error"
      );
    } finally {
      setInitialLoading(false);
    }
  }

  // ==========================================
  // LOAD ATTENDANCE
  // ==========================================

  async function loadAttendanceData() {
    setLoading(true);

    try {
      const {
        data: assignments,
        error: assignmentsError,
      } = await supabase
        .from("student_halaqat")
        .select("*");

      if (assignmentsError) {
        throw assignmentsError;
      }

      if (!assignments?.length) {
        setStudents([]);
        setAttendance([]);
        return;
      }

      const studentIds = [
        ...new Set(
          assignments.map(
            (item) => item.student_id
          )
        ),
      ];

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from("profiles")
        .select(
          "id, full_name, user_number, phone, status"
        )
        .in("id", studentIds);

      if (profilesError) {
        throw profilesError;
      }

      const {
        data: attendanceData,
        error: attendanceError,
      } = await supabase
        .from("attendance")
        .select("*")
        .eq(
          "attendance_date",
          selectedDate
        );

      if (attendanceError) {
        throw attendanceError;
      }

      const studentsWithHalaqa =
        (assignments || [])
          .filter(
            (assignment) =>
              assignment.is_current !== false
          )
          .map((assignment) => {
            const profile =
              (profiles || []).find(
                (student) =>
                  Number(student.id) ===
                  Number(
                    assignment.student_id
                  )
              );

            return {
              ...(profile || {}),

              student_id:
                assignment.student_id,

              halaqa_id:
                assignment.halaqa_id,
            };
          })
          .filter(
            (student) =>
              student.id
          );

      setStudents(
        studentsWithHalaqa
      );

      setAttendance(
        attendanceData || []
      );
    } catch (error) {
      console.error(error);

      showToast(
        error.message ||
          "تعذر تحميل بيانات الحضور",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================
  // STUDENTS
  // ==========================================

  function getStudentsForHalaqa(
    halaqaId
  ) {
    return students.filter(
      (student) =>
        Number(
          student.halaqa_id
        ) === Number(halaqaId)
    );
  }

  function getAttendanceRecord(
    studentId,
    halaqaId
  ) {
    return attendance.find(
      (record) =>
        Number(
          record.student_id
        ) === Number(studentId) &&
        Number(
          record.halaqa_id
        ) === Number(halaqaId) &&
        record.attendance_date ===
          selectedDate
    );
  }

  // ==========================================
  // STATS
  // ==========================================

  function getHalaqaStats(
    halaqaId
  ) {
    const halaqaStudents =
      getStudentsForHalaqa(
        halaqaId
      );

    const total =
      halaqaStudents.length;

    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    halaqaStudents.forEach(
      (student) => {
        const record =
          getAttendanceRecord(
            student.student_id,
            halaqaId
          );

        if (!record) return;

        if (
          record.status ===
          "present"
        ) {
          present++;
        }

        if (
          record.status ===
          "absent"
        ) {
          absent++;
        }

        if (
          record.status ===
          "late"
        ) {
          late++;
        }

        if (
          record.status ===
          "excused"
        ) {
          excused++;
        }
      }
    );

    const recorded =
      present +
      absent +
      late +
      excused;

    const unrecorded =
      Math.max(
        total - recorded,
        0
      );

    const attendancePercentage =
      total > 0
        ? Math.round(
            ((present + late) /
              total) *
              100
          )
        : 0;

    return {
      total,
      present,
      absent,
      late,
      excused,
      recorded,
      unrecorded,
      attendancePercentage,
    };
  }

  // ==========================================
  // SELECTED HALAQA
  // ==========================================

  const selectedHalaqaData =
    useMemo(() => {
      return halaqat.find(
        (h) =>
          Number(h.id) ===
          Number(selectedHalaqa)
      );
    }, [
      halaqat,
      selectedHalaqa,
    ]);

  const selectedStats =
    useMemo(() => {
      if (!selectedHalaqa) {
        return {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          excused: 0,
          recorded: 0,
          unrecorded: 0,
          attendancePercentage: 0,
        };
      }

      return getHalaqaStats(
        selectedHalaqa
      );
    }, [
      selectedHalaqa,
      students,
      attendance,
      selectedDate,
    ]);

  // ==========================================
  // FILTER STUDENTS
  // ==========================================

  const filteredStudents =
    useMemo(() => {
      let result =
        getStudentsForHalaqa(
          selectedHalaqa
        );

      const text =
        search
          .trim()
          .toLowerCase();

      if (text) {
        result = result.filter(
          (student) => {
            const name =
              (
                student.full_name ||
                ""
              ).toLowerCase();

            const number =
              String(
                student.user_number ||
                  ""
              ).toLowerCase();

            return (
              name.includes(text) ||
              number.includes(text)
            );
          }
        );
      }

      if (showOnlyUnrecorded) {
        result =
          result.filter(
            (student) =>
              !getAttendanceRecord(
                student.student_id,
                selectedHalaqa
              )
          );
      }

      return result;
    }, [
      students,
      selectedHalaqa,
      search,
      showOnlyUnrecorded,
      attendance,
      selectedDate,
    ]);

  // ==========================================
  // GLOBAL STATS
  // ==========================================

  const globalStats =
    useMemo(() => {
      let total = 0;
      let present = 0;
      let absent = 0;
      let late = 0;
      let excused = 0;

      halaqat.forEach(
        (halaqa) => {
          const stats =
            getHalaqaStats(
              halaqa.id
            );

          total += stats.total;
          present += stats.present;
          absent += stats.absent;
          late += stats.late;
          excused += stats.excused;
        }
      );

      const recorded =
        present +
        absent +
        late +
        excused;

      return {
        total,
        present,
        absent,
        late,
        excused,
        recorded,
        unrecorded:
          Math.max(
            total - recorded,
            0
          ),
        percentage:
          total > 0
            ? Math.round(
                ((present + late) /
                  total) *
                  100
              )
            : 0,
      };
    }, [
      halaqat,
      students,
      attendance,
      selectedDate,
    ]);

  // ==========================================
  // DATE NAVIGATION
  // ==========================================

  function changeDate(days) {
    const current =
      new Date(
        `${selectedDate}T00:00:00`
      );

    current.setDate(
      current.getDate() +
        days
    );

    const newDate =
      getLocalDate(current);

    const today =
      getLocalDate();

    if (newDate > today) {
      showToast(
        "لا يمكن تسجيل حضور لتاريخ مستقبلي",
        "info"
      );
      return;
    }

    setSelectedDate(
      newDate
    );
  }

  function goToToday() {
    setSelectedDate(
      getLocalDate()
    );
  }

  // ==========================================
  // ADMINISTRATIVE INTELLIGENCE
  // ==========================================

  const halaqaOperationalRows = useMemo(() => {
    return halaqat.map((halaqa) => {
      const stats = getHalaqaStats(halaqa.id);
      let level = "good";
      let label = "مستقرة";

      if (stats.unrecorded > 0) {
        level = "pending";
        label = "التسجيل غير مكتمل";
      }

      if (stats.absent >= 3 || (stats.total > 0 && stats.attendancePercentage < 70)) {
        level = "risk";
        label = "تحتاج متابعة";
      }

      return { halaqa, stats, level, label };
    });
  }, [halaqat, students, attendance, selectedDate]);

  const incompleteHalaqat = halaqaOperationalRows.filter(
    (item) => item.stats.unrecorded > 0
  ).length;

  const riskHalaqat = halaqaOperationalRows.filter(
    (item) => item.level === "risk"
  ).length;

  const fullyRecordedHalaqat = halaqaOperationalRows.filter(
    (item) => item.stats.total > 0 && item.stats.unrecorded === 0
  ).length;

  const selectedDayLabel =
    selectedDate === getLocalDate() ? "اليوم" : formatShortDate(selectedDate);

  function selectHalaqaForRecords(id) {
    setSelectedHalaqa(String(id));
    setSearch("");
    setShowOnlyUnrecorded(false);
    setTimeout(() => {
      document.getElementById("attendance-records")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
  }

  // ==========================================
  // RENDER
  // ==========================================

  if (initialLoading) {
    return (
      <AdminAttendanceShell>
        <LoadingScreen />
      </AdminAttendanceShell>
    );
  }

  return (
    <AdminAttendanceShell>
      <section className="aa-hero">
        <OrnamentScene primary="02-shams" />

        <div className="aa-hero-main">
          <div className="aa-hero-copy">
            <div className="aa-eyebrow">
              <ShieldCheck size={14} />
              بوابة المشرف · الرقابة التشغيلية
            </div>

            <div className="aa-title-row">
              <button
                type="button"
                className="aa-back"
                onClick={() => navigate("/admin")}
                aria-label="العودة إلى لوحة المشرف"
              >
                <ArrowRight size={19} />
              </button>

              <div className="aa-title-mark">
                <ClipboardCheck size={24} strokeWidth={1.7} />
              </div>

              <div>
                <h1>إدارة الحضور</h1>
                <p>
                  مركز إداري لمراقبة الالتزام، مراجعة السجلات، واكتشاف الحالات التي تحتاج متابعة.
                </p>
              </div>
            </div>
          </div>

          <div className="aa-hero-actions">
            <button
              type="button"
              className="aa-refresh"
              onClick={loadAttendanceData}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="aa-spin" /> : <RefreshCw size={16} />}
              تحديث البيانات
            </button>

            <div className="aa-date-chip">
              <CalendarDays size={17} />
              <div>
                <span>نطاق العرض</span>
                <strong>{selectedDayLabel}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="aa-hero-footer">
          <div>
            <span>نسبة الالتزام</span>
            <strong>{globalStats.percentage}%</strong>
          </div>
          <div>
            <span>الحلقات المكتملة</span>
            <strong>{fullyRecordedHalaqat}</strong>
          </div>
          <div>
            <span>تسجيل غير مكتمل</span>
            <strong>{incompleteHalaqat}</strong>
          </div>
          <div>
            <span>تحتاج متابعة</span>
            <strong>{riskHalaqat}</strong>
          </div>
        </div>
      </section>

      <section className="aa-toolbar">
        <div className="aa-toolbar-title">
          <CalendarDays size={17} />
          <div>
            <span>تاريخ السجل الإداري</span>
            <strong>{formatDateArabic(selectedDate)}</strong>
          </div>
        </div>

        <div className="aa-date-controls">
          <button type="button" onClick={() => changeDate(-1)}>
            <ArrowRight size={15} /> السابق
          </button>

          <CalendarInput

            value={selectedDate}
            max={getLocalDate()}
            onChange={(event) => setSelectedDate(event.target.value)}
          />

          <button type="button" className="aa-today" onClick={goToToday}>
            اليوم
          </button>

          <button
            type="button"
            onClick={() => changeDate(1)}
            disabled={selectedDate === getLocalDate()}
          >
            التالي <ArrowLeft size={15} />
          </button>
        </div>
      </section>

      <section className="aa-kpis">
        <AdminKpi icon={<Users size={18} />} label="الطلاب المشمولون" value={globalStats.total} note="في الحلقات المسجلة" />
        <AdminKpi icon={<UserCheck size={18} />} label="الحضور الفعلي" value={globalStats.present} note={`${globalStats.percentage}% نسبة الالتزام`} tone="success" />
        <AdminKpi icon={<XCircle size={18} />} label="الغياب المسجل" value={globalStats.absent} note="يحتاج مراجعة عند التكرار" tone="danger" />
        <AdminKpi icon={<Clock3 size={18} />} label="حالات التأخر" value={globalStats.late} note="مؤشر انضباط يومي" tone="warning" />
        <AdminKpi icon={<CircleSlash2 size={18} />} label="لم يكتمل تسجيلهم" value={globalStats.unrecorded} note="بانتظار استكمال السجل" tone="neutral" />
      </section>

      <section className="aa-intelligence">
        <div className="aa-section-heading">
          <div>
            <span className="aa-section-kicker"><Activity size={14} /> مركز المتابعة الذكي</span>
            <h2>ملخص الحالة التشغيلية</h2>
            <p>ملخص الحضور للتاريخ المحدد.</p>
          </div>

          <div className="aa-health">
            <div className="aa-health-ring" style={{ "--value": `${globalStats.percentage}%` }}>
              <span>{globalStats.percentage}%</span>
            </div>
            <div>
              <strong>مؤشر الالتزام</strong>
              <small>الحاضر والمتأخر من إجمالي الطلاب</small>
            </div>
          </div>
        </div>

        <div className="aa-intelligence-grid">
          <SmartNotice
            icon={<AlertTriangle size={17} />}
            title="حلقات تحتاج استكمال السجل"
            value={incompleteHalaqat}
            text="يوجد طلاب لم تسجل لهم حالة حضور في التاريخ المحدد."
            tone={incompleteHalaqat ? "warning" : "success"}
          />
          <SmartNotice
            icon={<Target size={17} />}
            title="حلقات تحتاج متابعة"
            value={riskHalaqat}
            text="مؤشر مبني على انخفاض الحضور أو ارتفاع الغياب في السجل المعروض."
            tone={riskHalaqat ? "danger" : "success"}
          />
          <SmartNotice
            icon={<FileCheck2 size={17} />}
            title="سجلات مكتملة"
            value={fullyRecordedHalaqat}
            text="حلقات اكتمل تسجيل جميع طلابها في التاريخ المحدد."
            tone="success"
          />
        </div>
      </section>

      <section className="aa-operations">
        <div className="aa-section-heading compact">
          <div>
            <span className="aa-section-kicker"><Building2 size={14} /> الرقابة على الحلقات</span>
            <h2>حالة تسجيل الحضور حسب الحلقة</h2>
            <p>استعرض حالة كل حلقة وانتقل مباشرة إلى سجلها التفصيلي.</p>
          </div>
          <span className="aa-count">{halaqat.length} حلقة</span>
        </div>

        {halaqat.length === 0 ? (
          <EmptyHalaqat />
        ) : (
          <div className="aa-halaqat-table">
            <div className="aa-table-head">
              <span>الحلقة</span>
              <span>الطلاب</span>
              <span>الحضور</span>
              <span>الغياب</span>
              <span>التأخر</span>
              <span>غير مسجل</span>
              <span>الالتزام</span>
              <span>الحالة</span>
              <span />
            </div>

            {halaqaOperationalRows.map(({ halaqa, stats, level, label }) => (
              <div className="aa-table-row" key={halaqa.id}>
                <div className="aa-halaqa-name">
                  <div className="aa-halaqa-icon"><BookOpen size={17} /></div>
                  <div>
                    <strong>{halaqa.name}</strong>
                    <small>سجل الحلقة</small>
                  </div>
                </div>
                <strong>{stats.total}</strong>
                <span className="aa-positive">{stats.present}</span>
                <span className="aa-negative">{stats.absent}</span>
                <span className="aa-warning-text">{stats.late}</span>
                <span>{stats.unrecorded}</span>
                <div className="aa-rate">
                  <strong>{stats.attendancePercentage}%</strong>
                  <div><i style={{ width: `${stats.attendancePercentage}%` }} /></div>
                </div>
                <span className={`aa-state ${level}`}>{label}</span>
                <button
                  type="button"
                  className="aa-open-record"
                  onClick={() => selectHalaqaForRecords(halaqa.id)}
                >
                  <Eye size={14} /> فتح السجل
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section id="attendance-records" className="aa-records">
        <div className="aa-records-head">
          <div>
            <span className="aa-section-kicker"><History size={14} /> السجل المركزي</span>
            <h2>سجلات الحضور التفصيلية</h2>
            <p>
              مراجعة السجل الإداري للطلاب. التسجيل اليومي الأساسي يبقى في واجهة المعلم.
            </p>
          </div>

          <div className="aa-record-selector">
            <label>الحلقة</label>
            <select value={selectedHalaqa} onChange={(event) => setSelectedHalaqa(event.target.value)}>
              {halaqat.map((halaqa) => (
                <option key={halaqa.id} value={halaqa.id}>{halaqa.name}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedHalaqa ? (
          <>
            <div className="aa-record-summary">
              <RecordMetric label="إجمالي الطلاب" value={selectedStats.total} />
              <RecordMetric label="حاضر" value={selectedStats.present} tone="success" />
              <RecordMetric label="غائب" value={selectedStats.absent} tone="danger" />
              <RecordMetric label="متأخر" value={selectedStats.late} tone="warning" />
              <RecordMetric label="معتذر" value={selectedStats.excused} />
              <RecordMetric label="غير مسجل" value={selectedStats.unrecorded} tone="neutral" />
            </div>

            <div className="aa-record-tools">
              <div className="aa-search">
                <Search size={17} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم الطالب أو رقم الطالب..."
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")}><X size={14} /></button>
                )}
              </div>

              <button
                type="button"
                className={showOnlyUnrecorded ? "aa-filter active" : "aa-filter"}
                onClick={() => setShowOnlyUnrecorded(!showOnlyUnrecorded)}
              >
                <Filter size={15} />
                {showOnlyUnrecorded ? "عرض جميع السجلات" : "غير المسجلين فقط"}
              </button>

              <div className="aa-result-count">
                <strong>{filteredStudents.length}</strong>
                <span>سجل</span>
              </div>
            </div>

            <div className="aa-student-table">
              <div className="aa-student-head">
                <span>الطالب</span>
                <span>رقم الطالب</span>
                <span>الحالة</span>
                <span>التاريخ</span>
              </div>

              {filteredStudents.length === 0 ? (
                <EmptyStudents search={search} onlyUnrecorded={showOnlyUnrecorded} />
              ) : (
                filteredStudents.map((student) => {
                  const record = getAttendanceRecord(student.student_id, selectedHalaqa);
                  return (
                    <div className="aa-student-row" key={student.student_id}>
                      <div className="aa-student-name">
                        <div><UserRound size={16} /></div>
                        <strong>{student.full_name}</strong>
                      </div>
                      <span>{student.user_number || "—"}</span>
                      <StatusBadge status={record?.status} />
                      <span>{formatShortDate(selectedDate)}</span>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div className="aa-empty-record">
            <ListChecks size={27} />
            <strong>اختر حلقة لعرض السجل</strong>
          </div>
        )}
      </section>

      <style>{`
        *{box-sizing:border-box}
        .aa-spin{animation:aaSpin .8s linear infinite}@keyframes aaSpin{to{transform:rotate(360deg)}}
        .aa-hero{position:relative;overflow:hidden;border:1px solid rgba(194,157,58,.36);border-radius:calc(25px * var(--app-radius-scale,1));background:linear-gradient(135deg,#073e33 0%,#095442 62%,#073d33 100%);color:#fff;box-shadow:0 18px 42px rgba(8,65,52,.12);margin-bottom:13px}
        .aa-ornament{position:absolute;width:180px;height:180px;opacity:.09;transform:rotate(45deg);border:1px solid #f0d171;pointer-events:none}.aa-ornament:before,.aa-ornament:after{content:"";position:absolute;inset:20px;border:1px solid #f0d171;transform:rotate(45deg)}.aa-ornament:after{inset:43px}.aa-ornament-a{top:-115px;left:-45px}.aa-ornament-b{bottom:-130px;right:-55px}
        .aa-hero-main{position:relative;z-index:1;display:flex;justify-content:space-between;align-items:center;gap:calc(20px * var(--app-density,1));padding:calc(24px * var(--app-density,1)) calc(25px * var(--app-density,1)) calc(20px * var(--app-density,1))}.aa-eyebrow,.aa-section-kicker{display:inline-flex;align-items:center;gap:calc(5px * var(--app-density,1));color:#caa94e;font-size:calc(9px * var(--app-font-scale,1));font-weight:900}.aa-title-row{display:flex;align-items:center;gap:calc(10px * var(--app-density,1));margin-top:8px}.aa-title-row h1{margin:0;font-size:calc(29px * var(--app-font-scale,1));font-weight:950}.aa-title-row p{margin:5px 0 0;color:rgba(255,255,255,.67);font-size:calc(10px * var(--app-font-scale,1));line-height:1.7}.aa-back,.aa-title-mark{width:42px;height:42px;flex:0 0 42px;border-radius:calc(12px * var(--app-radius-scale,1));display:grid;place-items:center;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.075);color:#fff}.aa-back{cursor:pointer}.aa-title-mark{color:#e8c967}
        .aa-hero-actions{display:flex;align-items:stretch;gap:calc(8px * var(--app-density,1))}.aa-refresh{display:flex;align-items:center;gap:calc(6px * var(--app-density,1));padding:0 calc(13px * var(--app-density,1));min-height:48px;border:1px solid rgba(255,255,255,.16);border-radius:calc(12px * var(--app-radius-scale,1));background:rgba(255,255,255,.07);color:#fff;font:800 9px inherit;cursor:pointer}.aa-date-chip{min-width:128px;display:flex;align-items:center;gap:calc(8px * var(--app-density,1));padding:calc(8px * var(--app-density,1)) calc(11px * var(--app-density,1));border-radius:calc(12px * var(--app-radius-scale,1));background:#fff;color:#17493a}.aa-date-chip>svg{color:#aa8427}.aa-date-chip span{display:block;color:#8c9791;font-size:calc(7px * var(--app-font-scale,1))}.aa-date-chip strong{display:block;margin-top:2px;font-size:calc(10px * var(--app-font-scale,1))}
        .aa-hero-footer{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.075)}.aa-hero-footer>div{padding:calc(10px * var(--app-density,1)) calc(16px * var(--app-density,1));border-inline-start:1px solid rgba(255,255,255,.09)}.aa-hero-footer>div:first-child{border-inline-start:0}.aa-hero-footer span{display:block;color:rgba(255,255,255,.56);font-size:calc(7px * var(--app-font-scale,1))}.aa-hero-footer strong{display:block;margin-top:2px;color:#efd474;font-size:calc(17px * var(--app-font-scale,1))}
        .aa-toolbar{display:flex;align-items:center;justify-content:space-between;gap:calc(12px * var(--app-density,1));padding:calc(10px * var(--app-density,1)) calc(12px * var(--app-density,1));margin-bottom:12px;background:#fff;border:1px solid #dfe6e2;border-radius:calc(15px * var(--app-radius-scale,1));box-shadow:0 5px 17px rgba(21,56,45,.035)}.aa-toolbar-title{display:flex;align-items:center;gap:calc(8px * var(--app-density,1))}.aa-toolbar-title>svg{color:#a78022}.aa-toolbar-title span{display:block;color:#8b9690;font-size:calc(7px * var(--app-font-scale,1))}.aa-toolbar-title strong{display:block;color:#234a3d;font-size:calc(10px * var(--app-font-scale,1));margin-top:1px}.aa-date-controls{display:flex;align-items:center;gap:calc(5px * var(--app-density,1))}.aa-date-controls button,.aa-date-controls input{height:34px;border:1px solid #dce4df;border-radius:calc(9px * var(--app-radius-scale,1));background:#fff;color:#526159;font:750 8px inherit;padding:0 calc(9px * var(--app-density,1))}.aa-date-controls button{display:flex;align-items:center;gap:calc(4px * var(--app-density,1));cursor:pointer}.aa-date-controls button:disabled{opacity:.35;cursor:not-allowed}.aa-date-controls .aa-today{background:#0b634e;color:#fff;border-color:#0b634e}
        .aa-kpis{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:calc(8px * var(--app-density,1));margin-bottom:13px}.aa-kpi{min-width:0;background:#fff;border:1px solid #dfe7e2;border-radius:calc(15px * var(--app-radius-scale,1));padding:calc(11px * var(--app-density,1)) calc(12px * var(--app-density,1));box-shadow:0 5px 17px rgba(21,56,45,.035)}.aa-kpi-top{display:flex;align-items:center;justify-content:space-between;gap:calc(5px * var(--app-density,1))}.aa-kpi-icon{width:30px;height:30px;border-radius:calc(9px * var(--app-radius-scale,1));display:grid;place-items:center;background:#edf6f1;color:var(--app-color-0b654f,#0b654f)}.aa-kpi.success .aa-kpi-icon{background:#ebf7ef;color:#187a50}.aa-kpi.danger .aa-kpi-icon{background:#fff0ee;color:#b53a2e}.aa-kpi.warning .aa-kpi-icon{background:#fff7e4;color:#9b761c}.aa-kpi.neutral .aa-kpi-icon{background:#f0f2f1;color:#6e7973}.aa-kpi label{color:#808d86;font-size:calc(7px * var(--app-font-scale,1));font-weight:850}.aa-kpi strong{display:block;margin-top:5px;color:#153f31;font-size:calc(19px * var(--app-font-scale,1));line-height:1}.aa-kpi small{display:block;margin-top:4px;color:#9aa39e;font-size:calc(6px * var(--app-font-scale,1))}
        .aa-intelligence,.aa-operations,.aa-records{background:#fff;border:1px solid #dfe6e2;border-radius:calc(19px * var(--app-radius-scale,1));box-shadow:0 7px 22px rgba(21,56,45,.04);margin-bottom:14px}.aa-intelligence{padding:calc(16px * var(--app-density,1))}.aa-section-heading{display:flex;align-items:center;justify-content:space-between;gap:calc(15px * var(--app-density,1))}.aa-section-heading.compact{padding:calc(15px * var(--app-density,1)) calc(16px * var(--app-density,1)) calc(11px * var(--app-density,1))}.aa-section-heading h2{margin:3px 0 2px;color:#153f31;font-size:calc(16px * var(--app-font-scale,1))}.aa-section-heading p{margin:0;color:#8c9791;font-size:calc(8px * var(--app-font-scale,1))}.aa-health{display:flex;align-items:center;gap:calc(8px * var(--app-density,1));padding:calc(7px * var(--app-density,1)) calc(10px * var(--app-density,1));border-radius:calc(12px * var(--app-radius-scale,1));background:var(--app-color-f7faf8,#f7faf8);border:1px solid #e6ece8}.aa-health-ring{width:42px;height:42px;border-radius:50%;background:conic-gradient(#0b6b53 var(--value),#e7ece9 0);display:grid;place-items:center;position:relative}.aa-health-ring:after{content:"";position:absolute;inset:5px;border-radius:50%;background:#fff}.aa-health-ring span{position:relative;z-index:1;color:#0b5c48;font-size:calc(8px * var(--app-font-scale,1));font-weight:950}.aa-health strong{display:block;color:#294b40;font-size:calc(8px * var(--app-font-scale,1))}.aa-health small{display:block;margin-top:2px;color:#939d97;font-size:calc(6px * var(--app-font-scale,1))}
        .aa-intelligence-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:calc(7px * var(--app-density,1));margin-top:12px}.aa-notice{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:calc(8px * var(--app-density,1));padding:calc(10px * var(--app-density,1));border-radius:calc(12px * var(--app-radius-scale,1));border:1px solid #e7ece9;background:#fafcfb}.aa-notice-icon{width:32px;height:32px;border-radius:calc(9px * var(--app-radius-scale,1));display:grid;place-items:center;background:#edf6f1;color:var(--app-color-0b654f,#0b654f)}.aa-notice.warning .aa-notice-icon{background:#fff7e3;color:#9c7416}.aa-notice.danger .aa-notice-icon{background:#fff0ee;color:#b43a2e}.aa-notice h3{margin:0;color:#345248;font-size:calc(8px * var(--app-font-scale,1))}.aa-notice p{margin:2px 0 0;color:#929c96;font-size:calc(6px * var(--app-font-scale,1));line-height:1.5}.aa-notice>strong{color:#173f32;font-size:calc(18px * var(--app-font-scale,1))}
        .aa-count{padding:calc(5px * var(--app-density,1)) calc(9px * var(--app-density,1));border-radius:999px;background:#eef6f2;color:var(--app-color-0b654f,#0b654f);font-size:calc(8px * var(--app-font-scale,1));font-weight:900}.aa-halaqat-table{border-top:1px solid #edf1ee}.aa-table-head,.aa-table-row{display:grid;grid-template-columns:minmax(170px,1.7fr) repeat(5,.55fr) 1fr 1.1fr 92px;align-items:center;gap:calc(8px * var(--app-density,1));padding:calc(9px * var(--app-density,1)) calc(14px * var(--app-density,1))}.aa-table-head{background:#f8faf8;color:#88938d;font-size:calc(7px * var(--app-font-scale,1));font-weight:900}.aa-table-row{min-height:56px;border-top:1px solid #edf1ee;color:#5c6962;font-size:calc(8px * var(--app-font-scale,1))}.aa-table-row:hover{background:#fbfcfb}.aa-halaqa-name{display:flex;align-items:center;gap:calc(8px * var(--app-density,1));min-width:0}.aa-halaqa-icon{width:31px;height:31px;flex:0 0 31px;border-radius:calc(9px * var(--app-radius-scale,1));display:grid;place-items:center;background:#edf6f1;color:var(--app-color-0b654f,#0b654f)}.aa-halaqa-name strong{display:block;color:#27493e;font-size:calc(9px * var(--app-font-scale,1));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aa-halaqa-name small{display:block;margin-top:2px;color:#a0a8a3;font-size:calc(6px * var(--app-font-scale,1))}.aa-positive{color:#14754d;font-weight:900}.aa-negative{color:#b23a2f;font-weight:900}.aa-warning-text{color:#9c7418;font-weight:900}.aa-rate strong{font-size:calc(8px * var(--app-font-scale,1));color:#345348}.aa-rate>div{height:3px;margin-top:4px;border-radius:calc(99px * var(--app-radius-scale,1));background:#e8ece9;overflow:hidden}.aa-rate i{display:block;height:100%;border-radius:calc(99px * var(--app-radius-scale,1));background:#0d7459}.aa-state{display:inline-flex;justify-content:center;padding:calc(4px * var(--app-density,1)) calc(6px * var(--app-density,1));border-radius:999px;font-size:calc(6px * var(--app-font-scale,1));font-weight:900;background:#edf6f1;color:var(--app-color-0b654f,#0b654f)}.aa-state.pending{background:#fff7e5;color:#956f16}.aa-state.risk{background:#fff0ee;color:#ad392e}.aa-open-record{height:30px;border:1px solid #dce6e1;border-radius:calc(8px * var(--app-radius-scale,1));background:#fff;color:var(--app-color-0b654f,#0b654f);font:850 7px inherit;display:flex;align-items:center;justify-content:center;gap:calc(4px * var(--app-density,1));cursor:pointer}
        .aa-records{overflow:hidden}.aa-records-head{display:flex;align-items:center;justify-content:space-between;gap:calc(12px * var(--app-density,1));padding:calc(15px * var(--app-density,1)) calc(16px * var(--app-density,1));border-bottom:1px solid #e9eeeb}.aa-records-head h2{margin:3px 0 2px;color:#153f31;font-size:calc(16px * var(--app-font-scale,1))}.aa-records-head p{margin:0;color:#8e9892;font-size:calc(8px * var(--app-font-scale,1))}.aa-record-selector{min-width:200px}.aa-record-selector label{display:block;margin-bottom:4px;color:#7d8982;font-size:calc(7px * var(--app-font-scale,1));font-weight:900}.aa-record-selector select{width:100%;height:35px;border:1px solid #dce4df;border-radius:calc(9px * var(--app-radius-scale,1));background:#fff;color:#354f46;font:750 8px inherit;padding:0 calc(8px * var(--app-density,1))}
        .aa-record-summary{display:grid;grid-template-columns:repeat(6,1fr);gap:calc(1px * var(--app-density,1));background:#e9eeeb;border-bottom:1px solid #e9eeeb}.aa-record-metric{background:#fbfcfb;padding:calc(9px * var(--app-density,1)) calc(11px * var(--app-density,1))}.aa-record-metric span{display:block;color:#8b9690;font-size:calc(6px * var(--app-font-scale,1))}.aa-record-metric strong{display:block;margin-top:2px;color:#294b40;font-size:calc(14px * var(--app-font-scale,1))}.aa-record-metric.success strong{color:#14754d}.aa-record-metric.danger strong{color:#b23a2f}.aa-record-metric.warning strong{color:#9b7418}.aa-record-metric.neutral strong{color:#737e78}
        .aa-record-tools{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:calc(7px * var(--app-density,1));padding:calc(10px * var(--app-density,1)) calc(14px * var(--app-density,1));background:#fafbfa;border-bottom:1px solid #e9eeeb}.aa-search{position:relative}.aa-search>svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);color:#89958e}.aa-search input{width:100%;height:36px;padding:0 calc(36px * var(--app-density,1));border:1px solid #dce4df;border-radius:calc(9px * var(--app-radius-scale,1));background:#fff;color:#344f45;font:700 8px inherit;outline:none}.aa-search input:focus{border-color:#72a593;box-shadow:0 0 0 3px color-mix(in srgb,var(--app-color-0b654f,#0b654f) 7.000000000000001%,transparent)}.aa-search button{position:absolute;left:5px;top:50%;transform:translateY(-50%);width:25px;height:25px;border:0;border-radius:calc(7px * var(--app-radius-scale,1));background:#f0f3f1;color:#77827c;display:grid;place-items:center;cursor:pointer}.aa-filter{height:36px;padding:0 calc(10px * var(--app-density,1));border:1px solid #dce4df;border-radius:calc(9px * var(--app-radius-scale,1));background:#fff;color:#637169;font:800 7px inherit;display:flex;align-items:center;gap:calc(4px * var(--app-density,1));cursor:pointer}.aa-filter.active{background:#edf6f1;color:var(--app-color-0b654f,#0b654f);border-color:#cce1d7}.aa-result-count{min-width:48px;text-align:center}.aa-result-count strong{display:block;color:#16483a;font-size:calc(12px * var(--app-font-scale,1))}.aa-result-count span{display:block;color:#929c96;font-size:calc(6px * var(--app-font-scale,1))}
        .aa-student-head,.aa-student-row{display:grid;grid-template-columns:minmax(180px,1.7fr) 1fr 1fr 1fr;align-items:center;gap:calc(10px * var(--app-density,1));padding:calc(9px * var(--app-density,1)) calc(15px * var(--app-density,1))}.aa-student-head{background:#f8faf8;color:#89948e;font-size:calc(7px * var(--app-font-scale,1));font-weight:900;border-bottom:1px solid #e9eeeb}.aa-student-row{min-height:51px;border-bottom:1px solid #edf1ee;color:#66736c;font-size:calc(8px * var(--app-font-scale,1))}.aa-student-row:last-child{border-bottom:0}.aa-student-row:hover{background:#fcfdfc}.aa-student-name{display:flex;align-items:center;gap:calc(7px * var(--app-density,1));min-width:0}.aa-student-name>div{width:29px;height:29px;flex:0 0 29px;border-radius:calc(9px * var(--app-radius-scale,1));display:grid;place-items:center;background:#edf6f1;color:var(--app-color-0b654f,#0b654f)}.aa-student-name strong{color:var(--app-color-304f44,#304f44);font-size:calc(9px * var(--app-font-scale,1));white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aa-empty-record{padding:calc(45px * var(--app-density,1)) calc(20px * var(--app-density,1));text-align:center;color:#87938c}.aa-empty-record strong{display:block;margin-top:7px;font-size:calc(10px * var(--app-font-scale,1))}
        @media(max-width:1150px){.aa-kpis{grid-template-columns:repeat(3,1fr)}.aa-table-head,.aa-table-row{grid-template-columns:minmax(160px,1.5fr) repeat(3,.55fr) .8fr 1fr 85px}.aa-table-head>:nth-child(5),.aa-table-row>:nth-child(5),.aa-table-head>:nth-child(6),.aa-table-row>:nth-child(6){display:none}.aa-record-summary{grid-template-columns:repeat(3,1fr)}}
        @media(max-width:780px){.aa-hero-main{align-items:flex-start;flex-direction:column;padding:calc(18px * var(--app-density,1))}.aa-hero-actions{width:100%}.aa-date-chip{flex:1}.aa-toolbar{align-items:flex-start;flex-direction:column}.aa-date-controls{width:100%;display:grid;grid-template-columns:auto 1fr auto auto}.aa-date-controls input{width:100%}.aa-kpis{grid-template-columns:repeat(2,1fr)}.aa-intelligence-grid{grid-template-columns:1fr}.aa-health{display:none}.aa-table-head{display:none}.aa-table-row{grid-template-columns:1fr repeat(3,55px);padding:calc(10px * var(--app-density,1)) calc(12px * var(--app-density,1))}.aa-table-row>:nth-child(5),.aa-table-row>:nth-child(6),.aa-table-row>:nth-child(7){display:none}.aa-state{justify-self:end}.aa-open-record{grid-column:1/-1;width:100%}.aa-records-head{align-items:flex-start;flex-direction:column}.aa-record-selector{width:100%}.aa-record-tools{grid-template-columns:1fr auto}.aa-search{grid-column:1/-1}.aa-student-head,.aa-student-row{grid-template-columns:minmax(150px,1.5fr) .8fr 1fr}.aa-student-head>:nth-child(4),.aa-student-row>:nth-child(4){display:none}}
        @media(max-width:500px){.aa-hero{border-radius:calc(18px * var(--app-radius-scale,1))}.aa-hero-main{padding:calc(14px * var(--app-density,1)) calc(12px * var(--app-density,1))}.aa-eyebrow{font-size:calc(7px * var(--app-font-scale,1))}.aa-title-row{gap:calc(7px * var(--app-density,1))}.aa-back,.aa-title-mark{width:35px;height:35px;flex-basis:35px;border-radius:calc(10px * var(--app-radius-scale,1))}.aa-title-row h1{font-size:calc(20px * var(--app-font-scale,1))}.aa-title-row p{font-size:calc(7px * var(--app-font-scale,1));line-height:1.6}.aa-hero-actions{display:grid;grid-template-columns:1fr 1fr}.aa-refresh{justify-content:center;min-height:41px}.aa-date-chip{min-width:0;padding:calc(6px * var(--app-density,1)) calc(8px * var(--app-density,1))}.aa-hero-footer>div{padding:calc(7px * var(--app-density,1)) calc(5px * var(--app-density,1))}.aa-hero-footer span{font-size:calc(5.5px * var(--app-font-scale,1))}.aa-hero-footer strong{font-size:calc(13px * var(--app-font-scale,1))}.aa-toolbar{padding:calc(8px * var(--app-density,1))}.aa-toolbar-title strong{font-size:calc(8px * var(--app-font-scale,1))}.aa-date-controls{grid-template-columns:1fr 1fr}.aa-date-controls input{grid-column:1/-1;grid-row:1}.aa-date-controls button{justify-content:center}.aa-kpis{gap:calc(5px * var(--app-density,1))}.aa-kpi{padding:calc(8px * var(--app-density,1));border-radius:calc(11px * var(--app-radius-scale,1))}.aa-kpi-icon{width:25px;height:25px}.aa-kpi label{font-size:calc(6px * var(--app-font-scale,1))}.aa-kpi strong{font-size:calc(15px * var(--app-font-scale,1));margin-top:3px}.aa-kpi small{font-size:calc(5px * var(--app-font-scale,1));margin-top:2px}.aa-intelligence{padding:calc(11px * var(--app-density,1))}.aa-section-heading h2,.aa-records-head h2{font-size:calc(13px * var(--app-font-scale,1))}.aa-section-heading p,.aa-records-head p{font-size:calc(6.5px * var(--app-font-scale,1));line-height:1.5}.aa-notice{grid-template-columns:27px 1fr auto;padding:calc(7px * var(--app-density,1))}.aa-notice-icon{width:27px;height:27px}.aa-notice h3{font-size:calc(7px * var(--app-font-scale,1))}.aa-notice p{font-size:calc(5.5px * var(--app-font-scale,1))}.aa-notice>strong{font-size:calc(14px * var(--app-font-scale,1))}.aa-table-row{grid-template-columns:1fr 43px 43px;padding:calc(8px * var(--app-density,1))}.aa-table-row>:nth-child(4),.aa-table-row>:nth-child(8){display:none}.aa-halaqa-name strong{font-size:calc(8px * var(--app-font-scale,1))}.aa-record-summary{grid-template-columns:repeat(3,1fr)}.aa-record-metric{padding:calc(7px * var(--app-density,1))}.aa-record-tools{padding:calc(8px * var(--app-density,1))}.aa-filter{padding:0 calc(7px * var(--app-density,1))}.aa-student-head,.aa-student-row{grid-template-columns:minmax(120px,1.5fr) .7fr 1fr;padding:calc(8px * var(--app-density,1))}.aa-student-name>div{width:25px;height:25px;flex-basis:25px}.aa-student-name strong{font-size:calc(7.5px * var(--app-font-scale,1))}}
      `}</style>
    </AdminAttendanceShell>
  );
}

/* =========================================================
   PAGE SHELL
========================================================= */

function AdminAttendanceShell({ children }) {
  return (
    <div
      dir="rtl"
      style={{
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden",
        padding: "calc(22px * var(--app-density,1)) clamp(calc(12px * var(--app-density,1)), 2vw, calc(30px * var(--app-density,1))) calc(40px * var(--app-density,1))",
        boxSizing: "border-box",
        background:
          "radial-gradient(circle at 8% 4%, rgba(183,145,43,.055), transparent 24%), radial-gradient(circle at 92% 12%, rgba(10,99,78,.055), transparent 25%), #f5f7f4",
        color: "#173d31",
      }}
    >
      <div style={{ width: "100%", maxWidth: "1680px", margin: "0 auto" }}>
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingScreen() {
  return (
    <div
      style={{
        minHeight:
          "70vh",
        display: "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        flexDirection:
          "column",
        gap: "calc(14px * var(--app-density,1))",
        color: "#69746d",
      }}
    >
      <Loader2
        size={35}
        style={{
          color: "var(--app-color-0f5132,#0f5132)",
          animation:
            "spin .8s linear infinite",
        }}
      />

      <strong>
        جارٍ تجهيز سجل الحضور...
      </strong>
    </div>
  );
}

function AdminKpi({ icon, label, value, note, tone = "primary" }) {
  return (
    <article className={`aa-kpi ${tone}`}>
      <div className="aa-kpi-top">
        <label>{label}</label>
        <div className="aa-kpi-icon">{icon}</div>
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}

function SmartNotice({ icon, title, value, text, tone = "success" }) {
  return (
    <article className={`aa-notice ${tone}`}>
      <div className="aa-notice-icon">{icon}</div>
      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <strong>{value}</strong>
    </article>
  );
}

function RecordMetric({ label, value, tone = "" }) {
  return (
    <div className={`aa-record-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   ATTENDANCE CIRCLE
========================================================= */

function AttendanceCircle({
  percentage,
}) {
  return (
    <div
      style={{
        width: "68px",
        height: "68px",
        borderRadius:
          "50%",
        background: `conic-gradient(var(--app-color-0f5132,#0f5132) ${percentage}%, #edf0ee ${percentage}% 100%)`,
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius:
            "50%",
          background:
            "#fff",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          flexDirection:
            "column",
        }}
      >
        <strong
          style={{
            color:
              "var(--app-color-0f5132,#0f5132)",
            fontSize:
              "calc(14px * var(--app-font-scale,1))",
          }}
        >
          {percentage}%
        </strong>

        <span
          style={{
            color:
              "#8c958f",
            fontSize:
              "calc(8px * var(--app-font-scale,1))",
          }}
        >
          حضور
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   MINI STAT
========================================================= */

function MiniStat({
  value,
  label,
  tone,
}) {
  const styles = {
    success: {
      background:
        "#f0f8f3",
      color:
        "#198754",
    },

    danger: {
      background:
        "#fff3f2",
      color:
        "#b42318",
    },

    warning: {
      background:
        "#fff9ea",
      color:
        "#927536",
    },

    neutral: {
      background:
        "#f4f5f4",
      color:
        "#737d76",
    },
  };

  const current =
    styles[tone];

  return (
    <div
      style={{
        background:
          current.background,
        borderRadius:
          "calc(9px * var(--app-radius-scale,1))",
        padding:
          "calc(8px * var(--app-density,1)) calc(4px * var(--app-density,1))",
        textAlign:
          "center",
      }}
    >
      <div
        style={{
          color:
            current.color,
          fontSize:
            "calc(14px * var(--app-font-scale,1))",
          fontWeight:
            "850",
        }}
      >
        {value}
      </div>

      <div
        style={{
          color:
            "#8d958f",
          fontSize:
            "calc(8px * var(--app-font-scale,1))",
          marginTop:
            "2px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* =========================================================
   ATTENDANCE BUTTON
========================================================= */

function AttendanceButton({
  label,
  icon,
  active,
  disabled,
  onClick,
  tone,
}) {
  const tones = {
    success: {
      activeBg:
        "#e8f6ed",
      activeColor:
        "#0f5132",
      activeBorder:
        "#0f5132",
    },

    danger: {
      activeBg:
        "#fff0ef",
      activeColor:
        "#b42318",
      activeBorder:
        "#b42318",
    },

    warning: {
      activeBg:
        "#fff8e6",
      activeColor:
        "#927536",
      activeBorder:
        "#c79d43",
    },

    neutral: {
      activeBg:
        "#eef0ef",
      activeColor:
        "#59635d",
      activeBorder:
        "#7d8780",
    },
  };

  const current =
    tones[tone];

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        justifyContent:
          "center",
        gap: "calc(5px * var(--app-density,1))",
        minWidth:
          "76px",
        padding:
          "calc(7px * var(--app-density,1)) calc(9px * var(--app-density,1))",
        borderRadius:
          "calc(8px * var(--app-radius-scale,1))",
        border: active
          ? `1.5px solid ${current.activeBorder}`
          : "1px solid #dfe3e0",
        background:
          active
            ? current.activeBg
            : "#fff",
        color:
          active
            ? current.activeColor
            : "#6f7872",
        cursor:
          disabled
            ? "wait"
            : "pointer",
        fontSize:
          "calc(10px * var(--app-font-scale,1))",
        fontWeight:
          active
            ? "850"
            : "650",
        opacity:
          disabled
            ? 0.6
            : 1,
      }}
    >
      {icon}

      {label}
    </button>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {
  const data = {
    present: {
      label:
        "حاضر",
      background:
        "#e8f6ed",
      color:
        "#0f5132",
    },

    absent: {
      label:
        "غائب",
      background:
        "#fff0ef",
      color:
        "#b42318",
    },

    late: {
      label:
        "متأخر",
      background:
        "#fff8e6",
      color:
        "#927536",
    },

    excused: {
      label:
        "معتذر",
      background:
        "#eef0ef",
      color:
        "#59635d",
    },
  };

  if (!status) {
    return (
      <span
        style={{
          minWidth:
            "70px",
          textAlign:
            "center",
          padding:
            "calc(6px * var(--app-density,1)) calc(9px * var(--app-density,1))",
          borderRadius:
            "calc(18px * var(--app-radius-scale,1))",
          background:
            "#f5f6f5",
          color:
            "#929993",
          fontSize:
            "calc(9px * var(--app-font-scale,1))",
          fontWeight:
            "700",
        }}
      >
        لم يسجل
      </span>
    );
  }

  const current =
    data[status] ||
    data.excused;

  return (
    <span
      style={{
        minWidth:
          "70px",
        textAlign:
          "center",
        padding:
          "calc(6px * var(--app-density,1)) calc(9px * var(--app-density,1))",
        borderRadius:
          "calc(18px * var(--app-radius-scale,1))",
        background:
          current.background,
        color:
          current.color,
        fontSize:
          "calc(9px * var(--app-font-scale,1))",
        fontWeight:
          "850",
      }}
    >
      {current.label}
    </span>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyHalaqat() {
  return (
    <div
      style={
        emptyBoxStyle
      }
    >
      <Users
        size={30}
        strokeWidth={1.5}
      />

      <strong>
        لا توجد حلقات
      </strong>

      <span>
        أضف الحلقات أولًا حتى تتمكن من تسجيل الحضور.
      </span>
    </div>
  );
}

function EmptyStudents({
  search,
  onlyUnrecorded,
}) {
  return (
    <div
      style={{
        padding:
          "calc(50px * var(--app-density,1)) calc(20px * var(--app-density,1))",
        textAlign:
          "center",
        color:
          "#8a938d",
      }}
    >
      <Search
        size={31}
        strokeWidth={1.5}
        style={{
          marginBottom:
            "10px",
          color:
            "var(--app-color-0f5132,#0f5132)",
        }}
      />

      <div
        style={{
          color:
            "#465149",
          fontWeight:
            "800",
          fontSize:
            "calc(14px * var(--app-font-scale,1))",
          marginBottom:
            "5px",
        }}
      >
        {search
          ? "لا توجد نتائج للبحث"
          : onlyUnrecorded
          ? "تم تسجيل جميع الطلاب"
          : "لا يوجد طلاب"}
      </div>

      <div
        style={{
          fontSize:
            "calc(11px * var(--app-font-scale,1))",
        }}
      >
        {search
          ? "جرب اسمًا أو رقمًا مختلفًا."
          : onlyUnrecorded
          ? "جميع طلاب الحلقة لديهم حالة مسجلة لهذا اليوم."
          : "لا يوجد طلاب مرتبطون بهذه الحلقة."}
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getStatusLabel(
  status
) {
  const labels = {
    present:
      "حاضر",
    absent:
      "غائب",
    late:
      "متأخر",
    excused:
      "معتذر",
  };

  return (
    labels[status] ||
    status
  );
}

const emptyBoxStyle = {
  background:
    "#fff",
  border:
    "1px solid #e2e7e3",
  borderRadius:
    "calc(18px * var(--app-radius-scale,1))",
  padding:
    "calc(50px * var(--app-density,1)) calc(20px * var(--app-density,1))",
  display:
    "flex",
  alignItems:
    "center",
  justifyContent:
    "center",
  flexDirection:
    "column",
  gap: "calc(8px * var(--app-density,1))",
  color:
    "#87908a",
  fontSize:
    "calc(11px * var(--app-font-scale,1))",
};
