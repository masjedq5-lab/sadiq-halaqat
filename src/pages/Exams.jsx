import CalendarInput from "../components/CalendarInput";
// src/pages/Exams.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Award, BookOpenCheck, CalendarDays, Check, CheckCircle2, CircleGauge, Edit3, Eye, FileCheck2, GraduationCap, Landmark, ListChecks, Loader2, Plus, Search, Send, ShieldCheck, Sparkles, Trash2, UserPlus, Users, X } from "lucide-react";

import { supabase } from "../lib/supabase";
import { useToast } from "../components/Toast";
import {
  EXAM_STATUS_META, HIJRI_MONTHS, deriveExamStatus, formatHijri,
  getHijriMonthDays, getHijriParts, gregorianFromHijri, hijriInputFromGregorian,
} from "./examV2Utils";
import "./ExamsV2.css";

const STEPS = ["البيانات","النطاق","الفريق والطلاب","المدة","المراجعة"];

export default function Exams(){
  const {showToast}=useToast();
  const [me,setMe]=useState(null);
  const [mosques,setMosques]=useState([]);
  const [exams,setExams]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showCreate,setShowCreate]=useState(false);
  const [selectedExam,setSelectedExam]=useState(null);
  const [progressExam,setProgressExam]=useState(null);
  const [deleteExam,setDeleteExam]=useState(null);
  const [search,setSearch]=useState("");
  const [mosqueFilter,setMosqueFilter]=useState("all");
  const [statusFilter,setStatusFilter]=useState("all");
  const [questionFilter,setQuestionFilter]=useState("all");

  useEffect(()=>{loadBase();},[]);

  async function loadBase(){
    setLoading(true);

    try{
      /*
        النطاق يأتي من RPC آمن في Supabase:
        - المشرف: مساجده المرتبطة فقط.
        - الإدارة: جميع المساجد.
        هذا يمنع اعتماد الصفحة على استعلامات عامة من الواجهة.
      */
      const {data:scope,error:scopeError}=await supabase.rpc(
        "supervisor_exam_scope_v2"
      );

      if(scopeError)throw scopeError;

      const profile=scope?.profile||null;
      const mosqueRows=Array.isArray(scope?.mosques)
        ? scope.mosques
        : [];

      if(!profile?.id){
        throw new Error("تعذر تحديد حساب المشرف الحالي");
      }

      if(!["supervisor","admin"].includes(profile.role)){
        throw new Error("هذه الصفحة للمشرف أو الإدارة فقط");
      }

      setMe(profile);
      setMosques(mosqueRows);

      await loadExams(profile,mosqueRows);
    }catch(error){
      console.error("EXAMS V2 LOAD:",error);

      showToast(
        error.message==="Could not find the function public.supervisor_exam_scope_v2 without parameters in the schema cache"
          ? "تعذر تجهيز الاختبارات حاليًا. تواصل مع مدير النظام"
          : error.message||"تعذر تحميل الاختبارات",
        "error"
      );
    }finally{
      setLoading(false);
    }
  }

  async function loadExams(profile=me,mosqueRows=mosques){
    if(!profile)return;
    let query=supabase.from("exams").select(`
      *,
      mosques(name),
      exam_halaqat(halaqa_id,halaqat(name)),
      exam_teachers(teacher_id),
      exam_students(student_id,assigned_teacher_id),
      exam_results(student_id,score,is_passed),
      exam_attempts(id,student_id,teacher_id,status,approved_at)
    `).order("created_at",{ascending:false});

    if(profile.role!=="admin"){
      const ids=mosqueRows.map(x=>Number(x.id));
      if(!ids.length){setExams([]);return;}
      query=query.in("mosque_id",ids);
    }

    const {data,error}=await query;
    if(error)throw error;

    const teacherIds=[...new Set((data||[]).flatMap(e=>(e.exam_teachers||[]).map(x=>Number(x.teacher_id))).filter(Boolean))];
    const teacherMap=new Map();
    if(teacherIds.length){
      const {data:rows,error:teacherError}=await supabase.from("profiles").select("id,full_name").in("id",teacherIds);
      if(teacherError)throw teacherError;
      (rows||[]).forEach(x=>teacherMap.set(Number(x.id),x.full_name));
    }

    setExams((data||[]).map(exam=>{
      const total=exam.exam_students?.length||0;
      const results=exam.exam_results?.length||0;
      return{
        ...exam,
        derived_status:deriveExamStatus(exam),
        halaqa_names:(exam.exam_halaqat||[]).map(x=>x.halaqat?.name).filter(Boolean),
        teacher_names:(exam.exam_teachers||[]).map(x=>teacherMap.get(Number(x.teacher_id))).filter(Boolean),
        total_students:total,
        results_count:results,
        progress_percent:total?Math.round(results/total*100):0,
      };
    }));
  }

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return exams.filter(exam=>{
      if(mosqueFilter!=="all"&&Number(exam.mosque_id)!==Number(mosqueFilter))return false;
      if(statusFilter!=="all"&&exam.derived_status!==statusFilter)return false;
      if(questionFilter!=="all"&&Number(exam.questions_count||3)!==Number(questionFilter))return false;
      if(!q)return true;
      return[
        exam.title,exam.mosques?.name,
        exam.halaqa_names?.join(" "),exam.teacher_names?.join(" ")
      ].join(" ").toLowerCase().includes(q);
    });
  },[exams,search,mosqueFilter,statusFilter,questionFilter]);

  const stats=useMemo(()=>{
    const results=exams.flatMap(x=>x.exam_results||[]);
    const average=results.length?Math.round(results.reduce((s,r)=>s+Number(r.score||0),0)/results.length):0;
    return{
      total:exams.length,
      active:exams.filter(x=>x.derived_status==="active").length,
      drafts:exams.filter(x=>x.derived_status==="draft").length,
      students:exams.reduce((s,x)=>s+Number(x.total_students||0),0),
      average,
    };
  },[exams]);

  async function removeExam(exam){
    try{
      const {error}=await supabase.rpc("supervisor_delete_exam_v2",{p_exam_id:Number(exam.id)});
      if(error)throw error;
      setDeleteExam(null);
      showToast("تم حذف الاختبار","success");
      await loadExams();
    }catch(error){
      showToast(error.message||"تعذر حذف الاختبار","error");
    }
  }

  if(loading)return <div className="exv2-page"><div className="exv2-loading"><Loader2 className="exv2-spin" size={28}/>جارٍ تجهيز نظام الاختبارات…</div></div>;

  return(
    <div className="exv2-page">
      <section className="exv2-hero">
        <div>
          <span className="exv2-kicker"><ShieldCheck size={14}/>منظومة الاختبارات </span>
          <h1>الاختبارات</h1>
          <p>إنشاء احترافي، نطاق لكل طالب، أسئلة يحددها المشرف، توزيع على المختبرين، واعتماد ومتابعة من مكان واحد.</p>

          {me?.role==="supervisor"&&(
            <div className="exv2-scope-badge">
              <ShieldCheck size={13}/>
              <span>
                نطاقك الحالي: {mosques.length} {mosques.length===1?"مسجد":"مساجد"}
              </span>
            </div>
          )}
        </div>
        <button type="button" className="exv2-primary" onClick={()=>setShowCreate(true)}><Plus size={16}/>إنشاء اختبار جديد</button>
      </section>

      <section className="exv2-stats">
        <Stat icon={FileCheck2} label="الاختبارات" value={stats.total} note="جميع الاختبارات"/>
        <Stat icon={CircleGauge} label="جارٍ الآن" value={stats.active} note="ضمن المدة"/>
        <Stat icon={Edit3} label="مسودات" value={stats.drafts} note="قبل الاعتماد"/>
        <Stat icon={Users} label="الطلاب" value={stats.students} note="إجمالي المشاركات"/>
        <Stat icon={Award} label="متوسط النتائج" value={`${stats.average}%`} note="المعتمد حتى الآن"/>
      </section>

      <section className="exv2-toolbar">
        <Field label="بحث"><div className="exv2-search"><Search size={15}/><input className="exv2-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="اسم الاختبار، الحلقة، المعلم..."/></div></Field>
        <Field label="المسجد"><select className="exv2-select" value={mosqueFilter} onChange={e=>setMosqueFilter(e.target.value)}><option value="all">كل المساجد</option>{mosques.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <Field label="الحالة"><select className="exv2-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option value="all">كل الحالات</option>{Object.entries(EXAM_STATUS_META).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}</select></Field>
        <Field label="عدد الأسئلة"><select className="exv2-select" value={questionFilter} onChange={e=>setQuestionFilter(e.target.value)}><option value="all">3 و 6 أسئلة</option><option value="3">3 أسئلة</option><option value="6">6 أسئلة</option></select></Field>
      </section>

      {!filtered.length?<div className="exv2-empty"><GraduationCap size={30}/><strong>لا توجد اختبارات مطابقة</strong><span>أنشئ اختبارًا جديدًا أو غيّر الفلاتر.</span></div>:
      <section className="exv2-grid">{filtered.map(exam=><ExamCard key={exam.id} exam={exam} onView={()=>setSelectedExam(exam)} onProgress={()=>setProgressExam(exam)} onDelete={()=>setDeleteExam(exam)}/>)}</section>}

      {showCreate&&<CreateExamWizard mosques={mosques} onClose={()=>setShowCreate(false)} onCreated={async()=>{setShowCreate(false);await loadExams();}}/>}
      {selectedExam&&<ExamDetailsModal exam={selectedExam} onClose={()=>setSelectedExam(null)} onUpdated={async()=>{await loadExams();}}/>}
      {progressExam&&<ExamProgressModal exam={progressExam} onClose={()=>setProgressExam(null)}/>}
      {deleteExam&&<ConfirmDeleteExam exam={deleteExam} onCancel={()=>setDeleteExam(null)} onConfirm={()=>removeExam(deleteExam)}/>}
    </div>
  );
}

