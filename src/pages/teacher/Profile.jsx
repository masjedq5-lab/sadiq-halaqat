import {displayDateFormatter} from "../../lib/calendar";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Activity, BookOpen, Building2, CalendarDays, Camera, CheckCircle2, Eye, EyeOff, GraduationCap, KeyRound, Loader2, LockKeyhole, LogOut, Mail, Phone, Save, ShieldCheck, Sparkles, UserRound, Users, X } from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  supabase,
} from "../../lib/supabase";

import {
  useToast,
} from "../../components/Toast";

import {
  useConfirm,
} from "../../context/ConfirmContext";

/* =========================================================
   Constants
========================================================= */

const ROLE_LABELS = {
  admin: "مدير النظام",
  supervisor: "المشرف",
  teacher: "المعلم",
  student: "الطالب",
};

const PERIOD_LABELS = {
  after_fajr: "بعد الفجر",
  after_dhuhr: "بعد الظهر",
  after_asr: "بعد العصر",
  after_maghrib: "بعد المغرب",
  after_isha: "بعد العشاء",
};

/* =========================================================
   Helpers
========================================================= */

function todayString() {
  const date = new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function daysAgoString(days) {
  const date = new Date();

  date.setDate(
    date.getDate() - days
  );

  return todayStringFromDate(date);
}

function todayStringFromDate(date) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatGregorianDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return "—";
  }
}


function cleanPhone(value) {
  return String(
    value || ""
  )
    .replace(/[^\d+]/g, "")
    .trim();
}

function getPasswordStrength(password) {
  const value =
    String(password || "");

  let score = 0;

  if (value.length >= 8) {
    score += 1;
  }

  if (value.length >= 12) {
    score += 1;
  }

  if (/[A-Za-z]/.test(value)) {
    score += 1;
  }

  if (/\d/.test(value)) {
    score += 1;
  }

  if (
    /[^A-Za-z0-9]/.test(value)
  ) {
    score += 1;
  }

  if (!value) {
    return {
      score: 0,
      label: "لم تكتب كلمة مرور",
      className: "empty",
    };
  }

  if (score <= 2) {
    return {
      score,
      label: "ضعيفة",
      className: "weak",
    };
  }

  if (score <= 3) {
    return {
      score,
      label: "جيدة",
      className: "good",
    };
  }

  return {
    score,
    label: "قوية",
    className: "strong",
  };
}

/* =========================================================
   Page
========================================================= */

