import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  amountToFaces,
  plannedRecitationAmounts,
  validateAmountRecitation,
} from "../src/lib/quranAmountRecitation.js";

const plan = {
  memorizationAmount: 3, memorizationUnit: "lines",
  revisionAmount: 5, revisionUnit: "faces",
  lessonSuppressed: false, interventionType: null,
};
const defaults = plannedRecitationAmounts(plan);
assert.deepEqual(defaults, {
  lesson_amount_value: "3", lesson_amount_unit: "lines",
  review_amount_value: "5", review_amount_unit: "faces",
});
let form = {
  ...defaults, lesson_evaluation: "ممتاز", review_evaluation: "جيد جداً",
};
let result = validateAmountRecitation(form);
assert.equal(result.hasLesson, true);
assert.equal(result.hasReview, true);
assert.equal(result.lessonFaces, 3 / 15);
assert.equal(result.reviewFaces, 5);
assert.equal(result.lessonFaces + result.reviewFaces, 5.2);
form = { ...form, lesson_amount_value: "4", review_amount_value: "6.5" };
result = validateAmountRecitation(form);
assert.equal(result.lessonFaces, 4 / 15);
assert.equal(result.reviewFaces, 6.5);
assert.equal(amountToFaces(15, "lines"), 1);
assert.equal(amountToFaces(0.5, "faces"), 0.5);
assert.equal(amountToFaces(-3, "lines"), null);
assert.deepEqual(plannedRecitationAmounts({ ...plan, lessonSuppressed:true }),
  { ...defaults, lesson_amount_value: "" });
assert.deepEqual(plannedRecitationAmounts({ ...plan, interventionType:"pause" }),
  { ...defaults, review_amount_value: "" });
await assert.rejects(async () => validateAmountRecitation({
  ...form, lesson_amount_value: "3", lesson_evaluation: "",
}), /اختر تقييم الدرس/);
await assert.rejects(async () => validateAmountRecitation({
  ...form, review_amount_value:"abc",
}), /مقدارًا صحيحًا للمراجعة/);
await assert.rejects(async () => validateAmountRecitation({
  ...form, lesson_amount_value:"3.5",
}), /مقدارًا صحيحًا للدرس/);
await assert.rejects(async () => validateAmountRecitation({
  ...form, lesson_amount_value:"3",
}, {lessonDisabled:true}), /الدرس موقوف/);
const jsx = await fs.readFile("src/pages/teacher/Recitations.jsx","utf8");
assert(jsx.includes('recording_mode: "amount"'));
assert(jsx.includes('recording_mode:"positions"'));
assert(jsx.includes('afterPersist: null'));
assert(jsx.includes("review_faces: measured.hasReview ? measured.reviewFaces : null"));
assert(jsx.includes("lesson_faces_manual: measured.hasLesson ? measured.lessonFaces : null"));
assert(jsx.includes('quranForm.recording_mode === "positions" && ('));
assert(jsx.includes('quranForm.recording_mode === "amount" && ('));
assert(jsx.includes('disabled={Boolean(editing || planSuggestion?.consolidation)}'));
console.log("PASS: Quran recitation quantity mode: plan 3 lines+5 faces, corrections, rating, paused tracks and no cursor advance");
