import CalendarInput from "./CalendarInput";
import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { supabase } from "../lib/supabase";
 
import AppSelect from "./AppSelect";

import { useToast } from "./Toast";

export default function CreateExamModal({
  onClose,
  onCreated,
  exam,
}) {

  const [loading,setLoading] =
    useState(false);


  const [mosques,setMosques] =
    useState([]);

  const [halaqat,setHalaqat] =
    useState([]);

  const [teachers,setTeachers] =
    useState([]);

  const [students,setStudents] =
    useState([]);

  const [types,setTypes] =
    useState([]);

const { showToast } = useToast();


  const [form, setForm] = useState({
  title: "",

  mosque_id: "",

  halaqa_ids: [],
  teacher_ids: [],
  student_ids: [],

  exam_type_id: "",

  exam_scope: "surah",

  selected_parts: [],

  exam_date: "",

  from_surah: "",
  from_ayah: "",

  to_surah: "",
  to_ayah: "",

  total_score: 100,
  passing_score: 70,

  notes: "",
});



useEffect(() => {
  loadInitial();
}, []);

useEffect(() => {
  

  

  

}, [form]);

useEffect(() => {

  if (!exam) return;







  setForm({

    title: exam.title || "",

    mosque_id: exam.mosque_id || "",

    halaqa_ids: [
  ...new Set(
    exam.exam_halaqat?.map(
      h => h.halaqa_id
    ) || []
  )
],

teacher_ids: [
  ...new Set(
    exam.exam_teachers?.map(
      t => t.teacher_id
    ) || []
  )
],

student_ids:
  exam.exam_students?.map(
    s => s.student_id
  ) || [],

    exam_type_id: exam.exam_type_id || "",

    exam_scope:
      exam.from_surah
        ? "surah"
        : "parts",

    selected_parts: [],

    exam_date: exam.exam_date || "",

    from_surah: exam.from_surah || "",
    from_ayah: exam.from_ayah || "",

    to_surah: exam.to_surah || "",
    to_ayah: exam.to_ayah || "",

    total_score: exam.total_score || 100,

    passing_score: exam.passing_score || 70,

    notes: exam.notes || "",

  });

  if (exam.mosque_id) {

  loadHalaqat(exam.mosque_id);

}

(async () => {

  if (exam.exam_halaqat?.length) {

    const halaqaIds =
      exam.exam_halaqat.map(
        h => h.halaqa_id
      );

    await loadTeachers(halaqaIds);
    await loadStudents(halaqaIds);

  }

})();

}, [exam]);


async function loadInitial(){

const {data,error}=await supabase
.from("exam_types")
.select("*");










setTypes(data || []);


const mosqueIds = [
  ...new Set(
    halaqatRows.map(
      h => h.mosque_id
    )
  )
];

const mosqueResult =
  await supabase
    .from("mosques")
    .select("*")
    .in(
      "id",
      mosqueIds
    )
    .order("name");




setMosques(
mosqueResult.data || []
);

}




async function loadHalaqat() {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } =
    await supabase
      .from("profiles")
      .select("id")
      .eq(
        "auth_user_id",
        user.id
      )
      .single();

  const {
    data: teacherHalaqat,
    error,
  } = await supabase
    .from("teacher_halaqat")
    .select(`
      halaqat(
        id,
        name,
        mosque_id
      )
    `)
    .eq(
      "teacher_id",
      profile.id
    );

  if (error) {
    console.error(error);
    return;
  }

  const halaqatRows =
    teacherHalaqat?.map(
      item => item.halaqat
    ) || [];

  setHalaqat(halaqatRows);
}



async function loadTeachers(halaqaIds){

  const ids = halaqaIds.map(Number);

  const { data: links, error } = await supabase
    .from("teacher_halaqat")
    .select("teacher_id")
    .in("halaqa_id", ids);

  if(error){
    console.error(error);
    setTeachers([]);
    return;
  }

  const teacherIds = [
    ...new Set(
      links.map(x => x.teacher_id)
    )
  ];

  if(!teacherIds.length){
    setTeachers([]);
    return;
  }

  const { data } = await supabase
    .from("profiles")
    .select("id,full_name")
    .in("id", teacherIds);

  setTeachers(data || []);
}

async function loadStudents(halaqaIds){

  const ids = halaqaIds.map(Number);

  const { data, error } = await supabase
    .from("student_halaqat")
    .select(`
      student_id,
      profiles(
        id,
        full_name
      )
    `)
    .in("halaqa_id", ids)
    .eq("is_current", true);

  if(error){
    console.error(error);
    setStudents([]);
    return;
  }

  const uniqueStudents =
    data.filter(
      (student,index,self)=>
        index === self.findIndex(
          s => s.student_id === student.student_id
        )
    );

  setStudents(uniqueStudents);
}







