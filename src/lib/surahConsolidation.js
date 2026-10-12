/**
 * Review the surah just memorized before allowing the next new lesson.
 * Review is recorded in recitations.review_* (not lesson_*), so it does
 * not count twice towards monthly NEW memorization.
 * Dates received here are Gregorian ISO strings (the UI renders Hijri).
 */

export function finishedSurahBoundary(endAyah, ayahCount, direction = "forward") {
  const end = Number(endAyah);
  const count = Number(ayahCount);
  if (!Number.isInteger(end) || !Number.isInteger(count) || count < 1) return false;
  return direction === "backward" ? end === 1 : end === count;
}

export function nextSurahConsolidation({
  lesson,
  ayahCount,
  direction = "forward",
  selectedDate,
  history = [],
  preferredDays = 1,
}) {
  if (!lesson?.id || !lesson?.to_surah || !lesson?.recitation_date ||
    !selectedDate || selectedDate <= lesson.recitation_date ||
    !finishedSurahBoundary(lesson.to_ayah, ayahCount, direction)) return null;

  const count = Number(ayahCount);
  const relevant = history.filter(row =>
    Number(row.surah_consolidation_origin_id) === Number(lesson.id) &&
    row.recitation_date < selectedDate
  );
  const savedTotal = relevant.map(row => Number(row.surah_consolidation_total))
    .find(total => total === 1 || total === 2);
  const requested = savedTotal || (Number(preferredDays) === 2 ? 2 : 1);
  const total = requested === 2 && count > 1 ? 2 : 1;

  const completedStep = relevant.reduce((highest, row) => {
    // 'إعادة' never advances the reinforcement sequence.
    if (row.review_evaluation === "إعادة" ||
      !row.review_surah || !Number(row.review_from_ayah) ||
      !Number(row.review_to_ayah)) return highest;
    return Math.max(highest, Number(row.surah_consolidation_step) || 0);
  }, 0);

  if (completedStep >= total) return null;

  const step = completedStep + 1;
  const midpoint = Math.floor(count / 2);
  return {
    key: `${lesson.id}-${lesson.to_surah}`,
    originId: Number(lesson.id),
    surah: lesson.to_surah,
    step,
    total,
    startAyah: total === 2 && step === 2 ? midpoint + 1 : 1,
    endAyah: total === 2 && step === 1 ? midpoint : count,
    locked: Boolean(savedTotal),
  };
}