function Stat({icon:Icon,label,value,note}){return <article className="exv2-stat"><div className="exv2-stat-icon"><Icon size={20}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>}
function Field({label,children}){return <div className="exv2-field"><label>{label}</label>{children}</div>}

function ExamCard({exam,onView,onProgress,onDelete}){
  const meta=EXAM_STATUS_META[exam.derived_status]||EXAM_STATUS_META.draft;
  return <article className="exv2-card">
    <div className="exv2-card-top"><div><h3>{exam.title}</h3><p>{exam.mosques?.name||"مسجد"} • {exam.questions_count||3} أسئلة</p></div><span className={`exv2-status ${meta.tone}`}>{meta.label}</span></div>
    <div className="exv2-card-meta">
      <Meta label="الحلقات" value={exam.halaqa_names?.length?exam.halaqa_names.join("، "):"—"}/>
      <Meta label="المختبرون" value={exam.teacher_names?.length?exam.teacher_names.join("، "):"—"}/>
      <Meta label="الطلاب" value={`${exam.total_students||0} طالب`}/>
      <Meta label="المدة" value={`${formatHijri(exam.start_date||exam.exam_date)} — ${formatHijri(exam.end_date||exam.exam_date)}`}/>
    </div>
    <div className="exv2-progress"><div className="exv2-progress-head"><span>تقدم النتائج</span><strong>{exam.results_count||0} / {exam.total_students||0}</strong></div><div className="exv2-track"><div className="exv2-fill" style={{width:`${exam.progress_percent||0}%`}}/></div></div>
    <div className="exv2-card-actions">
      <button type="button" className="view" onClick={onView}><Eye size={14}/>عرض وإدارة</button>
      <button type="button" className="progress" onClick={onProgress}><CircleGauge size={14}/>التقدم</button>
      <button type="button" className="delete" onClick={onDelete}><Trash2 size={13}/>حذف</button>
    </div>
  </article>;
}
function Meta({label,value}){return <div className="exv2-meta"><span>{label}</span><strong>{value}</strong></div>}

