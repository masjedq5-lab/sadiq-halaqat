// The quantity-only alternative does not use or advance surah/ayah cursors.
// Store the original units for editing; normalize to Mushaf faces for monthly progress.
export const QURAN_LINES_PER_FACE = 15;

export function amountToFaces(value, unit) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0 || !["lines", "faces"].includes(unit)) {
    return null;
  }
  return unit === "lines" ? count / QURAN_LINES_PER_FACE : count;
}

export function plannedRecitationAmounts(plan) {
  const lessonDisabled = Boolean(plan?.lessonSuppressed || plan?.consolidation);
  const reviewDisabled = Boolean(plan?.interventionType === "pause");
  // A teacher choosing the quantity path expects exactly the numbers
  // written in the monthly plan. Interventions override them when active.
  const hasIntervention = Boolean(plan?.activeIntervention);
  const plannedLesson = plan?.memorization_daily_amount;
  const plannedReview = plan?.revision_daily_amount;
  const lessonSource = !hasIntervention && plannedLesson !== null &&
    plannedLesson !== undefined && plannedLesson !== ""
    ? plannedLesson : plan?.memorizationAmount;
  const reviewSource = !hasIntervention && plannedReview !== null &&
    plannedReview !== undefined && plannedReview !== ""
    ? plannedReview : plan?.revisionAmount;
  const lesson = Number(lessonSource || 0);
  const review = Number(reviewSource || 0);
  const lessonUnit = !hasIntervention && plannedLesson !== null &&
    plannedLesson !== undefined && plannedLesson !== ""
    ? plan.memorization_daily_unit : plan?.memorizationUnit;
  const reviewUnit = !hasIntervention && plannedReview !== null &&
    plannedReview !== undefined && plannedReview !== ""
    ? plan.revision_daily_unit : plan?.revisionUnit;
  return {
    lesson_amount_value: !lessonDisabled && Number.isFinite(lesson) && lesson > 0 ? String(lesson) : "",
    lesson_amount_unit: lessonUnit === "faces" ? "faces" : "lines",
    review_amount_value: !reviewDisabled && Number.isFinite(review) && review > 0 ? String(review) : "",
    review_amount_unit: reviewUnit === "lines" ? "lines" : "faces",
  };
}

export function validateAmountRecitation(form, { lessonDisabled = false, reviewDisabled = false } = {}) {
  const tracks = [
    { name: "الدرس", value: form.lesson_amount_value, unit: form.lesson_amount_unit,
      evaluation: form.lesson_evaluation, disabled: lessonDisabled },
    { name: "المراجعة", value: form.review_amount_value, unit: form.review_amount_unit,
      evaluation: form.review_evaluation, disabled: reviewDisabled },
  ];
  const output = { lessonFaces: 0, reviewFaces: 0, hasLesson: false, hasReview: false };

  tracks.forEach((track, index) => {
    const raw = String(track.value ?? "").trim();
    if (track.disabled) {
      if (raw !== "" && Number(raw) > 0) {
        throw new Error(`${track.name} موقوف حاليًا. لا يمكن تسجيل مقدار له.`);
      }
      return;
    }
    if (raw === "") return;
    const amount = Number(raw);
    const valid = Number.isFinite(amount) && amount > 0 && amount <= 10000 &&
      (track.unit === "faces" || (track.unit === "lines" && Number.isInteger(amount)));
    if (!valid) {
      throw new Error(`أدخل مقدارًا صحيحًا لل${track.name} (الأسطر عدد صحيح، والصفحات يمكن أن تكون كسرية).`);
    }
    const faces = amountToFaces(amount, track.unit);
    if (faces == null || faces <= 0 || faces > 10000) {
      throw new Error(`مقدار ${track.name} غير صحيح.`);
    }
    if (!["ممتاز", "جيد جداً", "جيد", "إعادة"].includes(track.evaluation)) {
      throw new Error(`اختر تقييم ${track.name} بعد تحديد المقدار.`);
    }
    if (index === 0) {
      output.lessonFaces = faces;
      output.hasLesson = true;
    } else {
      output.reviewFaces = faces;
      output.hasReview = true;
    }
  });

  return output;
}
