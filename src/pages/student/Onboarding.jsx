import {displayDateFormatter} from "../../lib/calendar";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Clock3,
  GraduationCap,
  Loader2,
  LogOut,
  MapPin,
  RefreshCw,
  Search,
  Send,
  XCircle,
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import "../Register.css";

function formatDate(value) {
  if (!value) return "—";

  return displayDateFormatter( {
    timeZone: "Asia/Riyadh",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function StudentOnboarding() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [directory, setDirectory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);

  const pendingRequest = requests.find(
    (request) => request.status === "pending"
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return directory.filter((item) => {
      if (!term) return true;

      return [
        item.mosque_name,
        item.mosque_address,
        item.halaqa_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term)
        );
    });
  }, [directory, search]);

  async function load() {
    try {
      setLoading(true);

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: profileRows, error: profileError } = await supabase.rpc(
        "student_my_profile_v1"
      );

      const profile = profileRows?.[0] || null;

      if (
        profileError ||
        !profile ||
        profile.role !== "student" ||
        profile.status !== "active" ||
        profile.is_active === false
      ) {
        navigate("/login", { replace: true });
        return;
      }

      const [
        assignmentResult,
        directoryResult,
        requestsResult,
      ] = await Promise.all([
        supabase.rpc("get_my_student_assignment_v2"),
        supabase.rpc("get_student_join_directory_v2"),
        supabase.rpc("get_my_join_requests_v2"),
      ]);

      if (assignmentResult.error) throw assignmentResult.error;
      if (directoryResult.error) throw directoryResult.error;
      if (requestsResult.error) throw requestsResult.error;

      if ((assignmentResult.data ?? []).length > 0) {
        navigate("/student/dashboard", { replace: true });
        return;
      }

      setDirectory(directoryResult.data ?? []);
      setRequests(requestsResult.data ?? []);
    } catch (error) {
      console.error("Student onboarding load:", error);
      window.alert(
        error?.message || "تعذر تحميل المساجد والحلقات"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitRequest() {
    if (!selected || sending) return;

    try {
      setSending(true);

      const { error } = await supabase.rpc(
        "submit_join_request_v2",
        {
          p_halaqa_id: selected.halaqa_id,
          p_note: note.trim() || null,
          p_applicant_role: "student",
        }
      );

      if (error) throw error;

      setSelected(null);
      setNote("");
      await load();
    } catch (error) {
      console.error("Submit student join request:", error);

      const message = String(error?.message || "");

      if (message.includes("PENDING_REQUEST_EXISTS")) {
        window.alert("لديك طلب التحاق قيد المراجعة بالفعل.");
      } else if (message.includes("ALREADY_ASSIGNED")) {
        navigate("/student/dashboard", { replace: true });
      } else {
        window.alert(
          error?.message || "تعذر إرسال طلب الالتحاق"
        );
      }
    } finally {
      setSending(false);
    }
  }

  async function cancelRequest(requestId) {
    try {
      setCancellingId(requestId);

      const { error } = await supabase.rpc(
        "cancel_join_request_v2",
        {
          p_request_id: requestId,
        }
      );

      if (error) throw error;
      await load();
    } catch (error) {
      console.error("Cancel student request:", error);
      window.alert(
        error?.message || "تعذر إلغاء الطلب"
      );
    } finally {
      setCancellingId(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/login", { replace: true });
  }

  return (
    <main className="register-pro-page">
      <div className="sjo-shell">
        <section className="sjo-hero">
          <div className="register-pro-success-icon">
            <GraduationCap />
          </div>

          <div>
            <span className="sjo-kicker">
              <CheckCircle2 size={16} />
              حساب الطالب جاهز
            </span>
            <h1>اختر المسجد والحلقة</h1>
            <p>
              أرسل طلب الالتحاق مرة واحدة. سيصل الطلب إلى
              معلم الحلقة وإلى مشرف المسجد، وأول من يعتمد
              الطلب يتم ربطك بالحلقة مباشرة.
            </p>
          </div>

          <button
            type="button"
            className="sjo-signout"
            onClick={signOut}
          >
            <LogOut size={17} />
            تسجيل الخروج
          </button>
        </section>

        {pendingRequest && (
          <section className="sjo-pending">
            <Clock3 size={22} />
            <div>
              <span>طلبك قيد المراجعة</span>
              <strong>
                {pendingRequest.halaqa_name} —{" "}
                {pendingRequest.mosque_name}
              </strong>
              <small>
                أرسل في {formatDate(pendingRequest.created_at)}.
                يمكن للمعلم أو المشرف اعتماده.
              </small>
            </div>

            <button type="button" onClick={load}>
              <RefreshCw size={15} />
              تحديث
            </button>

            <button
              type="button"
              className="danger"
              onClick={() =>
                cancelRequest(pendingRequest.request_id)
              }
              disabled={
                cancellingId === pendingRequest.request_id
              }
            >
              {cancellingId === pendingRequest.request_id ? (
                <Loader2 className="sjo-spin" size={15} />
              ) : (
                <XCircle size={15} />
              )}
              إلغاء الطلب
            </button>
          </section>
        )}

        <section className="sjo-directory">
          <header>
            <div>
              <span>دليل الالتحاق</span>
              <h2>المساجد والحلقات المتاحة</h2>
            </div>

            <label>
              <Search size={17} />
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="ابحث باسم المسجد أو الحلقة..."
              />
            </label>
          </header>

          {loading ? (
            <div className="sjo-state">
              <Loader2 className="sjo-spin" />
              جاري تحميل الحلقات...
            </div>
          ) : filtered.length === 0 ? (
            <div className="sjo-state">
              <BookOpen size={30} />
              <strong>لا توجد حلقات مطابقة</strong>
            </div>
          ) : (
            <div className="sjo-grid">
              {filtered.map((item) => (
                <article key={item.halaqa_id}>
                  <div className="sjo-card-icon">
                    <BookOpen size={21} />
                  </div>

                  <span>{item.mosque_name}</span>
                  <h3>{item.halaqa_name}</h3>

                  <div className="sjo-meta">
                    <small>
                      <MapPin size={14} />
                      {item.mosque_address || "العنوان غير مضاف"}
                    </small>
                    <small>
                      <Building2 size={14} />
                      {item.current_students_count} طالب
                      {item.capacity
                        ? ` من ${item.capacity}`
                        : ""}
                    </small>
                  </div>

                  <button
                    type="button"
                    disabled={Boolean(pendingRequest)}
                    onClick={() => setSelected(item)}
                  >
                    <Send size={15} />
                    {pendingRequest
                      ? "لديك طلب قيد المراجعة"
                      : "طلب الالتحاق"}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {requests.some(
          (request) => request.status !== "pending"
        ) && (
          <section className="sjo-history">
            <h2>طلباتك السابقة</h2>

            {requests
              .filter(
                (request) => request.status !== "pending"
              )
              .slice(0, 5)
              .map((request) => (
                <div key={request.request_id}>
                  <strong>
                    {request.halaqa_name} —{" "}
                    {request.mosque_name}
                  </strong>
                  <span>
                    {request.status === "approved"
                      ? "مقبول"
                      : request.status === "rejected"
                        ? "مرفوض"
                        : "ملغي"}
                    {request.decided_by_name
                      ? ` — بواسطة ${request.decided_by_name}`
                      : ""}
                  </span>
                </div>
              ))}
          </section>
        )}

        {selected && (
          <div
            className="sjo-modal-bg"
            onMouseDown={(event) => {
              if (
                event.target === event.currentTarget &&
                !sending
              ) {
                setSelected(null);
              }
            }}
          >
            <section className="sjo-modal">
              <span>تأكيد طلب الالتحاق</span>
              <h2>{selected.halaqa_name}</h2>
              <p>{selected.mosque_name}</p>

              <label>
                <span>رسالة للمعلم والمشرف — اختياري</span>
                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  maxLength={500}
                  placeholder="يمكنك كتابة ملاحظة قصيرة..."
                />
              </label>

              <div>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setSelected(null)}
                  disabled={sending}
                >
                  رجوع
                </button>

                <button
                  type="button"
                  className="primary"
                  onClick={submitRequest}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="sjo-spin" size={16} />
                  ) : (
                    <Send size={16} />
                  )}
                  إرسال الطلب
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      <style>{`
        .sjo-shell{width:min(1120px,94vw);display:grid;gap:calc(15px * var(--app-density,1));margin:24px auto}
        .sjo-hero{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:calc(14px * var(--app-density,1));padding:calc(20px * var(--app-density,1));border:1px solid rgba(255,255,255,.55);border-radius:calc(24px * var(--app-radius-scale,1));background:rgba(255,255,255,.92);box-shadow:0 18px 60px rgba(10,47,42,.10)}
        .sjo-kicker{display:flex;align-items:center;gap:calc(6px * var(--app-density,1));color:#9a792d;font-size:calc(11px * var(--app-font-scale,1));font-weight:900}.sjo-hero h1{margin:5px 0;color:var(--app-color-0f4c45,#0f4c45);font-size:calc(25px * var(--app-font-scale,1))}.sjo-hero p{margin:0;max-width:720px;color:#6d7d75;font-size:calc(12px * var(--app-font-scale,1));line-height:1.8}
        .sjo-signout{min-height:39px;display:flex;align-items:center;gap:calc(6px * var(--app-density,1));padding:0 calc(12px * var(--app-density,1));border:1px solid #ead5d5;border-radius:calc(11px * var(--app-radius-scale,1));color:#9d4040;background:#fff7f7;font:inherit;font-weight:800;cursor:pointer}
        .sjo-pending{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:calc(10px * var(--app-density,1));padding:calc(14px * var(--app-density,1));border:1px solid #ebdfb6;border-radius:calc(16px * var(--app-radius-scale,1));color:#8a6c1e;background:#fffbeb}.sjo-pending span,.sjo-pending strong,.sjo-pending small{display:block}.sjo-pending strong{margin:2px 0;color:#5e512a;font-size:calc(12px * var(--app-font-scale,1))}.sjo-pending small{color:#847a5a;font-size:calc(9px * var(--app-font-scale,1))}.sjo-pending button{min-height:35px;display:flex;align-items:center;gap:calc(5px * var(--app-density,1));padding:0 calc(9px * var(--app-density,1));border:1px solid #e3d7ae;border-radius:calc(9px * var(--app-radius-scale,1));color:#786321;background:#fff;font:inherit;font-size:calc(10px * var(--app-font-scale,1));font-weight:800;cursor:pointer}.sjo-pending .danger{color:#9b3d3d;border-color:#efcece}
        .sjo-directory{padding:calc(16px * var(--app-density,1));border:1px solid #e1e9e5;border-radius:calc(21px * var(--app-radius-scale,1));background:rgba(255,255,255,.94)}.sjo-directory>header{display:flex;align-items:end;justify-content:space-between;gap:calc(12px * var(--app-density,1));margin-bottom:13px}.sjo-directory>header span{color:#9a792d;font-size:calc(10px * var(--app-font-scale,1));font-weight:900}.sjo-directory h2{margin:3px 0 0;color:#29453c;font-size:calc(18px * var(--app-font-scale,1))}.sjo-directory>header label{width:min(350px,100%);min-height:40px;display:flex;align-items:center;gap:calc(7px * var(--app-density,1));padding:0 calc(9px * var(--app-density,1));border:1px solid #dfe8e3;border-radius:calc(10px * var(--app-radius-scale,1));color:#819088;background:#f9fbfa}.sjo-directory>header input{flex:1;min-width:0;border:0;outline:0;background:transparent;font:inherit;font-size:calc(11px * var(--app-font-scale,1))}
        .sjo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:calc(10px * var(--app-density,1))}.sjo-grid article{position:relative;padding:calc(14px * var(--app-density,1));border:1px solid #e3ebe7;border-radius:calc(16px * var(--app-radius-scale,1));background:linear-gradient(180deg,#fff,#fafcfb)}.sjo-card-icon{width:39px;height:39px;display:grid;place-items:center;margin-bottom:9px;border-radius:calc(11px * var(--app-radius-scale,1));color:var(--app-color-0f766e,#0f766e);background:#eaf6f0}.sjo-grid article>span{color:#8d9a94;font-size:calc(9px * var(--app-font-scale,1))}.sjo-grid h3{margin:2px 0 9px;color:#29483e;font-size:calc(14px * var(--app-font-scale,1))}.sjo-meta{display:grid;gap:calc(5px * var(--app-density,1));min-height:47px}.sjo-meta small{display:flex;align-items:center;gap:calc(5px * var(--app-density,1));color:#73837b;font-size:calc(9px * var(--app-font-scale,1))}.sjo-grid article>button{width:100%;min-height:38px;margin-top:11px;display:flex;align-items:center;justify-content:center;gap:calc(6px * var(--app-density,1));border:0;border-radius:calc(10px * var(--app-radius-scale,1));color:#fff;background:var(--app-color-0f766e,#0f766e);font:inherit;font-size:calc(10px * var(--app-font-scale,1));font-weight:900;cursor:pointer}.sjo-grid article>button:disabled{opacity:.48;cursor:not-allowed}
        .sjo-state{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(6px * var(--app-density,1));color:#87958e}.sjo-history{padding:calc(14px * var(--app-density,1));border:1px solid #e1e9e5;border-radius:calc(17px * var(--app-radius-scale,1));background:#fff}.sjo-history h2{margin:0 0 9px;font-size:calc(14px * var(--app-font-scale,1))}.sjo-history>div{display:flex;justify-content:space-between;gap:calc(8px * var(--app-density,1));padding:calc(8px * var(--app-density,1)) 0;border-top:1px solid #edf1ef}.sjo-history strong{font-size:calc(10px * var(--app-font-scale,1))}.sjo-history span{color:#7d8a84;font-size:calc(9px * var(--app-font-scale,1))}
        .sjo-modal-bg{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:calc(14px * var(--app-density,1));background:rgba(5,35,31,.62)}.sjo-modal{width:min(480px,96vw);padding:calc(19px * var(--app-density,1));border-radius:calc(20px * var(--app-radius-scale,1));background:#fff;box-shadow:0 30px 100px rgba(0,0,0,.22)}.sjo-modal>span{color:#9a792d;font-size:calc(10px * var(--app-font-scale,1));font-weight:900}.sjo-modal h2{margin:4px 0 2px;color:var(--app-color-0f4c45,#0f4c45);font-size:calc(20px * var(--app-font-scale,1))}.sjo-modal p{margin:0 0 13px;color:#78877f;font-size:calc(11px * var(--app-font-scale,1))}.sjo-modal label>span{display:block;margin-bottom:5px;color:#596a62;font-size:calc(10px * var(--app-font-scale,1));font-weight:800}.sjo-modal textarea{width:100%;min-height:100px;resize:vertical;padding:calc(9px * var(--app-density,1));border:1px solid #dfe8e3;border-radius:calc(10px * var(--app-radius-scale,1));font:inherit;font-size:calc(11px * var(--app-font-scale,1));outline:0}.sjo-modal>div{display:flex;justify-content:flex-end;gap:calc(7px * var(--app-density,1));margin-top:11px}.sjo-modal button{min-height:38px;display:flex;align-items:center;justify-content:center;gap:calc(6px * var(--app-density,1));padding:0 calc(13px * var(--app-density,1));border-radius:calc(9px * var(--app-radius-scale,1));font:inherit;font-size:calc(10px * var(--app-font-scale,1));font-weight:900;cursor:pointer}.sjo-modal .primary{border:0;color:#fff;background:var(--app-color-0f766e,#0f766e)}.sjo-modal .secondary{border:1px solid #dfe7e3;color:#607068;background:#fff}
        .sjo-spin{animation:sjo-spin .8s linear infinite}@keyframes sjo-spin{to{transform:rotate(360deg)}}
        @media(max-width:720px){.sjo-hero{grid-template-columns:auto 1fr}.sjo-signout{grid-column:1/-1;justify-content:center}.sjo-pending{grid-template-columns:auto 1fr}.sjo-pending button{justify-content:center}.sjo-directory>header{align-items:stretch;flex-direction:column}.sjo-directory>header label{width:100%}}
      `}</style>
    </main>
  );
}
