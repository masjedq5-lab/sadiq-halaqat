import { dateKey } from "../../lib/calendar";
import CalendarInput from "../../components/CalendarInput";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Gift,
  History,
  RotateCcw,
  Search,
  Sparkles,
  Trophy,
  Users,
  TrendingDown,
} from "lucide-react";

import PremiumStudentsPointsTable from "../../components/rewards/PremiumStudentsPointsTable";
import MonthlyTransactionsTab from "../../components/rewards/MonthlyTransactionsTab";
import SessionGrantModal from "../../components/rewards/SessionGrantModal";
import SessionDeductionModal from "../../components/rewards/SessionDeductionModal";


import { showToast } from "../../components/Toast";

import {
  buildMonthlyStudentTotals,
  getCurrentHijriPeriod,
  getHijriMonthRange,
  hijriPeriodLabel,
  isSameHijriPeriod,
  shiftHijriPeriod,
  syncStudentCurrentMonthPoints,
  syncStudentsCurrentMonthPointsFromRows,
} from "../../lib/pointsHijri";

import "./PointsPremium.css";

export default function RewardsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("points");

  const [selectedDate, setSelectedDate] = useState(
    dateKey()
  );

  const [selectedPeriod, setSelectedPeriod] = useState(
    getCurrentHijriPeriod
  );

  const [selectedHalaqa, setSelectedHalaqa] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [search, setSearch] = useState("");

  const [halaqat, setHalaqat] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [rewardTypes, setRewardTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [grantOpen, setGrantOpen] = useState(false);
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);

  const currentPeriod = useMemo(
    () => getCurrentHijriPeriod(),
    []
  );

  async function loadHalaqat() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (profileError) {
      console.error(profileError);
      return;
    }

    const { data: teacherHalaqat, error } = await supabase
      .from("teacher_halaqat")
      .select(`
        halaqat(
          id,
          name
        )
      `)
      .eq("teacher_id", profile.id);

    if (error) {
      console.error(error);
      return;
    }

    const rows = (teacherHalaqat || [])
      .map((item) => item.halaqat)
      .filter(Boolean);

    setHalaqat(rows);

    if (rows.length === 1) {
      setSelectedHalaqa(String(rows[0].id));
    }
  }

  async function loadRewardTypes() {
    const { data, error } = await supabase
      .from("reward_types")
      .select("*")
      .order("points", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    setRewardTypes(data || []);
    return data || [];
  }

  async function loadTeachers() {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("role", "teacher")
      .order("full_name");

    if (error) {
      console.error(error);
      return;
    }

    setTeachers(data || []);
  }

  async function loadStudents() {
    if (!selectedHalaqa) {
      setStudents([]);
      return [];
    }

    const { data, error } = await supabase
      .from("student_halaqat")
      .select(`
        id,
        student_id,
        teacher_id,
        profiles!student_halaqat_student_id_fkey(
          id,
          full_name,
          total_points
        )
      `)
      .eq("halaqa_id", selectedHalaqa)
      .eq("is_current", true);

    if (error) {
      console.error(error);
      return [];
    }

    const rows = (data || [])
      .map((item) => ({
        id: item.profiles?.id,
        full_name: item.profiles?.full_name,
        total_points: item.profiles?.total_points || 0,
      }))
      .filter((item) => item.id);

    const uniqueStudents = Array.from(
      new Map(rows.map((item) => [item.id, item])).values()
    );

    setStudents(uniqueStudents);
    return uniqueStudents;
  }

  async function loadAttendance() {
    if (!selectedHalaqa || !selectedDate) {
      setAttendance([]);
      return;
    }

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("halaqa_id", selectedHalaqa)
      .eq("attendance_date", selectedDate);

    if (error) {
      console.error(error);
      return;
    }

    setAttendance(data || []);
  }

  async function loadTransactions(
    studentRows = students,
    period = selectedPeriod
  ) {
    const ids = studentRows
      .map((student) => Number(student.id))
      .filter(Boolean);

    if (!ids.length) {
      setTransactions([]);
      return [];
    }

    const range = getHijriMonthRange(period);

    const { data, error } = await supabase
      .from("points_transactions")
      .select(`
        *,
        profiles!points_transactions_student_id_fkey(
          full_name
        ),
        reward_types(
          name
        )
      `)
      .in("student_id", ids)
      .gte("transaction_date", range.start)
      .lte("transaction_date", range.end)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return [];
    }

    const rows = (data || []).map((item) => ({
      ...item,
      student_name: item.profiles?.full_name || "—",
      reward_name: item.reward_types?.name || item.reason || "—",
    }));

    setTransactions(rows);

    if (
      isSameHijriPeriod(
        period,
        getCurrentHijriPeriod()
      )
    ) {
      try {
        await syncStudentsCurrentMonthPointsFromRows(
          supabase,
          studentRows,
          rows
        );
      } catch (syncError) {
        console.error("SYNC CURRENT MONTH POINTS:", syncError);
      }
    }

    return rows;
  }

  async function refreshAll() {
    if (!selectedHalaqa) return;

    setLoading(true);

    try {
      const studentRows = await loadStudents();

      await Promise.all([
        loadAttendance(),
        loadRewardTypes(),
      ]);

      await loadTransactions(studentRows, selectedPeriod);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHalaqat();
    loadTeachers();
    loadRewardTypes();
  }, []);

  useEffect(() => {
    if (selectedHalaqa) {
      refreshAll();
    }
  }, [
    selectedHalaqa,
    selectedDate,
    selectedPeriod.year,
    selectedPeriod.month,
  ]);

  const monthlyTotals = useMemo(
    () => buildMonthlyStudentTotals(transactions, students),
    [transactions, students]
  );

  const monthlyTotalsMap = useMemo(
    () =>
      new Map(
        monthlyTotals.map((item) => [
          Number(item.student_id),
          item,
        ])
      ),
    [monthlyTotals]
  );

  const studentsWithAttendance = useMemo(() => {
    return students
      .map((student) => {
        const record = attendance.find(
          (item) => Number(item.student_id) === Number(student.id)
        );

        const monthPoints =
          monthlyTotalsMap.get(Number(student.id))?.net || 0;

        return {
          ...student,
          total_points: monthPoints,
          attendance: record?.status || "absent",
        };
      })
      .filter((student) => {
        const text = search.trim().toLowerCase();
        if (!text) return true;

        return String(student.full_name || "")
          .toLowerCase()
          .includes(text);
      });
  }, [students, attendance, monthlyTotalsMap, search]);

  const stats = useMemo(() => {
    const totalStudents = students.length;

    const totalRewards = transactions
      .filter((item) => item.category === "grant")
      .reduce((sum, item) => sum + Number(item.points || 0), 0);

    const totalPenalties = Math.abs(
      transactions
        .filter((item) => item.category === "deduction")
        .reduce((sum, item) => sum + Number(item.points || 0), 0)
    );

    return {
      totalStudents,
      totalRewards,
      totalPenalties,
      netPoints: totalRewards - totalPenalties,
    };
  }, [students, transactions]);

  function canUsePointsForStudent(student) {
    return (
      student?.attendance === "present" ||
      student?.attendance === "late"
    );
  }

  function openGrant(student) {
    if (!canUsePointsForStudent(student)) {
      showToast(
        student?.attendance === "excused"
          ? "الطالب غائب بعذر؛ لا يمكن منحه نقاطًا لهذا اليوم."
          : "الطالب غائب؛ لا يمكن منحه نقاطًا لهذا اليوم.",
        "error"
      );
      return;
    }

    setEditingSession(null);
    setSelectedStudent(student);
    setGrantOpen(true);
  }

  function openPenalty(student) {
    if (!canUsePointsForStudent(student)) {
      showToast(
        student?.attendance === "excused"
          ? "الطالب غائب بعذر؛ لا يمكن خصم نقاط منه لهذا اليوم."
          : "الطالب غائب؛ لا يمكن خصم نقاط منه لهذا اليوم.",
        "error"
      );
      return;
    }

    setEditingSession(null);
    setSelectedStudent(student);
    setPenaltyOpen(true);
  }

  function openHistory(student) {
    setSearch(student.full_name);
    setActiveTab("transactions");
  }

  function openSessionEdit(session) {
    const student =
      students.find(
        (item) => Number(item.id) === Number(session.student_id)
      ) || {
        id: session.student_id,
        full_name: session.student_name,
      };

    setSelectedStudent(student);
    setEditingSession(session);

    if (session.category === "grant") {
      setGrantOpen(true);
      setPenaltyOpen(false);
      return;
    }

    if (session.category === "deduction") {
      setPenaltyOpen(true);
      setGrantOpen(false);
    }
  }

  function closeGrant() {
    setGrantOpen(false);
    setEditingSession(null);
  }

  function closePenalty() {
    setPenaltyOpen(false);
    setEditingSession(null);
  }

  async function deleteSession(session) {
    try {
      const ids = session.items
        .map((item) => item.id)
        .filter(Boolean);

      if (!ids.length) return;

      const { error } = await supabase
        .from("points_transactions")
        .delete()
        .in("id", ids);

      if (error) throw error;

      await syncStudentCurrentMonthPoints(
        supabase,
        session.student_id
      );

      showToast("تم حذف الجلسة كاملة", "success");
      await refreshAll();
    } catch (error) {
      console.error("DELETE POINT SESSION:", error);
      showToast("تعذر حذف الجلسة", "error");
    }
  }

  function previousMonth() {
    setSelectedPeriod((current) => shiftHijriPeriod(current, -1));
  }

  function nextMonth() {
    setSelectedPeriod((current) => shiftHijriPeriod(current, 1));
  }

  function goCurrentMonth() {
    setSelectedPeriod(getCurrentHijriPeriod());
  }

  const isCurrentMonth = isSameHijriPeriod(
    selectedPeriod,
    currentPeriod
  );

  const tabs = [
    { key: "points", label: "المنح والخصومات", icon: Gift },
    { key: "transactions", label: "سجل العمليات", icon: History },
  ];

  return (
    <div className="teacher-points-page">
      <section className="tp-hero">
        <div className="tp-hero-copy">
          <span className="tp-hero-kicker">
            <Sparkles size={14} />
            نظام تحفيز شهري
          </span>
          <h1>المنح والخصومات</h1>
          <p>
            نقاط واضحة لكل شهر هجري، جلسات مجمعة، وتعديل سريع بدون تشتيت المعلم.
          </p>
        </div>

        <div className="tp-hero-mark">
          <Trophy size={34} />
        </div>
      </section>

      <section className="tp-monthbar">
        <div className="tp-monthbar-main">
          <div className="tp-month-icon">
            <CalendarDays size={20} />
          </div>
          <div>
            <small>شهر النقاط</small>
            <strong>{hijriPeriodLabel(selectedPeriod)}</strong>
          </div>
        </div>

        <div className="tp-month-actions">
          <button type="button" className="tp-btn" onClick={previousMonth}>
            <ChevronRight size={15} />
            السابق
          </button>

          {!isCurrentMonth && (
            <button type="button" className="tp-btn" onClick={goCurrentMonth}>
              <RotateCcw size={14} />
              الحالي
            </button>
          )}

          <button
            type="button"
            className="tp-btn"
            onClick={nextMonth}
            disabled={isCurrentMonth}
          >
            التالي
            <ChevronLeft size={15} />
          </button>
        </div>
      </section>

      <section className="tp-stats">
        <Stat label="طلاب الحلقة" value={stats.totalStudents} note="ضمن الحلقة المحددة" icon={Users} />
        <Stat label="إجمالي المنح" value={`+${stats.totalRewards}`} note="في الشهر المحدد" icon={Gift} tone="gold" />
        <Stat label="إجمالي الخصومات" value={`-${stats.totalPenalties}`} note="في الشهر المحدد" icon={TrendingDown} tone="danger" />
        <Stat label="صافي الشهر" value={stats.netPoints} note="المنح ناقص الخصومات" icon={Trophy} />
      </section>

      <section className="tp-premium-panel">
        <div className="tp-panel-content">
          <div className="tp-filter-grid">
            <div className="tp-field">
              <label>بحث عن طالب</label>
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#93a19c",
                  }}
                />
                <input
                  className="tp-control"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="اكتب اسم الطالب"
                  style={{ paddingLeft: "calc(36px * var(--app-density,1))" }}
                />
              </div>
            </div>

            <div className="tp-field">
              <label>الحلقة</label>
              <select
                className="tp-control"
                value={selectedHalaqa}
                onChange={(event) => setSelectedHalaqa(event.target.value)}
              >
                <option value="">اختر الحلقة</option>
                {halaqat.map((halaqa) => (
                  <option value={halaqa.id} key={halaqa.id}>
                    {halaqa.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tp-field">
              <label>المعلم</label>
              <select
                className="tp-control"
                value={selectedTeacher}
                onChange={(event) => setSelectedTeacher(event.target.value)}
              >
                <option value="">كل المعلمين</option>
                {teachers.map((teacher) => (
                  <option value={teacher.id} key={teacher.id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="tp-field">
              <label>تاريخ جلسة اليوم</label>
              <CalendarInput
                className="tp-control"

                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      <nav className="tp-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              type="button"
              key={tab.key}
              className={`tp-tab ${activeTab === tab.key ? "is-active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {activeTab === "points" && (
        <PremiumStudentsPointsTable
          students={studentsWithAttendance}
          onGrant={openGrant}
          onPenalty={openPenalty}
          onHistory={openHistory}
        />
      )}

      {activeTab === "transactions" && (
        <MonthlyTransactionsTab
          transactions={transactions}
          monthlyTotals={monthlyTotals}
          periodLabel={hijriPeriodLabel(selectedPeriod)}
          onDelete={deleteSession}
          onEdit={openSessionEdit}
        />
      )}

      <SessionGrantModal
        open={grantOpen}
        student={selectedStudent}
        rewardTypes={rewardTypes}
        selectedDate={selectedDate}
        selectedHalaqa={selectedHalaqa}
        editingSession={
          editingSession?.category === "grant"
            ? editingSession
            : null
        }
        onClose={closeGrant}
        onSaved={refreshAll}
      />

      <SessionDeductionModal
        open={penaltyOpen}
        student={selectedStudent}
        rewardTypes={rewardTypes}
        selectedDate={selectedDate}
        selectedHalaqa={selectedHalaqa}
        editingSession={
          editingSession?.category === "deduction"
            ? editingSession
            : null
        }
        onClose={closePenalty}
        onSaved={refreshAll}
      />

      {loading && (
        <div className="tp-loader">
          <Sparkles size={14} />
          جارٍ تحديث بيانات الشهر…
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, note, icon: Icon, tone = "green" }) {
  return (
    <article className="tp-stat" data-tone={tone}>
      <div className="tp-stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}
