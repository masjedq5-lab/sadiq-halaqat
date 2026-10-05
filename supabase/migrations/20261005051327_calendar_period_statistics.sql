CREATE OR REPLACE FUNCTION public.get_public_mosque_stats_period(p_period_start date, p_period_end date, p_academic_start date, p_mosque_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(mosque_id bigint, mosque_name text, halaqat_count bigint, teachers_count bigint, students_count bigint, recitations_month bigint, attendance_rate numeric, monthly_achievement_rate numeric, total_student_points bigint, health_score numeric, active_halaqat_today bigint, students_today bigint, weekly_recitations bigint, generated_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
BEGIN
  -- Public aggregates only: same scope as the existing public statistics RPC.
  -- Accept only a bounded current month, never unrestricted historical ranges.
  IF p_period_start IS NULL OR p_period_end IS NULL
     OR p_period_end - p_period_start NOT BETWEEN 28 AND 31
     OR p_academic_start IS NULL OR v_today - p_academic_start NOT BETWEEN 0 AND 30
     OR v_today < p_period_start OR v_today >= p_period_end THEN
    RAISE EXCEPTION 'Invalid current calendar period' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY

with

-- =========================================================
-- الحلقات الداخلة في النطاق
-- =========================================================

scoped_halaqat as (

  select
    h.id,
    h.mosque_id

  from public.halaqat h

  where h.status = 'active'

    and (
      p_mosque_id is null
      or h.mosque_id = p_mosque_id
    )
),


-- =========================================================
-- الطلاب الحاليون
-- =========================================================

scoped_students as (

  select distinct
    sh.student_id

  from public.student_halaqat sh

  join scoped_halaqat h
    on h.id = sh.halaqa_id

  join public.profiles p
    on p.id = sh.student_id

  where sh.is_current = true

    and p.role = 'student'

    and p.status = 'active'
),


-- =========================================================
-- المعلمون
-- =========================================================

scoped_teachers as (

  select distinct
    th.teacher_id

  from public.teacher_halaqat th

  join scoped_halaqat h
    on h.id = th.halaqa_id

  join public.profiles p
    on p.id = th.teacher_id

  where p.role = 'teacher'

    and p.status = 'active'
),


-- =========================================================
-- الحضور هذا الشهر
-- present + late = حضور
-- =========================================================

attendance_stats as (

  select

    count(*)::bigint
      as total_records,

    count(*) filter (
      where a.status in ('present', 'late')
    )::bigint
      as attended_records

  from public.attendance a

  join scoped_halaqat h
    on h.id = a.halaqa_id

  where
    a.attendance_date
      >= p_period_start

    and

    a.attendance_date
      < p_period_end
),


-- =========================================================
-- التسميعات هذا الشهر
-- =========================================================

monthly_recitations as (

  select
    count(*)::bigint
      as recitations_count

  from public.recitations r

  join scoped_halaqat h
    on h.id = r.halaqa_id

  where
    r.recitation_date
      >= p_period_start

    and

    r.recitation_date
      < p_period_end
),


-- =========================================================
-- التسميعات آخر 7 أيام
-- =========================================================

weekly_recitation_stats as (

  select
    count(*)::bigint
      as recitations_count,

    count(
      distinct r.student_id
    )::bigint
      as active_students

  from public.recitations r

  join scoped_halaqat h
    on h.id = r.halaqa_id

  where
    r.recitation_date
      >= v_today - 6

    and

    r.recitation_date
      <= v_today
),


-- =========================================================
-- الإنجاز الشهري
--
-- الحفظ مكتمل + المراجعة مكتملة = 100
-- واحد منهما مكتمل = 50
-- لا شيء = 0
--
-- نستخدم فقط السجلات المعتمدة
-- =========================================================

achievement_stats as (

  select

    coalesce(

      round(

        avg(

          (
            case
              when mp.memorization_completed
              then 1
              else 0
            end

            +

            case
              when mp.revision_completed
              then 1
              else 0
            end

          ) * 50.0

        ),

        1
      ),

      0

    )::numeric
      as achievement_rate

  from public.monthly_progress mp

  join scoped_halaqat h
    on h.id = mp.halaqa_id

  where
    mp.progress_month
      = p_academic_start

    and mp.approved = true
),


-- =========================================================
-- مجموع أرصدة نقاط الطلاب الحاليين
-- =========================================================

points_stats as (

  select

    coalesce(
      sum(
        coalesce(
          p.total_points,
          0
        )
      ),
      0
    )::bigint
      as total_points

  from scoped_students ss

  join public.profiles p
    on p.id = ss.student_id
),


-- =========================================================
-- الحلقات التي لديها نشاط اليوم
-- حضور أو تسميع
-- =========================================================

today_active_halaqat as (

  select

    count(
      distinct activity.halaqa_id
    )::bigint
      as halaqat_count

  from (

    select
      a.halaqa_id

    from public.attendance a

    join scoped_halaqat h
      on h.id = a.halaqa_id

    where
      a.attendance_date = v_today


    union all


    select
      r.halaqa_id

    from public.recitations r

    join scoped_halaqat h
      on h.id = r.halaqa_id

    where
      r.recitation_date = v_today

  ) activity
),


-- =========================================================
-- الطلاب الذين لديهم نشاط اليوم
-- حضور أو تسميع
-- =========================================================

today_active_students as (

  select

    count(
      distinct activity.student_id
    )::bigint
      as students_count

  from (

    select
      a.student_id

    from public.attendance a

    join scoped_halaqat h
      on h.id = a.halaqa_id

    where
      a.attendance_date = v_today


    union all


    select
      r.student_id

    from public.recitations r

    join scoped_halaqat h
      on h.id = r.halaqa_id

    where
      r.recitation_date = v_today

  ) activity
),


-- =========================================================
-- النسب المحسوبة
-- =========================================================

calculated_rates as (

  select

    case
      when ats.total_records = 0
      then 0

      else
        round(
          (
            ats.attended_records::numeric
            /
            ats.total_records::numeric
          ) * 100,
          1
        )
    end
      as attendance_rate,

    ach.achievement_rate
      as achievement_rate,

    case

      when (
        select count(*)
        from scoped_students
      ) = 0

      then 0

      else

        least(
          100::numeric,

          round(
            (
              wrs.active_students::numeric
              /
              (
                select count(*)::numeric
                from scoped_students
              )
            ) * 100,
            1
          )
        )

    end
      as weekly_activity_rate

  from attendance_stats ats

  cross join achievement_stats ach

  cross join weekly_recitation_stats wrs
)


-- =========================================================
-- النتيجة
-- =========================================================

select

  p_mosque_id
    as mosque_id,


  case

    when p_mosque_id is null
    then 'جميع المساجد'

    else
      coalesce(
        (
          select
            coalesce(
              to_jsonb(m) ->> 'name',
              to_jsonb(m) ->> 'mosque_name',
              'مسجد ' || m.id::text
            )

          from public.mosques m

          where m.id = p_mosque_id

          limit 1
        ),

        'المسجد'
      )

  end::text
    as mosque_name,


  (
    select count(*)::bigint
    from scoped_halaqat
  )
    as halaqat_count,


  (
    select count(*)::bigint
    from scoped_teachers
  )
    as teachers_count,


  (
    select count(*)::bigint
    from scoped_students
  )
    as students_count,


  mr.recitations_count
    as recitations_month,


  cr.attendance_rate
    as attendance_rate,


  cr.achievement_rate
    as monthly_achievement_rate,


  ps.total_points
    as total_student_points,


  round(

    (
      cr.attendance_rate * 0.40

      +

      cr.achievement_rate * 0.40

      +

      cr.weekly_activity_rate * 0.20
    ),

    1

  )
    as health_score,


  tah.halaqat_count
    as active_halaqat_today,


  tas.students_count
    as students_today,


  wrs.recitations_count
    as weekly_recitations,


  now()
    as generated_at


from monthly_recitations mr

cross join calculated_rates cr

cross join points_stats ps

cross join today_active_halaqat tah

cross join today_active_students tas

cross join weekly_recitation_stats wrs;

END;
$function$;

REVOKE ALL ON FUNCTION public.get_public_mosque_stats_period(date,date,date,bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_mosque_stats_period(date,date,date,bigint) TO anon, authenticated, service_role;
