/**
 * Monthly progress status is the single source of truth for whether a delay
 * diagnosis applies. Recitation repeats / absences remain measurable, but
 * cannot label a student "delayed" after all applicable goals are completed.
 */
export function getOverallCompletion(row) {
  if (!row) return null;
  const goals = [];
  if (Number(row.memorization_target_faces || 0) > 0) {
    goals.push(Boolean(row.memorization_completed));
  }
  if (Number(row.revision_target_faces || 0) > 0) {
    goals.push(Boolean(row.revision_completed));
  }
  if (!goals.length) return null;
  return goals.every(Boolean);
}

export function hasMonthlyDelay(row) {
  return getOverallCompletion(row) !== true && Boolean(row?.smart_delay?.hasDelay);
}

export function monthlyDelayReason(row) {
  if (!hasMonthlyDelay(row)) return '';
  return String(row?.delay_reason || row?.smart_delay?.reason || '').trim();
}

export function monthlyDelayReportLabel(row) {
  return monthlyDelayReason(row) ||
    (getOverallCompletion(row) === true ? '—' : 'لا يوجد تعثر ظاهر');
}
