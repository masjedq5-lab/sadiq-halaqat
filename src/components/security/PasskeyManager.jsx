import {displayDateFormatter} from "../../lib/calendar";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Laptop,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import "./PasskeyManager.css";

function passkeyErrorMessage(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");

  if (code === "passkey_disabled") {
    return "مفاتيح المرور غير مفعّلة على المشروع بعد.";
  }
  if (code === "webauthn_credential_exists") {
    return "هذا الجهاز مسجل مسبقًا كمفتاح مرور لهذا الحساب.";
  }
  if (code === "too_many_passkeys") {
    return "وصل الحساب إلى الحد الأعلى من مفاتيح المرور.";
  }
  if (code === "email_not_confirmed" || code === "phone_not_confirmed") {
    return "يجب أن يكون البريد أو رقم الجوال موثّقًا قبل تسجيل مفتاح مرور.";
  }
  if (/cancel|abort|notallowed/i.test(message)) {
    return "تم إلغاء التحقق من الجهاز قبل اكتماله.";
  }

  return message || "تعذر تنفيذ العملية. حاول مرة أخرى.";
}

function formatDate(value) {
  if (!value) return "غير معروف";
  try {
    return displayDateFormatter( {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return "غير معروف";
  }
}

export default function PasskeyManager({
  title = "البصمة والوجه",
  subtitle = "دخول أسرع وأكثر أمانًا باستخدام بصمة الإصبع أو الوجه أو رمز الجهاز.",
  compact = false,
}) {
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [passkeys, setPasskeys] = useState([]);
  const [message, setMessage] = useState(null);
  const [platformReady, setPlatformReady] = useState(null);

  const webauthnSupported =
    typeof window !== "undefined" &&
    Boolean(window.PublicKeyCredential && navigator.credentials);

  const total = passkeys.length;

  const securityLabel = useMemo(() => {
    if (!webauthnSupported) return "غير مدعوم على هذا الجهاز";
    if (total >= 2) return "حماية ممتازة";
    if (total === 1) return "مفعّل";
    return "جاهز للتفعيل";
  }, [total, webauthnSupported]);

  useEffect(() => {
    let active = true;

    async function detectPlatformAuthenticator() {
      if (
        !webauthnSupported ||
        typeof window.PublicKeyCredential
          ?.isUserVerifyingPlatformAuthenticatorAvailable !== "function"
      ) {
        if (active) setPlatformReady(false);
        return;
      }

      try {
        const available =
          await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (active) setPlatformReady(Boolean(available));
      } catch {
        if (active) setPlatformReady(null);
      }
    }

    detectPlatformAuthenticator();
    loadPasskeys();

    return () => {
      active = false;
    };
  }, []);

  async function loadPasskeys() {
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.passkey.list();

      if (error) throw error;

      const rows = Array.isArray(data)
        ? data
        : Array.isArray(data?.passkeys)
          ? data.passkeys
          : [];

      setPasskeys(rows);
    } catch (error) {
      console.error("Passkey list error:", error);
      setMessage({
        type: "error",
        text: passkeyErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function registerPasskey() {
    if (!webauthnSupported || registering) return;

    setRegistering(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.registerPasskey();
      if (error) throw error;

      setMessage({
        type: "success",
        text: "تم تسجيل وسيلة الدخول الآمنة على هذا الجهاز بنجاح.",
      });

      await loadPasskeys();
    } catch (error) {
      console.error("Passkey registration error:", error);
      setMessage({
        type: "error",
        text: passkeyErrorMessage(error),
      });
    } finally {
      setRegistering(false);
    }
  }

  async function deletePasskey(passkeyId) {
    if (!passkeyId || deletingId) return;

    const confirmed = window.confirm(
      "هل تريد إلغاء مفتاح المرور هذا؟ لن تتمكن من استخدامه للدخول بعد الحذف."
    );

    if (!confirmed) return;

    setDeletingId(passkeyId);
    setMessage(null);

    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId });
      if (error) throw error;

      setMessage({
        type: "success",
        text: "تم إلغاء مفتاح المرور من الحساب.",
      });

      await loadPasskeys();
    } catch (error) {
      console.error("Passkey delete error:", error);
      setMessage({
        type: "error",
        text: passkeyErrorMessage(error),
      });
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className={`passkey-vault ${compact ? "is-compact" : ""}`} dir="rtl">
      <div className="passkey-vault__hero">
        <div className="passkey-vault__orb" aria-hidden="true">
          <Fingerprint />
        </div>

        <div className="passkey-vault__hero-copy">
          <span className="passkey-vault__eyebrow">
            <Sparkles />
            أمان بدون كلمة مرور
          </span>
          <h2>{title}</h2>
          <p>{subtitle}</p>

          <div className="passkey-vault__chips">
            <span><Fingerprint /> بصمة الإصبع</span>
            <span><UserRoundCheck /> التعرف على الوجه</span>
            <span><KeyRound /> PIN أو مفتاح أمني</span>
          </div>
        </div>

        <div className="passkey-vault__status">
          <span>حالة الحماية</span>
          <strong>{securityLabel}</strong>
          <small>{total ? `${total} مفتاح مرور مسجل` : "لا يوجد مفتاح مسجل بعد"}</small>
        </div>
      </div>

      <div className="passkey-vault__grid">
        <article className="passkey-vault__device">
          <div className="passkey-vault__device-icon">
            {platformReady ? <Fingerprint /> : <Laptop />}
          </div>
          <div>
            <span>هذا الجهاز</span>
            <strong>
              {!webauthnSupported
                ? "المتصفح لا يدعم Passkeys"
                : platformReady === true
                  ? "البصمة أو الوجه جاهزان"
                  : platformReady === false
                    ? "يمكن استخدام PIN أو مفتاح أمني"
                    : "جاري التحقق من إمكانات الجهاز"}
            </strong>
            <p>
              يستخدم الصديق WebAuthn؛ بيانات البصمة أو الوجه لا تغادر جهازك ولا تصل إلى الصديق.
            </p>
          </div>
        </article>

        <article className="passkey-vault__device">
          <div className="passkey-vault__device-icon gold">
            <ShieldCheck />
          </div>
          <div>
            <span>الحماية</span>
            <strong>مقاومة للتصيد</strong>
            <p>
              مفتاح المرور مرتبط بالموقع الرسمي والجهاز أو مدير كلمات المرور الموثوق.
            </p>
          </div>
        </article>
      </div>

      <div className="passkey-vault__actions">
        <button
          type="button"
          className="passkey-vault__primary"
          onClick={registerPasskey}
          disabled={!webauthnSupported || registering}
        >
          {registering ? <Loader2 className="passkey-spin" /> : <Fingerprint />}
          {registering ? "جارٍ فتح حماية الجهاز…" : "إضافة بصمة أو وجه لهذا الحساب"}
        </button>

        <button
          type="button"
          className="passkey-vault__refresh"
          onClick={loadPasskeys}
          disabled={loading}
          title="تحديث القائمة"
        >
          <RefreshCw className={loading ? "passkey-spin" : ""} />
          تحديث
        </button>
      </div>

      {message && (
        <div className={`passkey-vault__message ${message.type}`} role="status">
          {message.type === "success" ? <CheckCircle2 /> : <ShieldCheck />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="passkey-vault__list-head">
        <div>
          <strong>وسائل الدخول الموثوقة</strong>
          <span>يمكنك تسجيل أكثر من جهاز كوسيلة احتياطية.</span>
        </div>
        <em>{total}</em>
      </div>

      {loading ? (
        <div className="passkey-vault__loading">
          <Loader2 className="passkey-spin" />
          جارٍ تحميل مفاتيح المرور…
        </div>
      ) : passkeys.length ? (
        <div className="passkey-vault__list">
          {passkeys.map((item, index) => (
            <article className="passkey-vault__key" key={item.id}>
              <div className="passkey-vault__key-icon">
                {index === 0 ? <Smartphone /> : <Laptop />}
              </div>

              <div className="passkey-vault__key-copy">
                <strong>
                  {item.friendly_name ||
                    item.friendlyName ||
                    `مفتاح مرور ${index + 1}`}
                </strong>
                <span>
                  أضيف {formatDate(item.created_at || item.createdAt)}
                  {(item.last_used_at || item.lastUsedAt)
                    ? ` • آخر استخدام ${formatDate(item.last_used_at || item.lastUsedAt)}`
                    : ""}
                </span>
              </div>

              <button
                type="button"
                className="passkey-vault__delete"
                onClick={() => deletePasskey(item.id)}
                disabled={deletingId === item.id}
                aria-label="إلغاء مفتاح المرور"
                title="إلغاء مفتاح المرور"
              >
                {deletingId === item.id
                  ? <Loader2 className="passkey-spin" />
                  : <Trash2 />}
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="passkey-vault__empty">
          <div><Fingerprint /></div>
          <strong>لم تسجل بصمة أو وجه بعد</strong>
          <span>
            اضغط «إضافة بصمة أو وجه» وسيستخدم جهازك Windows Hello أو Face ID أو Touch ID أو PIN المتاح.
          </span>
        </div>
      )}

      <div className="passkey-vault__footnote">
        <ShieldCheck />
        <span>
          يفضّل تسجيل وسيلتين موثوقتين على الأقل. لا تحذف كلمة المرور كخيار احتياطي.
        </span>
      </div>
    </section>
  );
}
