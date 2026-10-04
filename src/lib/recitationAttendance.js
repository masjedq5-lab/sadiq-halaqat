export const ABSENT_RECITATION_MESSAGE = "لا يمكن تسجيل التسميع: الطالب غائب في هذا التاريخ. صحّح حالة الحضور أو الغياب في جلسة التسميع أولاً.";

export async function checkRecitationAttendance(client, { student_id, halaqa_id, recitation_date }) {
  if (!student_id || !halaqa_id || !recitation_date) return { blocked: false, message: "" };
  const [attendance, session] = await Promise.all([
    client.from("attendance").select("status").eq("student_id", student_id)
      .eq("halaqa_id", halaqa_id).eq("attendance_date", recitation_date)
      .order("id", { ascending: false }).limit(1),
    client.from("recitation_session_students").select("id,recitation_sessions!inner(halaqa_id,session_date)")
      .eq("student_id", student_id).eq("status", "absent")
      .eq("recitation_sessions.halaqa_id", halaqa_id)
      .eq("recitation_sessions.session_date", recitation_date).limit(1),
  ]);
  if (attendance.error || session.error) throw new Error("تعذر التحقق من حضور الطالب. حاول مرة أخرى قبل حفظ التسميع.");
  const blocked = ["absent", "excused"].includes(attendance.data?.[0]?.status) || (!attendance.data?.length && Boolean(session.data?.length));
  return { blocked, message: blocked ? ABSENT_RECITATION_MESSAGE : "" };
}

export async function assertRecitationAttendance(client, scope) {
  const result = await checkRecitationAttendance(client, scope);
  if (result.blocked) throw new Error(result.message);
}
