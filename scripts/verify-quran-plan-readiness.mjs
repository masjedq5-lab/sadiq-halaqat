import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { recitationPlanNotices } from "../src/lib/quranPlanReadiness.js";

const good = {
  memorization_from_surah: "التحريم",
  memorization_from_ayah: 9,
  memorization_to_surah: "التغابن",
  memorization_to_ayah: 10,
  memorization_direction: "backward",
  memorization_daily_amount: 3,
  revision_from_surah: "الواقعة", revision_from_ayah: 1,
  revision_to_surah: "الدخان", revision_to_ayah: 59,
  revision_daily_amount: 5,
};
const generated = {start_surah_name:"التحريم",start_ayah:9,end_surah_name:"التحريم",end_ayah:10};
const generatedRevision = {start_surah_name:"الواقعة",start_ayah:1};
let warnings = recitationPlanNotices({plan:good,generatedLesson:generated,generatedReview:generatedRevision});
assert.deepEqual(warnings,{lesson:"",review:"",general:""});
warnings = recitationPlanNotices({plan: {...good, memorization_to_surah:null}, generatedReview:generatedRevision});
assert.match(warnings.lesson,/بداية الحفظ أو نهايته غير محددة/);
assert.equal(warnings.review,"");
warnings = recitationPlanNotices({plan:{...good,revision_from_ayah:null},generatedLesson:generated});
assert.match(warnings.review,/حدود/);
assert.equal(warnings.lesson,"");
warnings = recitationPlanNotices({plan:good,generatedReview:generatedRevision});
assert.match(warnings.lesson,/لم يُولّد/);
warnings = recitationPlanNotices({plan:good,lessonSuppressed:true,generatedReview:generatedRevision});
assert.equal(warnings.lesson,"");
warnings = recitationPlanNotices({plan:null});
assert.match(warnings.general,/لم يتم العثور على خطة شهرية/);
warnings = recitationPlanNotices({plan:good,interventionType:"pause",generatedLesson:generated});
assert.equal(warnings.review,"");

const source=await fs.readFile("src/pages/teacher/Recitations.jsx","utf8");
assert(source.includes("recitationPlanNotices({"));
assert(source.includes("recitation-plan-diagnostic"));
assert(source.includes("ayah: start.ayahCount"),"Both surah directions end at the last verse of each surah");
assert(source.includes("let revisionLoadError ="),"Review failure should not hide memorization suggestion");
assert(source.includes("if (revisionLoadError) planNotices.review = revisionLoadError;"));
console.log("PASS: plan-status messages, invalid bounds, reverse order and independent track load.");
