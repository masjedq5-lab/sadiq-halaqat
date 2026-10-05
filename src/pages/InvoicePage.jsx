import {displayDateFormatter} from "../lib/calendar";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight, Building2, CheckCircle2, CircleDollarSign, FileText,
  Landmark, Loader2, Printer, ReceiptText, ShieldCheck, UserRound
} from "lucide-react";
import { supabase } from "../lib/supabase";

const STATUS = {
  draft:{label:"مسودة",cls:"neutral"}, issued:{label:"صادرة",cls:"info"},
  pending:{label:"بانتظار السداد",cls:"warning"}, paid:{label:"مدفوعة",cls:"success"},
  overdue:{label:"متأخرة",cls:"danger"}, void:{label:"ملغاة",cls:"neutral"},
  refunded:{label:"مستردة",cls:"info"},
};
const money=(v,c="SAR")=>new Intl.NumberFormat("ar-SA",{style:"currency",currency:c||"SAR",minimumFractionDigits:2}).format(Number(v||0));
const dt=(v,withTime=false)=>v?displayDateFormatter(withTime?{year:"numeric",month:"long",day:"numeric",hour:"numeric",minute:"2-digit"}:{year:"numeric",month:"long",day:"numeric"}).format(new Date(v)):"—";

function Mark(){return <div className="iv-mark"><svg viewBox="0 0 64 64"><path d="M32 17C25 11 16 9 8 12v35c9-3 17-1 24 5V17Z"/><path d="M32 17c7-6 16-8 24-5v35c-9-3-17-1-24 5V17Z"/><path className="line" d="M32 18v34"/></svg></div>}
function Block({icon:Icon,title,children}){return <section className="iv-block"><div className="iv-block-title"><span><Icon size={14}/></span>{title}</div>{children}</section>}