export default function Profile() {
  const navigate =
    useNavigate();

  const {
    showToast,
  } =
    useToast();

  const {
    confirm,
  } =
    useConfirm();

  /* =====================================================
     Auth / Profile
  ===================================================== */

  const [
    user,
    setUser,
  ] =
    useState(null);

  const [
    profile,
    setProfile,
  ] =
    useState(null);

  /* =====================================================
     Editable fields
  ===================================================== */

  const [
    fullName,
    setFullName,
  ] =
    useState("");

  const [
    displayName,
    setDisplayName,
  ] =
    useState("");

  const [
    phone,
    setPhone,
  ] =
    useState("");

  const [
    avatarUrl,
    setAvatarUrl,
  ] =
    useState("");

  /* =====================================================
     Teacher context
  ===================================================== */

  const [
    teacherHalaqat,
    setTeacherHalaqat,
  ] =
    useState([]);

  const [
    stats,
    setStats,
  ] =
    useState({
      halaqat: 0,
      students: 0,
      recitations30: 0,
      attendanceRate30: 0,
    });

  /* =====================================================
     UI
  ===================================================== */

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    signingOut,
    setSigningOut,
  ] =
    useState(false);

  const [
    showPasswordModal,
    setShowPasswordModal,
  ] =
    useState(false);

  const [
    changingPassword,
    setChangingPassword,
  ] =
    useState(false);

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState("");

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] =
    useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(false);

  /* =====================================================
     Derived
  ===================================================== */

  const roleLabel =
    ROLE_LABELS[
      profile?.role
    ] ||
    "مستخدم النظام";

  const passwordStrength =
    useMemo(
      () =>
        getPasswordStrength(
          newPassword
        ),
      [newPassword]
    );

  const hasProfileChanges =
    useMemo(() => {
      if (!profile) {
        return false;
      }

      return (
        fullName.trim() !==
          String(
            profile.full_name ||
              ""
          ).trim() ||
        displayName.trim() !==
          String(
            profile.display_name ||
              ""
          ).trim() ||
        cleanPhone(phone) !==
          cleanPhone(
            profile.phone
          ) ||
        avatarUrl.trim() !==
          String(
            profile.avatar_url ||
              ""
          ).trim()
      );
    }, [
      profile,
      fullName,
      displayName,
      phone,
      avatarUrl,
    ]);

  /* =====================================================
     Start
  ===================================================== */

  useEffect(() => {
    loadProfile();
  }, []);

  /* =====================================================
     Load Profile
  ===================================================== */

  async function loadProfile() {
    setLoading(true);

    try {
      const {
        data: authData,
        error: authError,
      } =
        await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const authUser =
        authData?.user;

      if (!authUser) {
        navigate(
          "/login",
          {
            replace: true,
          }
        );

        return;
      }

      setUser(
        authUser
      );

      const {
        data: profileData,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(`
            id,
            role,
            user_number,
            full_name,
            phone,
            status,
            created_at,
            display_name,
            avatar_url,
            auth_user_id,
            login_type,
            gender,
            education_stage,
            education_grade,
            education_level,
            is_active
          `)
          .eq(
            "auth_user_id",
            authUser.id
          )
          .maybeSingle();

      if (
        profileError
      ) {
        throw profileError;
      }

      if (
        !profileData
      ) {
        showToast(
          "لم يتم العثور على ملف المستخدم المرتبط بهذا الحساب.",
          "error"
        );

        return;
      }

      setProfile(
        profileData
      );

      setFullName(
        profileData.full_name ||
          ""
      );

      setDisplayName(
        profileData.display_name ||
          ""
      );

      setPhone(
        profileData.phone ||
          ""
      );

      setAvatarUrl(
        profileData.avatar_url ||
          ""
      );

      if (
        profileData.role ===
        "teacher"
      ) {
        await loadTeacherContext(
          profileData.id
        );
      }

    } catch (error) {
      console.error(
        "PROFILE LOAD:",
        error
      );

      showToast(
        error.message ||
          "تعذر تحميل الملف الشخصي.",
        "error"
      );
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =====================================================
     Teacher Context
  ===================================================== */

  async function loadTeacherContext(
    teacherId
  ) {
    try {
      const {
        data: links,
        error: linksError,
      } =
        await supabase
          .from(
            "teacher_halaqat"
          )
          .select(`
            halaqa_id,
            role
          `)
          .eq(
            "teacher_id",
            teacherId
          );

      if (
        linksError
      ) {
        throw linksError;
      }

      const halaqaIds = [
        ...new Set(
          (
            links || []
          ).map(
            (item) =>
              Number(
                item.halaqa_id
              )
          )
        ),
      ];

      if (
        halaqaIds.length ===
        0
      ) {
        setTeacherHalaqat(
          []
        );

        setStats({
          halaqat: 0,
          students: 0,
          recitations30: 0,
          attendanceRate30: 0,
        });

        return;
      }

      const {
        data: halaqatRows,
        error: halaqatError,
      } =
        await supabase
          .from("halaqat")
          .select(`
            id,
            name,
            mosque_id,
            halaqa_period,
            status
          `)
          .in(
            "id",
            halaqaIds
          )
          .order(
            "name",
            {
              ascending:
                true,
            }
          );

      if (
        halaqatError
      ) {
        throw halaqatError;
      }

      const mosqueIds = [
        ...new Set(
          (
            halaqatRows ||
            []
          )
            .map(
              (item) =>
                item.mosque_id
            )
            .filter(Boolean)
            .map(Number)
        ),
      ];

      let mosqueRows =
        [];

      if (
        mosqueIds.length >
        0
      ) {
        const {
          data,
          error,
        } =
          await supabase
            .from("mosques")
            .select(`
              id,
              name
            `)
            .in(
              "id",
              mosqueIds
            );

        if (error) {
          throw error;
        }

        mosqueRows =
          data || [];
      }

      const mosqueMap =
        new Map(
          mosqueRows.map(
            (mosque) => [
              Number(
                mosque.id
              ),
              mosque.name,
            ]
          )
        );

      const roleMap =
        new Map(
          (
            links || []
          ).map(
            (link) => [
              Number(
                link.halaqa_id
              ),
              link.role,
            ]
          )
        );

      const preparedHalaqat =
        (
          halaqatRows ||
          []
        ).map(
          (halaqa) => ({
            ...halaqa,

            teacher_role:
              roleMap.get(
                Number(
                  halaqa.id
                )
              ) ||
              "main",

            mosque_name:
              mosqueMap.get(
                Number(
                  halaqa.mosque_id
                )
              ) ||
              "مسجد غير محدد",
          })
        );

      setTeacherHalaqat(
        preparedHalaqat
      );

      const since =
        daysAgoString(29);

      const today =
        todayString();

      const [
        studentLinksResult,
        recitationsResult,
        attendanceResult,
      ] =
        await Promise.all([
          supabase
            .from(
              "student_halaqat"
            )
            .select(`
              student_id,
              halaqa_id
            `)
            .in(
              "halaqa_id",
              halaqaIds
            )
            .eq(
              "is_current",
              true
            ),

          supabase
            .from(
              "recitations"
            )
            .select(
              "id",
              {
                count: "exact",
                head: true,
              }
            )
            .in(
              "halaqa_id",
              halaqaIds
            )
            .gte(
              "recitation_date",
              since
            )
            .lte(
              "recitation_date",
              today
            ),

          supabase
            .from(
              "attendance"
            )
            .select(`
              status
            `)
            .in(
              "halaqa_id",
              halaqaIds
            )
            .gte(
              "attendance_date",
              since
            )
            .lte(
              "attendance_date",
              today
            ),
        ]);

      if (
        studentLinksResult.error
      ) {
        throw studentLinksResult.error;
      }

      if (
        recitationsResult.error
      ) {
        console.error(
          "PROFILE RECITATIONS:",
          recitationsResult.error
        );
      }

      if (
        attendanceResult.error
      ) {
        console.error(
          "PROFILE ATTENDANCE:",
          attendanceResult.error
        );
      }

      const studentIds =
        [
          ...new Set(
            (
              studentLinksResult.data ||
              []
            ).map(
              (item) =>
                Number(
                  item.student_id
                )
            )
          ),
        ];

      const attendanceRows =
        attendanceResult.data ||
        [];

      const attended =
        attendanceRows.filter(
          (item) =>
            item.status ===
              "present" ||
            item.status ===
              "late"
        ).length;

      const attendanceBase =
        attendanceRows.filter(
          (item) =>
            [
              "present",
              "late",
              "absent",
            ].includes(
              item.status
            )
        ).length;

      setStats({
        halaqat:
          preparedHalaqat.length,

        students:
          studentIds.length,

        recitations30:
          recitationsResult.count ||
          0,

        attendanceRate30:
          attendanceBase > 0
            ? Math.round(
                (
                  attended /
                  attendanceBase
                ) *
                  100
              )
            : 0,
      });

    } catch (error) {
      console.error(
        "PROFILE CONTEXT:",
        error
      );

      showToast(
        "تم تحميل الملف، لكن تعذر تحميل بعض إحصائيات المعلم.",
        "info"
      );
    }
  }

  /* =====================================================
     Save Profile
  ===================================================== */

  async function saveProfile() {
    if (
      !profile?.id
    ) {
      return;
    }

    if (
      !fullName.trim()
    ) {
      showToast(
        "أدخل الاسم الكامل.",
        "error"
      );

      return;
    }

    const normalizedPhone =
      cleanPhone(phone);

    if (
      normalizedPhone &&
      normalizedPhone.length <
        9
    ) {
      showToast(
        "تحقق من رقم الجوال.",
        "error"
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        full_name:
          fullName.trim(),

        display_name:
          displayName.trim() ||
          null,

        phone:
          normalizedPhone ||
          null,

        avatar_url:
          avatarUrl.trim() ||
          null,
      };

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .update(
            payload
          )
          .eq(
            "id",
            profile.id
          )
          .select()
          .single();

      if (error) {
        throw error;
      }

      setProfile(
        data
      );

      setFullName(
        data.full_name ||
          ""
      );

      setDisplayName(
        data.display_name ||
          ""
      );

      setPhone(
        data.phone ||
          ""
      );

      setAvatarUrl(
        data.avatar_url ||
          ""
      );

      showToast(
        "تم حفظ بيانات الملف الشخصي بنجاح.",
        "success"
      );

    } catch (error) {
      console.error(
        "PROFILE SAVE:",
        error
      );

      showToast(
        error.message ||
          "تعذر حفظ التغييرات.",
        "error"
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* =====================================================
     Change Password

     1) Re-authenticate with the current password.
     2) Update the password in Supabase Auth.

     We do NOT use profiles.password_plain.
  ===================================================== */

  async function changePassword() {
    if (
      changingPassword
    ) {
      return;
    }

    if (
      !user?.email
    ) {
      showToast(
        "تعذر تغيير كلمة المرور لهذا الحساب من هذه الصفحة.",
        "error"
      );

      return;
    }

    if (
      !currentPassword
    ) {
      showToast(
        "أدخل كلمة المرور الحالية.",
        "error"
      );

      return;
    }

    if (
      newPassword.length < 8
    ) {
      showToast(
        "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.",
        "error"
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      showToast(
        "تأكيد كلمة المرور الجديدة غير مطابق.",
        "error"
      );

      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      showToast(
        "كلمة المرور الجديدة يجب أن تختلف عن الحالية.",
        "error"
      );

      return;
    }

    setChangingPassword(
      true
    );

    try {
      /*
        التحقق من كلمة المرور الحالية.
        هذه الخطوة تجعل التغيير من داخل
        الملف الشخصي أكثر أمانًا من مجرد
        updateUser بدون تحقق.
      */

      const {
        error:
          reauthError,
      } =
        await supabase.auth
          .signInWithPassword({
            email:
              user.email,

            password:
              currentPassword,
          });

      if (
        reauthError
      ) {
        showToast(
          "كلمة المرور الحالية غير صحيحة.",
          "error"
        );

        return;
      }

      const {
        error:
          updateError,
      } =
        await supabase.auth
          .updateUser({
            password:
              newPassword,
          });

      if (
        updateError
      ) {
        throw updateError;
      }

      showToast(
        "تم تغيير كلمة المرور بنجاح.",
        "success"
      );

      closePasswordModal();

    } catch (error) {
      console.error(
        "CHANGE PASSWORD:",
        error
      );

      showToast(
        error.message ||
          "تعذر تغيير كلمة المرور.",
        "error"
      );
    } finally {
      setChangingPassword(
        false
      );
    }
  }

  function closePasswordModal() {
    if (
      changingPassword
    ) {
      return;
    }

    setShowPasswordModal(
      false
    );

    setCurrentPassword(
      ""
    );

    setNewPassword(
      ""
    );

    setConfirmPassword(
      ""
    );

    setShowCurrentPassword(
      false
    );

    setShowNewPassword(
      false
    );
  }

  /* =====================================================
     Logout
  ===================================================== */

  async function handleLogout() {
    const confirmed =
      await confirm({
        title:
          "تسجيل الخروج",

        message:
          "هل أنت متأكد من تسجيل الخروج من حسابك؟",

        confirmText:
          "تسجيل الخروج",

        cancelText:
          "البقاء",

        type:
          "danger",
      });

    if (
      !confirmed
    ) {
      return;
    }

    setSigningOut(true);

    try {
      const {
        error,
      } =
        await supabase.auth
          .signOut();

      if (error) {
        throw error;
      }

      navigate(
        "/login",
        {
          replace: true,
        }
      );

    } catch (error) {
      console.error(
        "LOGOUT:",
        error
      );

      showToast(
        "تعذر تسجيل الخروج.",
        "error"
      );

      setSigningOut(
        false
      );
    }
  }

  /* =====================================================
     Loading
  ===================================================== */

  if (loading) {
    return (
      <div
        className="teacher-profile-page"
        dir="rtl"
      >
        <ProfileStyles />

        <div
          className="profile-page-loading"
        >
          <Loader2
            size={29}
            className="profile-spin"
          />

          <strong>
            جارٍ تجهيز ملفك الشخصي...
          </strong>
        </div>
      </div>
    );
  }

  /* =====================================================
     Render
  ===================================================== */

  return (
    <div
      className="teacher-profile-page"
      dir="rtl"
    >
      <ProfileStyles />

      {/* =================================================
          HERO
      ================================================= */}

      <section
        className="profile-hero"
      >
        <div
          className="profile-identity"
        >
          <div
            className="profile-avatar-wrap"
          >
            <div
              className="profile-avatar"
            >
              {avatarUrl ? (
                <img
                  src={
                    avatarUrl
                  }
                  alt="الصورة الشخصية"
                  onError={(
                    event
                  ) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              ) : (
                <UserRound
                  size={42}
                  strokeWidth={
                    1.5
                  }
                />
              )}
            </div>

            <div
              className="profile-camera"
              title="يتم تغيير الصورة من بيانات الحساب"
            >
              <Camera
                size={14}
              />
            </div>
          </div>

          <div
            className="profile-identity-text"
          >
            <div
              className="profile-eyebrow"
            >
              <Sparkles
                size={13}
              />

              ملف المستخدم
            </div>

            <div
              className="profile-name-row"
            >
              <h1>
                {profile?.display_name ||
                  profile?.full_name ||
                  roleLabel}
              </h1>

              <span
                className={
                  profile?.status ===
                  "active"
                    ? "profile-status active"
                    : "profile-status inactive"
                }
              >
                <CheckCircle2
                  size={13}
                />

                {profile?.status ===
                "active"
                  ? "حساب نشط"
                  : "حساب غير نشط"}
              </span>
            </div>

            <p>
              {roleLabel}
              {" • "}
              رقم المستخدم:
              {" "}
              {profile?.user_number ||
                "—"}
            </p>

            <div
              className="profile-meta"
            >
              <span>
                <Mail
                  size={13}
                />

                {user?.email ||
                  "لا يوجد بريد"}
              </span>

              <span>
                <Phone
                  size={13}
                />

                {profile?.phone ||
                  "لا يوجد جوال"}
              </span>
            </div>
          </div>
        </div>

        <div
          className="profile-hero-actions"
        >
          <button
            type="button"
            className="profile-security-btn"
            onClick={() =>
              setShowPasswordModal(
                true
              )
            }
          >
            <LockKeyhole
              size={16}
            />

            تغيير كلمة المرور
          </button>

          <button
            type="button"
            className="profile-logout-btn"
            onClick={
              handleLogout
            }
            disabled={
              signingOut
            }
          >
            {signingOut ? (
              <Loader2
                size={16}
                className="profile-spin"
              />
            ) : (
              <LogOut
                size={16}
              />
            )}

            تسجيل الخروج
          </button>
        </div>
      </section>

      {/* =================================================
          STATS
      ================================================= */}

      {profile?.role ===
        "teacher" && (
        <section
          className="profile-stats"
        >
          <ProfileStat
            icon={
              BookOpen
            }
            title="حلقاتي"
            value={
              stats.halaqat
            }
            subtitle="الحلقات المرتبطة بك"
            tone="green"
          />

          <ProfileStat
            icon={
              Users
            }
            title="طلابي"
            value={
              stats.students
            }
            subtitle="الطلاب الحاليون"
            tone="teal"
          />

          <ProfileStat
            icon={
              GraduationCap
            }
            title="التسميع"
            value={
              stats.recitations30
            }
            subtitle="خلال آخر 30 يومًا"
            tone="gold"
          />

          <ProfileStat
            icon={
              Activity
            }
            title="نسبة الحضور"
            value={`${stats.attendanceRate30}%`}
            subtitle="آخر 30 يومًا"
            tone="blue"
          />
        </section>
      )}

      {/* =================================================
          MAIN GRID
      ================================================= */}

      <div
        className="profile-main-grid"
      >
        {/* ===============================================
            EDIT CARD
        =============================================== */}

        <section
          className="profile-card profile-edit-card"
        >
          <CardHeading
            icon={
              UserRound
            }
            title="المعلومات الشخصية"
            description="حدّث البيانات التي تظهر داخل نظام الصديق."
          />

          <div
            className="profile-form-grid"
          >
            <ProfileField
              label="الاسم الكامل"
              value={
                fullName
              }
              onChange={
                setFullName
              }
              icon={
                UserRound
              }
              placeholder="الاسم الكامل"
              required
            />

            <ProfileField
              label="الاسم الظاهر"
              value={
                displayName
              }
              onChange={
                setDisplayName
              }
              icon={
                UserRound
              }
              placeholder="الاسم المختصر داخل النظام"
            />

            <ProfileField
              label="رقم الجوال"
              value={
                phone
              }
              onChange={
                setPhone
              }
              icon={
                Phone
              }
              placeholder="05xxxxxxxx"
              inputMode="tel"
            />

            <ProfileField
              label="البريد الإلكتروني"
              value={
                user?.email ||
                ""
              }
              icon={
                Mail
              }
              disabled
              help="البريد المستخدم لتسجيل الدخول."
            />
          </div>

          <div
            className="profile-avatar-field"
          >
            <ProfileField
              label="رابط الصورة الشخصية"
              value={
                avatarUrl
              }
              onChange={
                setAvatarUrl
              }
              icon={
                Camera
              }
              placeholder="https://..."
              help="ضع رابط الصورة الشخصية إذا رغبت في تحديثها."
            />
          </div>

          <div
            className="profile-save-row"
          >
            <div>
              {hasProfileChanges ? (
                <span
                  className="profile-change-hint changed"
                >
                  توجد تغييرات غير محفوظة
                </span>
              ) : (
                <span
                  className="profile-change-hint"
                >
                  جميع التغييرات محفوظة
                </span>
              )}
            </div>

            <button
              type="button"
              className="profile-save-btn"
              onClick={
                saveProfile
              }
              disabled={
                saving ||
                !hasProfileChanges
              }
            >
              {saving ? (
                <Loader2
                  size={16}
                  className="profile-spin"
                />
              ) : (
                <Save
                  size={16}
                />
              )}

              {saving
                ? "جارٍ الحفظ..."
                : "حفظ التغييرات"}
            </button>
          </div>
        </section>

        {/* ===============================================
            ACCOUNT CARD
        =============================================== */}

        <section
          className="profile-card"
        >
          <CardHeading
            icon={
              ShieldCheck
            }
            title="بيانات الحساب"
            description="معلومات النظام والصلاحية المرتبطة بحسابك."
          />

          <div
            className="account-info-list"
          >
            <AccountInfo
              icon={
                ShieldCheck
              }
              title="نوع الحساب"
              value={
                roleLabel
              }
            />

            <AccountInfo
              icon={
                KeyRound
              }
              title="رقم المستخدم"
              value={
                profile?.user_number ||
                "—"
              }
            />

            <AccountInfo
              icon={
                CalendarDays
              }
              title="تاريخ إنشاء الحساب"
              value={
                formatGregorianDate(
                  profile?.created_at
                )
              }

            />

            <AccountInfo
              icon={
                CheckCircle2
              }
              title="حالة الحساب"
              value={
                profile?.status ===
                "active"
                  ? "نشط"
                  : profile?.status ===
                    "archived"
                    ? "مؤرشف"
                    : "غير نشط"
              }
            />
          </div>
        </section>
      </div>

      {/* =================================================
          HALAQAT
      ================================================= */}

      {profile?.role ===
        "teacher" && (
        <section
          className="profile-card profile-halaqat-card"
        >
          <CardHeading
            icon={
              BookOpen
            }
            title="حلقاتي"
            description="الحلقات المرتبطة بحسابك حاليًا."
          />

          {teacherHalaqat.length ===
          0 ? (
            <div
              className="profile-empty"
            >
              لا توجد حلقات مرتبطة
              بهذا الحساب حاليًا.
            </div>
          ) : (
            <div
              className="profile-halaqat-grid"
            >
              {teacherHalaqat.map(
                (halaqa) => (
                  <div
                    className="profile-halaqa-item"
                    key={
                      halaqa.id
                    }
                  >
                    <div
                      className="halaqa-icon"
                    >
                      <BookOpen
                        size={18}
                      />
                    </div>

                    <div
                      className="halaqa-content"
                    >
                      <strong>
                        {
                          halaqa.name
                        }
                      </strong>

                      <span>
                        <Building2
                          size={12}
                        />

                        {
                          halaqa.mosque_name
                        }
                      </span>

                      <small>
                        {PERIOD_LABELS[
                          halaqa.halaqa_period
                        ] ||
                          "الفترة غير محددة"}

                        {" • "}

                        {halaqa.teacher_role ===
                        "main"
                          ? "معلم رئيسي"
                          : "معلم مساعد"}
                      </small>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      )}

      {/* =================================================
          SECURITY
      ================================================= */}

      <section
        className="profile-card profile-security-card"
      >
        <CardHeading
          icon={
            LockKeyhole
          }
          title="الأمان والحساب"
          description="تحكم بكلمة مرور حسابك وتسجيل الخروج."
        />

        <div
          className="security-actions"
        >
          <button
            type="button"
            className="security-action"
            onClick={() =>
              setShowPasswordModal(
                true
              )
            }
          >
            <div
              className="security-action-icon"
            >
              <LockKeyhole
                size={18}
              />
            </div>

            <div>
              <strong>
                تغيير كلمة المرور
              </strong>

              <span>
                تغيير مباشر وآمن بعد التحقق من كلمة المرور الحالية.
              </span>
            </div>
          </button>

          <button
            type="button"
            className="security-action danger"
            onClick={
              handleLogout
            }
            disabled={
              signingOut
            }
          >
            <div
              className="security-action-icon"
            >
              <LogOut
                size={18}
              />
            </div>

            <div>
              <strong>
                تسجيل الخروج
              </strong>

              <span>
                إنهاء جلسة الاستخدام الحالية والعودة لصفحة الدخول.
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* =================================================
          PASSWORD MODAL
      ================================================= */}

      {showPasswordModal && (
        <div
          className="password-overlay"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePasswordModal();
            }
          }}
        >
          <div
            className="password-modal"
          >
            <div
              className="password-modal-header"
            >
              <div>
                <div
                  className="password-modal-icon"
                >
                  <LockKeyhole
                    size={20}
                  />
                </div>

                <div>
                  <h2>
                    تغيير كلمة المرور
                  </h2>

                  <p>
                    سيتم التحقق من كلمة المرور الحالية قبل حفظ الجديدة.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  closePasswordModal
                }
                disabled={
                  changingPassword
                }
              >
                <X
                  size={17}
                />
              </button>
            </div>

            <div
              className="password-modal-body"
            >
              <PasswordField
                label="كلمة المرور الحالية"
                value={
                  currentPassword
                }
                onChange={
                  setCurrentPassword
                }
                visible={
                  showCurrentPassword
                }
                onToggle={() =>
                  setShowCurrentPassword(
                    (value) =>
                      !value
                  )
                }
                autoComplete="current-password"
              />

              <PasswordField
                label="كلمة المرور الجديدة"
                value={
                  newPassword
                }
                onChange={
                  setNewPassword
                }
                visible={
                  showNewPassword
                }
                onToggle={() =>
                  setShowNewPassword(
                    (value) =>
                      !value
                  )
                }
                autoComplete="new-password"
              />

              <div
                className="password-strength"
              >
                <div
                  className="password-strength-header"
                >
                  <span>
                    قوة كلمة المرور
                  </span>

                  <strong
                    className={
                      passwordStrength.className
                    }
                  >
                    {
                      passwordStrength.label
                    }
                  </strong>
                </div>

                <div
                  className="password-strength-bars"
                >
                  {[1, 2, 3, 4, 5].map(
                    (item) => (
                      <span
                        key={
                          item
                        }
                        className={
                          item <=
                          passwordStrength.score
                            ? `filled ${passwordStrength.className}`
                            : ""
                        }
                      />
                    )
                  )}
                </div>
              </div>

              <PasswordField
                label="تأكيد كلمة المرور الجديدة"
                value={
                  confirmPassword
                }
                onChange={
                  setConfirmPassword
                }
                visible={
                  showNewPassword
                }
                onToggle={() =>
                  setShowNewPassword(
                    (value) =>
                      !value
                  )
                }
                autoComplete="new-password"
              />

              {confirmPassword &&
                newPassword !==
                  confirmPassword && (
                  <div
                    className="password-warning"
                  >
                    كلمتا المرور غير متطابقتين.
                  </div>
                )}

              <div
                className="password-security-note"
              >
                <ShieldCheck
                  size={15}
                />

                <span>
                  لن تظهر كلمة المرور بعد حفظها.
                </span>
              </div>
            </div>

            <div
              className="password-modal-footer"
            >
              <button
                type="button"
                className="password-cancel"
                onClick={
                  closePasswordModal
                }
                disabled={
                  changingPassword
                }
              >
                إلغاء
              </button>

              <button
                type="button"
                className="password-submit"
                onClick={
                  changePassword
                }
                disabled={
                  changingPassword
                }
              >
                {changingPassword ? (
                  <Loader2
                    size={16}
                    className="profile-spin"
                  />
                ) : (
                  <KeyRound
                    size={16}
                  />
                )}

                {changingPassword
                  ? "جارٍ التغيير..."
                  : "تغيير كلمة المرور"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Profile Stat
========================================================= */

function ProfileStat({
  icon: Icon,
  title,
  value,
  subtitle,
  tone,
}) {
  return (
    <div
      className={
        `profile-stat ${tone}`
      }
    >
      <div
        className="profile-stat-icon"
      >
        <Icon
          size={19}
        />
      </div>

      <div>
        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        <small>
          {subtitle}
        </small>
      </div>
    </div>
  );
}

/* =========================================================
   Card Heading
========================================================= */

function CardHeading({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div
      className="profile-card-heading"
    >
      <div
        className="profile-card-heading-icon"
      >
        <Icon
          size={17}
        />
      </div>

      <div>
        <h2>
          {title}
        </h2>

        <p>
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   Profile Field
========================================================= */

function ProfileField({
  label,
  value,
  onChange,
  icon: Icon,
  placeholder,
  disabled,
  help,
  required,
  inputMode,
}) {
  return (
    <div
      className="profile-field"
    >
      <label>
        {label}

        {required && (
          <span>
            *
          </span>
        )}
      </label>

      <div
        className="profile-field-shell"
      >
        {Icon && (
          <Icon
            size={15}
          />
        )}

        <input
          value={
            value
          }
          onChange={(
            event
          ) =>
            onChange?.(
              event.target.value
            )
          }
          placeholder={
            placeholder
          }
          disabled={
            disabled
          }
          inputMode={
            inputMode
          }
        />
      </div>

      {help && (
        <small>
          {help}
        </small>
      )}
    </div>
  );
}

/* =========================================================
   Account Info
========================================================= */

function AccountInfo({
  icon: Icon,
  title,
  value,
  secondary,
}) {
  return (
    <div
      className="account-info"
    >
      <div
        className="account-info-icon"
      >
        <Icon
          size={17}
        />
      </div>

      <div>
        <span>
          {title}
        </span>

        <strong>
          {value}
        </strong>

        {secondary && (
          <small>
            {secondary}
          </small>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   Password Field
========================================================= */

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
}) {
  return (
    <div
      className="password-field"
    >
      <label>
        {label}
      </label>

      <div
        className="password-field-shell"
      >
        <LockKeyhole
          size={16}
        />

        <input
          type={
            visible
              ? "text"
              : "password"
          }
          value={
            value
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          autoComplete={
            autoComplete
          }
        />

        <button
          type="button"
          onClick={
            onToggle
          }
          aria-label={
            visible
              ? "إخفاء كلمة المرور"
              : "إظهار كلمة المرور"
          }
        >
          {visible ? (
            <EyeOff
              size={17}
            />
          ) : (
            <Eye
              size={17}
            />
          )}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   CSS
========================================================= */

function ProfileStyles() {
  return (
    <style>
      {`
        .teacher-profile-page {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          color: #0f172a;
        }

        .teacher-profile-page * {
          box-sizing: border-box;
        }

        .teacher-profile-page button,
        .teacher-profile-page input,
        .teacher-profile-page textarea,
        .teacher-profile-page select {
          font-family: inherit;
        }

        /* =============================================
           HERO
        ============================================= */

        .profile-hero {
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(18px * var(--app-density,1));

          padding: calc(22px * var(--app-density,1)) calc(24px * var(--app-density,1));
          margin-bottom: 14px;

          border: 1px solid color-mix(in srgb,var(--app-color-0f5132,#0f5132) 10%,transparent);
          border-radius: calc(23px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              135deg,
              #ffffff 0%,
              #f4faf6 62%,
              #fffaf0 100%
            );

          box-shadow:
            0 13px 37px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
        }

        .profile-hero::before {
          content: "";

          position: absolute;
          left: -145px;
          top: -170px;

          width: 280px;
          height: 280px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(201,162,39,.15),
              transparent 70%
            );

          pointer-events: none;
        }

        .profile-identity {
          position: relative;
          z-index: 2;

          min-width: 0;

          display: flex;
          align-items: center;

          gap: calc(14px * var(--app-density,1));
        }

        .profile-avatar-wrap {
          position: relative;
          flex: 0 0 auto;
        }

        .profile-avatar {
          width: 86px;
          height: 86px;

          overflow: hidden;

          border: 1px solid #dce8df;
          border-radius: calc(24px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);

          background:
            linear-gradient(
              145deg,
              #eaf3ed,
              #ffffff
            );

          box-shadow:
            0 10px 26px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 8%,transparent);
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-camera {
          position: absolute;
          left: -4px;
          bottom: -4px;

          width: 30px;
          height: 30px;

          border: 3px solid #fff;
          border-radius: calc(9px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #fff;
          background: var(--app-color-0f5132,#0f5132);
        }

        .profile-identity-text {
          min-width: 0;
        }

        .profile-eyebrow {
          display: flex;
          align-items: center;

          gap: calc(5px * var(--app-density,1));

          margin-bottom: 3px;

          color: #927536;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .profile-name-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;

          gap: calc(7px * var(--app-density,1));
        }

        .profile-name-row h1 {
          margin: 0;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(24px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .profile-status {
          min-height: 25px;

          padding: 0 calc(8px * var(--app-density,1));

          border-radius: 999px;

          display: inline-flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          font-size: calc(6px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .profile-status.active {
          color: #166534;
          background: #dcfce7;
        }

        .profile-status.inactive {
          color: #9f1239;
          background: #fff1f2;
        }

        .profile-identity-text > p {
          margin: 5px 0 0;

          color: #77827b;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        .profile-meta {
          display: flex;
          align-items: center;
          flex-wrap: wrap;

          gap: calc(9px * var(--app-density,1));

          margin-top: 7px;
        }

        .profile-meta span {
          display: inline-flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          color: #87928b;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .profile-hero-actions {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;
          flex-wrap: wrap;

          gap: calc(6px * var(--app-density,1));
        }

        .profile-security-btn,
        .profile-logout-btn {
          min-height: 40px;

          padding: 0 calc(11px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(5px * var(--app-density,1));

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .profile-security-btn {
          border: none;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .profile-logout-btn {
          border: 1px solid #efd9d6;

          color: #b42318;
          background: #fff9f8;
        }

        /* =============================================
           STATS
        ============================================= */

        .profile-stats {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0,1fr)
            );

          gap: calc(9px * var(--app-density,1));

          margin-bottom: 14px;
        }

        .profile-stat {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          padding: calc(12px * var(--app-density,1));

          border: 1px solid #e5ebe7;
          border-radius: calc(16px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 6px 20px
            rgba(15,23,42,.025);
        }

        .profile-stat-icon {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .profile-stat.green .profile-stat-icon {
          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .profile-stat.teal .profile-stat-icon {
          color: var(--app-color-0f766e,#0f766e);
          background: var(--app-color-edf8f7,#edf8f7);
        }

        .profile-stat.gold .profile-stat-icon {
          color: #927536;
          background: #fff8e7;
        }

        .profile-stat.blue .profile-stat-icon {
          color: #1d4ed8;
          background: #eff6ff;
        }

        .profile-stat span {
          display: block;

          color: #7f8a83;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .profile-stat strong {
          display: block;

          margin-top: 1px;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(18px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .profile-stat small {
          display: block;

          margin-top: 1px;

          color: #9ba39e;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        /* =============================================
           MAIN
        ============================================= */

        .profile-main-grid {
          display: grid;

          grid-template-columns:
            minmax(0,1.5fr)
            minmax(280px,.7fr);

          gap: calc(12px * var(--app-density,1));

          margin-bottom: 12px;
        }

        .profile-card {
          padding: calc(16px * var(--app-density,1));

          border: 1px solid #e4eae6;
          border-radius: calc(19px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 7px 24px
            rgba(15,23,42,.03);
        }

        .profile-card-heading {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          margin-bottom: 14px;
        }

        .profile-card-heading-icon {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .profile-card-heading h2 {
          margin: 0;

          color: #2f4036;

          font-size: calc(12px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .profile-card-heading p {
          margin: 2px 0 0;

          color: #919a94;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        /* =============================================
           FORM
        ============================================= */

        .profile-form-grid {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );

          gap: calc(9px * var(--app-density,1));
        }

        .profile-avatar-field {
          margin-top: 9px;
        }

        .profile-field label {
          display: block;

          margin-bottom: 4px;

          color: #66736b;

          font-size: calc(6px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .profile-field label span {
          color: #b42318;
        }

        .profile-field-shell {
          position: relative;
        }

        .profile-field-shell > svg {
          position: absolute;
          right: 10px;
          top: 50%;

          transform: translateY(-50%);

          color: #89938c;
        }

        .profile-field-shell input {
          width: 100%;
          height: 39px;

          padding:
            0 calc(34px * var(--app-density,1)) 0 calc(9px * var(--app-density,1));

          border: 1px solid #dce4df;
          border-radius: calc(10px * var(--app-radius-scale,1));

          outline: none;

          color: #33443a;
          background: #fbfdfc;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        .profile-field-shell input:focus {
          border-color: #9fc5ae;

          box-shadow:
            0 0 0 3px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
        }

        .profile-field-shell input:disabled {
          color: #859089;
          background: #f1f4f2;
          cursor: not-allowed;
        }

        .profile-field > small {
          display: block;

          margin-top: 3px;

          color: #9aa29d;

          font-size: calc(5.7px * var(--app-font-scale,1));
          line-height: 1.5;
        }

        .profile-save-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));

          margin-top: 13px;
          padding-top: calc(12px * var(--app-density,1));

          border-top: 1px solid #edf1ee;
        }

        .profile-change-hint {
          color: #8b958f;
          font-size: calc(6px * var(--app-font-scale,1));
        }

        .profile-change-hint.changed {
          color: #9a741f;
          font-weight: 850;
        }

        .profile-save-btn {
          min-height: 38px;

          padding: 0 calc(13px * var(--app-density,1));

          border: none;
          border-radius: calc(9px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(5px * var(--app-density,1));

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .profile-save-btn:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* =============================================
           ACCOUNT
        ============================================= */

        .account-info-list {
          display: grid;
          gap: calc(7px * var(--app-density,1));
        }

        .account-info {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          padding: calc(9px * var(--app-density,1));

          border: 1px solid #e8edea;
          border-radius: calc(11px * var(--app-radius-scale,1));

          background: #fbfdfc;
        }

        .account-info-icon {
          width: 33px;
          height: 33px;

          flex: 0 0 33px;

          border-radius: calc(9px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .account-info span {
          display: block;

          color: #8b958f;

          font-size: calc(5.7px * var(--app-font-scale,1));
        }

        .account-info strong {
          display: block;

          margin-top: 1px;

          color: #3d4b42;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .account-info small {
          display: block;

          margin-top: 2px;

          color: #927536;

          font-size: calc(5.5px * var(--app-font-scale,1));
        }

        /* =============================================
           HALAQAT
        ============================================= */

        .profile-halaqat-card {
          margin-bottom: 12px;
        }

        .profile-halaqat-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                min(100%,250px),
                1fr
              )
            );

          gap: calc(8px * var(--app-density,1));
        }

        .profile-halaqa-item {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          padding: calc(10px * var(--app-density,1));

          border: 1px solid #e6ece8;
          border-radius: calc(12px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              135deg,
              #fbfdfc,
              #fffdf8
            );
        }

        .halaqa-icon {
          width: 37px;
          height: 37px;

          flex: 0 0 37px;

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .halaqa-content {
          min-width: 0;
        }

        .halaqa-content strong {
          display: block;

          overflow: hidden;

          color: #33443a;

          font-size: calc(8px * var(--app-font-scale,1));

          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .halaqa-content span {
          display: flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));

          margin-top: 2px;

          color: #818c85;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .halaqa-content small {
          display: block;

          margin-top: 2px;

          color: #9a7b30;

          font-size: calc(5.7px * var(--app-font-scale,1));
        }

        .profile-empty {
          padding: calc(25px * var(--app-density,1));

          border: 1px dashed #d5ddd8;
          border-radius: calc(12px * var(--app-radius-scale,1));

          text-align: center;

          color: #8a958e;
          background: #fbfdfc;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        /* =============================================
           SECURITY CARD
        ============================================= */

        .profile-security-card {
          margin-bottom: 20px;
        }

        .security-actions {
          display: grid;

          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );

          gap: calc(8px * var(--app-density,1));
        }

        .security-action {
          min-height: 67px;

          padding: calc(10px * var(--app-density,1));

          border: 1px solid #dfe7e2;
          border-radius: calc(12px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;

          gap: calc(9px * var(--app-density,1));

          text-align: right;

          color: var(--app-color-0f5132,#0f5132);
          background: #fbfdfc;

          cursor: pointer;
        }

        .security-action.danger {
          border-color: #efd9d6;

          color: #b42318;
          background: #fff9f8;
        }

        .security-action-icon {
          width: 37px;
          height: 37px;

          flex: 0 0 37px;

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          background: color-mix(in srgb,var(--app-color-0f5132,#0f5132) 6%,transparent);
        }

        .security-action.danger
        .security-action-icon {
          background: rgba(180,35,24,.06);
        }

        .security-action strong {
          display: block;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        .security-action span {
          display: block;

          margin-top: 2px;

          color: #89948d;

          font-size: calc(6px * var(--app-font-scale,1));
          line-height: 1.5;
        }

        /* =============================================
           PASSWORD MODAL
        ============================================= */

        .password-overlay {
          position: fixed;
          inset: 0;

          z-index: 8000;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: calc(16px * var(--app-density,1));

          background: rgba(15,23,42,.58);

          backdrop-filter: blur(5px);
        }

        .password-modal {
          width: min(520px,100%);

          overflow: hidden;

          border-radius: calc(21px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 30px 90px
            rgba(15,23,42,.28);
        }

        .password-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: calc(10px * var(--app-density,1));

          padding: calc(15px * var(--app-density,1)) calc(16px * var(--app-density,1));

          border-bottom: 1px solid #e8edea;
        }

        .password-modal-header
        > div:first-child {
          display: flex;
          align-items: flex-start;

          gap: calc(9px * var(--app-density,1));
        }

        .password-modal-icon {
          width: 39px;
          height: 39px;

          flex: 0 0 39px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .password-modal-header h2 {
          margin: 0;

          color: #2f4036;

          font-size: calc(13px * var(--app-font-scale,1));
        }

        .password-modal-header p {
          margin: 3px 0 0;

          color: #8c9690;

          font-size: calc(6px * var(--app-font-scale,1));
          line-height: 1.5;
        }

        .password-modal-header
        > button {
          width: 34px;
          height: 34px;

          border: none;
          border-radius: calc(9px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #64748b;
          background: #f1f5f3;

          cursor: pointer;
        }

        .password-modal-body {
          padding: calc(15px * var(--app-density,1));
        }

        .password-field {
          margin-bottom: 10px;
        }

        .password-field label {
          display: block;

          margin-bottom: 4px;

          color: #66736b;

          font-size: calc(6px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .password-field-shell {
          position: relative;
        }

        .password-field-shell
        > svg {
          position: absolute;
          right: 10px;
          top: 50%;

          transform: translateY(-50%);

          color: #87928b;
        }

        .password-field-shell input {
          width: 100%;
          height: 40px;

          padding:
            0 calc(35px * var(--app-density,1)) 0 calc(40px * var(--app-density,1));

          border: 1px solid #dce4df;
          border-radius: calc(10px * var(--app-radius-scale,1));

          outline: none;

          color: #33443a;
          background: #fbfdfc;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        .password-field-shell button {
          position: absolute;
          left: 5px;
          top: 50%;

          width: 30px;
          height: 30px;

          transform: translateY(-50%);

          border: none;
          border-radius: calc(8px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #7b8780;
          background: transparent;

          cursor: pointer;
        }

        .password-strength {
          margin: -2px 0 10px;
        }

        .password-strength-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));

          margin-bottom: 5px;

          font-size: calc(5.7px * var(--app-font-scale,1));
        }

        .password-strength-header
        span {
          color: #8b958f;
        }

        .password-strength-header
        strong.weak {
          color: #b42318;
        }

        .password-strength-header
        strong.good {
          color: #a06e12;
        }

        .password-strength-header
        strong.strong {
          color: #166534;
        }

        .password-strength-bars {
          display: grid;

          grid-template-columns:
            repeat(5,1fr);

          gap: calc(4px * var(--app-density,1));
        }

        .password-strength-bars span {
          height: 4px;

          border-radius: 999px;

          background: #e8edea;
        }

        .password-strength-bars
        span.filled.weak {
          background: #dc665d;
        }

        .password-strength-bars
        span.filled.good {
          background: #d5ad52;
        }

        .password-strength-bars
        span.filled.strong {
          background: #16a36d;
        }

        .password-warning {
          margin-top: -2px;
          margin-bottom: 9px;

          color: #b42318;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .password-security-note {
          display: flex;
          align-items: flex-start;

          gap: calc(5px * var(--app-density,1));

          padding: calc(8px * var(--app-density,1));

          border: 1px solid #dcebe3;
          border-radius: calc(9px * var(--app-radius-scale,1));

          color: #37624c;
          background: #f4faf6;

          font-size: calc(6px * var(--app-font-scale,1));
          line-height: 1.5;
        }

        .password-modal-footer {
          display: flex;
          justify-content: flex-end;

          gap: calc(6px * var(--app-density,1));

          padding: calc(11px * var(--app-density,1)) calc(15px * var(--app-density,1));

          border-top: 1px solid #e8edea;

          background: #fbfdfc;
        }

        .password-modal-footer
        button {
          min-height: 37px;

          padding: 0 calc(12px * var(--app-density,1));

          border-radius: calc(9px * var(--app-radius-scale,1));

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .password-cancel {
          border: 1px solid #dce3df;

          color: #657169;
          background: #fff;
        }

        .password-submit {
          border: none;

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(5px * var(--app-density,1));

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .password-modal-footer
        button:disabled {
          opacity: .5;
          cursor: wait;
        }

        /* =============================================
           LOADING
        ============================================= */

        .profile-page-loading {
          min-height: 60vh;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          gap: calc(8px * var(--app-density,1));

          color: #718077;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        @keyframes profileSpin {
          to {
            transform: rotate(360deg);
          }
        }

        .profile-spin {
          animation:
            profileSpin
            .8s linear infinite;
        }

        /* =============================================
           TABLET
        ============================================= */

        @media (
          max-width: 1000px
        ) {
          .profile-stats {
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );
          }

          .profile-main-grid {
            grid-template-columns:
              1fr;
          }
        }

        /* =============================================
           MOBILE
        ============================================= */

        @media (
          max-width: 680px
        ) {
          .profile-hero {
            align-items: flex-start;

            padding: calc(15px * var(--app-density,1));
          }

          .profile-avatar {
            width: 67px;
            height: 67px;

            border-radius: calc(19px * var(--app-radius-scale,1));
          }

          .profile-camera {
            width: 26px;
            height: 26px;
          }

          .profile-name-row h1 {
            font-size: calc(18px * var(--app-font-scale,1));
          }

          .profile-meta {
            align-items: flex-start;
            flex-direction: column;

            gap: calc(4px * var(--app-density,1));
          }

          .profile-hero-actions {
            gap: calc(4px * var(--app-density,1));
          }

          .profile-security-btn,
          .profile-logout-btn {
            width: 38px;
            min-height: 38px;

            padding: 0;

            font-size: 0;
          }

          .profile-form-grid {
            grid-template-columns:
              1fr;
          }

          .security-actions {
            grid-template-columns:
              1fr;
          }

          .profile-save-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .profile-save-btn {
            width: 100%;
          }

          .password-overlay {
            align-items: flex-end;

            padding: calc(7px * var(--app-density,1));
          }

          .password-modal {
            border-radius:
              calc(20px * var(--app-radius-scale,1)) calc(20px * var(--app-radius-scale,1))
              calc(8px * var(--app-radius-scale,1)) calc(8px * var(--app-radius-scale,1));
          }
        }

        @media (
          max-width: 430px
        ) {
          .profile-stats {
            grid-template-columns:
              1fr 1fr;
          }

          .profile-stat strong {
            font-size: calc(15px * var(--app-font-scale,1));
          }

          .profile-identity {
            align-items: flex-start;
          }
        }
      `}
    </style>
  );
}
