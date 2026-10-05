import AppSelect from "../AppSelect";

import AppDatePicker
from "../AppDatePicker";

export default function ReportFilters({

  filters,

  setFilters,

  mosques = [],

  halaqat = [],

  teachers = [],

  students = [],

}) {

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
    marginBottom: "8px",
    display: "block",
  };



  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(250px,1fr))",
          gap: "18px",
        }}
      >
      <div>
<AppSelect
  label="نوع التاريخ"
  value={filters.dateType}
  onChange={(value)=>
    setFilters(prev=>({
      ...prev,
      dateType:value
    }))
  }
  options={[
    {
      value:"hijri",
      label:"هجري"
    },
    {
      value:"gregorian",
      label:"ميلادي"
    }
  ]}
/>
</div>

<div>
  <label style={labelStyle}>
    من تاريخ
  </label>

<AppDatePicker calendar={filters.dateType}
  value={filters.fromDate}
  onChange={(value)=>
    setFilters(prev=>({
      ...prev,
      fromDate:value
    }))
  }
/>
</div>

<div>
  <label style={labelStyle}>
    إلى تاريخ
  </label>

  <AppDatePicker calendar={filters.dateType}
    value={filters.toDate}
    onChange={(value)=>
      setFilters(prev=>({
        ...prev,
        toDate:value
      }))
    }
  />
</div>
        <AppSelect
  label="المسجد"
  value={filters.mosqueId}
  onChange={(value)=>
    setFilters(prev=>({
      ...prev,
      mosqueId:value
    }))
  }
  options={[
    {
      value:"",
      label:"جميع المساجد"
    },
    ...mosques.map(m=>({
      value:m.id,
      label:m.name
    }))
  ]}
/>

      <AppSelect
  label="الحلقة"
  value={filters.halaqaId}
  onChange={(value)=>
    setFilters(prev=>({
      ...prev,
      halaqaId:value
    }))
  }
  options={[
    {
      value:"",
      label:"جميع الحلقات"
    },
    ...halaqat.map(h=>({
      value:h.id,
      label:h.name
    }))
  ]}
/>

      <AppSelect
  label="المعلم"
  value={filters.teacherId}
  onChange={(value)=>
    setFilters(prev=>({
      ...prev,
      teacherId:value
    }))
  }
  options={[
    {
      value:"",
      label:"جميع المعلمين"
    },
    ...teachers.map(t=>({
      value:t.id,
      label:t.full_name
    }))
  ]}
/>

       <AppSelect
  label="الطالب"
  value={filters.studentId}
  onChange={(value)=>
    setFilters(prev=>({
      ...prev,
      studentId:value
    }))
  }
  options={[
    {
      value:"",
      label:"جميع الطلاب"
    },
    ...students.map(s=>({
      value:s.id,
      label:s.full_name
    }))
  ]}
/>
      </div>
    </div>
  );
}