async function save(){


try{


setLoading(true);

const allowedHalaqaIds =
  halaqat.map(
    h => Number(h.id)
  );

const valid =
  form.halaqa_ids.every(
    id =>
      allowedHalaqaIds.includes(
        Number(id)
      )
  );

if (!valid) {

  showToast(
    "لا يمكنك إنشاء اختبار لحلقة لا تتبعك",
    "error"
  );

  setLoading(false);

  return;
}

const payload = {

  title: form.title,

  exam_type: types.find(
    x => Number(x.id) === Number(form.exam_type_id)
  )?.name,

  exam_type_id: Number(form.exam_type_id),

  halaqa_id:
    form.halaqa_ids.length
      ? Number(form.halaqa_ids[0])
      : null,

  mosque_id:
    form.mosque_id
      ? Number(form.mosque_id)
      : null,

  teacher_id:
  form.teacher_ids?.length
    ? Number(form.teacher_ids[0])
    : null,

  exam_date: form.exam_date,

  from_surah: form.from_surah || null,
  from_ayah: form.from_ayah || null,

  to_surah: form.to_surah || null,
  to_ayah: form.to_ayah || null,

  total_score: Number(form.total_score),

  passing_score: Number(form.passing_score),

  notes: form.notes || null,

  status: "scheduled",

};

let savedExam;
let error;

if (exam) {

  const result = await supabase
    .from("exams")
    .update(payload)
    .eq("id", exam.id)
    .select()
    .single();

  savedExam = result.data;
  error = result.error;

} else {

  const result = await supabase
    .from("exams")
    .insert(payload)
    .select()
    .single();

  savedExam = result.data;
  error = result.error;

}

if (error) {
  
  throw error;
}

const uniqueHalaqat = [
  ...new Set(form.halaqa_ids)
];

const uniqueTeachers = [
  ...new Set(form.teacher_ids)
];








if (exam) {

  await supabase
    .from("exam_students")
    .delete()
    .eq("exam_id", savedExam.id);

  const delTeachers = await supabase
  .from("exam_teachers")
  .delete()
  .eq("exam_id", savedExam.id);



  const delHalaqat = await supabase
  .from("exam_halaqat")
  .delete()
  .eq("exam_id", savedExam.id);


const checkHalaqat = await supabase
  .from("exam_halaqat")
  .select("*")
  .eq("exam_id", savedExam.id);



const checkTeachers = await supabase
  .from("exam_teachers")
  .select("*")
  .eq("exam_id", savedExam.id);



  await supabase
    .from("exam_results")
    .delete()
    .eq("exam_id", savedExam.id);

}







// إنشاء نتائج الطلاب
const allowedStudents =
  students.map(
    s => Number(
      s.student_id
    )
  );

const invalidStudent =
  form.student_ids.some(
    id =>
      !allowedStudents.includes(
        Number(id)
      )
  );

if (invalidStudent) {

  showToast(
    "يوجد طالب لا يتبع حلقاتك",
    "error"
  );

  setLoading(false);

  return;
}
const resultRows =
  form.student_ids.map(studentId => ({
    exam_id: savedExam.id,
    student_id: studentId,
    score: 0,
  }));

if (resultRows.length > 0) {

  await supabase
    .from("exam_results")
    .insert(resultRows);

}

// ربط الطلاب بالاختبار
if (form.student_ids?.length) {

  const { data, error } = await supabase
    .from("exam_students")
    .insert(
      form.student_ids.map(id => ({
        exam_id: savedExam.id,
        student_id: Number(id),
      }))
    )
    .select();

  

  


}// ربط الحلقات بالاختبار
if (form.halaqa_ids?.length) {

  const insertHalaqat = await supabase
  .from("exam_halaqat")
  .insert(
    uniqueHalaqat.map(id => ({
  exam_id: savedExam.id,
  halaqa_id: id,
}))
  );



}

// ربط المعلمين بالاختبار
if (form.teacher_ids?.length) {
const insertTeachers = await supabase
  .from("exam_teachers")
  .insert(
    uniqueTeachers.map(id => ({
  exam_id: savedExam.id,
  teacher_id: id,
}))
  );



}


showToast(
  exam
    ? "تم تحديث الاختبار بنجاح"
    : "تم إنشاء الاختبار بنجاح",
  "success"
);


onCreated();

onClose();



}catch(err){

showToast(
  err.message,
  "error"
);

}

finally{

setLoading(false);

}


}






