import AppSelect from "../AppSelect";
import { Search } from "lucide-react";

const hijriMonths = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة"
];

const currentHijriYear =
  parseInt(
    new Intl.DateTimeFormat(
      "en-US-u-ca-islamic-umalqura-nu-latn",
      {
        year:"numeric"
      }
    ).format(new Date()),
    10
  );

const hijriYears = [];

for(
  let year = currentHijriYear - 1;
  year <= currentHijriYear + 2;
  year++
){
  hijriYears.push(year);
}

export default function MonthlyFilters({

  
  halaqat,


  selectedHalaqa,

  selectedYear,
  selectedMonth,

  onMosqueChange,
  onHalaqaChange,

  onYearChange,
  onMonthChange,

  onLoad

}) {

  return (

    <div
      style={{
        background:"#fff",
        borderRadius:"calc(22px * var(--app-radius-scale,1))",
        padding:"calc(24px * var(--app-density,1))",
        border:"1px solid #E2E8F0",
        marginBottom:"24px"
      }}
    >

      <div
        style={{
          display:"grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(260px,1fr))",
          gap:"calc(16px * var(--app-density,1))"
        }}
      >

       

        <AppSelect
          label="الحلقة"
          value={selectedHalaqa}
          onChange={onHalaqaChange}
          options={halaqat.map(x=>({
            label:x.name,
            value:x.id
          }))}
        />

 <AppSelect
  label="السنة الهجرية"
  value={selectedYear}
  onChange={onYearChange}
  options={Array.from(
    { length: 101 },
    (_, i) => ({
      label: String(1400 + i),
      value: String(1400 + i)
    })
  )}
/>

<AppSelect
  label="الشهر الهجري"
  value={selectedMonth}
  onChange={onMonthChange}
  options={hijriMonths.map((month,index)=>({
    label: month,
    value: String(index + 1).padStart(2,"0")
  }))}
/>

        <button type="button"
          onClick={onLoad}
          style={{
            border:"none",
            borderRadius:"calc(14px * var(--app-radius-scale,1))",
            background:
              "linear-gradient(135deg,var(--app-color-0f766e,#0F766E),var(--app-color-115e59,#115E59))",
            color:"#fff",
            fontWeight:"900",
            cursor:"pointer",
            minHeight:"54px",
            alignSelf:"end",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            gap:"calc(8px * var(--app-density,1))"
          }}
        >
          <Search size={18}/>
          تحميل البيانات
        </button>

      </div>

    </div>
  );
}
