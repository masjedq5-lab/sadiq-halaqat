import { createPortal } from "react-dom";
import { Award, Printer, ShieldCheck, X } from "lucide-react";
import {
  formatHijriDate,
} from "../../lib/studentPortalUtils";
import "./ExamCertificate.css";

function gradeLabel(score) {
  const value = Number(score || 0);
  if (value >= 95) return "ممتاز مرتفع";
  if (value >= 90) return "ممتاز";
  if (value >= 85) return "جيد جدًا مرتفع";
  if (value >= 80) return "جيد جدًا";
  if (value >= 75) return "جيد مرتفع";
  if (value >= 70) return "جيد";
  if (value >= 60) return "مقبول";
  return "لم يجتز";
}

function scoreText(value) {
  const number = Number(value || 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

export default function ExamCertificate({ row, studentName, onClose }) {
  if (!row?.certificate || !row?.result) return null;

  const result = row.result;
  const score = Number(result.score || 0);
  const grade = gradeLabel(score);

  const examTitle = /القرآن/.test(String(row.title || ""))
    ? row.title
    : `${row.title || "الاختبار"} في القرآن الكريم`;

  const certificateDate = row.end_date || row.start_date;

  function printCertificate() {
    const cleanup = () => {
      document.body.classList.remove("sec-pro-printing");
      window.removeEventListener("afterprint", cleanup);
    };

    document.body.classList.add("sec-pro-printing");
    window.addEventListener("afterprint", cleanup, { once: true });

    setTimeout(() => {
      window.print();
      setTimeout(cleanup, 900);
    }, 120);
  }

  const content = (
    <div className="sec-pro-modal" role="dialog" aria-modal="true">
      <section className="sec-pro-shell">
        <header className="sec-pro-toolbar">
          <div className="sec-pro-toolbar-title">
            <Award size={18} />
            <div>
              <strong>شهادة الإنجاز</strong>
              <span>قالب رسمي عالي الجودة — A4 أفقي</span>
            </div>
          </div>

          <div className="sec-pro-toolbar-actions">
            <button
              type="button"
              className="sec-pro-print-btn"
              onClick={printCertificate}
            >
              <Printer size={15} />
              طباعة / حفظ PDF
            </button>

            <button
              type="button"
              className="sec-pro-close"
              onClick={onClose}
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="sec-pro-preview-wrap">
          <article
            className="sec-pro-certificate"
            id="exam-certificate-print-area"
            dir="rtl"
          >
            <img
              className="sec-pro-bg"
              src="/certificate-template-pro.png"
              alt=""
              aria-hidden="true"
            />

            <img
              className="sec-pro-logo"
              src="/icon-512.png"
              alt="شعار الصديق"
            />

            <div className="sec-pro-heading">
              <span className="sec-pro-heading-small">إدارة الحلقات</span>
              <h2>شهادة شكر وتقدير</h2>
              <p>برنامج الصِّديق</p>
            </div>

            <main className="sec-pro-content">
              <p className="sec-pro-intro">
                يَسُرُّ إِدَارَةَ الحَلَقَاتِ أَنْ تَتَقَدَّمَ
                بِخَالِصِ الشُّكْرِ وَالتَّقْدِيرِ لِلطَّالِبِ
              </p>

              <h1 className="sec-pro-student-name">{studentName}</h1>

              <p className="sec-pro-message">
                تَقْدِيرًا لِاجْتِهَادِهِ وَمُثَابَرَتِهِ، وَلِإِتْمَامِهِ
                بِتَمَيُّزٍ
              </p>

              <h3 className="sec-pro-exam-title">{examTitle}</h3>

              <p className="sec-pro-dua">
                سَائِلِينَ اللهَ أَنْ يُبَارِكَ فِي حِفْظِهِ وَعِلْمِهِ،
                وَأَنْ يَجْعَلَ القُرْآنَ الكَرِيمَ نُورًا لِقَلْبِهِ
                وَرِفْعَةً لَهُ فِي الدُّنْيَا وَالآخِرَةِ.
              </p>

              <section className="sec-pro-result-row">
                <div className="sec-pro-result-box">
                  <span>النتيجة</span>
                  <strong>
                    {scoreText(score)}
                    <small>/100</small>
                  </strong>
                </div>

                <div className="sec-pro-grade-box">
                  <span>التقدير</span>
                  <strong>{grade}</strong>
                </div>
              </section>
            </main>

            <footer className="sec-pro-footer">
              <div className="sec-pro-footer-item sec-pro-footer-right">
                <span>المسجد</span>
                <strong>{row.mosque_name || "—"}</strong>
              </div>

              <div className="sec-pro-footer-center">
                <div>
                  <span>التاريخ</span>
                  <strong>{formatHijriDate(certificateDate)}</strong>
                </div>


              </div>

              <div className="sec-pro-footer-item sec-pro-footer-left">
                <span>رقم الشهادة</span>
                <strong>{row.certificate.certificate_code}</strong>
              </div>
            </footer>

            <div className="sec-pro-digital-seal sec-pro-digital-seal-right">
              <ShieldCheck size={29} />
              <span>شهادة إلكترونية معتمدة</span>
            </div>

            <div className="sec-pro-digital-seal sec-pro-digital-seal-left">
              <Award size={28} />
              <span>إنجاز يستحق التقدير</span>
            </div>
          </article>
        </div>
      </section>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(content, document.body)
    : content;
}
