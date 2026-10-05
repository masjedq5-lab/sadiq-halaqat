// src/lib/teacherPreferences.js

export const TEACHER_PREFERENCES_DEFAULTS = {
  default_halaqa_id: null,
  calendar_mode: "hijri",
  ui_density: "comfortable",
  remember_last_halaqa: true,
  remember_last_tab: true,

  session_mode_enabled: true,
  session_start_view: "attendance",
  session_auto_open_care: true,

  recitation_default_amount_type: "one_page",
  recitation_advance_next_student: true,
  recitation_show_last_record: true,
  recitation_show_monthly_plan: true,
  recitation_show_progress: true,
  recitation_show_care_alert: true,

  attendance_default_action: "none",
  attendance_confirm_mark_all: true,
  attendance_show_repeated_absence: true,

  plan_copy_previous_suggestion: true,
  plan_show_pace: true,
  plan_smart_target_suggestion: true,
  plan_default_mem_faces: 0,
  plan_default_revision_faces: 0,
  plan_flexibility: "balanced",
  plan_warn_above_history_pct: 35,

  care_absence_threshold: 2,
  care_absence_window_days: 7,
  care_late_threshold: 2,
  care_no_recitation_days: 4,
  care_plan_delay_threshold: 20,
  care_positive_alerts: true,
  care_default_snooze_hours: 24,
  care_escalate_absences: 4,
  care_escalate_after_contacts: 1,
  care_contact_cooldown_hours: 24,

  whatsapp_mode: "direct",
  whatsapp_guardian_first: true,
  whatsapp_include_signature: true,
  whatsapp_greeting: "السلام عليكم ورحمة الله وبركاته،",
  whatsapp_closing:
    "شاكرين لكم تعاونكم واهتمامكم،\nوبارك الله فيكم وفي أبنائكم.",
  whatsapp_signature:
    "نظام الصديق\nمتابعة حلقات القرآن الكريم",

  notify_unread_messages: true,
  notify_supervisor_messages: true,
  notify_plan_status_changes: true,
  daily_brief_enabled: true,
  daily_brief_time: null,
  end_session_summary: true,
  quiet_hours_enabled: false,
  quiet_hours_start: null,
  quiet_hours_end: null,

  shared_screen_mode: false,
  hide_contact_data_shared: true,
  hide_private_notes_shared: true,
  hide_care_details_shared: true,
};

export const TEACHER_PREFERENCE_SECTION_KEYS = {
  experience: [
    "default_halaqa_id",
    "calendar_mode",
    "ui_density",
    "remember_last_halaqa",
    "remember_last_tab",
  ],

  session: [
    "session_mode_enabled",
    "session_start_view",
    "session_auto_open_care",
    "attendance_default_action",
    "attendance_confirm_mark_all",
    "attendance_show_repeated_absence",
    "recitation_default_amount_type",
    "recitation_advance_next_student",
    "recitation_show_last_record",
    "recitation_show_monthly_plan",
    "recitation_show_progress",
    "recitation_show_care_alert",
  ],

  education: [
    "plan_copy_previous_suggestion",
    "plan_show_pace",
    "plan_smart_target_suggestion",
    "plan_default_mem_faces",
    "plan_default_revision_faces",
    "plan_flexibility",
    "plan_warn_above_history_pct",
  ],

  care: [
    "care_absence_threshold",
    "care_absence_window_days",
    "care_late_threshold",
    "care_no_recitation_days",
    "care_plan_delay_threshold",
    "care_positive_alerts",
    "care_default_snooze_hours",
    "care_escalate_absences",
    "care_escalate_after_contacts",
    "care_contact_cooldown_hours",
  ],

  communication: [
    "whatsapp_mode",
    "whatsapp_guardian_first",
    "whatsapp_include_signature",
    "whatsapp_greeting",
    "whatsapp_closing",
    "whatsapp_signature",
  ],

  notifications: [
    "notify_unread_messages",
    "notify_supervisor_messages",
    "notify_plan_status_changes",
    "daily_brief_enabled",
    "daily_brief_time",
    "end_session_summary",
    "quiet_hours_enabled",
    "quiet_hours_start",
    "quiet_hours_end",
  ],

  privacy: [
    "shared_screen_mode",
    "hide_contact_data_shared",
    "hide_private_notes_shared",
    "hide_care_details_shared",
  ],
};

export function normalizeTeacherPreferences(row = {}) {
  return {
    ...TEACHER_PREFERENCES_DEFAULTS,
    ...row,
    plan_default_mem_faces: Number(
      row?.plan_default_mem_faces ??
        TEACHER_PREFERENCES_DEFAULTS.plan_default_mem_faces
    ),
    plan_default_revision_faces: Number(
      row?.plan_default_revision_faces ??
        TEACHER_PREFERENCES_DEFAULTS.plan_default_revision_faces
    ),
    care_plan_delay_threshold: Number(
      row?.care_plan_delay_threshold ??
        TEACHER_PREFERENCES_DEFAULTS.care_plan_delay_threshold
    ),
  };
}

export function pickPreferenceFields(source, keys = []) {
  return keys.reduce((result, key) => {
    result[key] = source[key];
    return result;
  }, {});
}
