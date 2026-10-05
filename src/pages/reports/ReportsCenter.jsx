import { formatDate, dateKey } from "../../lib/calendar";
import CalendarInput from "../../components/CalendarInput";
import {formatSideLessonTotal} from "../../lib/sideLesson";
import { OrnamentScene } from '../../components/ornaments/Ornament';
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCopy,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Layers3,
  Loader2,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { showToast } from "../../components/Toast";
import {
  buildReport,
  formatFaces,
  formatGregorian,
  formatHijri,
  formatNumber,
  getExcelRows,
  getFilterOptions,
  getQuickRange,
  loadReportScope,
  updateReportFilters,
} from "./reportEngine";
import "./ReportsCenter.css";
import { escapeHtml } from "../../utils/htmlSecurity";

const REPORTS = [
  {
    id: "students",
    title: "الطلاب",
    description: "بطاقات مختصرة وواضحة",
    icon: Users,
    tone: "green",
  },
  {
    id: "attendance",
    title: "الحضور",
    description: "غياب وحضور بدون تعقيد",
    icon: CalendarCheck,
    tone: "blue",
  },
  {
    id: "recitations",
    title: "التسميع",
    description: "الجلسات والإنجاز والإعادات",
    icon: BookOpen,
    tone: "gold",
  },
  {
    id: "monthly-progress",
    title: "الإنجاز الشهري",
    description: "الحفظ والمراجعة والاعتماد",
    icon: Target,
    tone: "teal",
  },
  {
    id: "halaqat",
    title: "الحلقات",
    description: "المعلمون والطلاب والسعة",
    icon: Layers3,
    tone: "violet",
  },
  {
    id: "full",
    title: "التقرير التنفيذي",
    description: "ملخص سريع لصاحب المسجد",
    icon: BarChart3,
    tone: "deep",
  },
];

const SUPERVISOR_REPORTS = [
  {
    id: "my-mosques",
    title: "مساجدي",
    description: "نظرة على كل مسجد مسند لك",
    icon: Building2,
    tone: "emerald",
  },
  {
    id: "teachers",
    title: "المعلمون",
    description: "المعلمون وحلقاتهم",
    icon: GraduationCap,
    tone: "orange",
  },
];

const EMPTY_FILTERS = {
  mosqueIds: [],
  halaqaIds: [],
  teacherIds: [],
  studentIds: [],
  preset: "30",
  ...getQuickRange("30"),
};

