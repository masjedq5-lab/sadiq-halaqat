import {displayDateFormatter, calendarLocale} from "../../lib/calendar";
import { Save, BadgeCheck, Printer, FileSpreadsheet } from "lucide-react";

export default function MonthlyHeader({
  onSave,
  onApprove,
  onExportExcel,
  onExportPdf,
  onPrint,
  selectedMonth,
  loading
}){

let monthText = "";

if (selectedMonth) {

  const date =
    new Date(
      `${selectedMonth}-01`
    );

  const gregorian =
    date.toLocaleDateString(calendarLocale(),
      {
        year: "numeric",
        month: "long"
      }
    );

  const hijri =
    displayDateFormatter(
      {
        year: "numeric",
        month: "long"
      }
    ).format(date);

  monthText =
    `${gregorian} • ${hijri}`;
}
  return (
    <div
      style={{
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center",
        marginBottom:"28px",
        gap:"calc(20px * var(--app-density,1))",
        flexWrap:"wrap"
      }}
    >

      <div>
        <h1
          style={{
            margin:0,
            fontSize:"calc(34px * var(--app-font-scale,1))",
            fontWeight:"900",
            color:"#0F172A"
          }}
        >
          الإنجاز الشهري
        </h1>

        <div
          style={{
            color:"#64748B",
            marginTop:"8px",
            fontSize:"calc(15px * var(--app-font-scale,1))"
          }}
        >
          متابعة حفظ ومراجعة طلاب الحلقة
        </div>
{
  monthText &&
  (
    <div
      style={{
        marginTop:"10px",
        color:"var(--app-color-0f766e,#0F766E)",
        fontWeight:"700",
        fontSize:"calc(14px * var(--app-font-scale,1))"
      }}
    >
      {monthText}
    </div>
  )
}
      </div>

     <div
  style={{
    display:"flex",
    gap:"calc(12px * var(--app-density,1))",
    flexWrap:"wrap"
  }}
>

  <button type="button"
    onClick={onExportExcel}
    style={{
      border:"none",
      background:"#EFF6FF",
      color:"#1D4ED8",
      padding:"calc(14px * var(--app-density,1)) calc(18px * var(--app-density,1))",
      borderRadius:"calc(14px * var(--app-radius-scale,1))",
      fontWeight:"800",
      cursor:"pointer",
      display:"flex",
      alignItems:"center",
      gap:"calc(8px * var(--app-density,1))"
    }}
  >
    <FileSpreadsheet size={18}/>
    Excel
  </button>



  <button type="button"
    onClick={onPrint}
    style={{
      border:"none",
      background:"#F8FAFC",
      color:"#334155",
      padding:"calc(14px * var(--app-density,1)) calc(18px * var(--app-density,1))",
      borderRadius:"calc(14px * var(--app-radius-scale,1))",
      fontWeight:"800",
      cursor:"pointer",
      display:"flex",
      alignItems:"center",
      gap:"calc(8px * var(--app-density,1))"
    }}
  >
    <Printer size={18}/>
    طباعة
  </button>

  <button type="button"
    onClick={onApprove}
    style={{
      border:"none",
      background:"#ECFDF5",
      color:"#065F46",
      padding:"calc(14px * var(--app-density,1)) calc(20px * var(--app-density,1))",
      borderRadius:"calc(14px * var(--app-radius-scale,1))",
      fontWeight:"800",
      cursor:"pointer",
      display:"flex",
      alignItems:"center",
      gap:"calc(8px * var(--app-density,1))"
    }}
  >
    <BadgeCheck size={18}/>
    اعتماد
  </button>

  <button type="button"
    onClick={onSave}
    disabled={loading}
    style={{
      border:"none",
      background:
        "linear-gradient(135deg,var(--app-color-0f766e,#0F766E),var(--app-color-115e59,#115E59))",
      color:"#fff",
      padding:"calc(14px * var(--app-density,1)) calc(22px * var(--app-density,1))",
      borderRadius:"calc(14px * var(--app-radius-scale,1))",
      fontWeight:"900",
      cursor:"pointer",
      display:"flex",
      alignItems:"center",
      gap:"calc(8px * var(--app-density,1))",
      boxShadow:
        "0 10px 30px color-mix(in srgb,var(--app-color-0f766e,#0f766e) 25%,transparent)"
    }}
  >
    <Save size={18}/>
    حفظ
  </button>

</div>

    </div>
  );
}
