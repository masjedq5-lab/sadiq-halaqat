/**
 * Teacher-facing diagnostics only. Does not change student plans, recitation
 * progress, or automatically infer a missing Qur'an position.
 */
function hasPositiveAmount(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}
function validPosition(surah, ayah) {
  return Boolean(String(surah || "").trim() &&
    Number.isInteger(Number(ayah)) && Number(ayah) > 0);
}

export function recitationPlanNotices({
  plan,
  generatedLesson = null,
  generatedReview = null,
  lessonSuppressed = false,
  interventionType = null,
} = {}) {
  if (!plan) {
    return { lesson: "", review: "",
      general: "لم يتم العثور على خطة شهرية لهذا الطالب في التاريخ المحدد. تحقق من الشهر والحلقة في صفحة الخطة الشهرية." };
  }
  const issues = {lesson:"",review:"",general:""};
  const lessonAmount = hasPositiveAmount(plan.memorizationAmount)
    || hasPositiveAmount(plan.memorization_daily_amount);
  if (!lessonSuppressed && lessonAmount && !generatedLesson) {
    const hasStart = validPosition(plan.memorization_from_surah,plan.memorization_from_ayah);
    const hasEnd = validPosition(plan.memorization_to_surah,plan.memorization_to_ayah);
    issues.lesson = !hasStart || !hasEnd
      ? "خطة الحفظ موجودة وفيها مقدار يومي، لكن بداية الحفظ أو نهايته غير محددة. أكمل المواضع في الخطة الشهرية، أو سجّل بالمقدار دون تغيير مسار السور."
      : "خطة الحفظ موجودة، لكن لم يُولّد الدرس التالي. راجع آخر موضع سُمّع واتجاه الحفظ وحدود الخطة الشهرية.";
  }

  const reviewAmount = hasPositiveAmount(plan.revisionAmount)
    || hasPositiveAmount(plan.revision_daily_amount);
  if (interventionType !== "pause" && reviewAmount && !generatedReview) {
    const hasStart = validPosition(plan.revision_from_surah, plan.revision_from_ayah);
    const hasEnd = validPosition(plan.revision_to_surah, plan.revision_to_ayah);
    issues.review = !hasStart || !hasEnd
      ? "خطة المراجعة فيها مقدار يومي، لكن حدود المراجعة غير مكتملة أو لم يُولَّد النطاق من محفوظ الطالب. راجع إعدادات الخطة أو سجّل بالمقدار."
      : "خطة المراجعة موجودة، لكن لم يُولّد موضع المراجعة. تحقق من بداية المراجعة وحدودها وآخر تسجيل.";
  }
  return issues;
}
