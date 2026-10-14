import CompactPageHeader from "../components/CompactPageHeader";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

import {
  Gift,
  History,
  Settings2,
} from "lucide-react";

import RewardsStats from "../components/rewards/RewardsStats";
import RewardsFilters from "../components/rewards/RewardsFilters";
import StudentsPointsTable from "../components/rewards/StudentsPointsTable";

import GrantModal from "../components/rewards/GrantModal";
import DeductionModal from "../components/rewards/DeductionModal";

import RewardTypesTab from "../components/rewards/RewardTypesTab";
import TransactionsTab from "../components/rewards/TransactionsTab";

import CreateTypeModal from "../components/rewards/CreateTypeModal";
import EditTypeModal from "../components/rewards/EditTypeModal";
import EditTransactionModal
from "../components/rewards/EditTransactionModal";

import { showToast } from "../components/Toast";

export default function RewardsPage() {

  const [loading, setLoading] =
    useState(true);

  const [activeTab, setActiveTab] =
    useState("points");

  const [selectedDate, setSelectedDate] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  const [selectedHalaqa, setSelectedHalaqa] =
    useState("");

  const [selectedTeacher, setSelectedTeacher] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [halaqat, setHalaqat] =
    useState([]);

  const [students, setStudents] =
    useState([]);

  const [attendance, setAttendance] =
    useState([]);

  const [rewardTypes, setRewardTypes] =
    useState([]);

  const [supervisorMosques, setSupervisorMosques] =
    useState([]);

  const [selectedMosque, setSelectedMosque] =
    useState("");

  const [transactions, setTransactions] =
    useState([]);

  const [teachers, setTeachers] =
    useState([]);

  const [selectedStudent, setSelectedStudent] =
    useState(null);

  const [grantOpen, setGrantOpen] =
    useState(false);

  const [penaltyOpen, setPenaltyOpen] =
    useState(false);

  const [createTypeOpen, setCreateTypeOpen] =
    useState(false);

  const [editTypeOpen, setEditTypeOpen] =
    useState(false);

  const [editingType, setEditingType] =
    useState(null);
const [editTransactionOpen, setEditTransactionOpen] =
  useState(false);

const [editingTransaction, setEditingTransaction] =
  useState(null);

const loadHalaqat =
async (mosqueId = selectedMosque) => {

  if (!mosqueId) {
    setHalaqat([]);
    return;
  }

  const { data, error } =
    await supabase
      .from("halaqat")
      .select(`
        id,
        name,
        main_teacher_id,
        mosque_id
      `)
      .eq("mosque_id", mosqueId)
      .order("name");

  if (error) {
    console.error(error);
    return;
  }

  setHalaqat(data || []);
};

const loadSupervisorMosques =
async () => {

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error(authError);
    return;
  }

  const { data: profile, error: profileError } =
    await supabase
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .eq("role", "supervisor")
      .single();

  if (profileError || !profile) {
    console.error(profileError);
    return;
  }

  const { data, error } =
    await supabase
      .from("mosque_supervisors")
      .select(`
        mosque_id,
        mosques (
          id,
          name,
          status
        )
      `)
      .eq("supervisor_id", profile.id);

  if (error) {
    console.error(error);
    return;
  }

  const rows = (data || [])
    .map((row) => row.mosques)
    .filter((mosque) => mosque && mosque.status === "active");

  setSupervisorMosques(rows);

  setSelectedMosque((current) => {
    if (
      current &&
      rows.some((mosque) => String(mosque.id) === String(current))
    ) {
      return current;
    }

    return rows[0]?.id ? String(rows[0].id) : "";
  });
};

const loadRewardTypes =
async (mosqueId = selectedMosque) => {

  if (!mosqueId) {
    setRewardTypes([]);
    return;
  }

  const { data, error } =
    await supabase

      .from("reward_types")

      .select("*")

      .eq("mosque_id", mosqueId)

      .order("points", {
        ascending: false,
      });

  if (error) {
    console.error(error);
    return;
  }

  setRewardTypes(data || []);

};

