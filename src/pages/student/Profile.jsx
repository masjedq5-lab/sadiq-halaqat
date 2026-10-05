import CalendarInput from "../../components/CalendarInput";
import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, CircleUserRound, GraduationCap, LockKeyhole, Pencil, Save, ShieldCheck, UserRound, X } from "lucide-react";

import StudentPage from "../../components/student/StudentPage";
import { useStudentPortal } from "../../context/StudentPortalContext";
import { supabase } from "../../lib/supabase";
import {
  formatGregorianDate,
  recitationDaysLabel,
} from "../../lib/studentPortalUtils";
import "./StudentPortal.css";

const EDUCATION_STAGES = [
  { value: "primary", label: "المرحلة الابتدائية" },
  { value: "middle", label: "المرحلة المتوسطة" },
  { value: "secondary", label: "المرحلة الثانوية" },
  { value: "university", label: "المرحلة الجامعية" },
  { value: "other", label: "أخرى" },
];

const EDUCATION_GRADES = {
  primary: ["الأول الابتدائي", "الثاني الابتدائي", "الثالث الابتدائي", "الرابع الابتدائي", "الخامس الابتدائي", "السادس الابتدائي"],
  middle: ["الأول المتوسط", "الثاني المتوسط", "الثالث المتوسط"],
  secondary: ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"],
  university: ["طالب جامعي"],
  other: ["أخرى"],
};

const GOALS = [
  { value: "quran", label: "القرآن الكريم" },
  { value: "noorania", label: "القاعدة النورانية" },
  { value: "noorania_quran", label: "القرآن والقاعدة النورانية" },
  { value: "other", label: "أخرى" },
];

const PROGRAMS = [
  { value: "memorization", label: "حفظ" },
  { value: "revision", label: "مراجعة" },
  { value: "memorization_revision", label: "حفظ ومراجعة" },
  { value: "tajweed", label: "تجويد" },
  { value: "foundation", label: "تأسيس" },
];

const RECITATION_MODES = [
  { value: "regular", label: "حضوري" },
  { value: "remote", label: "عن بُعد" },
  { value: "both", label: "حضوري وعن بُعد" },
];

const GENDERS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
];

const RELATIONS = ["الأب", "الأم", "الأخ", "الأخت", "الجد", "الجدة", "العم", "الخال", "ولي أمر آخر"];

const RECITATION_DAYS = [
  ["sunday", "الأحد"],
  ["monday", "الإثنين"],
  ["tuesday", "الثلاثاء"],
  ["wednesday", "الأربعاء"],
  ["thursday", "الخميس"],
  ["friday", "الجمعة"],
  ["saturday", "السبت"],
];

function optionLabel(options, value, fallback = "غير مسجل") {
  return options.find((item) => item.value === value)?.label || value || fallback;
}

function statusLabel(value) {
  return { active: "نشط", inactive: "غير نشط", archived: "مؤرشف" }[value] || value || "غير مسجل";
}

