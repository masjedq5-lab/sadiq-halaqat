-- A student's deletion must be one Postgres transaction, not separate PostgREST deletes.
-- Only the authenticated teacher-delete-student Edge Function may call this
-- routine through the service-role client. Never grant it to browser roles.
CREATE OR REPLACE FUNCTION public.teacher_delete_student_atomic(
  p_student_id bigint,
  p_teacher_id bigint
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_student_id bigint;
BEGIN
  IF p_student_id IS NULL OR p_student_id <= 0
     OR p_teacher_id IS NULL OR p_teacher_id <= 0 THEN
    RAISE EXCEPTION 'INVALID_STUDENT_DELETE_INPUT' USING ERRCODE = '22023';
  END IF;

  -- Lock only the intended student. Do not delete any other profile.
  SELECT p.id INTO v_student_id
  FROM public.profiles AS p
  WHERE p.id = p_student_id AND p.role = 'student'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS t
    WHERE t.id = p_teacher_id AND t.role = 'teacher'
      AND t.status = 'active' AND t.is_active IS DISTINCT FROM false
  ) THEN
    RAISE EXCEPTION 'TEACHER_NOT_ACTIVE' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.student_halaqat AS sh
    WHERE sh.student_id = p_student_id AND sh.is_current IS TRUE
  ) THEN
    RAISE EXCEPTION 'STUDENT_HAS_NO_CURRENT_HALAQA'
      USING ERRCODE = 'P0002';
  END IF;

  -- A permanent deletion affects all circles. Refuse it if even one active
  -- student assignment belongs to another teacher's circle.
  IF EXISTS (
    SELECT 1
    FROM public.student_halaqat AS sh
    WHERE sh.student_id = p_student_id AND sh.is_current IS TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.teacher_halaqat AS th
        WHERE th.teacher_id = p_teacher_id AND th.halaqa_id = sh.halaqa_id
      )
  ) THEN
    RAISE EXCEPTION 'STUDENT_DELETE_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  -- Explicitly remove rows with RESTRICT / NO ACTION foreign keys.
  -- All other student-dependent rows cascade from profiles.
  DELETE FROM public.recitation_session_students WHERE student_id = p_student_id;
  DELETE FROM public.recitations WHERE student_id = p_student_id;
  DELETE FROM public.monthly_progress WHERE student_id = p_student_id;
  DELETE FROM public.activity_logs WHERE user_id = p_student_id;

  -- Historical legacy table has student_id but no foreign key.
  DELETE FROM public.student_points WHERE student_id = p_student_id;

  DELETE FROM public.profiles
  WHERE id = v_student_id AND role = 'student';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_DELETE_NOT_COMPLETED' USING ERRCODE = 'P0001';
  END IF;

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.teacher_delete_student_atomic(bigint, bigint)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_delete_student_atomic(bigint, bigint)
TO service_role;

COMMENT ON FUNCTION public.teacher_delete_student_atomic(bigint, bigint) IS
'Server-only atomic delete of an authorised teacher student and related data; rolls back completely on foreign key or policy failure.';
