/**
 * Input validation for the teacher's independently selected memorized Qur'an
 * range. Validate before writing policies or monthly plans.
 * Quran source is queried through quran_position_info, exactly as the SQL
 * quran_save_learning_policy validator does.
 */
export function parseScopeAyah(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const digits = String(value).trim()
    .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x06f0));
  if (!/^[0-9]+$/.test(digits)) return null;
  const numeric = Number(digits);
  return Number.isSafeInteger(numeric) && numeric > 0 ? numeric : null;
}

export function manualScopeError(row) {
  if (row?.revision_scope_mode !== "manual") return "";
  if (!String(row.revision_scope_start_surah || "").trim()) return "اختر سورة بداية المحفوظ";
  if (!parseScopeAyah(row.revision_scope_start_ayah)) return "أدخل رقم آية صحيح لبداية المحفوظ";
  if (!String(row.revision_scope_end_surah || "").trim()) return "اختر سورة نهاية المحفوظ";
  if (!parseScopeAyah(row.revision_scope_end_ayah)) return "أدخل رقم آية صحيح لنهاية المحفوظ";
  return "";
}

export async function validateManualScopeAgainstMushaf(row, supabase) {
  const errorText = manualScopeError(row);
  if (errorText) throw new Error(errorText);
  if (row?.revision_scope_mode !== "manual") return;

  const starts = [
    { surah: String(row.revision_scope_start_surah).trim(), ayah: parseScopeAyah(row.revision_scope_start_ayah), label: "البداية" },
    { surah: String(row.revision_scope_end_surah).trim(), ayah: parseScopeAyah(row.revision_scope_end_ayah), label: "النهاية" },
  ];
  const results = await Promise.all(starts.map(({surah, ayah}) =>
    supabase.rpc("quran_position_info", { p_surah: surah, p_ayah: ayah })
  ));

  results.forEach((result, index) => {
    if (result.error) throw result.error;
    const hasPosition = Array.isArray(result.data)
      ? result.data.length > 0
      : Boolean(result.data);
    if (!hasPosition) {
      const { surah, ayah, label } = starts[index];
      throw new Error(`الآية ${ayah} غير موجودة في سورة ${surah} (حد ${label}). راجع رقم الآية.`);
    }
  });
}