export default function StudentProfile() {
  const { profile, halaqa, mosque, mainTeacher, refresh } = useStudentPortal();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(() => buildForm(profile));

  useEffect(() => {
    setForm(buildForm(profile));
  }, [profile]);

  const gradeOptions = useMemo(
    () => EDUCATION_GRADES[form.education_stage] || ["أخرى"],
    [form.education_stage]
  );

  function change(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      recitation_days: current.recitation_days.includes(day)
        ? current.recitation_days.filter((item) => item !== day)
        : [...current.recitation_days, day],
    }));
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("");

      const { error } = await supabase.rpc("update_my_student_profile", {
        p_full_name: form.full_name,
        p_phone: form.phone || null,
        p_birth_date: form.birth_date || null,
        p_nationality: form.nationality || null,
        p_residence_address: form.residence_address || null,
        p_gender: form.gender || null,
        p_education_stage: form.education_stage || null,
        p_education_grade: form.education_grade || null,
        p_guardian_name: form.guardian_name || null,
        p_guardian_relation: form.guardian_relation || null,
        p_learning_goal: form.learning_goal || null,
        p_program_type: form.program_type || null,
        p_recitation_mode: form.recitation_mode || null,
        p_recitation_days: form.recitation_days,
      });

      if (error) throw error;

      await refresh();
      setEditing(false);
      setMessage("تم حفظ معلوماتك بنجاح");
    } catch (error) {
      console.error("Student profile save:", error);
      setMessage(error?.message || "تعذر حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  }

  return (
    <StudentPage
      eyebrow="هويتي التعليمية"
      title="الملف الشخصي"
      description="بطاقتك في الصديق، ويمكنك تحديث معلوماتك المسموح بها بسهولة."
      icon={CircleUserRound}
      action={
        <button type="button" className="student-profile-edit-btn" onClick={() => setEditing(true)}>
          <Pencil size={16} /> تعديل الملف
        </button>
      }
    >
      {message && <div className="student-profile-message"><Check size={16} /> {message}</div>}

      <section className="student-profile-hero">
        <div className="student-profile-avatar">{(profile?.full_name || "ط").trim().charAt(0)}</div>
        <div className="student-profile-main">
          <span>طالب في الصديق</span>
          <h2>{profile?.full_name || "طالب"}</h2>
          <p>{halaqa?.name || "بدون حلقة"} • {mosque?.name || "بدون مسجد"} • {mainTeacher?.full_name || "المعلم غير محدد"}</p>
        </div>
        <div className="student-profile-number">
          <span>رقم الطالب</span>
          <strong>{profile?.user_number || "—"}</strong>
        </div>
      </section>

      <section className="student-grid student-grid-2">
        <InfoSection title="البيانات الأساسية" icon={UserRound} onEdit={() => setEditing(true)}>
          <InfoGrid>
            <Info label="الجوال" value={profile?.phone} />
            <Info label="تاريخ الميلاد" value={profile?.birth_date ? formatGregorianDate(profile.birth_date) : "غير مسجل"} />
            <Info label="الجنسية" value={profile?.nationality} />
            <Info label="العنوان" value={profile?.residence_address} />
            <Info label="الجنس" value={optionLabel(GENDERS, profile?.gender)} />
            <Info label="الحالة" value={statusLabel(profile?.status)} />
          </InfoGrid>
        </InfoSection>

        <InfoSection title="ولي الأمر" icon={ShieldCheck} onEdit={() => setEditing(true)}>
          <InfoGrid>
            <Info label="الاسم" value={profile?.guardian_name || profile?.parent_name} />
            <Info label="الجوال" value={profile?.guardian_phone || profile?.parent_phone} locked />
            <Info label="صلة القرابة" value={profile?.guardian_relation} />
          </InfoGrid>
        </InfoSection>

        <InfoSection title="التعليم" icon={GraduationCap} onEdit={() => setEditing(true)}>
          <InfoGrid>
            <Info label="المرحلة" value={optionLabel(EDUCATION_STAGES, profile?.education_stage || profile?.education_level)} />
            <Info label="الصف" value={profile?.education_grade} />
            <Info label="الهدف" value={optionLabel(GOALS, profile?.learning_goal)} />
            <Info label="البرنامج" value={optionLabel(PROGRAMS, profile?.program_type)} />
          </InfoGrid>
        </InfoSection>

        <InfoSection title="التسميع" icon={BookOpen} onEdit={() => setEditing(true)}>
          <InfoGrid>
            <Info label="الطريقة" value={optionLabel(RECITATION_MODES, profile?.recitation_mode)} />
            <Info label="الأيام" value={recitationDaysLabel(profile?.recitation_days)} />
            <Info label="الوقت المفضل" value={profile?.preferred_recitation_time} />
            <Info label="التسجيل" value={profile?.registration_date ? formatGregorianDate(profile.registration_date) : "—"} />
          </InfoGrid>
        </InfoSection>
      </section>

      {editing && (
        <div className="student-profile-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEditing(false)}>
          <section className="student-profile-modal">
            <header>
              <div>
                <span>تحديث ملف الطالب</span>
                <h2>عدّل معلوماتك</h2>
                <p>جوال ولي الأمر محمي ولا يمكن للطالب تغييره.</p>
              </div>
              <button type="button" onClick={() => setEditing(false)}><X size={18} /></button>
            </header>

            <div className="student-profile-form-scroll">
              <FormGroup title="البيانات الأساسية" icon={UserRound}>
                <Field label="الاسم الكامل"><input value={form.full_name} onChange={(e) => change("full_name", e.target.value)} /></Field>
                <Field label="الجوال"><input inputMode="tel" value={form.phone} onChange={(e) => change("phone", e.target.value)} /></Field>
                <Field label="تاريخ الميلاد"><CalendarInput  value={form.birth_date} onChange={(e) => change("birth_date", e.target.value)} /></Field>
                <Field label="الجنسية"><input value={form.nationality} onChange={(e) => change("nationality", e.target.value)} /></Field>
                <Field label="العنوان"><input value={form.residence_address} onChange={(e) => change("residence_address", e.target.value)} /></Field>
                <Field label="الجنس"><Select value={form.gender} onChange={(e) => change("gender", e.target.value)} options={GENDERS} /></Field>
              </FormGroup>

              <FormGroup title="ولي الأمر" icon={ShieldCheck}>
                <Field label="اسم ولي الأمر"><input value={form.guardian_name} onChange={(e) => change("guardian_name", e.target.value)} /></Field>
                <Field label="صلة القرابة"><select value={form.guardian_relation} onChange={(e) => change("guardian_relation", e.target.value)}><option value="">اختر</option>{RELATIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
                <Field label="جوال ولي الأمر">
                  <div className="student-profile-locked-input"><LockKeyhole size={15} /><span>{profile?.guardian_phone || profile?.parent_phone || "غير مسجل"}</span></div>
                </Field>
              </FormGroup>

              <FormGroup title="التعليم" icon={GraduationCap}>
                <Field label="المرحلة"><Select value={form.education_stage} onChange={(e) => { change("education_stage", e.target.value); change("education_grade", ""); }} options={EDUCATION_STAGES} /></Field>
                <Field label="الصف"><select value={form.education_grade} onChange={(e) => change("education_grade", e.target.value)}><option value="">اختر الصف</option>{gradeOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></Field>
                <Field label="الهدف التعليمي"><Select value={form.learning_goal} onChange={(e) => change("learning_goal", e.target.value)} options={GOALS} /></Field>
                <Field label="نوع البرنامج"><Select value={form.program_type} onChange={(e) => change("program_type", e.target.value)} options={PROGRAMS} /></Field>
              </FormGroup>

              <FormGroup title="التسميع" icon={BookOpen}>
                <Field label="طريقة التسميع"><Select value={form.recitation_mode} onChange={(e) => change("recitation_mode", e.target.value)} options={RECITATION_MODES} /></Field>
                <div className="student-profile-field student-profile-field-wide">
                  <label>أيام التسميع</label>
                  <div className="student-profile-days">
                    {RECITATION_DAYS.map(([value, label]) => (
                      <button type="button" key={value} className={form.recitation_days.includes(value) ? "active" : ""} onClick={() => toggleDay(value)}>{label}</button>
                    ))}
                  </div>
                </div>
              </FormGroup>
            </div>

            <footer>
              <button type="button" className="secondary" onClick={() => setEditing(false)}>إلغاء</button>
              <button type="button" className="primary" onClick={save} disabled={saving}><Save size={16} /> {saving ? "جارٍ الحفظ…" : "حفظ التعديلات"}</button>
            </footer>
          </section>
        </div>
      )}
    </StudentPage>
  );
}

function buildForm(profile) {
  return {
    full_name: profile?.full_name || "",
    phone: profile?.phone || "",
    birth_date: profile?.birth_date || "",
    nationality: profile?.nationality || "",
    residence_address: profile?.residence_address || "",
    gender: profile?.gender || "",
    education_stage: profile?.education_stage || "",
    education_grade: profile?.education_grade || "",
    guardian_name: profile?.guardian_name || profile?.parent_name || "",
    guardian_relation: profile?.guardian_relation || "",
    learning_goal: profile?.learning_goal || "quran",
    program_type: profile?.program_type || "",
    recitation_mode: profile?.recitation_mode || "regular",
    recitation_days: Array.isArray(profile?.recitation_days) ? profile.recitation_days : [],
  };
}

function InfoSection({ title, icon: Icon, onEdit, children }) {
  return (
    <section className="student-panel">
      <div className="student-panel-head">
        <div className="student-panel-title">
          <div className="student-panel-title-icon"><Icon size={19} /></div>
          <div><span>ملف الطالب</span><h3>{title}</h3></div>
        </div>
        <button type="button" className="student-section-edit" onClick={onEdit}><Pencil size={14} /> تعديل</button>
      </div>
      {children}
    </section>
  );
}
function InfoGrid({ children }) { return <div className="student-info-grid">{children}</div>; }
function Info({ label, value, locked }) { return <article className="student-info-card"><span>{label}{locked && <LockKeyhole size={11} />}</span><strong>{value || "غير مسجل"}</strong></article>; }
function FormGroup({ title, icon: Icon, children }) { return <section className="student-profile-form-group"><div className="student-profile-form-title"><Icon size={17} /><strong>{title}</strong></div><div className="student-profile-form-grid">{children}</div></section>; }
function Field({ label, children }) { return <label className="student-profile-field"><span>{label}</span>{children}</label>; }
function Select({ value, onChange, options }) { return <select value={value} onChange={onChange}><option value="">اختر</option>{options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>; }
