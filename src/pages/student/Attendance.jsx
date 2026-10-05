import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, CheckCircle2, Clock3, ShieldCheck, UserX } from "lucide-react";
import StudentPage from "../../components/student/StudentPage";
import { useStudentPortal } from "../../context/StudentPortalContext";
import { supabase } from "../../lib/supabase";
import { formatGregorianDate, formatHijriDate, formatNumber } from "../../lib/studentPortalUtils";
import "./StudentPortal.css";

const STATUS = {
  present:{label:"حاضر",className:"student-attendance-present"},
  absent:{label:"غائب",className:"student-attendance-absent"},
  late:{label:"متأخر",className:"student-attendance-late"},
  excused:{label:"بعذر",className:"student-attendance-excused"},
};

export default function StudentAttendance() {
  const { profile } = useStudentPortal();
  const [loading,setLoading] = useState(true);
  const [rows,setRows] = useState([]);

  

  async function load(){
    if(!profile?.id)return;
    try{
      setLoading(true);
      const {data,error}=await supabase.from("attendance")
        .select("id, attendance_date, status, notes")
        .eq("student_id",profile.id).order("attendance_date",{ascending:false}).limit(120);
      if(error)throw error;
      setRows(data||[]);
    }catch(error){console.error("Student attendance:",error)}
    finally{setLoading(false)}
  }

  useEffect(()=>{load();},[profile?.id]);

  const stats=useMemo(()=>{
    const present=rows.filter(r=>r.status==="present").length;
    const absent=rows.filter(r=>r.status==="absent").length;
    const late=rows.filter(r=>r.status==="late").length;
    const excused=rows.filter(r=>r.status==="excused").length;
    const total=rows.length;
    const rate=total?Math.round(((present+late)/total)*100):0;
    return{present,absent,late,excused,rate};
  },[rows]);

  return (
    <StudentPage
      eyebrow="التزامي"
      title="حضوري"
      description="سجل واضح للحضور والغياب والتأخر، حتى تعرف مستوى انتظامك بنفسك."
      icon={CalendarCheck}
    >
      <section className="student-metrics">
        <Metric icon={CheckCircle2} label="حاضر" value={formatNumber(stats.present)} note="جلسة مسجلة"/>
        <Metric icon={UserX} label="غياب" value={formatNumber(stats.absent)} note="بدون عذر"/>
        <Metric icon={ShieldCheck} label="بعذر" value={formatNumber(stats.excused)} note="غياب بعذر"/>
        <Metric icon={Clock3} label="نسبة الحضور" value={`${stats.rate}%`} note={`${formatNumber(stats.late)} حالة تأخر`}/>
      </section>

      <section className="student-panel">
        <div className="student-panel-head">
          <div className="student-panel-title">
            <div className="student-panel-title-icon"><CalendarDays size={19}/></div>
            <div><span>السجل</span><h3>أيام الحضور</h3></div>
          </div>
        </div>

        {loading?(
          <div className="student-loading">جارٍ تحميل الحضور…</div>
        ):!rows.length?(
          <div className="student-empty"><CalendarCheck size={29}/><strong>لا توجد سجلات حضور بعد</strong></div>
        ):(
          <div className="student-list">
            {rows.map(row=>{
              const meta=STATUS[row.status]||{label:row.status,className:""};
              return(
                <div className="student-list-row" key={row.id}>
                  <div className="student-list-avatar"><CalendarDays size={16}/></div>
                  <div className="student-list-copy">
                    <strong>{formatHijriDate(row.attendance_date)}</strong>
                    <span>{row.notes||"بدون ملاحظات"}</span>
                  </div>
                  <strong className={meta.className}>{meta.label}</strong>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </StudentPage>
  );
}
function Metric({icon:Icon,label,value,note}){return <article className="student-metric"><div className="student-metric-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>}