return (

<div

style={{

position:"fixed",

inset:0,

background:"rgba(15,23,42,.45)",

display:"flex",

alignItems:"center",

justifyContent:"center",

zIndex:1000

}}

>


<div

style={{

width:"700px",

maxHeight:"90vh",

overflowY:"auto",

background:"#fff",

borderRadius:"calc(28px * var(--app-radius-scale,1))",

padding:"calc(30px * var(--app-density,1))"

}}

>


<div

style={{

display:"flex",

justifyContent:"space-between",

alignItems:"center"

}}

>

<h2>
إنشاء اختبار جديد
</h2>


<button type="button"

onClick={onClose}

style={{

border:"none",

background:"transparent",

cursor:"pointer"

}}

>

<X/>

</button>


</div>






<Input
label="عنوان الاختبار"
value={form.title}
onChange={v=>
setForm({...form,title:v})
}
/>





<AppSelect
  label="المسجد"
  value={form.mosque_id}
  onChange={async (v)=>{

    setForm({
      ...form,
      mosque_id:v,
      halaqa_ids:[],
      teacher_ids:[],
      student_ids:[]
    });

    await loadHalaqat(v);

  }}
  options={
    mosques.map(m=>({
      value:m.id,
      label:m.name
    }))
  }
/>





<AppSelect
  label="الحلقات"
 multiple={true}
  value={form.halaqa_ids}
  onChange={async (values) => {

    setForm({
      ...form,
      halaqa_ids: values,
    });

    if(values.length > 0){

  await loadTeachers(values);
  await loadStudents(values);

}
else{

  setTeachers([]);
  setStudents([]);

}

  }}
  options={
    halaqat.map(h => ({
      value: h.id,
      label: h.name,
    }))
  }
/>




<AppSelect
  label="نوع الاختبار"
  value={form.exam_type_id}
  onChange={(value)=>
    setForm({
      ...form,
      exam_type_id:value
    })
  }
  options={
    types.map(type=>({
      value:type.id,
      label:type.name
    }))
  }
/>





<AppSelect
  label="المعلمين"
 multiple={true}
  value={form.teacher_ids}
  onChange={(values)=>
    setForm({
      ...form,
      teacher_ids: values,
    })
  }
  options={
    teachers.map(t=>({
      value:t.id,
      label:t.full_name,
    }))
  }
/>





<Input
label="التاريخ"
type="date"
value={form.exam_date}
onChange={v=>
setForm({
...form,
exam_date:v
})
}
/>






<AppSelect
  label="الطلاب"
 multiple={true}
  value={form.student_ids}

  onChange={(values)=>
    setForm({
      ...form,
      student_ids: values,
    })
  }

  options={
    students.map(student=>({
      value: student.student_id,
      label: student.profiles?.full_name,
    }))
  }
/>






<AppSelect
  label="صنف الاختبار"
  value={form.exam_scope}
  onChange={(value)=>
    setForm({
      ...form,
      exam_scope: value,
      selected_parts: value === "parts"
        ? form.selected_parts
        : [],
    })
  }
  options={[
    {
      value:"surah",
      label:"سور"
    },
    {
      value:"parts",
      label:"أجزاء"
    }
  ]}
/>
{form.exam_scope === "surah" && (
  <>
    <Input
      label="من سورة"
      value={form.from_surah}
      onChange={(v)=>
        setForm({
          ...form,
          from_surah:v
        })
      }
    />

    <Input
      label="إلى سورة"
      value={form.to_surah}
      onChange={(v)=>
        setForm({
          ...form,
          to_surah:v
        })
      }
    />
  </>
)}
{form.exam_scope === "parts" && (
  <AppSelect
    label="الأجزاء"
    multiple={true}
    value={form.selected_parts}
    onChange={(values)=>
      setForm({
        ...form,
        selected_parts:values
      })
    }
    options={
      Array.from(
        { length: 30 },
        (_,i)=>({
          value:i+1,
          label:`الجزء ${i+1}`
        })
      )
    }
  />
)}









 

<button type="button"

onClick={save}

disabled={loading}

style={{

marginTop:25,

width:"100%",

padding:"calc(15px * var(--app-density,1))",

borderRadius:"calc(16px * var(--app-radius-scale,1))",

border:"none",

background:"var(--app-color-0f766e,#0F766E)",

color:"#fff",

fontWeight:800,

cursor:"pointer"

}}

>

<Save size={18}/>

حفظ الاختبار

</button>




</div>

</div>

);

}





function Input({
label,
value,
onChange,
type="text"
}){

const DateField = type === "date" ? CalendarInput : "input";
return (

<div style={{marginBottom:15}}>

<label>{label}</label>

<DateField

type={type}

value={value}

onChange={e=>onChange(e.target.value)}

style={{

width:"100%",

padding:"calc(12px * var(--app-density,1))",

borderRadius:"calc(12px * var(--app-radius-scale,1))",

border:"1px solid #E2E8F0",

marginTop:6

}}

/>

</div>

)

}
