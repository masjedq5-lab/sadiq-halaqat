import { supabase } from "./supabase";

export function learningDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function mergeEffectiveTargets(plan, effective) {
  if (!plan || !effective) return plan;
  return {
    ...plan,
    original_memorization_target_faces: plan.memorization_target_faces,
    original_revision_target_faces: plan.revision_target_faces,
    ...effective,
  };
}

export async function effectiveMonthlyPlans(plans, halaqaId, period) {
  if (!plans?.length || !halaqaId || !period?.start || !period?.end) return plans || [];
  const { data, error } = await supabase.rpc("quran_effective_monthly_targets", {
    p_halaqa_id: Number(halaqaId), p_period_start: period.start, p_period_end: period.end,
  });
  if (error) throw error;
  const byStudent = new Map((data || []).map((row) => [Number(row.student_id), row]));
  return plans.map((plan) => mergeEffectiveTargets(plan, byStudent.get(Number(plan.student_id))));
}

export async function learningPolicy(studentId, halaqaId, date = learningDate()) {
  const { data, error } = await supabase.from("quran_student_policies").select("*")
    .eq("student_id", Number(studentId)).eq("halaqa_id", Number(halaqaId))
    .lte("effective_from", date).or(`effective_to.is.null,effective_to.gte.${date}`)
    .order("effective_from", { ascending: false }).order("id", { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function latestLearningPolicyDate(studentId, halaqaId) {
  const { data, error } = await supabase.from("quran_student_policies").select("effective_from")
    .eq("student_id", Number(studentId)).eq("halaqa_id", Number(halaqaId)).eq("active", true)
    .order("effective_from", { ascending: false }).order("id", { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw error;
  return data?.effective_from || "";
}

export async function saveLearningPolicy(studentId, halaqaId, patch, date = learningDate()) {
  const { data, error } = await supabase.rpc("quran_save_learning_policy", {
    p_student_id: Number(studentId), p_halaqa_id: Number(halaqaId),
    p_patch: patch, p_effective_from: date,
  });
  if (error) throw error;
  return data;
}
