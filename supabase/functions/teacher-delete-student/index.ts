import { createClient } from "npm:@supabase/supabase-js@2.112.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json(
      { ok: false, message: "Server configuration error" },
      500
    );
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return json({ ok: false, message: "يجب تسجيل الدخول كمعلم." }, 401);
    }

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user || !user.email_confirmed_at) {
      return json({ ok: false, message: "جلسة المعلم غير صالحة." }, 401);
    }

    const { data: teacher, error: teacherError } = await admin
      .from("profiles")
      .select("id, role, status, is_active")
      .eq("auth_user_id", user.id)
      .eq("role", "teacher")
      .maybeSingle();

    if (teacherError) throw teacherError;

    if (
      !teacher ||
      teacher.status !== "active" ||
      teacher.is_active === false
    ) {
      return json(
        { ok: false, message: "حساب المعلم غير مفعل." },
        403
      );
    }

    const body = await req.json();
    const studentId = Number(body?.student_id);

    if (!Number.isFinite(studentId) || studentId <= 0) {
      return json({ ok: false, message: "رقم الطالب الداخلي غير صالح." }, 400);
    }

    // A student can have more than one active circle. The requesting teacher
    // must be assigned to every one of them before a permanent deletion.
    const { data: studentLinks, error: linkError } = await admin
      .from("student_halaqat")
      .select("halaqa_id")
      .eq("student_id", studentId)
      .eq("is_current", true);

    if (linkError) throw linkError;

    if (!studentLinks?.length) {
      return json(
        { ok: false, message: "الطالب غير مرتبط بحلقة حالية. ربما أزيل الارتباط في محاولة حذف سابقة؛ أعد ربط الطالب بحلقته عبر الإدارة أولًا." },
        409
      );
    }

    const assignedHalaqat = [...new Set(studentLinks.map((item) => Number(item.halaqa_id)))];
    const { data: teacherLinks, error: teacherLinkError } = await admin
      .from("teacher_halaqat")
      .select("halaqa_id")
      .eq("teacher_id", teacher.id)
      .in("halaqa_id", assignedHalaqat);

    if (teacherLinkError) throw teacherLinkError;

    const allowed = new Set((teacherLinks || []).map((item) => Number(item.halaqa_id)));
    if (assignedHalaqat.some((halaqaId) => !allowed.has(halaqaId))) {
      return json(
        { ok: false, message: "لا تملك صلاحية حذف الطالب من جميع حلقاته الحالية." },
        403
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, role, auth_user_id, full_name, user_number")
      .eq("id", studentId)
      .eq("role", "student")
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return json({ ok: false, message: "الطالب غير موجود." }, 404);
    }

    // Database changes run atomically in one Postgres transaction. On any
    // FK error all deleted rows are rolled back (unlike sequential REST calls).
    const { data: deleted, error: deletionError } = await admin.rpc(
      "teacher_delete_student_atomic",
      {
        p_student_id: studentId,
        p_teacher_id: teacher.id,
      },
    );

    if (deletionError) {
      console.error("atomic student deletion:", {
        code: deletionError.code,
        message: deletionError.message,
      });
      if (deletionError.code === "42501") {
        return json({ ok: false, message: "ليس لديك صلاحية حذف هذا الطالب." }, 403);
      }
      if (deletionError.code === "P0002") {
        return json({ ok: false, message: "تعذر العثور على ارتباط الطالب الحالي. حدّث الصفحة أو تواصل مع الإدارة." }, 409);
      }
      return json({
        ok: false,
        message: "تعذر الحذف بسبب ارتباط بيانات أخرى بالطالب. لم يُحذف أي سجل في هذه المحاولة، ويمكن مراجعة سجلات الخادم.",
      }, 409);
    }

    if (deleted !== true) {
      return json({ ok: false, message: "تعذر إكمال حذف الطالب. لم تُحذف بياناته في هذه المحاولة." }, 500);
    }

    let authWarning: string | null = null;

    if (profile.auth_user_id) {
      const { error: authDeleteError } =
        await admin.auth.admin.deleteUser(profile.auth_user_id);

      if (authDeleteError) {
        console.error("delete auth student:", authDeleteError);
        authWarning =
          "تم حذف ملف الطالب من النظام، لكن تعذر حذف مستخدم Auth تلقائيًا.";
      }
    }

    return json({
      ok: true,
      deleted: {
        id: profile.id,
        full_name: profile.full_name,
        user_number: profile.user_number,
      },
      warning: authWarning,
    });
  } catch (error) {
    console.error("teacher-delete-student failure:", error);

    return json(
      {
        ok: false,
        message: "تعذر إكمال طلب الحذف. لم يُنفّذ حذف جزئي؛ حدّث الصفحة ثم حاول مرة أخرى أو تواصل مع الإدارة.",
      },
      500
    );
  }
});