export default function ReportsCenter({ mode: requestedMode }) {
  const [scope, setScope] = useState(null);
  const [loadingScope, setLoadingScope] = useState(true);
  const [selectedReport, setSelectedReport] = useState("students");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [exporting, setExporting] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  const mode = scope?.mode || requestedMode || "teacher";

  const reportTypes = useMemo(
    () => (mode === "supervisor" ? [...SUPERVISOR_REPORTS, ...REPORTS] : REPORTS),
    [mode]
  );

  const options = useMemo(
    () => (scope ? getFilterOptions(scope, filters) : { halaqat: [], teachers: [], students: [] }),
    [scope, filters.mosqueIds, filters.halaqaIds, filters.teacherIds]
  );

  useEffect(() => {
    loadScope();
  }, []);

  useEffect(() => {
    if (!scope) return;
    generateReport("students", filters);
  }, [scope]);

  async function loadScope() {
    try {
      setLoadingScope(true);
      const data = await loadReportScope();
      setScope(data);
    } catch (error) {
      console.error("REPORT SCOPE:", error);
      showToast("تعذر تجهيز نطاق التقارير", "error");
    } finally {
      setLoadingScope(false);
    }
  }

  async function generateReport(type = selectedReport, nextFilters = filters) {
    if (!scope) return;

    try {
      setLoadingReport(true);
      const data = await buildReport({ type, scope, filters: nextFilters });
      setSelectedReport(type);
      setReport(data);
    } catch (error) {
      console.error("GENERATE REPORT:", error);
      showToast(error?.message || "تعذر إنشاء التقرير", "error");
    } finally {
      setLoadingReport(false);
    }
  }

  function selectReport(type) {
    setSelectedReport(type);
    generateReport(type, filters);
  }

  function setFilter(key, value) {
    setFilters((current) => updateReportFilters(scope, current, key, value));
  }

  function applyPreset(preset) {
    const range = getQuickRange(preset);
    const next = { ...filters, preset, ...range };
    setFilters(next);
    if (scope) generateReport(selectedReport, next);
  }

  function resetFilters() {
    const next = { ...EMPTY_FILTERS };
    setFilters(next);
    if (scope) generateReport(selectedReport, next);
  }

  async function handleCopy() {
    if (!report?.rows?.length) {
      showToast("لا توجد بيانات لنسخها", "info");
      return;
    }

    try {
      const rows = getExcelRows(report);
      const lines = rows.map((row) => Object.values(row).join(" | "));
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      showToast("تم نسخ التقرير", "success");
    } catch (error) {
      console.error(error);
      showToast("تعذر نسخ التقرير", "error");
    }
  }

  async function handleExcel() {
    if (!report?.rows?.length) {
      showToast("لا توجد بيانات للتصدير", "info");
      return;
    }

    try {
      setExporting("excel");
      const [XLSX, fileSaver] = await Promise.all([import("xlsx"), import("file-saver")]);
      const saveAs = fileSaver.saveAs || fileSaver.default?.saveAs || fileSaver.default;
      const rows = getExcelRows(report);
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!views"] = [{ rightToLeft: true }];
      worksheet["!cols"] = Object.keys(rows[0] || {}).map((key) => ({
        wch: Math.max(14, Math.min(34, key.length + 10)),
      }));

      const summaryRows = (report.summary || []).map((item) => ({
        "المؤشر": item.label,
        "القيمة": item.value,
      }));
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet["!views"] = [{ rightToLeft: true }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "التقرير");
      XLSX.utils.book_append_sheet(workbook, summarySheet, "الملخص");

      const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, `الصديق-${report.type}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast("تم تصدير Excel", "success");
    } catch (error) {
      console.error(error);
      showToast("تعذر تصدير Excel", "error");
    } finally {
      setExporting("");
    }
  }

  function handlePrint() {
    const element = document.getElementById("reports-document");
    const style = document.getElementById("reports-print-style");

    if (!element || !style) {
      showToast("لا يوجد تقرير جاهز للطباعة", "error");
      return;
    }

    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      showToast("اسمح بفتح نافذة الطباعة من المتصفح", "error");
      return;
    }

    try {
      win.opener = null;
    } catch {
      // Browser-level opener isolation is best-effort only.
    }

    win.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>${escapeHtml(report?.title || "تقرير الصديق")}</title>
          <style>${style.textContent}</style>
        </head>
        <body>
          ${element.outerHTML}

        </body>
      </html>
    `);

    win.document.close();

    const printWhenReady = async () => {
      const images = Array.from(win.document.images || []);

      await Promise.all(
        images.map((img) => {
          if (img.complete) {
            return img.decode?.().catch(() => {}) || Promise.resolve();
          }

          return new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          });
        })
      );

      window.setTimeout(() => {
        try {
          win.focus();
          win.print();
        } catch {
          // The print window may have been closed by the user.
        }
      }, 250);
    };

    if (win.document.readyState === "complete") {
      void printWhenReady();
    } else {
      win.addEventListener("load", () => {
        void printWhenReady();
      }, { once: true });
    }
  }

  async function handlePDF() {
    const root = document.getElementById("reports-document");
    if (!root) {
      showToast("لا يوجد تقرير جاهز للتصدير", "error");
      return;
    }

    try {
      setExporting("pdf");
      showToast("جارٍ تجهيز PDF…", "info");
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);

      const header = root.querySelector('[data-pdf-role="header"]');
      const units = [...root.querySelectorAll('[data-pdf-unit="true"]')].filter(
        (node) => node !== header && node.getAttribute("data-pdf-role") !== "footer"
      );
      const footer = root.querySelector('[data-pdf-role="footer"]');

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 10;
      const marginTop = 10;
      const usableWidth = pageWidth - marginX * 2;
      const bottomLimit = pageHeight - 12;
      let y = marginTop;

      let headerImage = null;
      let headerHeight = 0;

      if (header) {
        const canvas = await html2canvas(header, {
          scale: 1.8,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        headerImage = canvas.toDataURL("image/jpeg", 0.96);
        headerHeight = (canvas.height * usableWidth) / canvas.width;
      }

      function addHeader() {
        if (!headerImage) return;
        pdf.addImage(headerImage, "JPEG", marginX, y, usableWidth, headerHeight, undefined, "FAST");
        y += headerHeight + 4;
      }

      addHeader();

      for (const unit of units) {
        const isStudentReport = report?.type === "students";

        const canvas = await html2canvas(unit, {
          scale: isStudentReport ? 2.35 : 1.7,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        const image = isStudentReport
          ? canvas.toDataURL("image/png")
          : canvas.toDataURL("image/jpeg", 0.94);

        const imageFormat = isStudentReport ? "PNG" : "JPEG";
        let width = usableWidth;
        let height = (canvas.height * width) / canvas.width;

        if (height > pageHeight - 24) {
          const ratio = (pageHeight - 24) / height;
          width *= ratio;
          height *= ratio;
        }

        if (y + height > bottomLimit) {
          pdf.addPage();
          y = marginTop;
          addHeader();
        }

        const x = marginX + (usableWidth - width) / 2;
        pdf.addImage(
          image,
          imageFormat,
          x,
          y,
          width,
          height,
          undefined,
          isStudentReport ? undefined : "FAST"
        );
        y += height + 3.5;
      }

      if (footer) {
        const canvas = await html2canvas(footer, {
          scale: 1.8,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        });
        const image = canvas.toDataURL("image/jpeg", 0.95);
        const height = (canvas.height * usableWidth) / canvas.width;

        if (y + height > bottomLimit) {
          pdf.addPage();
          y = marginTop;
          addHeader();
        }

        pdf.addImage(image, "JPEG", marginX, y, usableWidth, height, undefined, "FAST");
      }

      pdf.save(`الصديق-${report?.type || "report"}-${new Date().toISOString().slice(0, 10)}.pdf`);
      showToast("تم إنشاء PDF", "success");
    } catch (error) {
      console.error("PDF EXPORT:", error);
      showToast("تعذر إنشاء PDF", "error");
    } finally {
      setExporting("");
    }
  }

  if (loadingScope) return <ReportsLoading />;

  if (!scope) {
    return (
      <div className="reports-error-state">
        <AlertTriangle size={28} />
        <strong>تعذر فتح مركز التقارير</strong>
        <button type="button" onClick={loadScope}>إعادة المحاولة</button>
      </div>
    );
  }

  return (
    <div className="reports-pro" dir="rtl">
      <style id="reports-print-style">{PRINT_CSS}</style>

      <ReportsHero scope={scope} mode={mode} onRefresh={() => generateReport()} loading={loadingReport} />

      <section className="reports-types">
        <header className="reports-section-heading">
          <div>
            <span>اختيار سريع</span>
            <h2>ما التقرير الذي تريده؟</h2>
          </div>
          <small>اختر النوع وسيظهر مباشرة</small>
        </header>

        <div className="reports-types-grid">
          {reportTypes.map((item) => (
            <ReportTypeCard
              key={item.id}
              item={item}
              active={selectedReport === item.id}
              onClick={() => selectReport(item.id)}
            />
          ))}
        </div>
      </section>

      <section className="reports-filter-panel">
        <button
          type="button"
          className="reports-filter-toggle"
          onClick={() => setFiltersOpen((value) => !value)}
        >
          <div>
            <Filter size={17} />
            <strong>تخصيص التقرير</strong>
            <span>اختياري — التقرير يعمل بدون تعقيد</span>
          </div>
          <ChevronDown className={filtersOpen ? "is-open" : ""} size={18} />
        </button>

        {filtersOpen && (
          <div className="reports-filter-body">
            <QuickPeriods active={filters.preset} onSelect={applyPreset} />
            <p className="reports-filter-hint">اختر قيمة أو أكثر من كل قائمة. ترك القائمة دون تحديد يشمل الكل.</p>

            <div className="reports-filter-grid">
              {mode !== "teacher" && (
                <FilterMultiSelect
                  label="المساجد"
                  placeholder={mode === "supervisor" ? "كل مساجدي" : "كل المساجد"}
                  value={filters.mosqueIds}
                  onChange={(value) => setFilter("mosqueIds", value)}
                  options={scope.mosques.map((item) => ({ value: Number(item.id), label: item.name }))}
                />
              )}

              <FilterMultiSelect
                label="الحلقات"
                placeholder="كل الحلقات"
                value={filters.halaqaIds}
                onChange={(value) => setFilter("halaqaIds", value)}
                options={options.halaqat.map((item) => ({ value: Number(item.id), label: item.name }))}
              />

              {mode !== "teacher" && (
                <FilterMultiSelect
                  label="المعلمون"
                  placeholder="كل المعلمين"
                  value={filters.teacherIds}
                  onChange={(value) => setFilter("teacherIds", value)}
                  options={options.teachers.map((item) => ({ value: Number(item.id), label: item.full_name }))}
                />
              )}

              <FilterMultiSelect
                label="الطلاب"
                placeholder="كل الطلاب"
                value={filters.studentIds}
                onChange={(value) => setFilter("studentIds", value)}
                options={options.students.map((item) => ({ value: Number(item.id), label: item.full_name }))}
              />

              <FilterDate label="من" value={filters.fromDate} onChange={(value) => setFilter("fromDate", value)} />
              <FilterDate label="إلى" value={filters.toDate} onChange={(value) => setFilter("toDate", value)} />
            </div>

            <div className="reports-filter-actions">
              <button type="button" className="reports-reset" onClick={resetFilters}>
                <X size={15} />
                مسح التخصيص
              </button>
              <button
                type="button"
                className="reports-generate"
                onClick={() => generateReport()}
                disabled={loadingReport}
              >
                {loadingReport ? <Loader2 className="reports-spin" size={17} /> : <Sparkles size={17} />}
                {loadingReport ? "جارٍ تجهيز التقرير…" : "تحديث التقرير"}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="reports-result-head">
        <div>
          <span>التقرير الحالي</span>
          <h2>{report?.title || "التقرير"}</h2>
          <p>{report?.subtitle || ""}</p>
        </div>

        <div className="reports-export-bar">
          <button type="button" onClick={handleCopy} disabled={!report?.rows?.length}>
            {copied ? <Check size={16} /> : <ClipboardCopy size={16} />}
            {copied ? "تم النسخ" : "نسخ"}
          </button>
          <button type="button" onClick={handleExcel} disabled={!report?.rows?.length || exporting === "excel"}>
            {exporting === "excel" ? <Loader2 className="reports-spin" size={16} /> : <FileSpreadsheet size={16} />}
            Excel
          </button>
          <button type="button" onClick={handlePDF} disabled={!report?.rows?.length || exporting === "pdf"}>
            {exporting === "pdf" ? <Loader2 className="reports-spin" size={16} /> : <FileText size={16} />}
            PDF
          </button>
          <button type="button" className="is-primary" onClick={handlePrint} disabled={!report?.rows?.length}>
            <Printer size={16} />
            طباعة
          </button>
        </div>
      </section>

      {loadingReport ? (
        <ReportSkeleton />
      ) : report ? (
        <ReportDocument report={report} mode={mode} />
      ) : (
        <div className="reports-empty-state">
          <BarChart3 size={28} />
          <strong>اختر تقريرًا</strong>
          <span>سيظهر التقرير هنا مباشرة.</span>
        </div>
      )}
    </div>
  );
}

function ReportsHero({ scope, mode, onRefresh, loading }) {
  const uniqueStudents = new Set(scope.studentLinks.map((row) => Number(row.student_id))).size;
  const uniqueTeachers = new Set(scope.teacherLinks.map((row) => Number(row.teacher_id))).size;

  return (
    <section className="reports-hero">
      <OrnamentScene primary="01-noor" />
      <div className="reports-hero-copy">
        <div className="reports-kicker">
          <Sparkles size={15} />
          مركز تقارير ذكي
        </div>
        <h1>التقرير الذي تحتاجه، بأقل عدد من النقرات.</h1>
        <p>
          تقارير واضحة للمعلم والمشرف وصاحب المسجد، بتصدير Excel وPDF وطباعة مصممة خصيصًا للعربية.
        </p>
        <div className="reports-hero-meta">
          <span><UserRound size={14} /> {scope.profile.full_name}</span>
          <span><ShieldCheck size={14} /> {mode === "supervisor" ? "مشرف" : mode === "teacher" ? "معلم" : "إدارة النظام"}</span>
        </div>
      </div>

      <div className="reports-hero-stats">
        {mode === "supervisor" && <HeroStat label="مساجدي" value={scope.mosques.length} icon={Building2} />}
        <HeroStat label="الحلقات" value={scope.halaqat.length} icon={Layers3} />
        <HeroStat label="الطلاب" value={uniqueStudents} icon={Users} />
        <HeroStat label="المعلمون" value={uniqueTeachers} icon={GraduationCap} />
        <button type="button" onClick={onRefresh} disabled={loading}>
          <RefreshCw className={loading ? "reports-spin" : ""} size={16} />
          تحديث
        </button>
      </div>
    </section>
  );
}

function HeroStat({ label, value, icon: Icon }) {
  return (
    <div className="reports-hero-stat">
      <Icon size={17} />
      <div>
        <strong>{formatNumber(value)}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

function ReportTypeCard({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button type="button" className={`reports-type-card tone-${item.tone} ${active ? "is-active" : ""}`} onClick={onClick}>
      <div className="reports-type-icon"><Icon size={19} /></div>
      <div className="reports-type-copy">
        <strong>{item.title}</strong>
        <span>{item.description}</span>
      </div>
      {active && <Check size={15} className="reports-type-check" />}
    </button>
  );
}

function QuickPeriods({ active, onSelect }) {
  const items = [
    ["today", "اليوم"],
    ["week", "هذا الأسبوع"],
    ["7", "آخر 7 أيام"],
    ["30", "آخر 30 يومًا"],
    ["month", "هذا الشهر"],
    ["all", "كل الفترات"],
  ];

  return (
    <div className="reports-periods">
      <span><CalendarDays size={15} /> فترة التقرير</span>
      <div>
        {items.map(([value, label]) => (
          <button key={value} type="button" className={active === value ? "is-active" : ""} onClick={() => onSelect(value)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterMultiSelect({ label, placeholder, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const id = useId();
  const selected = options.filter((option) => value.includes(option.value));
  const query = search.trim().toLocaleLowerCase("ar");
  const visible = options.filter((option) => String(option.label || "").toLocaleLowerCase("ar").includes(query));
  const allVisibleSelected = visible.length > 0 && visible.every((option) => value.includes(option.value));
  const selectedText = selected.map((option) => option.label).join("، ");

  useEffect(() => {
    if (!open) return;

    const desktopPointer =
      window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches;

    if (desktopPointer) {
      requestAnimationFrame(() => {
        searchRef.current?.focus({ preventScroll: true });
      });
    }

    function closeOutside(event) {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOutside, true);

    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
    };
  }, [open]);

  function toggle(valueToToggle) {
    onChange(value.includes(valueToToggle)
      ? value.filter((item) => item !== valueToToggle)
      : [...value, valueToToggle]);
  }

  function openMenu() {
    setSearch("");
    setOpen(true);
  }

  return (
    <div
      ref={rootRef}
      className={`reports-multi-field ${open ? "is-open" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <label id={`${id}-label`} htmlFor={`${id}-trigger`}>{label}</label>
      <button
        id={`${id}-trigger`}
        ref={triggerRef}
        type="button"
        className={`reports-multi-trigger ${selected.length ? "has-selection" : ""}`}
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        aria-labelledby={`${id}-label ${id}-value`}
        title={selectedText || placeholder}
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            openMenu();
          }
        }}
      >
        <span id={`${id}-value`}>{selected.length === 1 ? selectedText : selected.length ? `تم تحديد ${formatNumber(selected.length)}` : placeholder}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-panel`} className="reports-multi-panel" role="group" aria-labelledby={`${id}-label`}>
          <div className="reports-multi-search">
            <Search size={15} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث…"
              aria-label={`بحث في ${label}`}
              autoComplete="off"
            />
          </div>
          <div className="reports-multi-actions">
            <button type="button" disabled={!visible.length || allVisibleSelected} onClick={() => onChange([...new Set([...value, ...visible.map((option) => option.value)])])}>
              {query ? "تحديد النتائج" : "تحديد الكل"}
            </button>
            <button type="button" disabled={!value.length} onClick={() => onChange([])}>مسح</button>
          </div>
          <div className="reports-multi-options">
            {visible.map((option) => (
              <label className={`reports-multi-option ${value.includes(option.value) ? "is-selected" : ""}`} key={option.value}>
                <input type="checkbox" checked={value.includes(option.value)} onChange={() => toggle(option.value)} />
                <span>{option.label}</span>
              </label>
            ))}
            {!visible.length && <p className="reports-multi-empty">{options.length ? "لا توجد نتائج للبحث" : "لا توجد خيارات ضمن النطاق المحدد"}</p>}
          </div>
          <div className="reports-multi-footer">
            <span role="status">{value.length ? `${formatNumber(value.length)} محدد` : "يشمل الكل"}</span>
            <button type="button" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>تم</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterDate({ label, value, onChange }) {
  return (
    <label className="reports-field">
      <span>{label}</span>
      <div>
        <CalendarInput  value={value} onChange={(event) => onChange(event.target.value)} />
        <CalendarDays size={15} />
      </div>
    </label>
  );
}

function ReportDocument({ report, mode }) {
  return (
    <article className="report-document" id="reports-document">
      <ReportDocumentHeader report={report} mode={mode} />

      {!!report.summary?.length && (
        <section className="report-summary-grid" data-pdf-unit="true">
          {report.summary.map((item) => (
            <div className={`report-summary-card tone-${item.tone || "green"}`} key={item.label}>
              <span>{item.label}</span>
              <strong>{typeof item.value === "number" ? formatNumber(item.value) : item.value}</strong>
            </div>
          ))}
        </section>
      )}

      {!!report.insights?.length && (
        <section className="report-insights" data-pdf-unit="true">
          <div className="report-insights-title"><Sparkles size={16} /> قراءة سريعة</div>
          <div className="report-insight-list">
            {report.insights.map((text, index) => (
              <div key={`${text}-${index}`}><Check size={14} /> {text}</div>
            ))}
          </div>
        </section>
      )}

      <ReportContent report={report} />
      <ReportDocumentFooter />
    </article>
  );
}

function ReportDocumentHeader({ report, mode }) {
  return (
    <header className="report-document-header" data-pdf-role="header" data-pdf-unit="true">
      <img className="report-corner c1" src="/ornaments/sadiq/gold/07-rukn-tr.svg" alt="" />
      <img className="report-corner c2" src="/ornaments/sadiq/gold/07-rukn-tr.svg" alt="" />
      <div className="report-brand">
        <img src="/icon-512.png" alt="الصديق" />
        <div>
          <span>نظام الصديق لإدارة الحلقات</span>
          <h1>{report.title}</h1>
          <p>{report.subtitle}</p>
        </div>
      </div>

      <div className="report-meta-grid">
        <Meta label="النطاق" value={report.meta.mosqueName} />
        <Meta label="الحلقة" value={report.meta.halaqaName} />
        <Meta label={mode === "supervisor" ? "المعلم" : "أعده"} value={report.meta.teacherName || report.meta.generatedBy} />
        <Meta label="الفترة" value={report.meta.periodLabel} />
      </div>

      <div className="report-date-line">
        <CalendarDays size={13} />
        <span>{formatDate(dateKey())}</span>
      </div>
    </header>
  );
}

function Meta({ label, value }) {
  return (
    <div className="report-meta-item">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function ReportContent({ report }) {
  if (!report.rows?.length) {
    return (
      <section className="report-no-data" data-pdf-unit="true">
        <Search size={24} />
        <strong>لا توجد بيانات ضمن هذا النطاق</strong>
        <span>غيّر الفترة أو الفلاتر ثم حدّث التقرير.</span>
      </section>
    );
  }

  if (report.layout === "students") return <StudentCards rows={report.rows} />;
  if (report.layout === "attendance") return <AttendanceCards rows={report.rows} />;
  if (report.layout === "recitations") return <RecitationCards rows={report.rows} />;
  if (report.layout === "halaqat") return <HalaqaCards rows={report.rows} />;
  if (report.layout === "teachers") return <TeacherCards rows={report.rows} />;
  if (report.layout === "mosques") return <MosqueCards rows={report.rows} />;
  if (report.layout === "monthly") return <MonthlyCards rows={report.rows} />;
  return <ExecutiveCards rows={report.rows} />;
}

function chunkPairs(rows) {
  const result = [];
  for (let index = 0; index < rows.length; index += 2) result.push(rows.slice(index, index + 2));
  return result;
}

function StudentCards({ rows }) {
  return (
    <section className="report-content-section report-students-section">
      {chunkPairs(rows).map((pair, index) => (
        <div
          className="report-card-row report-student-row"
          data-pdf-unit="true"
          key={`student-pair-${index}`}
        >
          {pair.map((row) => (
            <article className="report-student-card report-student-card-pro" key={row.id}>
              <div className="report-student-main">
                <div className="report-student-topline">
                  <span className="report-student-card-kicker">بطاقة طالب</span>
                  <span className="report-student-card-number">{row.number || "—"}</span>
                </div>

                <div className="report-student-identity">
                  <div className="report-student-avatar">
                    <UserRound size={20} />
                  </div>

                  <div className="report-student-head">
                    <strong>{row.name}</strong>
                    <span>رقم الطالب: {row.number || "—"}</span>
                  </div>
                </div>

                <div className="report-student-details">
                  <InfoLine icon={Phone} label="جوال ولي الأمر" value={row.guardianPhone} />
                  <InfoLine icon={BookOpen} label="الحلقة" value={row.halaqa} />
                  <InfoLine icon={GraduationCap} label="المعلم" value={row.teacher} />
                  <InfoLine icon={Building2} label="المسجد" value={row.mosque} />
                </div>

                <div className="report-student-signature">
                  <span>الصِّديق</span>
                  <small>رفيق الطالب في طريق القرآن</small>
                </div>
              </div>

              <div className="report-student-qr-panel">
                <div className="report-student-qr-frame">
                  <img
                    className="report-student-login-qr"
                    src="/student-login-qr.png"
                    alt="QR دخول الطالب"
                    title="امسح للدخول إلى الصديق"
                    loading="eager"
                    onError={(event) => {
                      const panel = event.currentTarget.closest(".report-student-qr-panel");
                      if (panel) panel.style.display = "none";
                    }}
                  />
                </div>

                <strong>الدخول للبوابة</strong>
                <span>امسح الرمز بالكاميرا</span>
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function AttendanceCards({ rows }) {
  return (
    <section className="report-content-section">
      {chunkPairs(rows).map((pair, index) => (
        <div className="report-card-row" data-pdf-unit="true" key={`attendance-${index}`}>
          {pair.map((row) => (
            <article className={`report-simple-card ${row.attention ? "needs-attention" : ""}`} key={row.id}>
              <CardTitle name={row.name} meta={`${row.halaqa} • ${row.mosque}`} />
              <div className="report-kpi-strip">
                <MiniKpi label="حاضر" value={row.present} tone="green" />
                <MiniKpi label="غائب" value={row.absent} tone="red" />
                <MiniKpi label="بعذر" value={row.excused} tone="gold" />
                <MiniKpi label="متأخر" value={row.late} tone="blue" />
              </div>
              <div className="report-rate-line">
                <span>الحضور الفعلي</span>
                <strong>{row.rate}%</strong>
                <div><i style={{ width: `${Math.min(100, row.rate)}%` }} /></div>
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function RecitationCards({ rows }) {
  return (
    <section className="report-content-section">
      {chunkPairs(rows).map((pair, index) => (
        <div className="report-card-row" data-pdf-unit="true" key={`recitation-${index}`}>
          {pair.map((row) => (
            <article className="report-simple-card" key={row.id}>
              <CardTitle name={row.name} meta={`${row.halaqa} • ${row.mosque}`} />
              <div className="report-kpi-strip">
                <MiniKpi label="الجلسات" value={row.sessions} tone="green" />
                <MiniKpi label="الحفظ" value={`${formatFaces(row.lessonFaces)} ص`} tone="blue" />
                <MiniKpi label="المراجعة" value={`${formatFaces(row.reviewFaces)} ص`} tone="teal" />
                <MiniKpi label="جنب الدرس" value={formatSideLessonTotal(row.sideLessonFaces,row.sideLinesPerFace)} tone="gold" />
              </div>
              <div className="report-inline-note">
                <span><RefreshCw size={13} /> إعادات: <strong>{row.repeats}</strong></span>
                <span><CalendarDays size={13} /> آخر تسميع: <strong>{row.lastDate ? formatGregorian(row.lastDate) : "—"}</strong></span>
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function HalaqaCards({ rows }) {
  return (
    <section className="report-content-section">
      {chunkPairs(rows).map((pair, index) => (
        <div className="report-card-row" data-pdf-unit="true" key={`halaqa-${index}`}>
          {pair.map((row) => (
            <article className="report-simple-card" key={row.id}>
              <CardTitle name={row.name} meta={row.mosque} />
              <InfoLine icon={GraduationCap} label="المعلم الرئيسي" value={row.mainTeacher} />
              <InfoLine icon={Users} label="الطلاب" value={`${row.studentsCount} طالب`} />
              <InfoLine icon={Activity} label="الفترة" value={row.period} />
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function TeacherCards({ rows }) {
  return (
    <section className="report-content-section">
      {chunkPairs(rows).map((pair, index) => (
        <div className="report-card-row" data-pdf-unit="true" key={`teacher-${index}`}>
          {pair.map((row) => (
            <article className="report-simple-card" key={row.id}>
              <CardTitle name={row.name} meta={row.number} />
              <InfoLine icon={BookOpen} label="الحلقات" value={row.halaqat} />
              <InfoLine icon={Building2} label="المساجد" value={row.mosques} />
              <InfoLine icon={Users} label="الطلاب" value={`${row.studentsCount} طالب`} />
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function MosqueCards({ rows }) {
  return (
    <section className="report-content-section">
      {chunkPairs(rows).map((pair, index) => (
        <div className="report-card-row" data-pdf-unit="true" key={`mosque-${index}`}>
          {pair.map((row) => (
            <article className="report-mosque-card" key={row.id}>
              <div className="report-mosque-icon"><Building2 size={22} /></div>
              <div className="report-mosque-head"><strong>{row.name}</strong><span><MapPin size={12} /> {row.address}</span></div>
              <div className="report-mosque-stats">
                <MiniKpi label="الحلقات" value={row.halaqatCount} tone="green" />
                <MiniKpi label="المعلمون" value={row.teachersCount} tone="blue" />
                <MiniKpi label="الطلاب" value={row.studentsCount} tone="gold" />
              </div>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function MonthlyCards({ rows }) {
  return (
    <section className="report-content-section">
      {chunkPairs(rows).map((pair, index) => (
        <div className="report-card-row" data-pdf-unit="true" key={`monthly-${index}`}>
          {pair.map((row) => (
            <article className="report-simple-card" key={row.id}>
              <CardTitle name={row.name} meta={`${row.halaqa} • ${formatHijri(row.month)}`} />
              <div className="report-kpi-strip three">
                <MiniKpi label="الحفظ" value={`${formatFaces(row.memorization)} ص`} tone="green" />
                <MiniKpi label="المراجعة" value={`${formatFaces(row.revision)} ص`} tone="blue" />
                <MiniKpi label="الاعتماد" value={row.approved ? "معتمد" : "غير معتمد"} tone={row.approved ? "teal" : "gold"} />
              </div>
              {row.delayReason && row.delayReason !== "—" && <div className="report-inline-note"><span><AlertTriangle size={13} /> {row.delayReason}</span></div>}
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

function ExecutiveCards({ rows }) {
  return (
    <section className="report-executive-grid" data-pdf-unit="true">
      {rows.map((row) => (
        <article key={row.id}>
          <span>{row.label}</span>
          <strong>{formatNumber(row.value)}</strong>
          <small>{row.note}</small>
        </article>
      ))}
    </section>
  );
}

function CardTitle({ name, meta }) {
  return (
    <div className="report-card-title">
      <div className="report-mini-avatar"><UserRound size={16} /></div>
      <div><strong>{name}</strong><span>{meta}</span></div>
    </div>
  );
}

function InfoLine({ icon: Icon, label, value }) {
  return (
    <div className="report-info-line">
      <Icon size={13} />
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function MiniKpi({ label, value, tone }) {
  return (
    <div className={`report-mini-kpi tone-${tone || "green"}`}>
      <span>{label}</span>
      <strong>{typeof value === "number" ? formatNumber(value) : value}</strong>
    </div>
  );
}

function ReportDocumentFooter() {
  return (
    <footer className="report-document-footer" data-pdf-role="footer" data-pdf-unit="true">
      <img src="/ornaments/sadiq/gold/07-rukn-tr.svg" alt="" />
      <div>
        <strong>بالقرآن نرتقي، وبالمتابعة نصنع أثرًا يبقى.</strong>
        <span>الصديق • تقارير واضحة لاتخاذ قرار أفضل</span>
      </div>
      <div className="report-footer-brand"><img src="/icon-512.png" alt="الصديق" /><span>الصِّديق</span></div>
    </footer>
  );
}

function ReportsLoading() {
  return (
    <div className="reports-loading-state">
      <Loader2 className="reports-spin" size={30} />
      <strong>جارٍ تجهيز مركز التقارير…</strong>
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="reports-skeleton">
      <div className="sk-head" />
      <div className="sk-grid"><i /><i /><i /><i /></div>
      <div className="sk-row" /><div className="sk-row" /><div className="sk-row" />
    </div>
  );
}

const PRINT_CSS = `
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body { margin: 0; background: #fff; direction: rtl; font-family: Tahoma, Arial, sans-serif; color: #173a33; }
  .report-document { width: 100%; max-width: 190mm; margin: 0 auto; background: #fff; }
  .report-document-header { position: relative; overflow: hidden; padding: 16px 18px 13px; border: 1px solid #dce6e2; border-top: 4px solid #0f4c45; border-radius: 12px; background: linear-gradient(135deg,#fff,#f7faf8); page-break-inside: avoid; }
  .report-corner { position: absolute; width: 70px; opacity: .07; pointer-events: none; } .report-corner.c1{top:0;right:0}.report-corner.c2{top:0;left:0;transform:scaleX(-1)}
  .report-brand { display:flex; align-items:center; gap:12px; position:relative; z-index:2; } .report-brand>img{width:44px;height:44px;object-fit:contain}.report-brand span{font-size:9px;color:#8a7a45;font-weight:700}.report-brand h1{margin:2px 0 0;font-size:20px;color:#082f2a}.report-brand p{margin:3px 0 0;font-size:9px;color:#71837c}
  .report-meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:12px}.report-meta-item{padding:7px;border-radius:7px;background:#f4f8f6}.report-meta-item span{display:block;font-size:7px;color:#82928c}.report-meta-item strong{display:block;margin-top:2px;font-size:8.5px;color:#304d45;white-space:normal;overflow-wrap:anywhere;line-height:1.6}.report-date-line{display:flex;justify-content:flex-end;align-items:center;gap:6px;margin-top:8px;font-size:7.5px;color:#7b8d86}.report-date-line i{width:3px;height:3px;border-radius:50%;background:#d1b34c}
  .report-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px;page-break-inside:avoid}.report-summary-card{padding:9px;border:1px solid #e1e8e5;border-radius:8px;background:#fff}.report-summary-card span{display:block;font-size:7.5px;color:#7b8c86}.report-summary-card strong{display:block;margin-top:2px;font-size:15px;color:#0c3e37}.report-summary-card.tone-gold{border-color:#ecdfb2}.report-summary-card.tone-blue{border-color:#dbe7f6}.report-summary-card.tone-teal{border-color:#d7ebe7}
  .report-insights{display:flex;align-items:flex-start;gap:9px;margin-top:8px;padding:9px 10px;border:1px solid #e7ddb4;border-radius:8px;background:#fffaf0;page-break-inside:avoid}.report-insights-title{display:flex;align-items:center;gap:4px;white-space:nowrap;font-size:8px;color:#846619;font-weight:800}.report-insight-list{display:grid;gap:3px;font-size:7.5px;color:#705f33}.report-insight-list>div{display:flex;align-items:center;gap:4px}
  .report-content-section{margin-top:8px}
  .report-card-row{display:grid;grid-template-columns:repeat(2,1fr);gap:3mm;margin-bottom:3mm;page-break-inside:avoid}
  .report-student-row{gap:3mm;margin-bottom:3mm}
  .report-student-card,.report-simple-card,.report-mosque-card{position:relative;padding:10px;border:1px solid #dfe7e4;border-radius:9px;background:#fff;page-break-inside:avoid}
  .report-student-card-pro{
    min-height:49mm;
    overflow:hidden;
    display:grid;
    grid-template-columns:minmax(0,1fr) 31mm;
    grid-template-areas:"main qr";
    gap:3mm;
    align-items:stretch;
    padding:3.2mm;
    border:1px solid #d7e3de;
    border-radius:4mm;
    background:linear-gradient(145deg,#fff,#f8fbf9);
    box-shadow:none;
    break-inside:avoid;
    page-break-inside:avoid;
  }
  .report-student-card-pro::before{
    content:"";
    position:absolute;
    top:0;right:0;left:0;
    height:1mm;
    background:linear-gradient(90deg,#0f4c45,#d1b34c,#0f4c45);
  }
  .report-student-card-pro::after{display:none}
  .report-student-main{grid-area:main;min-width:0;display:flex;flex-direction:column}
  .report-student-topline{display:flex;align-items:center;justify-content:space-between;gap:2mm;margin-bottom:2mm}
  .report-student-card-kicker{display:inline-flex;align-items:center;min-height:5mm;padding:0 2mm;border:1px solid #e9ddb0;border-radius:99px;background:#fffaf0;color:#8b6d19;font-size:6.5pt;font-weight:800}
  .report-student-card-number{color:#8a9993;font-size:6.3pt;font-weight:700}
  .report-student-identity{display:flex;align-items:center;gap:2mm;padding-bottom:2mm;border-bottom:1px solid #e8efec}
  .report-student-avatar{width:9mm;height:9mm;flex:0 0 9mm;display:grid;place-items:center;border-radius:2.6mm;background:#eaf7f1;color:#147a5e}
  .report-student-head{min-width:0;padding:0}
  .report-student-head strong{display:block;overflow:hidden;font-size:7.4pt;line-height:1.3;color:#173a33;font-weight:800;text-overflow:ellipsis;white-space:nowrap}
  .report-student-head span{display:block;margin-top:.7mm;font-size:6.5pt;color:#8a9893}
  .report-student-details{display:grid;grid-template-columns:1fr;gap:0;margin-top:.5mm}
  .report-student-card .report-info-line{grid-column:auto}
  .report-student-qr-panel{
    grid-area:qr;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;
    padding:2mm 1.5mm;
    border:1px solid #dbe7e2;
    border-radius:3.2mm;
    background:#f8fbf9;
  }
  .report-student-qr-frame{
    width:28mm;
    height:28mm;
    display:grid;
    place-items:center;
    padding:1mm;
    border:1px solid #d5e0db;
    border-radius:2.2mm;
    background:#fff;
  }
  .report-student-login-qr{
    position:static;
    width:26mm;
    height:26mm;
    object-fit:contain;
    padding:0;
    border:0;
    border-radius:1mm;
    background:#fff;
  }
  .report-student-qr-panel>strong{margin-top:1.4mm;color:#0f4c45;font-size:6.6pt;font-weight:800;text-align:center}
  .report-student-qr-panel>span{margin-top:.5mm;color:#83928d;font-size:5.6pt;text-align:center}
  .report-student-signature{display:flex;align-items:center;justify-content:space-between;gap:1.5mm;margin-top:auto;padding-top:1.5mm;border-top:1px dashed #dce7e2}
  .report-student-signature>span{color:#0f4c45;font-size:6.3pt;font-weight:800}
  .report-student-signature>small{color:#8b9994;font-size:5.3pt}
  .report-info-line{display:grid;grid-template-columns:3.2mm 17mm 1fr;gap:1mm;align-items:center;margin-top:1.4mm;padding-top:1.4mm;border-top:1px solid #edf1ef;font-size:6.2pt}.report-info-line svg{color:#55776d}.report-info-line span{color:#82928c}.report-info-line strong{font-size:6.6pt;color:#334f48;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .report-card-title{display:flex;align-items:center;gap:7px;margin-bottom:8px}.report-mini-avatar{width:30px;height:30px;display:grid;place-items:center;border-radius:8px;background:#eef6f3;color:#0f4c45}.report-card-title strong{display:block;font-size:10px}.report-card-title span{display:block;margin-top:2px;font-size:7px;color:#83928d}.report-kpi-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.report-kpi-strip.three{grid-template-columns:repeat(3,1fr)}.report-mini-kpi{padding:6px;border-radius:6px;background:#f5f8f6;text-align:center}.report-mini-kpi span{display:block;font-size:6.5px;color:#82928c}.report-mini-kpi strong{display:block;margin-top:2px;font-size:10px;color:#24463d}.report-mini-kpi.tone-red{background:#fff2f0}.report-mini-kpi.tone-gold{background:#fff9e8}.report-mini-kpi.tone-blue{background:#f0f6ff}.report-mini-kpi.tone-teal{background:#eef9f7}
  .report-rate-line{display:grid;grid-template-columns:auto auto 1fr;gap:5px;align-items:center;margin-top:8px;font-size:7px}.report-rate-line span{color:#7a8b85}.report-rate-line strong{font-size:9px}.report-rate-line>div{height:5px;border-radius:99px;background:#e7eeeb;overflow:hidden}.report-rate-line i{display:block;height:100%;background:#0f766e;border-radius:99px}.report-inline-note{display:flex;justify-content:space-between;gap:6px;margin-top:8px;padding-top:7px;border-top:1px solid #edf1ef;font-size:7px;color:#71847d}.report-inline-note span{display:flex;align-items:center;gap:3px}.report-mosque-card{display:grid;grid-template-columns:36px 1fr;gap:8px}.report-mosque-icon{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;background:#eaf7f1;color:#147a5e}.report-mosque-head strong{display:block;font-size:10px}.report-mosque-head span{display:flex;align-items:center;gap:3px;margin-top:3px;font-size:7px;color:#879690}.report-mosque-stats{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:4px;margin-top:6px}
  .report-executive-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px;page-break-inside:avoid}.report-executive-grid article{padding:12px;border:1px solid #e0e8e5;border-radius:9px;background:#fff}.report-executive-grid span{font-size:7.5px;color:#7c8d86}.report-executive-grid strong{display:block;margin-top:3px;font-size:18px;color:#0b423a}.report-executive-grid small{display:block;margin-top:4px;font-size:6.5px;color:#8c9995}
  .report-no-data{min-height:120px;display:grid;place-items:center;align-content:center;gap:5px;margin-top:8px;border:1px dashed #dbe5e1;border-radius:9px;color:#768a82}.report-no-data strong{font-size:10px}.report-no-data span{font-size:7.5px}.report-document-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px;padding:9px 12px;border-top:1px solid #dbe5e1;page-break-inside:avoid}.report-document-footer>img{width:35px;opacity:.18}.report-document-footer>div:nth-child(2){text-align:center}.report-document-footer strong{display:block;font-size:8px;color:#506a62}.report-document-footer span{display:block;margin-top:2px;font-size:6.5px;color:#8b9994}.report-footer-brand{display:flex;align-items:center;gap:4px}.report-footer-brand img{width:20px;height:20px}.report-footer-brand span{font-size:7px!important;color:#0f4c45!important;font-weight:800}
  @media print { .report-card-row,.report-summary-grid,.report-insights,.report-document-header,.report-document-footer{break-inside:avoid;page-break-inside:avoid} }
`;