/* ========================= CREATE ========================= */
function CreateExamWizard({mosques,onClose,onCreated}){
  const {showToast}=useToast();
  const [step,setStep]=useState(0),[saving,setSaving]=useState(false);
  const [title,setTitle]=useState(""),[questionsCount,setQuestionsCount]=useState(3),[passingScore,setPassingScore]=useState(60);
  const [mosqueId,setMosqueId]=useState(""),[halaqat,setHalaqat]=useState([]),[selectedHalaqat,setSelectedHalaqat]=useState([]);
  const [teachers,setTeachers]=useState([]),[selectedTeachers,setSelectedTeachers]=useState([]);
  const [students,setStudents]=useState([]),[selectedStudents,setSelectedStudents]=useState([]);
  const h=getHijriParts(new Date());
  const [fromHijri,setFromHijri]=useState(h),[toHijri,setToHijri]=useState(h);

  useEffect(()=>{
    if(mosques.length===1){
      setMosqueId(current=>current||String(mosques[0].id));
    }
  },[mosques.length]);

  

  const selectedHalaqatKey=useMemo(
    ()=>selectedHalaqat.slice().sort((a,b)=>a-b).join(","),
    [selectedHalaqat]
  );

  

  async function loadHalaqat(){
    const {data,error}=await supabase.from("halaqat").select("id,name,mosque_id,status,halaqa_period").eq("mosque_id",Number(mosqueId)).order("name");
    if(error)return showToast("تعذر تحميل الحلقات","error");
    setHalaqat(data||[]);
  }

  useEffect(()=>{
      if(!mosqueId)return;
      loadHalaqat();
    },[mosqueId]);
  async function loadPeople(){
    const selectedIds=selectedHalaqat.map(Number);

    /*
      المعلمون المختبرون:
      جميع المعلمين المرتبطين بأي حلقة داخل المسجد المختار،
      وليس فقط معلمي الحلقات التي سيدخل طلابها الاختبار.

      الطلاب:
      يبقون فقط من الحلقات التي اختارها المشرف للاختبار.
    */
    const mosqueHalaqaIds=halaqat.map(h=>Number(h.id)).filter(Boolean);

    const [tr,sr]=await Promise.all([
      mosqueHalaqaIds.length
        ? supabase
            .from("teacher_halaqat")
            .select("teacher_id,profiles!teacher_halaqat_teacher_id_fkey(id,full_name,user_number,role,status,is_active)")
            .in("halaqa_id",mosqueHalaqaIds)
        : Promise.resolve({data:[],error:null}),

      supabase
        .from("student_halaqat")
        .select("student_id,halaqa_id,is_current,profiles!student_halaqat_student_id_fkey(id,full_name,user_number,status,is_active)")
        .in("halaqa_id",selectedIds)
        .eq("is_current",true)
    ]);

    if(tr.error)return showToast("تعذر تحميل معلمي المسجد","error");
    if(sr.error)return showToast("تعذر تحميل الطلاب","error");

    setTeachers(
      Array.from(
        new Map(
          (tr.data||[])
            .map(x=>x.profiles)
            .filter(profile=>
              profile &&
              profile.role==="teacher" &&
              profile.status!=="archived" &&
              profile.is_active!==false
            )
            .map(profile=>[Number(profile.id),profile])
        ).values()
      ).sort((a,b)=>
        String(a.full_name||"").localeCompare(
          String(b.full_name||""),
          "ar"
        )
      )
    );

    setStudents(
      Array.from(
        new Map(
          (sr.data||[])
            .filter(x=>
              x.profiles &&
              x.profiles.status==="active" &&
              x.profiles.is_active!==false
            )
            .map(x=>[
              Number(x.student_id),
              {
                ...x.profiles,
                halaqa_id:Number(x.halaqa_id)
              }
            ])
        ).values()
      ).sort((a,b)=>
        String(a.full_name||"").localeCompare(
          String(b.full_name||""),
          "ar"
        )
      )
    );
  }

  useEffect(()=>{
      if(!selectedHalaqatKey)return;
      loadPeople();
    },[selectedHalaqatKey]);

  function toggle(id,setter){setter(c=>c.includes(Number(id))?c.filter(x=>x!==Number(id)):[...c,Number(id)]);}
  function validate(){
    if(step===0&&!title.trim()){showToast("اكتب اسم الاختبار","error");return false;}
    if(step===1&&(!mosqueId||!selectedHalaqat.length)){showToast("اختر المسجد والحلقات","error");return false;}
    if(step===2&&(!selectedTeachers.length||!selectedStudents.length)){showToast("اختر المعلمين والطلاب","error");return false;}
    if(step===3){
      const start=gregorianFromHijri(fromHijri),end=gregorianFromHijri(toHijri);
      if(end<start){showToast("تاريخ النهاية يجب أن يكون بعد البداية","error");return false;}
    }
    return true;
  }
  async function create(){
    if(!validate())return;
    setSaving(true);
    try{
      const {error}=await supabase.rpc("supervisor_create_exam_v2",{
        p_title:title.trim(),
        p_mosque_id:Number(mosqueId),
        p_questions_count:Number(questionsCount),
        p_passing_score:Number(passingScore),
        p_start_date:gregorianFromHijri(fromHijri),
        p_end_date:gregorianFromHijri(toHijri),
        p_halaqa_ids:selectedHalaqat.map(Number),
        p_teacher_ids:selectedTeachers.map(Number),
        p_student_ids:selectedStudents.map(Number),
      });
      if(error)throw error;
      showToast("تم إنشاء الاختبار كمسودة. الآن حدد الأجزاء والأسئلة.","success");
      await onCreated();
    }catch(error){console.error("CREATE EXAM V2:",error);showToast(error.message||"تعذر إنشاء الاختبار","error");}
    finally{setSaving(false);}
  }

  return <Modal title="إنشاء اختبار جديد" subtitle="خمس خطوات مرتبة" icon={GraduationCap} onClose={onClose}>
    <div className="exv2-steps">{STEPS.map((s,i)=><div key={s} className={`exv2-step ${step===i?"active":""}`}><b>{i+1}</b><span>{s}</span></div>)}</div>

    {step===0&&<section className="exv2-section">
      <Title icon={FileCheck2}>بيانات الاختبار</Title>
      <div className="exv2-form-grid">
        <Field label="اسم الاختبار"><input className="exv2-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="اختبار منتصف الفصل"/></Field>
        <Field label="نوع الاختبار"><select className="exv2-select" disabled><option>القرآن الكريم</option></select></Field>
        <Field label="عدد الأسئلة"><select className="exv2-select" value={questionsCount} onChange={e=>setQuestionsCount(Number(e.target.value))}><option value={3}>3 أسئلة</option><option value={6}>6 أسئلة</option></select></Field>
        <Field label="درجة النجاح"><input className="exv2-input" type="number" min="1" max="100" value={passingScore} onChange={e=>setPassingScore(Number(e.target.value))}/></Field>
      </div>
      <Info good icon={Sparkles}>عدد الأسئلة ثابت لجميع الطلاب: 3 أو 6. لا تحتاج إلى تجهيز أسئلة يدويًا لكل طالب.</Info>
    </section>}

    {step===1&&<>
      <section className="exv2-section"><Title icon={Landmark}>المسجد</Title><Field label="المسجد التابع للمشرف"><select
        className="exv2-select"
        value={mosqueId}
        onChange={e=>{
          setMosqueId(e.target.value);
          setSelectedHalaqat([]);
          setTeachers([]);
          setSelectedTeachers([]);
          setStudents([]);
          setSelectedStudents([]);
        }}
      >
        <option value="">اختر المسجد</option>
        {mosques.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {mosques.length===1&&(
        <div className="exv2-field-hint">
          تم اختيار مسجدك المرتبط بحساب المشرف تلقائيًا.
        </div>
      )}
      </Field></section>
      <section className="exv2-section"><Title icon={BookOpenCheck}>الحلقات التابعة</Title>{!halaqat.length?<SmallEmpty text="اختر المسجد أولًا أو لا توجد حلقات"/>:<div className="exv2-choice-grid">{halaqat.map(h=><Choice key={h.id} active={selectedHalaqat.includes(Number(h.id))} title={h.name} subtitle="حلقة تابعة للمسجد" onClick={()=>toggle(h.id,setSelectedHalaqat)}/>)}</div>}</section>
    </>}

    {step===2&&<>
      <section className="exv2-section"><Title icon={Users}>المعلمون المختبرون</Title>{!teachers.length?<SmallEmpty text="لا يوجد معلمون ضمن الحلقات المحددة"/>:<div className="exv2-choice-grid">{teachers.map(t=><Choice key={t.id} active={selectedTeachers.includes(Number(t.id))} title={t.full_name} subtitle={t.user_number||"معلم"} onClick={()=>toggle(t.id,setSelectedTeachers)}/>)}</div>}</section>
      <section className="exv2-section"><Title icon={Users}>الطلاب</Title>
        {!!students.length&&<div style={{display:"flex",gap:"calc(6px * var(--app-density,1))",marginBottom:8}}><button type="button" className="exv2-secondary" onClick={()=>setSelectedStudents(students.map(s=>Number(s.id)))}>تحديد الجميع</button><button type="button" className="exv2-secondary" onClick={()=>setSelectedStudents([])}>إلغاء الجميع</button></div>}
        {!students.length?<SmallEmpty text="لا يوجد طلاب نشطون"/>:<div className="exv2-choice-grid">{students.map(s=><Choice key={s.id} active={selectedStudents.includes(Number(s.id))} title={s.full_name} subtitle={s.user_number||"طالب"} onClick={()=>toggle(s.id,setSelectedStudents)}/>)}</div>}
      </section>
    </>}

    {step===3&&<section className="exv2-section"><Title icon={CalendarDays}>مدة الاختبار</Title><div className="exv2-form-grid"><HijriDate label="من" value={fromHijri} onChange={setFromHijri}/><HijriDate label="إلى" value={toHijri} onChange={setToHijri}/></div><Info good icon={CheckCircle2}>يُعرض التاريخ وفق التقويم الافتراضي في الإعدادات.</Info></section>}

    {step===4&&<section className="exv2-section"><Title icon={CheckCircle2}>المراجعة النهائية</Title><div className="exv2-review">
      <Review label="الاختبار" value={title}/><Review label="المسجد" value={mosques.find(m=>Number(m.id)===Number(mosqueId))?.name||"—"}/><Review label="الحلقات" value={`${selectedHalaqat.length} حلقة`}/>
      <Review label="المعلمون" value={`${selectedTeachers.length} معلم`}/><Review label="الطلاب" value={`${selectedStudents.length} طالب`}/><Review label="عدد الأسئلة" value={`${questionsCount} أسئلة`}/>
      <Review label="من" value={`${fromHijri.day} ${HIJRI_MONTHS[fromHijri.month-1]} ${fromHijri.year} هـ`}/><Review label="إلى" value={`${toHijri.day} ${HIJRI_MONTHS[toHijri.month-1]} ${toHijri.year} هـ`}/><Review label="درجة النجاح" value={`${passingScore}/100`}/>
    </div><Info icon={AlertTriangle}>سيُنشأ الاختبار كمسودة. بعد ذلك حدد أجزاء كل طالب والمختبر المسؤول عنه قبل الاعتماد.</Info></section>}

    <div className="exv2-modal-foot">
      <button type="button" className="exv2-secondary" onClick={()=>step===0?onClose():setStep(step-1)}>{step===0?"إلغاء":"السابق"}</button>
      {step<4?<button type="button" className="exv2-primary exv2-next-btn" onClick={()=>{if(validate())setStep(step+1)}}>التالي</button>:<button type="button" className="exv2-primary" disabled={saving} onClick={create}>{saving?<Loader2 className="exv2-spin" size={14}/>:<Check size={14}/>}إنشاء كمسودة</button>}
    </div>
  </Modal>;
}

/* ========================= DETAILS ========================= */
function ExamDetailsModal({exam,onClose,onUpdated}){
  const {showToast}=useToast();
  const [tab,setTab]=useState("overview"),[loading,setLoading]=useState(true),[data,setData]=useState(null);
  const [title,setTitle]=useState(exam.title||""),[questionsCount,setQuestionsCount]=useState(Number(exam.questions_count||3)),[passingScore,setPassingScore]=useState(Number(exam.passing_score||60));
  const [fromHijri,setFromHijri]=useState(hijriInputFromGregorian(exam.start_date||exam.exam_date));
  const [toHijri,setToHijri]=useState(hijriInputFromGregorian(exam.end_date||exam.exam_date));
  const [partsStudent,setPartsStudent]=useState(null),[addStudents,setAddStudents]=useState(false);
  const [busy,setBusy]=useState(false);

  

  async function load(){
    setLoading(true);

    try{
      const {data:payload,error}=await supabase.rpc(
        "supervisor_exam_details_v2",
        {
          p_exam_id:Number(exam.id)
        }
      );

      if(error)throw error;

      setData({
        halaqat:Array.isArray(payload?.halaqat)
          ? payload.halaqat
          : [],

        teachers:Array.isArray(payload?.teachers)
          ? payload.teachers
          : [],

        students:Array.isArray(payload?.students)
          ? payload.students.map(student=>({
              ...student,
              student_id:Number(student.student_id),
              assigned_teacher_id:student.assigned_teacher_id
                ? Number(student.assigned_teacher_id)
                : null,
              parts:Array.isArray(student.parts)
                ? student.parts.map(Number)
                : [],
              questions:Array.isArray(student.questions)
                ? student.questions
                : [],
            }))
          : [],

        attempts:Array.isArray(payload?.attempts)
          ? payload.attempts
          : [],

        results:Array.isArray(payload?.results)
          ? payload.results
          : [],
      });
    }catch(error){
      console.error("LOAD EXAM DETAILS V2:",error);
      showToast(
        error.message||"تعذر تحميل تفاصيل الاختبار",
        "error"
      );
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{load();},[exam.id]);

  const readiness=useMemo(()=>{
    const rows=data?.students||[];
    const missingParts=rows.filter(s=>!s.parts.length).length;
    const unassigned=rows.filter(s=>!s.assigned_teacher_id).length;

    return{
      ready:rows.length>0&&!missingParts&&!unassigned,
      missingParts,
      unassigned
    };
  },[data]);

  const status=deriveExamStatus(exam);

  async function saveSettings(){
    setBusy(true);
    try{
      const {error}=await supabase.rpc("supervisor_update_exam_v2",{
        p_exam_id:Number(exam.id),p_title:title.trim(),p_questions_count:Number(questionsCount),
        p_passing_score:Number(passingScore),p_start_date:gregorianFromHijri(fromHijri),p_end_date:gregorianFromHijri(toHijri)
      });
      if(error)throw error;
      showToast("تم حفظ بيانات الاختبار","success");await onUpdated();await load();
    }catch(error){showToast(error.message||"تعذر حفظ التعديلات","error");}finally{setBusy(false);}
  }

  async function assignTeacher(studentId,teacherId){
    const {error}=await supabase.rpc("supervisor_assign_exam_student_teacher",{p_exam_id:Number(exam.id),p_student_id:Number(studentId),p_teacher_id:teacherId?Number(teacherId):null});
    if(error)return showToast(error.message,"error");
    await load();
  }
  async function autoDistribute(){
    const {error}=await supabase.rpc("supervisor_auto_distribute_exam_teachers",{p_exam_id:Number(exam.id)});
    if(error)return showToast(error.message,"error");
    showToast("تم توزيع الطلاب بالتساوي","success");await load();
  }
  async function removeStudent(studentId){
    if(!window.confirm("حذف الطالب من الاختبار مع أجزائه وأسئلته؟"))return;
    const {error}=await supabase.rpc("supervisor_remove_exam_student_v2",{p_exam_id:Number(exam.id),p_student_id:Number(studentId)});
    if(error)return showToast(error.message,"error");
    showToast("تم حذف الطالب","success");await load();
  }
  async function approve(){
    setBusy(true);
    try{
      const {error}=await supabase.rpc("supervisor_approve_exam_v2",{p_exam_id:Number(exam.id)});
      if(error)throw error;
      showToast("تم اعتماد الاختبار ورفعه للمعلمين","success");await onUpdated();onClose();
    }catch(error){showToast(error.message||"تعذر الاعتماد","error");}finally{setBusy(false);}
  }

  if(loading)return <Modal title="إدارة الاختبار" subtitle="جارٍ تحميل البيانات" icon={GraduationCap} onClose={onClose} large><div className="exv2-loading"><Loader2 className="exv2-spin" size={26}/>جارٍ التحميل…</div></Modal>;

  return <>
    <Modal title="إدارة الاختبار" subtitle="البيانات، الطلاب، الأجزاء والأسئلة" icon={GraduationCap} onClose={onClose} large>
      <div className="exv2-card" style={{marginBottom:10}}><div className="exv2-card-top"><div><h3>{title}</h3><p>{exam.mosques?.name||"مسجد"} • {questionsCount} أسئلة • {formatHijri(exam.start_date||exam.exam_date)}</p></div><span className={`exv2-status ${EXAM_STATUS_META[status]?.tone||"neutral"}`}>{EXAM_STATUS_META[status]?.label||"مسودة"}</span></div></div>
      <div className="exv2-tabs">{[["overview","البيانات"],["students","الطلاب والأسئلة"],["progress","التقدم"]].map(([k,l])=><button type="button" key={k} className={`exv2-tab ${tab===k?"active":""}`} onClick={()=>setTab(k)}>{l}</button>)}</div>

      {tab==="overview"&&<>
        <section className="exv2-section">
          <Title icon={Edit3}>بيانات الاختبار</Title>
          <div className="exv2-form-grid three">
            <Field label="اسم الاختبار"><input className="exv2-input" value={title} onChange={e=>setTitle(e.target.value)} disabled={status!=="draft"}/></Field>
            <Field label="عدد الأسئلة"><select className="exv2-select" value={questionsCount} onChange={e=>setQuestionsCount(Number(e.target.value))} disabled={status!=="draft"}><option value={3}>3 أسئلة</option><option value={6}>6 أسئلة</option></select></Field>
            <Field label="درجة النجاح"><input className="exv2-input" type="number" value={passingScore} onChange={e=>setPassingScore(Number(e.target.value))} disabled={status!=="draft"}/></Field>
            <HijriDate label="من" value={fromHijri} onChange={setFromHijri} disabled={status!=="draft"}/>
            <HijriDate label="إلى" value={toHijri} onChange={setToHijri} disabled={status!=="draft"}/>
            <Field label="الحلقات"><input className="exv2-input" value={data?.halaqat?.map(x=>x.name).join("، ")||"—"} disabled/></Field>
          </div>
          {status==="draft"&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}><button type="button" className="exv2-primary" onClick={saveSettings} disabled={busy}><Check size={14}/>حفظ التعديلات</button></div>}
        </section>
      </>}

      {tab==="students"&&<section className="exv2-section">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:"calc(8px * var(--app-density,1))",flexWrap:"wrap"}}>
          <Title icon={ListChecks}>إعداد الطلاب</Title>
          {status==="draft"&&<div style={{display:"flex",gap:"calc(6px * var(--app-density,1))",flexWrap:"wrap"}}><button type="button" className="exv2-secondary" onClick={autoDistribute}><Users size={14}/>توزيع المختبرين</button><button type="button" className="exv2-secondary" onClick={()=>setAddStudents(true)}><UserPlus size={14}/>إضافة طلاب</button><button type="button" className="exv2-primary" disabled={!readiness.ready||busy} onClick={approve}><Send size={15}/>اعتماد ورفع للمعلمين</button></div>}
        </div>
        <Info good={readiness.ready} icon={readiness.ready?CheckCircle2:AlertTriangle}>{readiness.ready?"الاختبار جاهز للاعتماد والرفع للمعلمين.":`ناقص: ${readiness.missingParts} بدون أجزاء، ${readiness.unassigned} بدون مختبر.`}</Info>
        <div className="exv2-table-wrap" style={{marginTop:10}}><table className="exv2-table"><thead><tr><th>الطالب</th><th>المختبر</th><th>الأجزاء</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>
          {(data?.students||[]).map(st=>{
            const ready=st.parts.length&&st.assigned_teacher_id;
            return <tr key={st.student_id}>
              <td><div className="exv2-student"><div className="exv2-avatar">{(st.student_name||"ط")[0]}</div><div><strong>{st.student_name}</strong><span>{st.user_number||"بدون رقم"}</span></div></div></td>
              <td><select className="exv2-select" value={st.assigned_teacher_id||""} onChange={e=>assignTeacher(st.student_id,e.target.value)} disabled={status!=="draft"}><option value="">اختر المختبر</option>{(data?.teachers||[]).map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></td>
              <td><div className="exv2-parts">{st.parts.length?st.parts.map(p=><span className="exv2-chip" key={p}>ج{p}</span>):<span style={{color:"#a54037"}}>لم تحدد</span>}</div></td>
              <td><span className={`exv2-status ${ready?"success":"warning"}`}>{ready?"جاهز":"ناقص"}</span></td>
              <td><div className="exv2-row-actions"><button type="button" className="parts" disabled={status!=="draft"} onClick={()=>setPartsStudent(st)}><BookOpenCheck size={13}/>الأجزاء</button><button type="button" className="remove" disabled={status!=="draft"} onClick={()=>removeStudent(st.student_id)}><Trash2 size={12}/>حذف</button></div></td>
            </tr>;
          })}
        </tbody></table></div>

      </section>}

      {tab==="progress"&&<ProgressContent data={data} exam={exam} onFinalized={async()=>{await onUpdated();await load();}}/>}
    </Modal>

    {partsStudent&&<PartsModal
      exam={exam}
      student={partsStudent}
      onClose={()=>setPartsStudent(null)}
      onSaved={async(savedParts)=>{
        const studentId=Number(partsStudent.student_id);

        setData(current=>current?{
          ...current,
          students:(current.students||[]).map(row=>
            Number(row.student_id)===studentId
              ? {
                  ...row,
                  parts:savedParts,
                  questions:[],
                }
              : row
          ),
        }:current);

        setPartsStudent(null);
        await load();
      }}
    />}
    
    {addStudents&&<AddStudentsModal exam={exam} existing={data?.students||[]} onClose={()=>setAddStudents(false)} onSaved={async()=>{setAddStudents(false);await load();}}/>}
  </>;
}

