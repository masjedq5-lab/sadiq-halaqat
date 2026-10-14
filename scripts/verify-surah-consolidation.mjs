import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { finishedSurahBoundary, nextSurahConsolidation } from "../src/lib/surahConsolidation.js";

const lesson = { id: 50, to_surah: "الإخلاص", to_ayah: 4, recitation_date: "2026-10-10" };
const historyRow = (step, total, review_evaluation = "ممتاز", to = step === 1 ? 2 : 4) => ({
  surah_consolidation_origin_id: 50, surah_consolidation_step: step,
  surah_consolidation_total: total, recitation_date: "2026-10-11",
  review_surah: "الإخلاص", review_from_ayah: step === 1 ? 1 : 3,
  review_to_surah: "الإخلاص", review_to_ayah: to, review_evaluation,
});

const onDate = (history = [], preferredDays = 1, selectedDate = "2026-10-12") =>
  nextSurahConsolidation({ lesson, ayahCount: 4, selectedDate, history, preferredDays });

assert(finishedSurahBoundary(4, 4, "forward"));
assert(finishedSurahBoundary(4, 4, "backward"));
assert(!finishedSurahBoundary(1, 4, "backward"));
assert(!finishedSurahBoundary(3, 4, "forward"));
assert.equal(nextSurahConsolidation({ lesson, ayahCount: 4, selectedDate: "2026-10-10" }), null,
  "The teacher may record a second recitation on the lesson completion date");

assert.deepEqual(
  (({ step, total, startAyah, endAyah }) => ({ step, total, startAyah, endAyah }))(onDate([], 1)),
  { step: 1, total: 1, startAyah: 1, endAyah: 4 },
);
assert.deepEqual(
  (({ step, total, startAyah, endAyah }) => ({ step, total, startAyah, endAyah }))(onDate([], 2)),
  { step: 1, total: 2, startAyah: 1, endAyah: 2 },
);
assert.deepEqual(
  (({ step, total, startAyah, endAyah, locked }) => ({ step, total, startAyah, endAyah, locked }))(
    onDate([historyRow(1, 2)], 1)
  ),
  { step: 2, total: 2, startAyah: 3, endAyah: 4, locked: true },
  "An already started two-day plan must remain two days",
);
assert.equal(onDate([historyRow(1, 1, "ممتاز", 4)]), null, "Accepted complete surah unlocks the next lesson");
assert.equal(onDate([historyRow(1, 2), historyRow(2, 2)]), null, "The second accepted half unlocks the next lesson");
assert.equal(onDate([historyRow(1, 2, "إعادة")]).step, 1, "Repeat rating holds the same part");
assert.equal(onDate([historyRow(1, 2, "ممتاز", 1)]).step, 1,
  "Partial actual recitation cannot silently complete an entire part");
assert.equal(onDate([historyRow(1, 2), historyRow(2, 2, "إعادة")]).step, 2,
  "Repeat on the second day must not restart the entire surah");
assert.equal(onDate([historyRow(1, 2, "ممتاز", 2)], 1, "2026-10-11").step, 1,
  "Same-day history is ignored until the following date");
assert.equal(nextSurahConsolidation({lesson: {...lesson, to_ayah: 1},
  direction: "backward", ayahCount: 4, selectedDate:"2026-10-12"}), null,
  "Backward routes change surah ORDER, not verse order");
assert.equal(nextSurahConsolidation({lesson,
  direction: "backward", ayahCount: 4, selectedDate:"2026-10-12"}).endAyah, 4);


const source = await fs.readFile("src/pages/teacher/Recitations.jsx", "utf8");
assert(source.includes("!justCompletedSurah"), "Do not prequeue a new surah on completion day");
assert(source.includes("ayah: start.ayahCount"), "Reverse-surah boundary must stop at the final ayah");
assert(!source.includes("direction) === \"backward\"\\n        ? 1 : start.ayahCount"), "Regression: never bound backward verse at 1");
assert(source.includes("surah_consolidation_origin_id: consolidation?.originId"), "Persist review state");
assert(source.includes('recitationRecord.surah_consolidation_origin_id'), "No automatic review cursor advance during consolidation");
assert(source.includes("surahConsolidationPreference"), "Teacher can choose a 1- or 2-day path");

console.log("PASS: surah completion consolidates whole/two halves, protects repeats, partial reviews, historic dates and subsequent new lessons.");