const loadTransactions =
async () => {

  const { data, error } =
    await supabase

      .from(
        "points_transactions"
      )

      .select(`
        *,
        profiles!points_transactions_student_id_fkey(
          full_name
        ),
        reward_types(
          name
        )
      `)

      .order(
        "created_at",
        {
          ascending:false
        }
      );

  if(error){

    console.error(error);

    return;

  }

  const rows =
    (data || []).map(
      item => ({

        ...item,

        student_name:
          item.profiles
            ?.full_name,

        reward_name:
          item.reward_types
            ?.name

      })
    );

  setTransactions(
    rows
  );

};


const loadTeachers =
async () => {

  const { data, error } =
    await supabase

      .from("profiles")

      .select(`
        id,
        full_name,
        role
      `)

      .eq(
        "role",
        "teacher"
      )

      .order(
        "full_name"
      );

  if (error) {

    console.error(error);

    return;

  }

  setTeachers(
    data || []
  );

};

const loadStudents =
async () => {

  if(!selectedHalaqa)
    return;

  const { data, error } =
    await supabase

      .from(
        "student_halaqat"
      )

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

      .eq(
        "halaqa_id",
        selectedHalaqa
      )

      .eq(
        "is_current",
        true
      );

  if(error){

    console.error(error);

    return;

  }

  const rows =
    (data || []).map(
      item => ({

        id:
          item.profiles?.id,

        full_name:
          item.profiles
            ?.full_name,

        total_points:
          item.profiles
            ?.total_points || 0

      })
    );

  setStudents(
    rows
  );

};

const loadAttendance =
async () => {

  if (
    !selectedHalaqa ||
    !selectedDate
  ) return;

  const { data, error } =
    await supabase

      .from("attendance")

      .select("*")

      .eq(
        "halaqa_id",
        selectedHalaqa
      )

      .eq(
        "attendance_date",
        selectedDate
      );

  if (error) {

    console.error(error);

    return;

  }

  setAttendance(
    data || []
  );

};

const refreshAll =
async () => {

  setLoading(true);

  try {

    await Promise.all([

      loadStudents(),

      loadAttendance(),

      loadRewardTypes(),

      loadTransactions(),

    ]);

  } finally {

    setLoading(false);

  }

};

useEffect(() => {

  loadSupervisorMosques();

  loadTeachers();

  loadTransactions();

}, []);

useEffect(() => {

  setSelectedHalaqa("");
  setSelectedTeacher("");
  setStudents([]);
  setAttendance([]);

  if (!selectedMosque) {
    setHalaqat([]);
    setRewardTypes([]);
    return;
  }

  loadHalaqat(selectedMosque);
  loadRewardTypes(selectedMosque);

}, [selectedMosque]);

useEffect(() => {

  if (
    selectedHalaqa
  ) {

    refreshAll();

  }

}, [
  selectedHalaqa,
  selectedDate
]);

const studentsWithAttendance =
useMemo(() => {

  return students.map(
    student => {

      const record =
        attendance.find(

          a =>

            a.student_id ===
            student.id

        );

      return {

        ...student,

        attendance:
          record?.status ||
          "absent"

      };

    }
  );

}, [
  students,
  attendance
]);

const rewardOptions =
  rewardTypes.filter(
    x =>
      x.type ===
      "reward"
      &&
      x.is_active
  );

const penaltyOptions =
  rewardTypes.filter(
    x =>
      x.type ===
      "penalty"
      &&
      x.is_active
  );

const stats =
useMemo(() => {

  const totalStudents =
    students.length;

  const totalRewards =
    transactions

      .filter(
        x =>
          x.category ===
          "grant"
      )

      .reduce(
        (sum,item)=>
          sum +
          Number(
            item.points
          ),
        0
      );

  const totalPenalties =
    Math.abs(

      transactions

      .filter(
        x =>
          x.category ===
          "deduction"
      )

      .reduce(
        (sum,item)=>
          sum +
          Number(
            item.points
          ),
        0
      )

    );

  const netPoints =
    totalRewards -
    totalPenalties;

  return {

    totalStudents,

    totalRewards,

    totalPenalties,

    netPoints

  };

},[
  students,
  transactions
]);

const canUsePointsForStudent =
(student) =>
  student?.attendance === "present" ||
  student?.attendance === "late";

const openGrant =
(student)=>{

  if (!canUsePointsForStudent(student)) {
    showToast(
      student?.attendance === "excused"
        ? "الطالب غائب بعذر؛ لا يمكن منحه نقاطًا لهذا اليوم."
        : "الطالب غائب؛ لا يمكن منحه نقاطًا لهذا اليوم.",
      "error"
    );

    return;
  }

  setSelectedStudent(
    student
  );

  setGrantOpen(true);

};