/* ========================= PARTS ========================= */
function PartsModal({exam,student,onClose,onSaved}){
  const {showToast}=useToast();
  const [selected,setSelected]=useState(student.parts||[]),[saving,setSaving]=useState(false);
  async function save(){
    if(!selected.length)return showToast("حدد جزءًا واحدًا على الأقل","error");
    setSaving(true);
    try{
      const {data,error}=await supabase.rpc(
        "supervisor_save_exam_student_parts_v2",
        {
          p_exam_id:Number(exam.id),
          p_student_id:Number(student.student_id),
          p_parts:selected.map(Number)
        }
      );

      if(error)throw error;

      const savedParts=Array.isArray(data?.parts)
        ? data.parts.map(Number)
        : selected.map(Number);

      showToast("تم حفظ أجزاء الطالب","success");
      await onSaved(savedParts);
    }catch(error){showToast(error.message||"تعذر حفظ الأجزاء","error");}finally{setSaving(false);}
  }
  return <Modal title={`أجزاء ${student.student_name}`} subtitle="نطاق الأسئلة من أصل 30 جزء" icon={BookOpenCheck} onClose={onClose}>
    <section className="exv2-section"><div className="exv2-juz-grid">{Array.from({length:30},(_,i)=>i+1).map(p=><button type="button" key={p} className={`exv2-juz ${selected.includes(p)?"active":""}`} onClick={()=>setSelected(c=>c.includes(p)?c.filter(x=>x!==p):[...c,p].sort((a,b)=>a-b))}>{p}</button>)}</div></section>
    <div className="exv2-modal-foot"><button type="button" className="exv2-secondary" onClick={onClose}>إلغاء</button><button type="button" className="exv2-primary" disabled={saving} onClick={save}><Check size={14}/>حفظ الأجزاء</button></div>
  </Modal>;
}

