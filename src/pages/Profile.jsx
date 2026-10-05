import {calendarLocale} from "../lib/calendar";
import Ornament from '../components/ornaments/Ornament';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

import { UserRound, Mail, Phone, ShieldCheck, CalendarDays, Building2, BookOpen, GraduationCap, Users, Camera, Save, LockKeyhole, Eye, EyeOff, X, CheckCircle2, RefreshCw } from "lucide-react";

import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import FormField from "../components/FormField";
import LoadingState from "../components/LoadingState";
import { useToast } from "../components/Toast";

export default function Profile() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");

  const [avatarUrl, setAvatarUrl] = useState("");
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [stats, setStats] = useState({
    mosques: 0,
    halaqat: 0,
    teachers: 0,
    students: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  

  async function loadProfile() {
    setLoading(true);

    try {
      const {
        data: authData,
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const authUser = authData?.user;

      if (!authUser) {
        navigate("/login", {
          replace: true,
        });
        return;
      }

      setUser(authUser);

      const {
        data: profileData,
        error: profileError,
      } = await supabase
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
          auth_user_id
        `)
        .eq(
          "auth_user_id",
          authUser.id
        )
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profileData) {
        showToast(
          "لم يتم العثور على ملف الحساب.",
          "error"
        );
        return;
      }

      setProfile(profileData);

      setFullName(
        profileData.full_name || ""
      );

      setDisplayName(
        profileData.display_name || ""
      );

      setPhone(
        profileData.phone || ""
      );

      setAvatarUrl(
        profileData.avatar_url || ""
      );

      await loadStats();
    } catch (error) {
      console.error(error);

      showToast(
        "تعذر تحميل بيانات الملف الشخصي.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
      loadProfile();
    }, []);

  async function loadStats() {
    const [
      mosquesResult,
      halaqatResult,
      teachersResult,
      studentsResult,
    ] = await Promise.all([
      supabase
        .from("mosques")
        .select("id", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("halaqat")
        .select("id", {
          count: "exact",
          head: true,
        }),

      supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "teacher"),

      supabase
        .from("profiles")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("role", "student"),
    ]);

    if (mosquesResult.error) {
      console.error(
        "mosques:",
        mosquesResult.error
      );
    }

    if (halaqatResult.error) {
      console.error(
        "halaqat:",
        halaqatResult.error
      );
    }

    if (teachersResult.error) {
      console.error(
        "teachers:",
        teachersResult.error
      );
    }

    if (studentsResult.error) {
      console.error(
        "students:",
        studentsResult.error
      );
    }

    setStats({
      mosques:
        mosquesResult.count || 0,

      halaqat:
        halaqatResult.count || 0,

      teachers:
        teachersResult.count || 0,

      students:
        studentsResult.count || 0,
    });
  }

  async function saveProfile() {
    if (!fullName.trim()) {
      showToast(
        "أدخل الاسم الكامل.",
        "error"
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data,
        error,
      } = await supabase
        .from("profiles")
        .update({
          full_name:
            fullName.trim(),

          display_name:
            displayName.trim() ||
            null,

          phone:
            phone.trim() ||
            null,

          avatar_url:
            avatarUrl.trim() ||
            null,
        })
        .eq(
          "id",
          profile.id
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      setProfile(data);

      showToast(
        "تم حفظ بيانات الملف الشخصي بنجاح.",
        "success"
      );
    } catch (error) {
      console.error(error);

      showToast(
        "تعذر حفظ التغييرات.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (newPassword.length < 8) {
      showToast("كلمة المرور يجب ألا تقل عن 8 أحرف.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("تأكيد كلمة المرور غير مطابق.", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setPasswordOpen(false);
      showToast("تم تغيير كلمة المرور بنجاح.", "success");
    } catch (error) {
      console.error(error);
      showToast("تعذر تغيير كلمة المرور. حاول مرة أخرى.", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  function formatDate(date) {
    if (!date) {
      return "-";
    }

    try {
      return new Date(
        date
      ).toLocaleDateString(calendarLocale(),
        {
          year: "numeric",
          month: "long",
          day: "numeric",
        }
      );
    } catch {
      return "-";
    }
  }

  if (loading) {
    return (
      <LoadingState
        message="جاري تحميل الملف الشخصي..."
        minHeight="400px"
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      <PageHeader
        icon={UserRound}
        title="الملف الشخصي"
        description="هويتك الإدارية وبيانات حسابك وأمانه في مكان واحد"
      />

      {/* =====================================
          بطاقة الهوية
      ===================================== */}

      <section
        style={{
          background: "linear-gradient(118deg,#063d33 0%,var(--app-color-075544,#075544) 62%,#08483c 100%)",
          border: "1px solid rgba(190,151,54,.38)",
          borderRadius: "calc(24px * var(--app-radius-scale,1))",
          padding: "calc(28px * var(--app-density,1))",
          marginBottom: "18px",
          boxShadow: "0 18px 44px rgba(10,65,52,.12)",
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "calc(18px * var(--app-density,1))",
            flexWrap: "wrap",
          }}
        >
          {/* الصورة */}

          <div
            style={{
              position: "relative",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "92px",
                height: "92px",
                borderRadius: "calc(26px * var(--app-radius-scale,1))",
                overflow: "hidden",
                background: "rgba(255,255,255,.10)",
                border: "1px solid rgba(232,205,126,.38)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ead078",
              }}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="صورة الحساب"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit:
                      "cover",
                  }}
                />
              ) : (
                <UserRound
                  size={42}
                  strokeWidth={1.5}
                />
              )}
            </div>

            <div
              style={{
                position: "absolute",
                left: "-5px",
                bottom: "-5px",
                width: "30px",
                height: "30px",
                borderRadius: "calc(9px * var(--app-radius-scale,1))",
                background: "#b38a2e",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border:
                  "3px solid #fff",
              }}
            >
              <Camera size={14} />
            </div>
          </div>

          {/* المعلومات */}

          <div
            style={{
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "calc(8px * var(--app-density,1))",
                flexWrap: "wrap",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color: "#fff",
                  fontSize: "calc(25px * var(--app-font-scale,1))",
                  fontWeight: "800",
                }}
              >
                {profile?.full_name ||
                  "المشرف"}
              </h2>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "calc(5px * var(--app-density,1))",
                  padding:
                    "calc(5px * var(--app-density,1)) calc(9px * var(--app-density,1))",
                  borderRadius: "calc(20px * var(--app-radius-scale,1))",
                  background: "rgba(235,210,129,.13)",
                  color: "#ecd27d",
                  fontSize: "calc(10px * var(--app-font-scale,1))",
                  fontWeight: "800",
                }}
              >
                <CheckCircle2
                  size={13}
                />

                {profile?.status ===
                "active"
                  ? "نشط"
                  : "غير نشط"}
              </span>
            </div>

            <div
              style={{
                marginTop: "6px",
                color: "rgba(255,255,255,.68)",
                fontSize: "calc(13px * var(--app-font-scale,1))",
              }}
            >
              مشرف نظام الصديق
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "calc(6px * var(--app-density,1))",
                marginTop: "9px",
                color: "rgba(255,255,255,.58)",
                fontSize: "calc(11px * var(--app-font-scale,1))",
              }}
            >
              <ShieldCheck
                size={15}
                color="#e0bd63"
              />

              رقم المستخدم:
              {" "}
              {profile?.user_number ||
                "-"}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          الإحصائيات
      ===================================== */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(190px,1fr))",
          gap: "calc(14px * var(--app-density,1))",
          marginBottom: "20px",
        }}
      >
        <StatCard
          icon={Building2}
          title="المساجد"
          value={stats.mosques}
        />

        <StatCard
          icon={BookOpen}
          title="الحلقات"
          value={stats.halaqat}
        />

        <StatCard
          icon={GraduationCap}
          title="المعلمون"
          value={stats.teachers}
        />

        <StatCard
          icon={Users}
          title="الطلاب"
          value={stats.students}
        />
      </section>

      {/* =====================================
          المعلومات الشخصية
      ===================================== */}

      <section
        style={{
          background: "#fff",
          border:
            "1px solid #e4e9e5",
          borderRadius: "calc(20px * var(--app-radius-scale,1))",
          padding: "calc(24px * var(--app-density,1))",
          marginBottom: "20px",
          boxShadow:
            "0 4px 18px rgba(0,0,0,0.035)",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "var(--app-color-173d2b,#173d2b)",
              fontSize: "calc(19px * var(--app-font-scale,1))",
              fontWeight: "800",
            }}
          >
            معلومات الحساب
          </h2>

          <p
            style={{
              margin:
                "5px 0 0",
              color: "#8a928d",
              fontSize: "calc(11px * var(--app-font-scale,1))",
            }}
          >
            يمكنك تحديث بياناتك الشخصية من هنا.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(230px,1fr))",
            gap: "calc(16px * var(--app-density,1))",
          }}
        >
          <FormField
            label="الاسم الكامل"
            value={fullName}
            onChange={setFullName}
            placeholder="أدخل الاسم الكامل"
            required
            icon={UserRound}
          />

          <FormField
            label="الاسم الظاهر"
            value={displayName}
            onChange={setDisplayName}
            placeholder="الاسم الذي يظهر داخل النظام"
            icon={UserRound}
          />

          <FormField
            label="رقم الجوال"
            value={phone}
            onChange={setPhone}
            placeholder="05xxxxxxxx"
            icon={Phone}
          />

          <FormField
            label="البريد الإلكتروني"
            value={user?.email || ""}
            onChange={() => {}}
            disabled
            icon={Mail}
          />
        </div>

        <div
          style={{
            marginTop: "16px",
          }}
        >
          <FormField
            label="رابط الصورة الشخصية"
            value={avatarUrl}
            onChange={setAvatarUrl}
            placeholder="https://..."
            icon={Camera}
          />
        </div>

        <button
          type="button"
          onClick={saveProfile}
          disabled={saving}
          style={{
            marginTop: "18px",
            minHeight: "46px",
            padding:
              "0 calc(20px * var(--app-density,1))",
            border: "none",
            borderRadius: "calc(11px * var(--app-radius-scale,1))",
            background:
              saving
                ? "#6f8d7e"
                : "var(--app-color-0f5132,#0f5132)",
            color: "#fff",
            cursor:
              saving
                ? "wait"
                : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "calc(8px * var(--app-density,1))",
            fontSize: "calc(13px * var(--app-font-scale,1))",
            fontWeight: "800",
          }}
        >
          {saving ? (
            <>
              <RefreshCw
                size={17}
                style={{
                  animation:
                    "profileSpin .8s linear infinite",
                }}
              />

              جارٍ الحفظ...
            </>
          ) : (
            <>
              <Save size={17} />

              حفظ التغييرات
            </>
          )}
        </button>
      </section>

      {/* =====================================
          معلومات النظام
      ===================================== */}

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(230px,1fr))",
          gap: "calc(14px * var(--app-density,1))",
          marginBottom: "20px",
        }}
      >
        <InfoCard
          icon={Mail}
          title="البريد الإلكتروني"
          value={
            user?.email || "-"
          }
        />

        <InfoCard
          icon={CalendarDays}
          title="تاريخ إنشاء الحساب"
          value={formatDate(
            profile?.created_at
          )}
        />

        <InfoCard
          icon={ShieldCheck}
          title="نوع الحساب"
          value="مشرف النظام"
        />
      </section>

      {/* =====================================
          الأمان
      ===================================== */}

      <section
        style={{
          background: "#fff",
          border:
            "1px solid #e4e9e5",
          borderRadius: "calc(20px * var(--app-radius-scale,1))",
          padding: "calc(24px * var(--app-density,1))",
          marginBottom: "20px",
          boxShadow:
            "0 4px 18px rgba(0,0,0,0.035)",
        }}
      >
        <div
          style={{
            marginBottom: "18px",
          }}
        >
          <h2
            style={{
              margin: 0,
              color: "var(--app-color-173d2b,#173d2b)",
              fontSize: "calc(19px * var(--app-font-scale,1))",
              fontWeight: "800",
            }}
          >
            الأمان والحساب
          </h2>

          <p
            style={{
              margin:
                "5px 0 0",
              color: "#8a928d",
              fontSize: "calc(11px * var(--app-font-scale,1))",
            }}
          >
            تحديث كلمة المرور مباشرة وبشكل آمن عبر حسابك.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPasswordOpen(true)}
          style={{
            width: "100%",
            minHeight: "76px",
            border: "1px solid #dce6e1",
            borderRadius: "calc(16px * var(--app-radius-scale,1))",
            background: "linear-gradient(110deg,#f7fbf9,#fff)",
            color: "var(--app-color-0b5d4b,#0b5d4b)",
            cursor: "pointer",
            padding: "calc(14px * var(--app-density,1)) calc(16px * var(--app-density,1))",
            display: "flex",
            alignItems: "center",
            gap: "calc(13px * var(--app-density,1))",
            textAlign: "right",
          }}
        >
          <span style={{
            width:"44px",height:"44px",display:"grid",placeItems:"center",
            borderRadius:"calc(13px * var(--app-radius-scale,1))",background:"#eaf4ef",flexShrink:0
          }}><LockKeyhole size={20}/></span>
          <span style={{flex:1}}>
            <strong style={{display:"block",fontSize:"calc(13px * var(--app-font-scale,1))"}}>تغيير كلمة المرور</strong>
            <small style={{display:"block",marginTop:"4px",color:"#84918a",fontSize:"calc(10px * var(--app-font-scale,1))"}}>
              تعيين كلمة مرور جديدة مباشرة لحسابك
            </small>
          </span>
          <ShieldCheck size={19} color="#b08a31"/>
        </button>
      </section>


      {passwordOpen && (
        <div className="profile-password-backdrop" onMouseDown={(e)=>{if(e.target===e.currentTarget&&!changingPassword)setPasswordOpen(false)}}>
          <div className="profile-password-modal" role="dialog" aria-modal="true">
            <Ornament name="01-noor" className="profile-modal-ornament" />
            <div className="profile-password-head">
              <span className="profile-password-icon"><LockKeyhole size={22}/></span>
              <div>
                <span>أمان الحساب</span>
                <h3>تغيير كلمة المرور</h3>
                <p>اختر كلمة مرور قوية لا تقل عن 8 أحرف.</p>
              </div>
              <button type="button" className="profile-modal-close" onClick={()=>setPasswordOpen(false)} disabled={changingPassword}><X size={18}/></button>
            </div>

            <div className="profile-password-body">
              <label className="profile-password-field">
                <span>كلمة المرور الجديدة</span>
                <div>
                  <input type={showPassword?"text":"password"} value={newPassword}
                    onChange={(e)=>setNewPassword(e.target.value)}
                    autoComplete="new-password" placeholder="••••••••"/>
                  <button type="button" onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button>
                </div>
              </label>
              <label className="profile-password-field">
                <span>تأكيد كلمة المرور</span>
                <div>
                  <input type={showPassword?"text":"password"} value={confirmPassword}
                    onChange={(e)=>setConfirmPassword(e.target.value)}
                    autoComplete="new-password" placeholder="أعد كتابة كلمة المرور"/>
                </div>
              </label>
              <div className="profile-password-hint"><ShieldCheck size={15}/><span>غيّر كلمة المرور بأمان، ولن تظهر بعد حفظها.</span></div>
            </div>

            <div className="profile-password-actions">
              <button type="button" className="profile-cancel-btn" onClick={()=>setPasswordOpen(false)} disabled={changingPassword}>إلغاء</button>
              <button type="button" className="profile-password-save" onClick={changePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}>
                {changingPassword?<><RefreshCw size={16} className="profile-spin"/> جارٍ التحديث...</>:<><Save size={16}/> تحديث كلمة المرور</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>
        {`

          .profile-password-backdrop{
            position:fixed;inset:0;z-index:9999;display:grid;place-items:center;
            padding:calc(20px * var(--app-density,1));background:rgba(6,34,28,.46);backdrop-filter:blur(6px)
          }
          .profile-password-modal{
            position:relative;width:min(460px,100%);overflow:hidden;
            border:1px solid rgba(184,143,46,.34);border-radius:calc(22px * var(--app-radius-scale,1));background:#fff;
            box-shadow:0 30px 80px rgba(6,39,31,.24)
          }
          .profile-modal-ornament{
            position:absolute;left:-22px;top:-35px;font-size:calc(120px * var(--app-font-scale,1));color:#b48b31;opacity:.055;pointer-events:none
          }
          .profile-password-head{display:flex;align-items:flex-start;gap:calc(11px * var(--app-density,1));padding:calc(20px * var(--app-density,1));border-bottom:1px solid #e8eeea;background:linear-gradient(120deg,var(--app-color-f8fbf9,#f8fbf9),#fff)}
          .profile-password-icon{width:42px;height:42px;display:grid;place-items:center;border-radius:calc(12px * var(--app-radius-scale,1));background:#eaf4ef;color:var(--app-color-0b5d4b,#0b5d4b);flex:none}
          .profile-password-head>div{flex:1}.profile-password-head span{font-size:calc(8px * var(--app-font-scale,1));color:#a17b29;font-weight:800}.profile-password-head h3{margin:2px 0;color:#173f33;font-size:calc(16px * var(--app-font-scale,1))}.profile-password-head p{margin:0;color:#8b9690;font-size:calc(9px * var(--app-font-scale,1))}
          .profile-modal-close{width:34px;height:34px;display:grid;place-items:center;border:1px solid #e0e7e3;border-radius:calc(9px * var(--app-radius-scale,1));background:#fff;color:#66766e;cursor:pointer}
          .profile-password-body{padding:calc(18px * var(--app-density,1)) calc(20px * var(--app-density,1))}.profile-password-field{display:block;margin-bottom:13px}.profile-password-field>span{display:block;margin-bottom:6px;color:#425d53;font-size:calc(9px * var(--app-font-scale,1));font-weight:800}
          .profile-password-field>div{display:flex;align-items:center;border:1px solid #d9e3de;border-radius:calc(11px * var(--app-radius-scale,1));background:#fff;overflow:hidden}
          .profile-password-field input{flex:1;min-width:0;height:43px;border:0;outline:0;padding:0 calc(12px * var(--app-density,1));background:transparent;font:inherit;color:#24483c}
          .profile-password-field button{width:42px;height:43px;border:0;background:transparent;color:#718179;cursor:pointer}
          .profile-password-hint{display:flex;align-items:flex-start;gap:calc(7px * var(--app-density,1));padding:calc(10px * var(--app-density,1));border-radius:calc(10px * var(--app-radius-scale,1));background:#f5f8f6;color:#6d7f76;font-size:calc(8px * var(--app-font-scale,1));line-height:1.6}.profile-password-hint svg{color:#a47d29;flex:none}
          .profile-password-actions{display:flex;justify-content:flex-end;gap:calc(8px * var(--app-density,1));padding:calc(13px * var(--app-density,1)) calc(20px * var(--app-density,1));border-top:1px solid #e9eeeb;background:#fbfcfb}
          .profile-cancel-btn,.profile-password-save{height:39px;padding:0 calc(14px * var(--app-density,1));border-radius:calc(10px * var(--app-radius-scale,1));font:800 10px inherit;cursor:pointer}
          .profile-cancel-btn{border:1px solid #dce4df;background:#fff;color:#63736b}.profile-password-save{display:flex;align-items:center;gap:calc(6px * var(--app-density,1));border:1px solid var(--app-color-0b5d4b,#0b5d4b);background:var(--app-color-0b5d4b,#0b5d4b);color:#fff}
          .profile-password-save:disabled,.profile-cancel-btn:disabled{opacity:.5;cursor:not-allowed}
          .profile-spin{animation:profileSpin .8s linear infinite}

          @keyframes profileSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div
      style={{
        background: "#fff",
        border:
          "1px solid #e4e9e5",
        borderRadius: "calc(16px * var(--app-radius-scale,1))",
        padding: "calc(16px * var(--app-density,1))",
        display: "flex",
        alignItems: "center",
        gap: "calc(12px * var(--app-density,1))",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          flexShrink: 0,
          borderRadius: "calc(12px * var(--app-radius-scale,1))",
          background: "var(--app-color-edf5ef,#edf5ef)",
          color: "var(--app-color-0f5132,#0f5132)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon
          size={19}
          strokeWidth={1.7}
        />
      </div>

      <div
        style={{
          minWidth: 0,
        }}
      >
        <div
          style={{
            color: "#8a928d",
            fontSize: "calc(10px * var(--app-font-scale,1))",
            marginBottom: "3px",
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: "#354139",
            fontSize: "calc(12px * var(--app-font-scale,1))",
            fontWeight: "700",
            overflowWrap: "anywhere",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