export default function InvoicePage(){
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice,setInvoice]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{let alive=true;(async()=>{
    setLoading(true);setError("");
    const {data,error}=await supabase.from("invoices").select("*").eq("id",invoiceId).maybeSingle();
    if(!alive)return;
    if(error)setError(error.message||"تعذر تحميل الفاتورة");
    else if(!data)setError("الفاتورة غير موجودة أو لا تملك صلاحية عرضها.");
    else setInvoice(data);
    setLoading(false);
  })();return()=>{alive=false}},[invoiceId]);

  const status=STATUS[invoice?.status]||STATUS.issued;
  const items=useMemo(()=>invoice?[{
    description:invoice.description||"اشتراك استخدام نظام الصديق",
    details:[invoice.plan_name,invoice.billing_cycle].filter(Boolean).join(" · "),
    quantity:Number(invoice.quantity||1),unitPrice:Number(invoice.unit_price||invoice.subtotal||0),
    total:Number(invoice.subtotal||invoice.total_amount||0)
  }]:[],[invoice]);

  if(loading)return <State icon={Loader2} title="جاري تجهيز الفاتورة" text="يتم تحميل النسخة المالية المحفوظة..." />;
  if(error)return <State title="تعذر عرض الفاتورة" text={error} action={()=>navigate("/admin/invoices")} />;
  if(!invoice)return null;

  return <div className="iv-screen" dir="rtl">
    <style>{`
      .iv-screen{--g:#153f31;--gold:#a8843f;--ink:#17221d;--muted:#68756e;--line:#e7e7df;background:#f2f4f1;min-height:100vh;padding:22px;font-family:inherit;color:var(--ink)}
      .iv-toolbar{width:min(1000px,100%);margin:0 auto 12px;display:flex;justify-content:space-between;align-items:center}.iv-tools{display:flex;gap:8px}
      .iv-btn{height:40px;border:1px solid #dce2dd;border-radius:11px;background:#fff;padding:0 13px;display:flex;align-items:center;gap:7px;font:inherit;font-size:11px;font-weight:850;cursor:pointer}.iv-btn.primary{background:var(--g);color:#fff;border-color:var(--g)}
      .iv-paper{position:relative;overflow:hidden;width:min(1000px,100%);min-height:1370px;margin:auto;background:#fffefa;border:1px solid #e3e4dd;border-radius:17px;box-shadow:0 20px 60px rgba(24,49,39,.11);padding:55px 58px 42px}
      .iv-paper:before{content:"";position:absolute;top:0;right:0;left:0;height:7px;background:linear-gradient(90deg,var(--g),var(--gold),var(--g))}
      .iv-water{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:.022}.iv-water svg{width:390px;fill:var(--g)}
      .iv-head{position:relative;display:flex;justify-content:space-between;gap:30px;padding-bottom:25px;border-bottom:1px solid var(--line)}
      .iv-brand{display:flex;align-items:center;gap:14px}.iv-mark{width:56px;height:56px;border-radius:16px;background:var(--g);display:grid;place-items:center}.iv-mark svg{width:37px;fill:#d3b66e}.iv-mark .line{fill:none;stroke:#f4e3b4;stroke-width:1.6}
      .iv-brand-name{font-size:24px;font-weight:950}.iv-brand-sub{font-size:10.5px;color:var(--muted)}
      .iv-heading{text-align:left}.iv-heading small{color:var(--gold);font-size:9px;font-weight:900;letter-spacing:1px}.iv-heading h1{font-size:27px;margin:4px 0 0}.iv-heading p{font-size:9px;color:var(--muted);letter-spacing:1px;margin:2px 0}
      .iv-meta{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:13px;overflow:hidden;margin:23px 0 26px}.iv-meta>div{background:#fff;padding:14px 16px}.iv-label{font-size:9.5px;color:var(--muted);margin-bottom:4px}.iv-value{font-size:13px;font-weight:900}
      .iv-badge{display:inline-flex;gap:5px;align-items:center;padding:5px 9px;border-radius:999px;font-size:9.5px;font-weight:900}.iv-badge.success{background:#e8f5ed;color:#17623e}.iv-badge.warning{background:#fff4dd;color:#93651e}.iv-badge.danger{background:#faeaea;color:#9d3b3b}.iv-badge.info{background:#eaf1f8;color:#345e80}.iv-badge.neutral{background:#f0f1ef;color:#5d665f}
      .iv-parties{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:23px}.iv-block{border:1px solid var(--line);border-radius:14px;padding:17px 18px;background:rgba(255,255,255,.76)}.iv-block-title{display:flex;align-items:center;gap:7px;color:var(--g);font-size:11px;font-weight:900;margin-bottom:11px}.iv-block-title span{width:25px;height:25px;border-radius:7px;background:#eef5f1;display:grid;place-items:center}.iv-block strong{font-size:13px;display:block;margin-bottom:5px}.iv-line{font-size:10.5px;color:var(--muted);line-height:1.9}.iv-line b{color:var(--ink)}
      .iv-service{border:1px solid #dce7e1;border-radius:15px;background:linear-gradient(135deg,#f7fbf8,#fffdf7);padding:19px 21px;margin-bottom:25px}.iv-service strong{font-size:13px}.iv-service-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:13px}.iv-service-grid b{font-size:11px}
      .iv-section{display:flex;align-items:center;gap:7px;color:var(--g);font-size:12px;font-weight:900;margin:0 0 10px}
      .iv-table-wrap{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:22px}.iv-table{width:100%;border-collapse:collapse}.iv-table th{background:#f5f7f4;color:#6e7a73;font-size:9.5px;text-align:right;padding:11px 13px}.iv-table td{padding:15px 13px;font-size:11px;border-top:1px solid #efefe9}.iv-item{font-weight:850}.iv-detail{font-size:9px;color:var(--muted);margin-top:3px}
      .iv-fin{display:grid;grid-template-columns:1.1fr .9fr;gap:20px}.iv-pay,.iv-totals{border:1px solid var(--line);border-radius:14px;overflow:hidden}.iv-pay{padding:10px 16px}.iv-row{display:flex;justify-content:space-between;gap:15px;padding:9px 0;border-bottom:1px dashed #e5e6df;font-size:10.5px}.iv-row:last-child{border:0}.iv-row span:first-child{color:var(--muted)}.iv-total{display:flex;justify-content:space-between;padding:10px 15px;font-size:10.5px;border-bottom:1px solid #eee}.iv-total span{color:var(--muted)}.iv-total.grand{background:var(--g);color:#fff;padding:15px;font-size:14px}.iv-total.grand span{color:#dceae3}.iv-total:last-child{border:0}
      .iv-note{margin-top:23px;padding:12px 14px;border-radius:11px;background:#f6f0e3;color:#68562e;font-size:9.8px;display:flex;gap:8px;line-height:1.8}
      .iv-footer{margin-top:38px;padding-top:17px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;color:var(--muted);font-size:9px}.iv-verify{display:flex;gap:5px;align-items:center;color:var(--g);font-weight:850;margin-top:5px}
      @media(max-width:700px){.iv-screen{padding:9px}.iv-paper{padding:34px 21px;min-height:auto}.iv-parties,.iv-fin{grid-template-columns:1fr}.iv-meta{grid-template-columns:1fr 1fr}.iv-meta>div:first-child{grid-column:1/-1}.iv-table-wrap{overflow:auto}.iv-table{min-width:570px}.iv-btn span{display:none}}
      @media(max-width:470px){.iv-head{display:block}.iv-heading{text-align:right;margin-top:18px}.iv-meta{grid-template-columns:1fr}.iv-meta>div:first-child{grid-column:auto}.iv-service-grid{grid-template-columns:1fr}}
      @page{size:A4;margin:9mm}@media print{.iv-screen{padding:0;background:#fff}.iv-toolbar{display:none}.iv-paper{width:100%;min-height:277mm;border:0;border-radius:0;box-shadow:none;padding:12mm}.iv-block,.iv-service,.iv-fin,.iv-table-wrap{break-inside:avoid}*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}}
    `}</style>

    <div className="iv-toolbar">
      <button type="button" className="iv-btn" onClick={()=>navigate("/admin/invoices")}><ArrowRight size={15}/><span>الفواتير</span></button>
      <div className="iv-tools"><button type="button" className="iv-btn primary" onClick={()=>window.print()}><Printer size={15}/><span>طباعة / حفظ PDF</span></button></div>
    </div>

    <main className="iv-paper">
      <div className="iv-water"><svg viewBox="0 0 64 64"><path d="M32 17C25 11 16 9 8 12v35c9-3 17-1 24 5V17Z"/><path d="M32 17c7-6 16-8 24-5v35c-9-3-17-1-24 5V17Z"/></svg></div>
      <header className="iv-head">
        <div className="iv-brand"><Mark/><div><div className="iv-brand-name">الصِّديق</div><div className="iv-brand-sub">نظام إدارة حلقات القرآن الكريم</div></div></div>
        <div className="iv-heading"><small>DOCUMENT / INVOICE</small><h1>فاتورة اشتراك</h1><p>SUBSCRIPTION INVOICE</p></div>
      </header>

      <section className="iv-meta">
        <div><div className="iv-label">رقم الفاتورة</div><div className="iv-value">{invoice.invoice_number}</div></div>
        <div><div className="iv-label">تاريخ الإصدار</div><div className="iv-value">{dt(invoice.issued_at||invoice.created_at)}</div></div>
        <div><div className="iv-label">الحالة</div><span className={`iv-badge ${status.cls}`}>{invoice.status==="paid"&&<CheckCircle2 size={12}/>} {status.label}</span></div>
      </section>

      <div className="iv-parties">
        <Block icon={Building2} title="مقدم الخدمة">
          <strong>{invoice.seller_legal_name||"—"}</strong>
          <div className="iv-line">السجل التجاري: <b>{invoice.seller_cr_number||"—"}</b></div>
          <div className="iv-line">العنوان: <b>{invoice.seller_address||"—"}</b></div>
          <div className="iv-line">التواصل: <b>{invoice.seller_phone||invoice.seller_email||"—"}</b></div>
        </Block>
        <Block icon={UserRound} title="العميل">
          <strong>{invoice.customer_name||`مسجد #${invoice.mosque_id}`}</strong>
          <div className="iv-line">جهة التواصل: <b>{invoice.customer_contact_name||"—"}</b></div>
          <div className="iv-line">رقم التواصل: <b>{invoice.customer_phone||"—"}</b></div>
          <div className="iv-line">مرجع الاشتراك: <b>#{invoice.subscription_id||"—"}</b></div>
        </Block>
      </div>

      <section className="iv-service">
        <strong>{invoice.description||"اشتراك استخدام نظام الصديق لإدارة حلقات القرآن الكريم"}</strong>
        <div className="iv-service-grid">
          <div><div className="iv-label">الخطة / دورة الفوترة</div><b>{invoice.plan_name||"—"} · {invoice.billing_cycle||"—"}</b></div>
          <div><div className="iv-label">فترة الخدمة</div><b>{dt(invoice.billing_period_start)} — {dt(invoice.billing_period_end)}</b></div>
        </div>
      </section>

      <h2 className="iv-section"><ReceiptText size={16}/> تفاصيل الفاتورة</h2>
      <div className="iv-table-wrap"><table className="iv-table"><thead><tr><th style={{width:"48%"}}>الوصف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead><tbody>
        {items.map((x,i)=><tr key={i}><td><div className="iv-item">{x.description}</div><div className="iv-detail">{x.details}</div></td><td>{x.quantity}</td><td>{money(x.unitPrice,invoice.currency)}</td><td><b>{money(x.total,invoice.currency)}</b></td></tr>)}
      </tbody></table></div>

      <div className="iv-fin">
        <section><h2 className="iv-section"><Landmark size={16}/> معلومات السداد</h2><div className="iv-pay">
          <div className="iv-row"><span>طريقة الدفع</span><b>{invoice.payment_method||"—"}</b></div>
          <div className="iv-row"><span>مرجع العملية</span><b>{invoice.payment_reference||"—"}</b></div>
          <div className="iv-row"><span>تاريخ السداد</span><b>{dt(invoice.paid_at,true)}</b></div>
        </div></section>
        <section><h2 className="iv-section"><CircleDollarSign size={16}/> ملخص المبالغ</h2><div className="iv-totals">
          <div className="iv-total"><span>المجموع</span><b>{money(invoice.subtotal,invoice.currency)}</b></div>
          <div className="iv-total grand"><span>الإجمالي المستحق</span><b>{money(invoice.total_amount,invoice.currency)}</b></div>
          <div className="iv-total"><span>المدفوع</span><b>{money(invoice.amount_paid,invoice.currency)}</b></div>
          <div className="iv-total"><span>المتبقي</span><b>{money(invoice.balance_due,invoice.currency)}</b></div>
        </div></section>
      </div>

      <div className="iv-note"><FileText size={15}/><div><b>فاتورة اشتراك غير ضريبية.</b> لا تتضمن هذه الوثيقة ضريبة قيمة مضافة أو رقمًا ضريبيًا.</div></div>
      <footer className="iv-footer"><div>هذه الوثيقة تعرض Snapshot البيانات المحفوظة عند إصدار الفاتورة.<div className="iv-verify"><ShieldCheck size={12}/> وثيقة إلكترونية صادرة من نظام الصديق</div></div><div>{invoice.invoice_number} · صفحة 1 من 1</div></footer>
    </main>
  </div>
}

function State({icon:Icon=FileText,title,text,action}){
  return <div dir="rtl" style={{minHeight:"60vh",display:"grid",placeItems:"center",fontFamily:"inherit"}}>
    <div style={{textAlign:"center",maxWidth:420,padding:30}}>{Icon&&<Icon size={30}/>}<h2>{title}</h2><p style={{color:"#6b7770",fontSize:13}}>{text}</p>{action&&<button type="button" onClick={action} style={{marginTop:10,padding:"10px 18px",border:0,borderRadius:10,background:"#153f31",color:"#fff",cursor:"pointer"}}>العودة للفواتير</button>}</div>
  </div>
}