/* ========================= ADD STUDENTS ========================= */
function AddStudentsModal({exam,existing,onClose,onSaved}){
  const {showToast}=useToast();
  const [rows,setRows]=useState([]),[selected,setSelected]=useState([]),[search,setSearch]=useState(""),[loading,setLoading]=useState(true);
  
  async function load(){
    try{
      const {data:links,error}=await supabase.from("exam_halaqat").select("halaqa_id").eq("exam_id",exam.id);if(error)throw error;
      const ids=(links||[]).map(x=>Number(x.halaqa_id));if(!ids.length){setRows([]);return;}
      const {data,error:studentError}=await supabase.from("student_halaqat").select("student_id,halaqa_id,is_current,profiles!student_halaqat_student_id_fkey(id,full_name,user_number,status,is_active)").in("halaqa_id",ids).eq("is_current",true);if(studentError)throw studentError;
      const exists=new Set(existing.map(x=>Number(x.student_id)));
      setRows(Array.from(new Map((data||[]).filter(x=>x.profiles&&!exists.has(Number(x.student_id))&&x.profiles.status==="active"&&x.profiles.is_active!==false).map(x=>[Number(x.student_id),x.profiles])).values()));
    }catch(error){showToast(error.message||"تعذر تحميل الطلاب","error");}finally{setLoading(false);}
  }

  useEffect(()=>{load();},[]);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return !q?rows:rows.filter(x=>[x.full_name,x.user_number].join(" ").toLowerCase().includes(q));},[rows,search]);
  async function save(){
    if(!selected.length)return showToast("اختر طالبًا واحدًا على الأقل","error");
    const {error}=await supabase.rpc("supervisor_add_exam_students_v2",{p_exam_id:Number(exam.id),p_student_ids:selected.map(Number)});
    if(error)return showToast(error.message,"error");
    showToast("تمت إضافة الطلاب","success");await onSaved();
  }
  return <Modal title="إضافة طلاب" subtitle="من حلقات الاختبار" icon={UserPlus} onClose={onClose}>
    <section className="exv2-section"><div className="exv2-search" style={{marginBottom:9}}><Search size={15}/><input className="exv2-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن الطالب"/></div>
      {loading?<SmallEmpty text="جارٍ التحميل…"/>:!filtered.length?<SmallEmpty text="لا يوجد طلاب إضافيون"/>:<div className="exv2-choice-grid">{filtered.map(s=><Choice key={s.id} active={selected.includes(Number(s.id))} title={s.full_name} subtitle={s.user_number||"طالب"} onClick={()=>setSelected(c=>c.includes(Number(s.id))?c.filter(x=>x!==Number(s.id)):[...c,Number(s.id)])}/>)}</div>}
    </section>
    <div className="exv2-modal-foot"><button type="button" className="exv2-secondary" onClick={onClose}>إلغاء</button><button type="button" className="exv2-primary" disabled={!selected.length} onClick={save}><Plus size={14}/>إضافة {selected.length||""}</button></div>
  </Modal>;
}

