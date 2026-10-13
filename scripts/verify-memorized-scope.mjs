import assert from "node:assert/strict";
import {
  manualScopeError, parseScopeAyah, validateManualScopeAgainstMushaf
} from "../src/lib/memorizedScopeValidation.js";

const valid = {
  revision_scope_mode: "manual",
  revision_scope_start_surah: "الواقعة",
  revision_scope_start_ayah: "١",
  revision_scope_end_surah: "الدخان",
  revision_scope_end_ayah: "59",
};
assert.equal(parseScopeAyah("١٢"), 12);
assert.equal(parseScopeAyah("۱۲"), 12);
assert.equal(parseScopeAyah("12.5"), null);
assert.equal(parseScopeAyah(-1), null);
assert.equal(parseScopeAyah("0"), null);
assert.equal(manualScopeError({revision_scope_mode:"lesson_derived"}), "");
assert.equal(manualScopeError({revision_scope_mode:"manual"}), "اختر سورة بداية المحفوظ");
assert.equal(manualScopeError({...valid,revision_scope_start_ayah:""}), "أدخل رقم آية صحيح لبداية المحفوظ");
assert.equal(manualScopeError({...valid,revision_scope_end_surah:""}), "اختر سورة نهاية المحفوظ");
assert.equal(manualScopeError({...valid,revision_scope_end_ayah:0}), "أدخل رقم آية صحيح لنهاية المحفوظ");
assert.equal(manualScopeError(valid), "");

let calls = [];
const mock = {
  rpc: async (method, params) => {
    calls.push({method,params});
    return {data:[{surah_name:params.p_surah,ayah:params.p_ayah}],error:null};
  }
};
await validateManualScopeAgainstMushaf({revision_scope_mode:"manual"},mock).then(
  () => assert.fail("Incomplete scope must be rejected before RPC"),
  err => assert.match(err.message,/اختر سورة بداية المحفوظ/)
);
assert.equal(calls.length,0);
await validateManualScopeAgainstMushaf({revision_scope_mode:"lesson_derived"},mock);
assert.equal(calls.length,0);
await validateManualScopeAgainstMushaf(valid,mock);
assert.equal(calls.length,2);
assert.deepEqual(calls[0],{
  method:"quran_position_info",params:{p_surah:"الواقعة",p_ayah:1}
});
assert.deepEqual(calls[1],{
  method:"quran_position_info",params:{p_surah:"الدخان",p_ayah:59}
});
await assert.rejects(
  () => validateManualScopeAgainstMushaf(valid,{
    rpc:async (_method,params) => params.p_surah === "الدخان"
      ? {data:[],error:null}
      : {data:[{ayah:1}],error:null}
  }),
  /الآية 59 غير موجودة في سورة الدخان/
);
await assert.rejects(
  () => validateManualScopeAgainstMushaf(valid,{
    rpc:async () => ({data:null,error:new Error("RLS unavailable")})
  }),
  /RLS unavailable/
);
console.log("PASS: Manual memorized-scope UI validation and exact Mushaf RPC checks (no database writes)");