const openPenalty =
(student)=>{

  if (!canUsePointsForStudent(student)) {
    showToast(
      student?.attendance === "excused"
        ? "الطالب غائب بعذر؛ لا يمكن خصم نقاط منه لهذا اليوم."
        : "الطالب غائب؛ لا يمكن خصم نقاط منه لهذا اليوم.",
      "error"
    );

    return;
  }

  setSelectedStudent(
    student
  );

  setPenaltyOpen(true);

};

const openHistory =
(student)=>{

  setSearch(
    student.full_name
  );

  setActiveTab(
    "transactions"
  );

};

const deleteType =
async (item)=>{

  const { error } =
    await supabase

      .from(
        "reward_types"
      )

      .delete()

      .eq(
        "id",
        item.id
      )
      .eq(
        "mosque_id",
        selectedMosque
      );

  if(error){

    showToast(
      "فشل الحذف"
    );

    return;
  }

  showToast(
    "تم الحذف"
  );

  loadRewardTypes();

};

const toggleType =
async (item)=>{

  const { error } =
    await supabase

      .from(
        "reward_types"
      )

      .update({

        is_active:
          !item.is_active

      })

      .eq(
        "id",
        item.id
      )
      .eq(
        "mosque_id",
        selectedMosque
      );

  if(error){

    showToast(
      "فشل التحديث"
    );

    return;
  }

  showToast(
    "تم التحديث"
  );

  loadRewardTypes();

};

const deleteTransaction =
async (item) => {

  const { error } =
    await supabase
      .from(
        "points_transactions"
      )
      .delete()
      .eq(
        "id",
        item.id
      );

  if (error) {

    showToast(
      "فشل الحذف"
    );

    return;
  }

  // إعادة حساب مجموع النقاط

  const {
    data: transactions
  } = await supabase
    .from(
      "points_transactions"
    )
    .select("points")
    .eq(
      "student_id",
      item.student_id
    );

  const total =
    (transactions || [])
      .reduce(
        (sum, row) =>
          sum + row.points,
        0
      );

  await supabase
    .from("profiles")
    .update({
      total_points: total
    })
    .eq(
      "id",
      item.student_id
    );

  showToast(
    "تم حذف العملية"
  );

  await refreshAll();

};
const tabs = [

  {
    key: "points",
    label: "المنح والخصومات",
    icon: Gift,
  },

  {
    key: "types",
    label: "إدارة الأنواع",
    icon: Settings2,
  },

  {
    key: "transactions",
    label: "سجل العمليات",
    icon: History,
  },

];

