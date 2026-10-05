import {displayDateFormatter} from "../lib/calendar";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, ChevronLeft, Clock3, FileText, Loader2, ReceiptText, RefreshCw, Search, WalletCards } from "lucide-react";
import { supabase } from "../lib/supabase";

const STATUS = {
  draft:    { label: "مسودة", cls: "neutral" },
  issued:   { label: "صادرة", cls: "info" },
  pending:  { label: "بانتظار السداد", cls: "warning" },
  paid:     { label: "مدفوعة", cls: "success" },
  overdue:  { label: "متأخرة", cls: "danger" },
  void:     { label: "ملغاة", cls: "neutral" },
  refunded: { label: "مستردة", cls: "info" },
};

const money = (v, currency = "SAR") =>
  new Intl.NumberFormat("ar-SA", {
    style: "currency", currency: currency || "SAR", minimumFractionDigits: 2
  }).format(Number(v || 0));

const date = (v) => v
  ? displayDateFormatter( {
      year: "numeric", month: "short", day: "numeric"
    }).format(new Date(v))
  : "—";

export default function AdminInvoices() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  async function loadInvoices() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        mosque_id,
        subscription_id,
        status,
        total_amount,
        amount_paid,
        balance_due,
        currency,
        customer_name,
        plan_name,
        billing_cycle,
        issued_at,
        due_at,
        paid_at,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message || "تعذر تحميل الفواتير");
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  }

  useEffect(() => { loadInvoices(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const statusOk = status === "all" || r.status === status;
      const searchOk = !q || [
        r.invoice_number, r.customer_name, r.plan_name,
        String(r.mosque_id ?? ""), String(r.subscription_id ?? "")
      ].some((v) => String(v || "").toLowerCase().includes(q));
      return statusOk && searchOk;
    });
  }, [rows, search, status]);

  const stats = useMemo(() => ({
    count: rows.length,
    paid: rows.filter(r => r.status === "paid").length,
    pending: rows.filter(r => ["issued", "pending"].includes(r.status)).length,
    overdue: rows.filter(r => r.status === "overdue").length,
    paidAmount: rows.filter(r => r.status === "paid")
      .reduce((s, r) => s + Number(r.amount_paid || r.total_amount || 0), 0),
  }), [rows]);

  return (
    <div className="ai-page" dir="rtl">
      <style>{`
        .ai-page{--g:#153f31;--g2:#245e49;--gold:#a8843f;--ink:#18241e;--muted:#6b7770;
          --line:#e5e9e5;--soft:#f6f8f6;font-family:inherit;color:var(--ink)}
        .ai-head{display:flex;justify-content:space-between;gap:calc(18px * var(--app-density,1));align-items:flex-start;margin-bottom:20px}
        .ai-kicker{color:var(--gold);font-size:calc(11px * var(--app-font-scale,1));font-weight:900;letter-spacing:.7px}
        .ai-title{font-size:calc(25px * var(--app-font-scale,1));font-weight:950;margin:3px 0}.ai-sub{color:var(--muted);font-size:calc(12px * var(--app-font-scale,1))}
        .ai-refresh{height:40px;border:1px solid var(--line);background:#fff;border-radius:calc(11px * var(--app-radius-scale,1));padding:0 calc(13px * var(--app-density,1));
          display:flex;align-items:center;gap:calc(7px * var(--app-density,1));font:inherit;font-size:calc(11px * var(--app-font-scale,1));font-weight:800;cursor:pointer}
        .ai-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:calc(12px * var(--app-density,1));margin-bottom:18px}
        .ai-stat{background:#fff;border:1px solid var(--line);border-radius:calc(15px * var(--app-radius-scale,1));padding:calc(16px * var(--app-density,1));display:flex;gap:calc(12px * var(--app-density,1));align-items:center}
        .ai-stat-icon{width:38px;height:38px;border-radius:calc(11px * var(--app-radius-scale,1));display:grid;place-items:center;background:#eef5f1;color:var(--g)}
        .ai-stat-label{font-size:calc(10px * var(--app-font-scale,1));color:var(--muted);margin-bottom:2px}.ai-stat-value{font-size:calc(18px * var(--app-font-scale,1));font-weight:950}
        .ai-panel{background:#fff;border:1px solid var(--line);border-radius:calc(17px * var(--app-radius-scale,1));overflow:hidden}
        .ai-tools{padding:calc(14px * var(--app-density,1));display:flex;gap:calc(10px * var(--app-density,1));border-bottom:1px solid var(--line);background:#fcfdfc}
        .ai-search{flex:1;position:relative}.ai-search svg{position:absolute;right:12px;top:12px;color:#87928c}
        .ai-search input,.ai-select{width:100%;height:40px;border:1px solid #dfe5e1;border-radius:calc(11px * var(--app-radius-scale,1));background:#fff;font:inherit;font-size:calc(11px * var(--app-font-scale,1));outline:none}
        .ai-search input{padding:0 calc(38px * var(--app-density,1)) 0 calc(12px * var(--app-density,1))}.ai-select{width:180px;padding:0 calc(11px * var(--app-density,1));color:var(--ink)}
        .ai-table-wrap{overflow:auto}.ai-table{width:100%;border-collapse:collapse;min-width:900px}
        .ai-table th{background:#f7f9f7;color:#738078;font-size:calc(10px * var(--app-font-scale,1));text-align:right;padding:calc(11px * var(--app-density,1)) calc(14px * var(--app-density,1));border-bottom:1px solid var(--line)}
        .ai-table td{padding:calc(14px * var(--app-density,1));border-bottom:1px solid #eef0ee;font-size:calc(11.5px * var(--app-font-scale,1));vertical-align:middle}
        .ai-table tbody tr:hover{background:#fbfcfb}.ai-num{font-weight:900;font-variant-numeric:tabular-nums}
        .ai-customer{font-weight:850}.ai-small{font-size:calc(9.5px * var(--app-font-scale,1));color:var(--muted);margin-top:2px}
        .ai-badge{display:inline-flex;align-items:center;gap:calc(5px * var(--app-density,1));padding:calc(5px * var(--app-density,1)) calc(9px * var(--app-density,1));border-radius:999px;font-size:calc(9.5px * var(--app-font-scale,1));font-weight:900}
        .ai-badge.success{background:#e9f6ee;color:#17633f}.ai-badge.warning{background:#fff3dc;color:#8a5d19}
        .ai-badge.danger{background:#fae9e9;color:#9c3a3a}.ai-badge.info{background:#eaf1f7;color:#365f7e}
        .ai-badge.neutral{background:#eff1ef;color:#5f6862}
        .ai-open{width:34px;height:34px;border:1px solid var(--line);border-radius:calc(9px * var(--app-radius-scale,1));background:#fff;color:var(--g);display:grid;place-items:center;cursor:pointer}
        .ai-empty{padding:calc(55px * var(--app-density,1)) calc(20px * var(--app-density,1));text-align:center;color:var(--muted)}.ai-empty strong{display:block;color:var(--ink);margin:8px 0 3px}
        .ai-error{margin-bottom:14px;padding:calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1));border-radius:calc(12px * var(--app-radius-scale,1));background:#fff1f1;color:#8f3535;font-size:calc(11px * var(--app-font-scale,1));border:1px solid #f0d4d4}
        @media(max-width:900px){.ai-stats{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:600px){.ai-head{align-items:center}.ai-title{font-size:calc(21px * var(--app-font-scale,1))}.ai-sub{display:none}.ai-tools{display:grid}.ai-select{width:100%}.ai-stat{padding:calc(12px * var(--app-density,1))}.ai-stat-value{font-size:calc(16px * var(--app-font-scale,1))}}
      `}</style>

      <header className="ai-head">
        <div>
          <div className="ai-kicker">FINANCIAL CONTROL</div>
          <h1 className="ai-title">الفواتير</h1>
          <div className="ai-sub">متابعة فواتير اشتراكات المساجد وسجل حالاتها المالية.</div>
        </div>
        <button type="button" className="ai-refresh" onClick={loadInvoices} disabled={loading}>
          <RefreshCw size={15} className={loading ? "spin" : ""}/> تحديث
        </button>
      </header>

      {error && <div className="ai-error"><AlertTriangle size={14}/> {error}</div>}

      <section className="ai-stats">
        <Stat icon={FileText} label="إجمالي الفواتير" value={stats.count} />
        <Stat icon={CheckCircle2} label="الفواتير المدفوعة" value={stats.paid} />
        <Stat icon={Clock3} label="بانتظار السداد" value={stats.pending} />
        <Stat icon={WalletCards} label="المبالغ المسددة" value={money(stats.paidAmount)} />
      </section>

      <section className="ai-panel">
        <div className="ai-tools">
          <div className="ai-search">
            <Search size={15}/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث برقم الفاتورة، المسجد، الخطة..." />
          </div>
          <select className="ai-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">جميع الحالات</option>
            <option value="draft">مسودة</option>
            <option value="issued">صادرة</option>
            <option value="pending">بانتظار السداد</option>
            <option value="paid">مدفوعة</option>
            <option value="overdue">متأخرة</option>
            <option value="void">ملغاة</option>
            <option value="refunded">مستردة</option>
          </select>
        </div>

        {loading ? (
          <div className="ai-empty"><Loader2 size={25}/><strong>جاري تحميل الفواتير...</strong></div>
        ) : filtered.length === 0 ? (
          <div className="ai-empty">
            <ReceiptText size={28}/>
            <strong>{rows.length ? "لا توجد نتائج مطابقة" : "لا توجد فواتير حتى الآن"}</strong>
            <span>{rows.length ? "غيّر البحث أو الفلتر." : "ستظهر الفواتير هنا بعد إصدار أول فاتورة."}</span>
          </div>
        ) : (
          <div className="ai-table-wrap">
            <table className="ai-table">
              <thead><tr>
                <th>الفاتورة</th><th>العميل</th><th>الخطة</th><th>تاريخ الإصدار</th>
                <th>الإجمالي</th><th>المتبقي</th><th>الحالة</th><th></th>
              </tr></thead>
              <tbody>
                {filtered.map(r => {
                  const st = STATUS[r.status] || STATUS.issued;
                  return <tr key={r.id}>
                    <td><div className="ai-num">{r.invoice_number}</div><div className="ai-small">Subscription #{r.subscription_id ?? "—"}</div></td>
                    <td><div className="ai-customer">{r.customer_name || `مسجد #${r.mosque_id}`}</div></td>
                    <td>{r.plan_name || "—"}<div className="ai-small">{r.billing_cycle || ""}</div></td>
                    <td>{date(r.issued_at || r.created_at)}</td>
                    <td className="ai-num">{money(r.total_amount, r.currency)}</td>
                    <td className="ai-num">{money(r.balance_due, r.currency)}</td>
                    <td><span className={`ai-badge ${st.cls}`}>{st.label}</span></td>
                    <td><button type="button" className="ai-open" title="عرض الفاتورة" onClick={() => navigate(`/admin/invoices/${r.id}`)}><ChevronLeft size={16}/></button></td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="ai-stat">
    <span className="ai-stat-icon"><Icon size={18}/></span>
    <div><div className="ai-stat-label">{label}</div><div className="ai-stat-value">{value}</div></div>
  </div>;
}
