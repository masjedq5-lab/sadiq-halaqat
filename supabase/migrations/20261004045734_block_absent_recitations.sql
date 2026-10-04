-- Enforce the same-day rule even when the form is stale or the API is called directly.
-- No existing recitations, attendance records or RLS policies are changed.
create or replace function private.prevent_absent_recitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare attendance_status text;
begin
  if auth.uid() is not null and not private.can_manage_halaqa_records(new.halaqa_id) then
    raise exception using errcode = '42501', message = 'غير مصرح بتسجيل التسميع لهذه الحلقة';
  end if;
  select a.status into attendance_status from public.attendance a
  where a.student_id = new.student_id and a.halaqa_id = new.halaqa_id
    and a.attendance_date = new.recitation_date
  order by a.id desc limit 1;
  if attendance_status in ('absent', 'excused') or (attendance_status is null and exists (
    select 1 from public.recitation_session_students rs
    join public.recitation_sessions s on s.id = rs.session_id
    where rs.student_id = new.student_id and rs.status = 'absent'
      and s.halaqa_id = new.halaqa_id and s.session_date = new.recitation_date
  )) then
    raise exception using errcode = '23514',
      message = 'لا يمكن تسجيل التسميع: الطالب غائب في هذا التاريخ. صحّح حالة الحضور أو الغياب في جلسة التسميع أولاً.';
  end if;
  return new;
end;
$function$;
revoke all on function private.prevent_absent_recitation() from public, anon, authenticated;
create trigger recitations_attendance_guard before insert or update on public.recitations
for each row execute function private.prevent_absent_recitation();
create trigger noorania_recitations_attendance_guard before insert or update on public.noorania_recitations
for each row execute function private.prevent_absent_recitation();
