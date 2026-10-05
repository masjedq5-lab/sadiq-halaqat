import { formatDate, dateKey } from "../../lib/calendar";

export default function PrintReport({
  selectedReport,
  reportData = [],
}) {

  const reportTitles = {
    attendance: "تقرير الحضور والغياب",
    recitations: "تقرير التسميع",
    students: "تقرير الطلاب",
    teachers: "تقرير المعلمين",
    halaqat: "تقرير الحلقات",
    "monthly-progress":
      "تقرير الإنجاز الشهري",
    full: "التقرير الشامل",
  };

const thStyle = {
  border: "1px solid #D6C28A",
  padding: "10px",
  background: "#0F5132",
  color: "#fff",
  fontWeight: "700",
};

const tdStyle = {
  border: "1px solid #E5E7EB",
  padding: "8px",
  textAlign: "center",
};

  return (

    <div
      id="print-report"
      style={{
        background: "#fff",
        padding: "40px",
        direction: "rtl",
      }}
    >

      {/* Header */}

      <div
        style={{
          textAlign: "center",
          marginBottom: "30px",
        }}
      >

        <img
          src="/logo.png"
          alt=""
          style={{
            width: "100px",
          }}
        />

        <h1
          style={{
            margin: "10px 0",
            color: "#0F5132",
          }}
        >
          الصديق
        </h1>

        <div
          style={{
            color: "#666",
          }}
        >
          نظام إدارة الحلقات القرآنية
        </div>

      </div>

      {/* Info */}

      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          marginBottom: "25px",
        }}
      >

        <div>
          <b>نوع التقرير:</b>
          {" "}
          {
            reportTitles[
              selectedReport
            ]
          }
        </div>

        <div>
          <b>التاريخ:</b>
          {" "}
          {
            formatDate(dateKey())
          }
        </div>

      </div>

      {/* Stats */}

      <div
        style={{
          marginBottom: "25px",
        }}
      >

        <b>
          عدد السجلات:
        </b>

        {" "}

        {
          Array.isArray(
            reportData
          )
            ? reportData.length
            : 1
        }

      </div>

     {selectedReport === "recitations" &&
 reportData.length > 0 && (

  <>

    {/* عنوان القسم */}

    <div
      style={{
        textAlign: "center",
        marginBottom: "20px",
      }}
    >
      <h2
        style={{
          color: "#0F5132",
          marginBottom: "8px",
        }}
      >
        سجل التسميع
      </h2>

      <div
        style={{
          color: "#777",
        }}
      >
        جميع التسميعات المسجلة بالنظام
      </div>
    </div>

    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
      }}
    >

      <thead>

        <tr>

         <th style={thStyle}>الطالب</th>

          <th style={thStyle}>الحلقة</th>

          <th style={thStyle}>التاريخ</th>

          <th style={thStyle}>الدرس</th>

         <th style={thStyle}>تقييم الدرس</th>

         <th style={thStyle}>المراجعة</th>

          <th style={thStyle}>تقييم المراجعة</th>

          <th style={thStyle}>الدرس القادم</th>

        </tr>

      </thead>

      <tbody>

        {reportData.map(
          (row, index) => (

            <tr key={index}>

              <td style={tdStyle}>
                {
                  row.profiles
                    ?.full_name ||
                  "-"
                }
              </td>

              <td style={tdStyle}>
                {
                  row.halaqat
                    ?.name ||
                  "-"
                }
              </td>

              <td style={tdStyle}>
                {
                  row.recitation_date
                }
              </td>

              <td style={tdStyle}>

                {
                  row.from_surah
                }

                {" "}

                {
                  row.from_ayah
                }

                -

                {
                  row.to_ayah
                }

              </td>

             <td style={tdStyle}>
                {
                  row.lesson_evaluation ||
                  "-"
                }
              </td>

             <td style={tdStyle}>

                {
                  row.review_surah
                }

                {" "}

                {
                  row.review_from_ayah
                }

                -

                {
                  row.review_to_ayah
                }

              </td>

             <td style={tdStyle}>
                {
                  row.review_evaluation ||
                  "-"
                }
              </td>

              <td style={tdStyle}>

                {
                  row.next_surah
                }

                {" "}

                {
                  row.next_from_ayah
                }

                -

                {
                  row.next_to_ayah
                }

              </td>

            </tr>

          )
        )}

      </tbody>

    </table>

  </>

)}

    </div>

  );
}
