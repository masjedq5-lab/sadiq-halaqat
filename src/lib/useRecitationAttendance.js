import "./recitationAttendance.css";
import { useEffect, useState } from "react";
import { checkRecitationAttendance } from "./recitationAttendance";

export default function useRecitationAttendance(client, scope, enabled = true, revision = null) {
  const { student_id, halaqa_id, recitation_date } = scope;
  const ready = enabled && Boolean(student_id && halaqa_id && recitation_date);
  const key = JSON.stringify([student_id, halaqa_id, recitation_date, revision]);
  const [state, setState] = useState({ key: null, blocked: false, message: "" });
  useEffect(() => {
    if (!ready) return;
    let active = true;
    let request = 0;
    async function refresh() {
      const current = ++request;
      setState({ key, checking: true, blocked: false, message: "" });
      try {
        const result = await checkRecitationAttendance(client, { student_id, halaqa_id, recitation_date });
        if (active && current === request) setState({ key, ...result });
      } catch (error) {
        if (active && current === request) setState({ key, blocked: true, message: error.message });
      }
    }
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [client, ready, key, student_id, halaqa_id, recitation_date]);
  if (!ready) return { disabled: false, message: "" };
  if (state.key !== key || state.checking) return { disabled: true, message: "جارٍ التحقق من حضور الطالب..." };
  return { disabled: state.blocked, message: state.message };
}