return (

<div className="page-container rewards-page-container">

  {/* HEADER */}

  <CompactPageHeader title="المنح والخصومات">
    <label className="sadiq-heading-select">
      <span>المسجد الحالي</span>
      <select
        value={selectedMosque}
        onChange={(event) =>
          setSelectedMosque(event.target.value)
        }
      >
        {supervisorMosques.length === 0 && (
          <option value="">
            لا توجد مساجد مرتبطة
          </option>
        )}

        {supervisorMosques.map((mosque) => (
          <option key={mosque.id} value={mosque.id}>
            {mosque.name}
          </option>
        ))}
      </select>
    </label>
  </CompactPageHeader>

  {/* STATS */}

  <RewardsStats
    totalStudents={stats.totalStudents}
    totalRewards={stats.totalRewards}
    totalPenalties={stats.totalPenalties}
    netPoints={stats.netPoints}
  />

  {/* FILTERS */}

  <RewardsFilters

    selectedDate={
      selectedDate
    }

    setSelectedDate={
      setSelectedDate
    }

    selectedHalaqa={
      selectedHalaqa
    }

    setSelectedHalaqa={
      setSelectedHalaqa
    }

    selectedTeacher={
      selectedTeacher
    }

    setSelectedTeacher={
      setSelectedTeacher
    }

    halaqat={
      halaqat
    }

    teachers={
      teachers
    }

    search={
      search
    }

    setSearch={
      setSearch
    }

  />

  {/* TABS */}

  <div
  style={{
    display: "flex",
    gap: "calc(12px * var(--app-density,1))",
    marginBottom: "24px",

    background: "#fff",

    padding: "calc(12px * var(--app-density,1))",

    borderRadius: "calc(18px * var(--app-radius-scale,1))",

    border: "1px solid #E2E8F0",

    width: "fit-content",

    boxShadow:
      "0 4px 16px rgba(15,23,42,.04)",
  }}
>

    {tabs.map(tab=>{

      const Icon =
        tab.icon;

      return (

        <button type="button"
  key={tab.key}
  onClick={() =>
    setActiveTab(tab.key)
  }
  style={{
    display: "flex",
    alignItems: "center",
    gap: "calc(10px * var(--app-density,1))",

    padding: "calc(12px * var(--app-density,1)) calc(20px * var(--app-density,1))",

    borderRadius: "calc(14px * var(--app-radius-scale,1))",

    border:
      activeTab === tab.key
        ? "1px solid var(--app-color-0f766e,#0F766E)"
        : "1px solid #E2E8F0",

    background:
      activeTab === tab.key
        ? "linear-gradient(135deg,var(--app-color-0f766e,#0F766E),var(--app-color-115e59,#115E59))"
        : "#FFFFFF",

    color:
      activeTab === tab.key
        ? "#FFFFFF"
        : "#334155",

    fontWeight: "800",

    cursor: "pointer",

    transition: ".25s",

    boxShadow:
      activeTab === tab.key
        ? "0 8px 20px color-mix(in srgb,var(--app-color-0f766e,#0f766e) 20%,transparent)"
        : "none",
  }}
>
  <Icon size={18} />

  {tab.label}
</button>

      );

    })}

  </div>

  {/* TAB CONTENT */}

  {activeTab ===
  "points" && (

    <StudentsPointsTable

      students={
        studentsWithAttendance
      }

      onGrant={
        openGrant
      }

      onPenalty={
        openPenalty
      }

      onHistory={
        openHistory
      }

    />

  )}

  {activeTab ===
  "types" && (

    <RewardTypesTab

      rewardTypes={
        rewardTypes
      }

      onCreate={()=>
        setCreateTypeOpen(
          true
        )
      }

      onEdit={(item)=>{

        setEditingType(
          item
        );

        setEditTypeOpen(
          true
        );

      }}

      onDelete={
        deleteType
      }

      onToggleStatus={
        toggleType
      }

    />

  )}

  {activeTab ===
  "transactions" && (

    <TransactionsTab

      transactions={
        transactions
      }

      onDelete={
        deleteTransaction
      }

      onEdit={(item)=>{

  setEditingTransaction(
    item
  );

  setEditTransactionOpen(
    true
  );

}}

    />

  )}

  {/* GRANT */}

  <GrantModal

    open={
      grantOpen
    }

    student={
      selectedStudent
    }

    rewardTypes={
      rewardOptions
    }

    selectedDate={
      selectedDate
    }

    selectedHalaqa={
      selectedHalaqa
    }

    onClose={()=>
      setGrantOpen(
        false
      )
    }

    onSaved={
      refreshAll
    }

  />

  {/* PENALTY */}

  <DeductionModal

    open={
      penaltyOpen
    }

    student={
      selectedStudent
    }

    penaltyTypes={
      penaltyOptions
    }

    selectedDate={
      selectedDate
    }

    selectedHalaqa={
      selectedHalaqa
    }

    onClose={()=>
      setPenaltyOpen(
        false
      )
    }

    onSaved={
      refreshAll
    }

  />

  {/* CREATE TYPE */}

  <CreateTypeModal

    open={
      createTypeOpen
    }

    mosqueId={
      selectedMosque
    }

    onClose={()=>
      setCreateTypeOpen(
        false
      )
    }

    onSaved={
      loadRewardTypes
    }

  />

  {/* EDIT TYPE */}

  <EditTypeModal

    open={
      editTypeOpen
    }

    mosqueId={
      selectedMosque
    }

    item={
      editingType
    }

    onClose={()=>
      setEditTypeOpen(
        false
      )
    }

    onSaved={
      loadRewardTypes
    }

  />

<EditTransactionModal

  open={
    editTransactionOpen
  }

  transaction={
    editingTransaction
  }

  onClose={()=>
    setEditTransactionOpen(
      false
    )
  }

  onSaved={() => {

    loadTransactions();

    setEditTransactionOpen(
      false
    );

  }}

/>

</div>

);
}