/* ========================= PROGRESS ========================= */
function ExamProgressModal({exam,onClose}){
  const [loading,setLoading]=useState(true),[data,setData]=useState(null);
  
  async function load(){
    try{
      const [s,a,r,t]=await Promise.all([
        supabase.from("exam_students").select("student_id,assigned_teacher_id").eq("exam_id",exam.id),
        supabase.from("exam_attempts").select("*").eq("exam_id",exam.id),
        supabase.from("exam_results").select("*").eq("exam_id",exam.id),
        supabase.from("exam_teachers").select("teacher_id").eq("exam_id",exam.id),
      ]);
      const err=[s,a,r,t].find(x=>x.error)?.error;if(err)throw err;
      setData({students:s.data||[],attempts:a.data||[],results:r.data||[],teachers:t.data||[]});
    }finally{setLoading(false);}
  }

  useEffect(()=>{load();},[exam.id]);
  return <Modal title={`تقدم: ${exam.title}`} subtitle="متابعة التنفيذ والنتائج" icon={CircleGauge} onClose={onClose}>{loading?<div className="exv2-loading"><Loader2 className="exv2-spin" size={24}/>جارٍ الحساب…</div>:<ProgressContent data={data} exam={exam}/>}</Modal>;
}
function ProgressContent({data,exam,onFinalized}){
  const {showToast}=useToast();
  const [finalizing,setFinalizing]=useState(false);
  const [finalizedNow,setFinalizedNow]=useState(false);
  const students=data?.students||[],attempts=data?.attempts||[],results=data?.results||[];
  const started=new Set(attempts.map(x=>Number(x.student_id))).size;
  const inProgress=attempts.filter(x=>x.status==="in_progress").length;
  const completed=attempts.filter(x=>["completed","approved"].includes(x.status)).length;
  const avg=results.length?Math.round(results.reduce((s,r)=>s+Number(r.score||0),0)/results.length):0;
  const allResults=students.length>0&&results.length===students.length;
  const finalized=finalizedNow||Boolean(exam?.results_finalized_at)||exam?.workflow_status==="completed";

  async function finalizeResults(){
    if(!allResults||finalized)return;
    const ok=window.confirm(`سيتم اعتماد النتائج النهائية للاختبار وإرسال النتيجة لكل طالب، وإصدار شهادة إنجاز للطلاب المجتازين.\n\nهل تريد المتابعة؟`);
    if(!ok)return;
    setFinalizing(true);
    try{
      const {data:result,error}=await supabase.rpc("supervisor_finalize_exam_results_v2",{p_exam_id:Number(exam.id)});
      if(error)throw error;
      setFinalizedNow(true);
      showToast(`تم اعتماد النتائج وإرسالها للطلاب${result?.certificates!=null?` — الشهادات: ${result.certificates}`:""}`,"success");
      await onFinalized?.();
    }catch(error){
      const map={SOME_RESULTS_MISSING:"بعض الطلاب لم تُعتمد نتائجهم بعد.",SOME_RESULTS_NOT_APPROVED_BY_TEACHERS:"يوجد طلاب لم يعتمد المعلم نتائجهم بعد."};
      showToast(map[error.message]||error.message||"تعذر اعتماد النتائج النهائية","error");
    }finally{setFinalizing(false);}
  }

  return <section className="exv2-section">
    <div className="exv2-progress-grid">
      <ProgressCard label="إجمالي الطلاب" value={students.length}/><ProgressCard label="لم يبدأ" value={Math.max(students.length-started,0)}/><ProgressCard label="جارٍ" value={inProgress}/><ProgressCard label="اختبارات مكتملة" value={completed}/>
      <ProgressCard label="نتائج معتمدة" value={results.length}/><ProgressCard label="المتوسط" value={`${avg}%`}/><ProgressCard label="نسبة الإنجاز" value={`${students.length?Math.round(results.length/students.length*100):0}%`}/><ProgressCard label="المختبرون" value={data?.teachers?.length||0}/>
    </div>
    <div className={`exv2-readiness ${finalized||allResults?"ok":"bad"}`} style={{marginTop:10}}>
      <CheckCircle2 size={16}/>
      <div>{finalized?"تم اعتماد النتائج النهائية وإرسالها للطلاب.":allResults?"جميع نتائج الطلاب جاهزة. يمكنك اعتماد النتائج النهائية الآن ليصل الإشعار وتظهر الشهادات للطلاب.":`النتائج المكتملة: ${results.length} من ${students.length}.`}</div>
    </div>
    {!finalized&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:10}}>
      <button type="button" className="exv2-primary" disabled={!allResults||finalizing} onClick={finalizeResults}>
        {finalizing?<Loader2 className="exv2-spin" size={15}/>:<Award size={15}/>}
        اعتماد النتائج النهائية وإرسالها للطلاب
      </button>
    </div>}
  </section>;
}
function ProgressCard({label,value}){return <div className="exv2-progress-card"><span>{label}</span><strong>{value}</strong></div>}

