-- Run as postgres: all fixtures and writes are rolled back, no real student data is changed.
begin;
create temp table attendance_test_results(name text primary key,passed boolean not null);
grant insert on attendance_test_results to authenticated;
do $tests$
declare t record; program text; state text; denied boolean; fixture_id bigint; n integer:=0;
begin
  select p.id,p.auth_user_id,th.halaqa_id into t from public.profiles p
    join public.teacher_halaqat th on th.teacher_id=p.id
    where p.role='teacher' and p.status='active' and p.is_active and p.auth_user_id is not null
    order by p.id,th.id limit 1;
  if t.id is null then raise exception 'TEST_TEACHER_UNAVAILABLE'; end if;
  insert into public.profiles(id,role,user_number,full_name,status,is_active) overriding system value
    values(-930000001,'student','ATTENDANCE-FIXTURE','Attendance fixture','active',true);
  insert into public.student_halaqat(id,student_id,halaqa_id,teacher_id,is_current) overriding system value
    values(-930000002,-930000001,t.halaqa_id,t.id,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',t.auth_user_id,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',t.auth_user_id::text,true);
  execute 'set local role authenticated';
  foreach program in array array['recitations','noorania_recitations'] loop
    n:=n+1; fixture_id:=-930000010-n;
    -- Unmarked attendance remains allowed; keep this existing record for the update check.
    if program='recitations' then
      insert into public.recitations(id,student_id,halaqa_id,teacher_id,recitation_date) overriding system value
        values(fixture_id,-930000001,t.halaqa_id,t.id,'2026-10-04');
    else
      insert into public.noorania_recitations(id,student_id,halaqa_id,teacher_id,recitation_date,lesson) overriding system value
        values(fixture_id,-930000001,t.halaqa_id,t.id,'2026-10-04','');
    end if;
    insert into attendance_test_results values(program||'_unmarked_allowed',true);
    foreach state in array array['absent','excused'] loop
      insert into public.attendance(id,student_id,halaqa_id,attendance_date,status,recorded_by) overriding system value
        values(-930000020,-930000001,t.halaqa_id,'2026-10-04',state,t.id);
      denied:=false;
      begin
        if program='recitations' then
          insert into public.recitations(id,student_id,halaqa_id,teacher_id,recitation_date,side_lesson_faces,side_lesson_lines,next_evaluation) overriding system value
            values(-930000021,-930000001,t.halaqa_id,t.id,'2026-10-04',1,0,'جيد');
        else
          insert into public.noorania_recitations(id,student_id,halaqa_id,teacher_id,recitation_date,lesson,side_lesson_faces,side_lesson_lines,side_lesson_evaluation) overriding system value
            values(-930000021,-930000001,t.halaqa_id,t.id,'2026-10-04','',1,0,'جيد');
        end if;
      exception when check_violation then
        if sqlerrm not like '%الطالب غائب%' then raise; end if;
        denied:=true;
      end;
      if not denied then raise exception 'ABSENT_INSERT_ALLOWED: % %',program,state; end if;
      insert into attendance_test_results values(program||'_'||state||'_insert_blocked',true);
      denied:=false;
      begin execute format('update public.%I set notes=''changed'' where id=$1',program) using fixture_id;
      exception when check_violation then
        if sqlerrm not like '%الطالب غائب%' then raise; end if;
        denied:=true;
      end;
      if not denied then raise exception 'ABSENT_UPDATE_ALLOWED'; end if;
      insert into attendance_test_results values(program||'_'||state||'_edit_blocked',true);
      delete from public.attendance where id=-930000020;
    end loop;
    insert into public.attendance(id,student_id,halaqa_id,attendance_date,status,recorded_by) overriding system value
      values(-930000020,-930000001,t.halaqa_id,'2026-10-03','absent',t.id);
    execute format('update public.%I set notes=''other date allowed'' where id=$1',program) using fixture_id;
    insert into attendance_test_results values(program||'_other_date_allowed',true);
    delete from public.attendance where id=-930000020;
    foreach state in array array['present','late'] loop
      insert into public.attendance(id,student_id,halaqa_id,attendance_date,status,recorded_by) overriding system value
        values(-930000020,-930000001,t.halaqa_id,'2026-10-04',state,t.id);
      execute format('update public.%I set notes=$1 where id=$2',program) using state,fixture_id;
      insert into attendance_test_results values(program||'_'||state||'_allowed',true);
      delete from public.attendance where id=-930000020;
    end loop;
    insert into public.recitation_sessions(id,teacher_id,halaqa_id,session_date,status) overriding system value
      values(-930000030,t.id,t.halaqa_id,'2026-10-04','completed');
    insert into public.recitation_session_students(id,session_id,student_id,position,status) overriding system value
      values(-930000031,-930000030,-930000001,1,'absent');
    denied:=false;
    begin execute format('update public.%I set notes=''session absence'' where id=$1',program) using fixture_id;
    exception when check_violation then denied:=true; end;
    if not denied then raise exception 'SESSION_ABSENCE_ALLOWED'; end if;
    insert into attendance_test_results values(program||'_session_absence_blocked',true);
    insert into public.attendance(id,student_id,halaqa_id,attendance_date,status,recorded_by) overriding system value
      values(-930000020,-930000001,t.halaqa_id,'2026-10-04','present',t.id);
    execute format('update public.%I set notes=''returned'' where id=$1',program) using fixture_id;
    insert into attendance_test_results values(program||'_returned_student_allowed',true);
    delete from public.attendance where id=-930000020;
    delete from public.recitation_session_students where id=-930000031;
    delete from public.recitation_sessions where id=-930000030;
  end loop;
  if exists(select 1 from public.recitations where id=-930000021) or exists(select 1 from public.noorania_recitations where id=-930000021)
    or exists(select 1 from public.recitation_segments where recitation_id=-930000021)
    or exists(select 1 from public.points_transactions where student_id=-930000001) then raise exception 'REJECTED_SAVE_LEFT_WRITES'; end if;
  insert into attendance_test_results values('rejected_saves_leave_no_recitations_segments_or_points',true);
  if not exists(select 1 from public.recitations where id=-930000011) or not exists(select 1 from public.noorania_recitations where id=-930000012) then raise exception 'PREVIOUS_HISTORY_LOST'; end if;
  insert into attendance_test_results values('previous_history_retained',true);
  execute 'reset role';
  if has_function_privilege('anon','private.prevent_absent_recitation()','EXECUTE')
    or has_function_privilege('authenticated','private.prevent_absent_recitation()','EXECUTE') then raise exception 'TRIGGER_DIRECTLY_CALLABLE'; end if;
  insert into attendance_test_results values('private_trigger_not_callable',true);
end $tests$;
select count(*) as passed_tests,bool_and(passed) as all_passed,true as fixtures_rolled_back from attendance_test_results;
rollback;