/* ========================= SHARED ========================= */
function Modal({title,subtitle,icon:Icon,onClose,children,large=false}){
  const content=(
    <div className="exv2-modal" role="dialog" aria-modal="true">
      <section className={`exv2-modal-card ${large?"large":""}`}>
        <header className="exv2-modal-head">
          <div className="exv2-modal-title">
            <div className="exv2-modal-title-icon"><Icon size={18}/></div>
            <div><strong>{title}</strong><span>{subtitle}</span></div>
          </div>
          <button type="button" className="exv2-close" onClick={onClose} aria-label="إغلاق">
            <X size={17}/>
          </button>
        </header>
        <div className="exv2-modal-body">{children}</div>
      </section>
    </div>
  );

  /*
    Portal مهم هنا لأن Teacher/Supervisor Layout قد يحتوي
    transform / overflow / fixed layers. بدون Portal يمكن أن يصبح
    position:fixed تابعًا للحاوية بدل نافذة المتصفح وينزاح الـ Modal.
  */
  return typeof document!=="undefined"
    ? createPortal(content,document.body)
    : content;
}
function Title({icon:Icon,children}){return <div className="exv2-section-title"><Icon size={16}/>{children}</div>}
function Choice({active,title,subtitle,onClick}){return <button type="button" className={`exv2-choice ${active?"active":""}`} onClick={onClick}><div className="exv2-choice-check"><Check size={13}/></div><div><strong>{title}</strong><span>{subtitle}</span></div></button>}
function Info({good=false,icon:Icon,children}){return <div className={`exv2-readiness ${good?"ok":"bad"}`}><Icon size={16}/><div>{children}</div></div>}
function Review({label,value}){return <div className="exv2-review-card"><span>{label}</span><strong>{value}</strong></div>}
function SmallEmpty({text}){return <div style={{padding:"calc(18px * var(--app-density,1))",border:"1px dashed #cbd9d3",borderRadius:"calc(12px * var(--app-radius-scale,1))",color:"#7c8b85",textAlign:"center",fontSize:"calc(10px * var(--app-font-scale,1))"}}>{text}</div>}
function HijriDate({label,value,onChange,disabled=false}){
  return <Field label={label}><CalendarInput aria-label={label} value={gregorianFromHijri(value)} disabled={disabled} required
    onChange={e=>{if(e.target.value)onChange(hijriInputFromGregorian(e.target.value));}} /></Field>;
}
function ConfirmDeleteExam({exam,onCancel,onConfirm}){return <Modal title="حذف الاختبار نهائيًا" subtitle={exam.title} icon={Trash2} onClose={onCancel}><Info icon={AlertTriangle}>سيتم حذف الاختبار نهائيًا مع جميع بياناته المرتبطة: الطلاب، المختبرون، الحلقات، الأجزاء، الأسئلة، المحاولات، الدرجات، النتائج والشهادات. لا يمكن التراجع عن هذا الإجراء.</Info><div className="exv2-modal-foot"><button type="button" className="exv2-secondary" onClick={onCancel}>إلغاء</button><button type="button" className="exv2-danger" onClick={onConfirm}><Trash2 size={14}/>حذف نهائي بكل البيانات</button></div></Modal>}
