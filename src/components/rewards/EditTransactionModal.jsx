import {displayDateFormatter} from "../../lib/calendar";
import { useEffect, useState } from "react";

import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileText,
  Gift,
  Loader2,
  MinusCircle,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import {
  supabase,
} from "../../lib/supabase";

import ConfirmModal from "../ConfirmModal";

import {
  showToast,
} from "../Toast";

/* =========================================================
   Helpers
========================================================= */

function getTransactionStudentId(transaction) {
  return Number(
    transaction?.student_id ||
      transaction?.student?.id ||
      0
  );
}

function getTransactionHalaqaId(transaction) {
  return Number(
    transaction?.halaqa_id ||
      transaction?.halaqa?.id ||
      0
  );
}

function normalizeDate(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(
    0,
    10
  );
}

function formatGregorianDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(
      new Date(
        `${normalizeDate(
          value
        )}T12:00:00`
      )
    );
  } catch {
    return normalizeDate(
      value
    );
  }
}

function formatHijriDate(value) {
  if (!value) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      }
    ).format(
      new Date(
        `${normalizeDate(
          value
        )}T12:00:00`
      )
    );
  } catch {
    return "—";
  }
}

function cleanText(value) {
  return String(
    value ?? ""
  ).trim();
}

/* =========================================================
   Component
========================================================= */

export default function EditTransactionModal({
  open,
  transaction,
  onClose,
  onSaved,
}) {
  const [
    points,
    setPoints,
  ] =
    useState("");

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    showConfirm,
    setShowConfirm,
  ] =
    useState(false);

  const [
    freshTransaction,
    setFreshTransaction,
  ] =
    useState(null);

  const [
    currentBalance,
    setCurrentBalance,
  ] =
    useState(0);

  const [
    studentName,
    setStudentName,
  ] =
    useState("");

  const [
    halaqaName,
    setHalaqaName,
  ] =
    useState("");

  /* =====================================================
     Source transaction
  ===================================================== */

  const sourceTransaction =
    freshTransaction ||
    transaction;

  const isGrant =
    sourceTransaction?.category ===
    "grant";

  const isDeduction =
    sourceTransaction?.category ===
    "deduction";

  const studentId =
    getTransactionStudentId(
      sourceTransaction
    );

  const halaqaId =
    getTransactionHalaqaId(
      sourceTransaction
    );

  const transactionDate =
    normalizeDate(
      sourceTransaction
        ?.transaction_date
    );

  const originalSignedPoints =
    Number(
      sourceTransaction?.points ||
        0
    );

  const originalMagnitude =
    Math.abs(
      originalSignedPoints
    );

  const newMagnitude =
    Math.abs(
      Number(points) ||
        0
    );

  const newSignedPoints =
    isGrant
      ? newMagnitude
      : -newMagnitude;

  const signedDifference =
    newSignedPoints -
    originalSignedPoints;

  const balanceAfter =
    currentBalance +
    signedDifference;

  const hasChanges =
    newMagnitude !==
      originalMagnitude ||
    cleanText(notes) !==
      cleanText(
        sourceTransaction?.notes
      );

  const canSave =
    Boolean(
      sourceTransaction?.id
    ) &&
    Boolean(studentId) &&
    Boolean(halaqaId) &&
    Boolean(
      transactionDate
    ) &&
    Boolean(
      isGrant ||
      isDeduction
    ) &&
    Number.isFinite(
      newMagnitude
    ) &&
    newMagnitude > 0 &&
    hasChanges &&
    !saving &&
    !loading;

  /* =====================================================
     Open / load
  ===================================================== */

  useEffect(() => {
    if (
      !open ||
      !transaction?.id
    ) {
      return;
    }

    setShowConfirm(false);
    setFreshTransaction(null);

    setPoints(
      String(
        Math.abs(
          Number(
            transaction.points ||
              0
          )
        )
      )
    );

    setNotes(
      transaction.notes ||
        ""
    );

    setCurrentBalance(
      Number(
        transaction.student_total_points ||
          transaction.total_points ||
          0
      )
    );

    setStudentName(
      transaction.student_name ||
        transaction.student?.full_name ||
        ""
    );

    setHalaqaName(
      transaction.halaqa_name ||
        transaction.halaqa?.name ||
        ""
    );

    loadTransactionContext();
  }, [
    open,
    transaction?.id,
  ]);

  /* =====================================================
     Prevent background scroll
  ===================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    const oldOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        oldOverflow;
    };
  }, [
    open,
  ]);

  /* =====================================================
     Keyboard
  ===================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event
    ) {
      if (
        event.key ===
          "Escape" &&
        !showConfirm
      ) {
        handleClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    open,
    showConfirm,
    saving,
  ]);

  /* =====================================================
     Load fresh transaction/context
  ===================================================== */

  async function loadTransactionContext() {
    if (!transaction?.id) {
      return;
    }

    try {
      setLoading(true);

      const {
        data: tx,
        error: txError,
      } =
        await supabase
          .from(
            "points_transactions"
          )
          .select(`
            id,
            student_id,
            points,
            reason,
            reward_type_id,
            category,
            halaqa_id,
            transaction_date,
            notes
          `)
          .eq(
            "id",
            transaction.id
          )
          .maybeSingle();

      if (txError) {
        throw txError;
      }

      if (!tx) {
        throw new Error(
          "تعذر العثور على العملية."
        );
      }

      if (
        tx.category !==
          "grant" &&
        tx.category !==
          "deduction"
      ) {
        throw new Error(
          "هذه العملية ليست منحة أو خصمًا قابلًا للتعديل من هذه النافذة."
        );
      }

      setFreshTransaction(
        tx
      );

      setPoints(
        String(
          Math.abs(
            Number(
              tx.points ||
                0
            )
          )
        )
      );

      setNotes(
        tx.notes ||
          ""
      );

      const requests = [
        supabase
          .from("profiles")
          .select(
            "full_name, total_points"
          )
          .eq(
            "id",
            tx.student_id
          )
          .maybeSingle(),
      ];

      if (
        tx.halaqa_id
      ) {
        requests.push(
          supabase
            .from("halaqat")
            .select("name")
            .eq(
              "id",
              tx.halaqa_id
            )
            .maybeSingle()
        );
      }

      const results =
        await Promise.all(
          requests
        );

      const profileResult =
        results[0];

      if (
        profileResult.error
      ) {
        throw profileResult.error;
      }

      if (
        profileResult.data
      ) {
        setStudentName(
          profileResult.data
            .full_name ||
            studentName ||
            ""
        );

        setCurrentBalance(
          Number(
            profileResult.data
              .total_points ||
              0
          )
        );
      }

      const halaqaResult =
        results[1];

      if (
        halaqaResult &&
        !halaqaResult.error &&
        halaqaResult.data?.name
      ) {
        setHalaqaName(
          halaqaResult.data
            .name
        );
      }

    } catch (error) {
      console.error(
        "LOAD TRANSACTION FOR EDIT:",
        error
      );

      showToast(
        error?.message ||
          "تعذر تحميل بيانات العملية.",
        "error"
      );

    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     Close
  ===================================================== */

  function handleClose() {
    if (saving) {
      return;
    }

    setShowConfirm(
      false
    );

    onClose?.();
  }

  /* =====================================================
     Teacher scope validation
  ===================================================== */

  async function validateTeacherScope(
    tx
  ) {
    const {
      data: authData,
      error: authError,
    } =
      await supabase.auth
        .getUser();

    if (authError) {
      throw authError;
    }

    const authUser =
      authData?.user;

    if (!authUser) {
      throw new Error(
        "تعذر تحديد حساب المعلم."
      );
    }

    const {
      data: teacher,
      error: teacherError,
    } =
      await supabase
        .from("profiles")
        .select(
          "id, role"
        )
        .eq(
          "auth_user_id",
          authUser.id
        )
        .maybeSingle();

    if (teacherError) {
      throw teacherError;
    }

    if (
      !teacher ||
      teacher.role !==
        "teacher"
    ) {
      throw new Error(
        "هذه العملية متاحة للمعلم فقط."
      );
    }

    const {
      data: teacherLink,
      error:
        teacherLinkError,
    } =
      await supabase
        .from(
          "teacher_halaqat"
        )
        .select("id")
        .eq(
          "teacher_id",
          teacher.id
        )
        .eq(
          "halaqa_id",
          tx.halaqa_id
        )
        .maybeSingle();

    if (
      teacherLinkError
    ) {
      throw teacherLinkError;
    }

    if (!teacherLink) {
      throw new Error(
        "لا تملك صلاحية تعديل معاملات هذه الحلقة."
      );
    }

    /*
      نتحقق من ارتباط الطالب
      بالحَلقة في تاريخ العملية،
      وليس من is_current فقط؛
      لأن المعاملة قد تكون قديمة.
    */

    const {
      data: studentLinks,
      error:
        studentLinksError,
    } =
      await supabase
        .from(
          "student_halaqat"
        )
        .select(`
          id,
          start_date,
          end_date
        `)
        .eq(
          "student_id",
          tx.student_id
        )
        .eq(
          "halaqa_id",
          tx.halaqa_id
        );

    if (
      studentLinksError
    ) {
      throw studentLinksError;
    }

    const txDate =
      normalizeDate(
        tx.transaction_date
      );

    const wasInHalaqa =
      (
        studentLinks ||
        []
      ).some(
        (link) => {
          const start =
            normalizeDate(
              link.start_date
            );

          const end =
            normalizeDate(
              link.end_date
            );

          const afterStart =
            !start ||
            txDate >= start;

          const beforeEnd =
            !end ||
            txDate <= end;

          return (
            afterStart &&
            beforeEnd
          );
        }
      );

    if (!wasInHalaqa) {
      throw new Error(
        "لا يوجد ارتباط موثق للطالب بهذه الحلقة في تاريخ العملية."
      );
    }

    return teacher;
  }

  /* =====================================================
     Request save
  ===================================================== */

  function requestSave() {
    if (
      !sourceTransaction?.id
    ) {
      showToast(
        "تعذر تحديد العملية.",
        "error"
      );

      return;
    }

    if (
      !Number.isFinite(
        newMagnitude
      ) ||
      newMagnitude <= 0
    ) {
      showToast(
        "أدخل عدد نقاط صحيحًا أكبر من صفر.",
        "error"
      );

      return;
    }

    if (!hasChanges) {
      showToast(
        "لا توجد تعديلات للحفظ.",
        "info"
      );

      return;
    }

    setShowConfirm(
      true
    );
  }

  /* =====================================================
     Save
  ===================================================== */

  async function saveChanges() {
    if (!canSave) {
      return;
    }

    setShowConfirm(
      false
    );

    setSaving(true);

    let originalTx = null;

    try {
      /*
        نقرأ العملية مرة أخرى قبل
        الحفظ حتى لا نعتمد على بيانات
        قديمة في الواجهة.
      */

      const {
        data: tx,
        error: txError,
      } =
        await supabase
          .from(
            "points_transactions"
          )
          .select(`
            id,
            student_id,
            points,
            reason,
            reward_type_id,
            category,
            halaqa_id,
            transaction_date,
            notes
          `)
          .eq(
            "id",
            sourceTransaction.id
          )
          .maybeSingle();

      if (txError) {
        throw txError;
      }

      if (!tx) {
        throw new Error(
          "العملية لم تعد موجودة."
        );
      }

      if (
        tx.category !==
          "grant" &&
        tx.category !==
          "deduction"
      ) {
        throw new Error(
          "لا يمكن تعديل هذا النوع من المعاملات من هذه النافذة."
        );
      }

      originalTx = tx;

      await validateTeacherScope(
        tx
      );

      const magnitude =
        Math.abs(
          Number(points) ||
            0
        );

      if (
        !Number.isFinite(
          magnitude
        ) ||
        magnitude <= 0
      ) {
        throw new Error(
          "قيمة النقاط غير صحيحة."
        );
      }

      const signedPoints =
        tx.category ===
        "grant"
          ? magnitude
          : -magnitude;

      const newNotes =
        cleanText(notes) ||
        null;

      const {
        error: updateError,
      } =
        await supabase
          .from(
            "points_transactions"
          )
          .update({
            points:
              signedPoints,
            notes:
              newNotes,
          })
          .eq(
            "id",
            tx.id
          );

      if (updateError) {
        throw updateError;
      }

      /*
        بعد تعديل المعاملة نعيد
        احتساب رصيد الطالب كاملًا.
      */

      const {
        data:
          transactions,
        error:
          transactionsError,
      } =
        await supabase
          .from(
            "points_transactions"
          )
          .select("points")
          .eq(
            "student_id",
            tx.student_id
          );

      if (
        transactionsError
      ) {
        throw transactionsError;
      }

      const newTotal =
        (
          transactions ||
          []
        ).reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.points ||
                0
            ),
          0
        );

      const {
        error:
          profileError,
      } =
        await supabase
          .from("profiles")
          .update({
            total_points:
              newTotal,
          })
          .eq(
            "id",
            tx.student_id
          );

      if (
        profileError
      ) {
        /*
          تعويض احترازي:
          لو فشل تحديث الرصيد بعد
          نجاح تعديل المعاملة، نحاول
          إعادة المعاملة لقيمتها
          الأصلية لتقليل احتمال
          عدم الاتساق.
        */

        try {
          await supabase
            .from(
              "points_transactions"
            )
            .update({
              points:
                originalTx.points,
              notes:
                originalTx.notes,
            })
            .eq(
              "id",
              originalTx.id
            );
        } catch (
          rollbackError
        ) {
          console.error(
            "ROLLBACK TRANSACTION FAILED:",
            rollbackError
          );
        }

        throw profileError;
      }

      setCurrentBalance(
        newTotal
      );

      showToast(
        tx.category ===
          "grant"
          ? "تم تحديث المنحة وإعادة احتساب رصيد الطالب."
          : "تم تحديث الخصم وإعادة احتساب رصيد الطالب.",
        "success"
      );

      await onSaved?.();

      onClose?.();

    } catch (error) {
      console.error(
        "EDIT TRANSACTION:",
        error
      );

      showToast(
        error?.message ||
          "تعذر تحديث العملية.",
        "error"
      );

    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Render guard
  ===================================================== */

  if (
    !open ||
    !transaction
  ) {
    return null;
  }

  const TypeIcon =
    isGrant
      ? Gift
      : MinusCircle;

  const deltaText =
    signedDifference ===
    0
      ? "بدون تغيير في الرصيد"
      : signedDifference >
          0
        ? `+${signedDifference} نقطة`
        : `${signedDifference} نقطة`;

  return (
    <>
      <div
        className="edit-tx-overlay"
        dir="rtl"
        onMouseDown={(
          event
        ) => {
          if (
            event.target ===
              event.currentTarget &&
            !showConfirm
          ) {
            handleClose();
          }
        }}
      >
        <div
          className={
            isGrant
              ? "edit-tx-modal grant"
              : "edit-tx-modal deduction"
          }
          role="dialog"
          aria-modal="true"
          aria-label="تعديل معاملة نقاط"
        >
          {/* =========================================
              HEADER
          ========================================= */}

          <div className="edit-tx-header">
            <div className="edit-tx-heading">
              <div className="edit-tx-main-icon">
                <TypeIcon
                  size={22}
                />
              </div>

              <div>
                <div className="edit-tx-eyebrow">
                  <Sparkles
                    size={12}
                  />

                  سجل النقاط
                </div>

                <h2>
                  تعديل العملية
                </h2>

                <p>
                  عدّل قيمة النقاط أو
                  الملاحظة مع الحفاظ على
                  نوع العملية وسجلها.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="edit-tx-close"
              onClick={
                handleClose
              }
              disabled={
                saving
              }
              aria-label="إغلاق"
            >
              <X size={17} />
            </button>
          </div>

          {/* =========================================
              LOADING
          ========================================= */}

          {loading ? (
            <div className="edit-tx-loading">
              <Loader2
                size={24}
                className="edit-tx-spin"
              />

              <strong>
                جارٍ تحميل بيانات
                العملية...
              </strong>
            </div>
          ) : (
            <>
              {/* =====================================
                  CONTEXT
              ===================================== */}

              <div className="edit-tx-context-card">
                <div className="edit-tx-student">
                  <div className="edit-tx-avatar">
                    <UserRound
                      size={20}
                    />
                  </div>

                  <div>
                    <span>
                      الطالب
                    </span>

                    <strong>
                      {studentName ||
                        sourceTransaction
                          ?.student_name ||
                        "طالب"}
                    </strong>

                    <small>
                      العملية رقم #
                      {
                        sourceTransaction?.id
                      }
                    </small>
                  </div>
                </div>

                <div className="edit-tx-context-pills">
                  <span>
                    <BookOpen
                      size={12}
                    />

                    {halaqaName ||
                      sourceTransaction
                        ?.halaqa_name ||
                      "الحلقة"}
                  </span>

                  <span>
                    <CalendarDays
                      size={12}
                    />

                    {formatGregorianDate(
                      transactionDate
                    )}
                  </span>

                  <span>
                    <CalendarDays
                      size={12}
                    />

                    {formatHijriDate(
                      transactionDate
                    )}
                  </span>
                </div>
              </div>

              {/* =====================================
                  SUMMARY
              ===================================== */}

              <div className="edit-tx-summary-grid">
                <SummaryCard
                  label="الرصيد الحالي"
                  value={
                    currentBalance
                  }
                  suffix="نقطة"
                  icon={Coins}
                />

                <SummaryCard
                  label="القيمة الأصلية"
                  value={
                    isGrant
                      ? `+${originalMagnitude}`
                      : `-${originalMagnitude}`
                  }
                  suffix="نقطة"
                  icon={
                    TypeIcon
                  }
                  tone={
                    isGrant
                      ? "positive"
                      : "danger"
                  }
                />

                <SummaryCard
                  label="الرصيد بعد التعديل"
                  value={
                    balanceAfter
                  }
                  suffix="نقطة"
                  icon={
                    ArrowLeftRight
                  }
                  tone={
                    balanceAfter <
                    0
                      ? "danger"
                      : "positive"
                  }
                />
              </div>

              {/* =====================================
                  BODY
              ===================================== */}

              <div className="edit-tx-body">
                <section className="edit-tx-section">
                  <div className="edit-tx-section-head">
                    <div>
                      <h3>
                        بيانات العملية
                      </h3>

                      <p>
                        بعض الحقول مثبتة
                        لحماية سلامة سجل
                        النقاط.
                      </p>
                    </div>

                    <ShieldCheck
                      size={17}
                    />
                  </div>

                  <div className="edit-tx-fields-grid">
                    <ReadOnlyField
                      label="نوع العملية"
                      value={
                        isGrant
                          ? "منحة"
                          : "خصم"
                      }
                      icon={
                        TypeIcon
                      }
                    />

                    <ReadOnlyField
                      label="سبب العملية"
                      value={
                        sourceTransaction
                          ?.reason ||
                        "غير محدد"
                      }
                      icon={
                        isGrant
                          ? Award
                          : AlertTriangle
                      }
                    />
                  </div>
                </section>

                <section className="edit-tx-section">
                  <div className="edit-tx-section-head">
                    <div>
                      <h3>
                        تعديل النقاط
                      </h3>

                      <p>
                        أدخل القيمة
                        موجبة؛ النظام
                        يحدد الإضافة أو
                        الخصم حسب نوع
                        العملية.
                      </p>
                    </div>

                    <Coins
                      size={17}
                    />
                  </div>

                  <div className="edit-tx-points-box">
                    <div className="edit-tx-points-input">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        inputMode="numeric"
                        value={
                          points
                        }
                        onChange={(
                          event
                        ) =>
                          setPoints(
                            event.target
                              .value
                          )
                        }
                      />

                      <span>
                        نقطة
                      </span>
                    </div>

                    <div className="edit-tx-change-preview">
                      <span>
                        أثر التعديل على
                        الرصيد
                      </span>

                      <strong
                        className={
                          signedDifference >
                          0
                            ? "positive"
                            : signedDifference <
                                0
                              ? "negative"
                              : ""
                        }
                      >
                        {deltaText}
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="edit-tx-section">
                  <div className="edit-tx-section-head">
                    <div>
                      <h3>
                        ملاحظة العملية
                      </h3>

                      <p>
                        يمكنك تحديث
                        الملاحظة دون
                        تغيير سبب
                        المعاملة.
                      </p>
                    </div>

                    <FileText
                      size={17}
                    />
                  </div>

                  <textarea
                    className="edit-tx-notes"
                    rows={4}
                    value={
                      notes
                    }
                    onChange={(
                      event
                    ) =>
                      setNotes(
                        event.target
                          .value
                          .slice(
                            0,
                            500
                          )
                      )
                    }
                    placeholder="أضف ملاحظة توضح سبب تعديل العملية..."
                  />

                  <div className="edit-tx-notes-meta">
                    <span>
                      يفضل توضيح سبب
                      التعديل للحفاظ على
                      سجل مفهوم.
                    </span>

                    <span>
                      {notes.length}
                      /500
                    </span>
                  </div>
                </section>

                {/* =================================
                    SAFETY
                ================================= */}

                <div
                  className={
                    balanceAfter < 0
                      ? "edit-tx-warning critical"
                      : "edit-tx-warning"
                  }
                >
                  {balanceAfter <
                  0 ? (
                    <AlertTriangle
                      size={18}
                    />
                  ) : (
                    <CheckCircle2
                      size={18}
                    />
                  )}

                  <div>
                    <strong>
                      {balanceAfter <
                      0
                        ? "تنبيه: الرصيد سيصبح سالبًا"
                        : "سلامة الرصيد"}
                    </strong>

                    <span>
                      {balanceAfter <
                      0
                        ? `بعد هذا التعديل سيصبح رصيد الطالب ${balanceAfter} نقطة. راجع القيمة قبل الحفظ.`
                        : `الرصيد المتوقع بعد التعديل هو ${balanceAfter} نقطة.`}
                    </span>
                  </div>
                </div>
              </div>

              {/* =====================================
                  FOOTER
              ===================================== */}

              <div className="edit-tx-footer">
                <div className="edit-tx-footer-status">
                  {hasChanges ? (
                    <>
                      <AlertTriangle
                        size={12}
                      />

                      توجد تغييرات غير
                      محفوظة
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={12}
                      />

                      لا توجد تغييرات
                    </>
                  )}
                </div>

                <div className="edit-tx-actions">
                  <button
                    type="button"
                    className="edit-tx-cancel"
                    onClick={
                      handleClose
                    }
                    disabled={
                      saving
                    }
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    className="edit-tx-save"
                    disabled={
                      !canSave
                    }
                    onClick={
                      requestSave
                    }
                  >
                    {saving ? (
                      <Loader2
                        size={15}
                        className="edit-tx-spin"
                      />
                    ) : (
                      <Save
                        size={15}
                      />
                    )}

                    {saving
                      ? "جارٍ الحفظ..."
                      : "حفظ التعديلات"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <style>
          {`
            .edit-tx-overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;

              display: flex;
              align-items: center;
              justify-content: center;

              padding: calc(18px * var(--app-density,1));

              background:
                rgba(10, 29, 24, .60);

              backdrop-filter:
                blur(7px);
            }

            .edit-tx-modal {
              width:
                min(760px, 100%);

              max-height:
                calc(100vh - 36px);

              overflow:
                auto;

              border:
                1px solid
                rgba(255,255,255,.5);

              border-radius:
                calc(24px * var(--app-radius-scale,1));

              background:
                #FFFFFF;

              box-shadow:
                0 30px 90px
                rgba(0,0,0,.25);

              animation:
                editTxIn
                .18s ease-out;
            }

            @keyframes
            editTxIn {
              from {
                opacity: 0;

                transform:
                  translateY(8px)
                  scale(.985);
              }

              to {
                opacity: 1;

                transform:
                  translateY(0)
                  scale(1);
              }
            }

            /* =========================
               HEADER
            ========================= */

            .edit-tx-header {
              position: sticky;
              top: 0;
              z-index: 20;

              display: flex;
              align-items: flex-start;
              justify-content:
                space-between;

              gap: calc(14px * var(--app-density,1));

              padding:
                calc(17px * var(--app-density,1)) calc(20px * var(--app-density,1));

              border-bottom:
                1px solid #E8EEE9;

              background:
                linear-gradient(
                  135deg,
                  rgba(255,255,255,.98),
                  rgba(247,251,248,.98)
                );

              backdrop-filter:
                blur(10px);
            }

            .edit-tx-heading {
              display: flex;
              align-items: center;

              gap: calc(10px * var(--app-density,1));
            }

            .edit-tx-main-icon {
              width: 46px;
              height: 46px;

              flex: 0 0 46px;

              border-radius:
                calc(14px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              box-shadow:
                0 8px 20px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 10%,transparent);
            }

            .edit-tx-modal.grant
            .edit-tx-main-icon {
              color: #FFFFFF;

              background:
                linear-gradient(
                  145deg,
                  var(--app-color-0f5132,#0F5132),
                  var(--app-color-0f766e,#0F766E)
                );
            }

            .edit-tx-modal.deduction
            .edit-tx-main-icon {
              color: #A84235;

              border:
                1px solid #F0D7D1;

              background:
                #FFF3F0;
            }

            .edit-tx-eyebrow {
              display: flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));

              margin-bottom: 2px;

              color: #94742D;

              font-size: calc(9px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .edit-tx-heading h2 {
              margin: 0;

              color: #2F4036;

              font-size: calc(19px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .edit-tx-heading p {
              margin:
                3px 0 0;

              color: #8B958F;

              font-size: calc(9px * var(--app-font-scale,1));
              line-height: 1.5;
            }

            .edit-tx-close {
              width: 36px;
              height: 36px;

              flex: 0 0 36px;

              border:
                1px solid #E0E7E2;

              border-radius:
                calc(10px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #657169;
              background: #FFFFFF;

              cursor: pointer;
            }

            .edit-tx-close:hover {
              color: #A34337;

              border-color:
                #EBD7D3;

              background:
                #FFF9F7;
            }

            /* =========================
               LOADING
            ========================= */

            .edit-tx-loading {
              min-height: 310px;

              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;

              gap: calc(7px * var(--app-density,1));

              color: #718078;
            }

            .edit-tx-loading strong {
              font-size: calc(8px * var(--app-font-scale,1));
            }

            /* =========================
               CONTEXT
            ========================= */

            .edit-tx-context-card {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(12px * var(--app-density,1));

              margin:
                14px 20px 10px;

              padding: calc(11px * var(--app-density,1)) calc(12px * var(--app-density,1));

              border:
                1px solid #E3EAE5;

              border-radius:
                calc(14px * var(--app-radius-scale,1));

              background:
                linear-gradient(
                  135deg,
                  var(--app-color-f8fbf9,#F8FBF9),
                  #FFFCF7
                );
            }

            .edit-tx-student {
              display: flex;
              align-items: center;

              gap: calc(9px * var(--app-density,1));

              min-width: 0;
            }

            .edit-tx-avatar {
              width: 40px;
              height: 40px;

              flex: 0 0 40px;

              border-radius:
                calc(12px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: var(--app-color-0f5132,#0F5132);
              background: #E9F5ED;
            }

            .edit-tx-student span,
            .edit-tx-student strong,
            .edit-tx-student small {
              display: block;
            }

            .edit-tx-student span {
              color: #8A948E;

              font-size: calc(7px * var(--app-font-scale,1));
            }

            .edit-tx-student strong {
              margin-top: 1px;

              color: #35463C;

              font-size: calc(11px * var(--app-font-scale,1));
            }

            .edit-tx-student small {
              margin-top: 2px;

              color: #9AA29D;

              font-size: calc(6.5px * var(--app-font-scale,1));
            }

            .edit-tx-context-pills {
              display: flex;
              align-items: center;
              justify-content:
                flex-end;
              flex-wrap: wrap;

              gap: calc(5px * var(--app-density,1));
            }

            .edit-tx-context-pills span {
              min-height: 28px;

              padding:
                0 calc(8px * var(--app-density,1));

              border:
                1px solid #E3E9E5;

              border-radius:
                calc(8px * var(--app-radius-scale,1));

              display: inline-flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));

              color: #6D7971;
              background: #FFFFFF;

              font-size: calc(6.5px * var(--app-font-scale,1));
              font-weight: 800;
            }

            /* =========================
               SUMMARY
            ========================= */

            .edit-tx-summary-grid {
              display: grid;

              grid-template-columns:
                repeat(
                  3,
                  minmax(0,1fr)
                );

              gap: calc(8px * var(--app-density,1));

              padding:
                0 calc(20px * var(--app-density,1)) calc(10px * var(--app-density,1));
            }

            .edit-tx-summary-card {
              display: flex;
              align-items: center;

              gap: calc(8px * var(--app-density,1));

              padding: calc(10px * var(--app-density,1));

              border:
                1px solid #E6ECE8;

              border-radius:
                calc(12px * var(--app-radius-scale,1));

              background: #FFFFFF;
            }

            .edit-tx-summary-card.positive {
              border-color:
                #D7E7DD;

              background:
                #F8FCF9;
            }

            .edit-tx-summary-card.danger {
              border-color:
                #F0D8D3;

              background:
                #FFF9F7;
            }

            .edit-tx-summary-icon {
              width: 34px;
              height: 34px;

              flex: 0 0 34px;

              border-radius:
                calc(10px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: var(--app-color-0f5132,#0F5132);
              background: var(--app-color-edf7f1,#EDF7F1);
            }

            .edit-tx-summary-card.positive
            .edit-tx-summary-icon {
              color: #0F6A46;
              background: #EAF7EE;
            }

            .edit-tx-summary-card.danger
            .edit-tx-summary-icon {
              color: #A84235;
              background: #FCEDEA;
            }

            .edit-tx-summary-card span,
            .edit-tx-summary-card strong {
              display: block;
            }

            .edit-tx-summary-card span {
              color: #8A948E;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .edit-tx-summary-card strong {
              margin-top: 1px;

              color: #3B4B41;

              font-size: calc(13px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .edit-tx-summary-card strong small {
              margin-right: 2px;

              color: #8A948E;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 800;
            }

            .edit-tx-summary-card.positive
            strong {
              color: #0F6A46;
            }

            .edit-tx-summary-card.danger
            strong {
              color: #A84235;
            }

            /* =========================
               BODY / SECTION
            ========================= */

            .edit-tx-body {
              padding:
                0 calc(20px * var(--app-density,1)) calc(16px * var(--app-density,1));
            }

            .edit-tx-section {
              margin-bottom: 10px;

              padding: calc(12px * var(--app-density,1));

              border:
                1px solid #E7ECE9;

              border-radius:
                calc(14px * var(--app-radius-scale,1));

              background: #FFFFFF;
            }

            .edit-tx-section-head {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(10px * var(--app-density,1));

              margin-bottom: 9px;

              color: #89958D;
            }

            .edit-tx-section-head h3 {
              margin: 0;

              color: #405046;

              font-size: calc(10px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .edit-tx-section-head p {
              margin:
                2px 0 0;

              color: #929B95;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            /* =========================
               READ ONLY
            ========================= */

            .edit-tx-fields-grid {
              display: grid;

              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );

              gap: calc(7px * var(--app-density,1));
            }

            .edit-tx-readonly {
              display: flex;
              align-items: center;

              gap: calc(8px * var(--app-density,1));

              padding: calc(9px * var(--app-density,1));

              border:
                1px solid #E5EBE7;

              border-radius:
                calc(10px * var(--app-radius-scale,1));

              background: #FAFCFB;
            }

            .edit-tx-readonly-icon {
              width: 31px;
              height: 31px;

              flex: 0 0 31px;

              border-radius:
                calc(9px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: var(--app-color-0f5132,#0F5132);
              background: var(--app-color-edf7f1,#EDF7F1);
            }

            .edit-tx-modal.deduction
            .edit-tx-readonly-icon {
              color: #A84235;
              background: #FFF0ED;
            }

            .edit-tx-readonly span,
            .edit-tx-readonly strong {
              display: block;
            }

            .edit-tx-readonly span {
              color: #8D9791;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .edit-tx-readonly strong {
              margin-top: 1px;

              color: #405046;

              font-size: calc(8px * var(--app-font-scale,1));
            }

            /* =========================
               POINTS
            ========================= */

            .edit-tx-points-box {
              display: grid;

              grid-template-columns:
                minmax(0,1fr)
                minmax(180px,.75fr);

              gap: calc(8px * var(--app-density,1));
            }

            .edit-tx-points-input {
              display: flex;
              align-items: center;

              overflow: hidden;

              border:
                1px solid #DCE5DF;

              border-radius:
                calc(10px * var(--app-radius-scale,1));

              background: #FBFDFC;
            }

            .edit-tx-points-input:focus-within {
              border-color:
                #9FC5AE;

              box-shadow:
                0 0 0 3px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
            }

            .edit-tx-points-input input {
              flex: 1;

              min-width: 0;
              height: 44px;

              padding:
                0 calc(11px * var(--app-density,1));

              border: none;
              outline: none;

              color: #35463C;
              background:
                transparent;

              font-size: calc(12px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .edit-tx-points-input span {
              padding:
                0 calc(11px * var(--app-density,1));

              color: #7E8A82;

              font-size: calc(7px * var(--app-font-scale,1));
              font-weight: 800;
            }

            .edit-tx-change-preview {
              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;

              gap: calc(2px * var(--app-density,1));

              padding: calc(8px * var(--app-density,1));

              border:
                1px solid #E6ECE8;

              border-radius:
                calc(10px * var(--app-radius-scale,1));

              background: #FAFCFB;

              text-align: center;
            }

            .edit-tx-change-preview span {
              color: #8A958E;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .edit-tx-change-preview strong {
              color: #56635B;

              font-size: calc(9px * var(--app-font-scale,1));
            }

            .edit-tx-change-preview strong.positive {
              color: #0F7A4F;
            }

            .edit-tx-change-preview strong.negative {
              color: #B42318;
            }

            /* =========================
               NOTES
            ========================= */

            .edit-tx-notes {
              width: 100%;
              min-height: 90px;

              padding: calc(10px * var(--app-density,1));

              border:
                1px solid #DDE5E0;

              border-radius:
                calc(10px * var(--app-radius-scale,1));

              outline: none;

              color: #3F4E44;
              background: #FBFDFC;

              font-size: calc(8px * var(--app-font-scale,1));
              line-height: 1.7;

              resize: vertical;
            }

            .edit-tx-notes:focus {
              border-color:
                #A6C5B2;

              box-shadow:
                0 0 0 3px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);

              background: #FFFFFF;
            }

            .edit-tx-notes-meta {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));

              margin-top: 5px;

              color: #99A19C;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            /* =========================
               WARNING
            ========================= */

            .edit-tx-warning {
              display: flex;
              align-items: flex-start;

              gap: calc(8px * var(--app-density,1));

              padding: calc(10px * var(--app-density,1));

              border:
                1px solid #D9E7DE;

              border-radius:
                calc(12px * var(--app-radius-scale,1));

              color: #0F6848;

              background:
                #F2FAF5;
            }

            .edit-tx-warning.critical {
              border-color:
                #EDCFC9;

              color: #9E3C30;

              background:
                #FFF5F2;
            }

            .edit-tx-warning strong,
            .edit-tx-warning span {
              display: block;
            }

            .edit-tx-warning strong {
              font-size: calc(7px * var(--app-font-scale,1));
            }

            .edit-tx-warning span {
              margin-top: 2px;

              font-size: calc(6px * var(--app-font-scale,1));
              line-height: 1.55;
            }

            /* =========================
               FOOTER
            ========================= */

            .edit-tx-footer {
              position: sticky;
              bottom: 0;
              z-index: 20;

              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(10px * var(--app-density,1));

              padding:
                calc(12px * var(--app-density,1)) calc(20px * var(--app-density,1));

              border-top:
                1px solid #E9EEEB;

              background:
                rgba(
                  251,
                  253,
                  252,
                  .96
                );

              backdrop-filter:
                blur(10px);
            }

            .edit-tx-footer-status {
              display: flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));

              color: #7B877F;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .edit-tx-actions {
              display: flex;
              align-items: center;

              gap: calc(6px * var(--app-density,1));
            }

            .edit-tx-cancel,
            .edit-tx-save {
              min-height: 40px;

              padding:
                0 calc(13px * var(--app-density,1));

              border-radius:
                calc(9px * var(--app-radius-scale,1));

              font-size: calc(8px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;
            }

            .edit-tx-cancel {
              border:
                1px solid #DCE4DF;

              color: #647169;
              background: #FFFFFF;
            }

            .edit-tx-save {
              border: none;

              display: inline-flex;
              align-items: center;
              justify-content: center;

              gap: calc(5px * var(--app-density,1));

              color: #FFFFFF;

              background:
                linear-gradient(
                  135deg,
                  var(--app-color-0f5132,#0F5132),
                  var(--app-color-0f766e,#0F766E)
                );
            }

            .edit-tx-modal.deduction
            .edit-tx-save {
              background:
                linear-gradient(
                  135deg,
                  #A84235,
                  #C35A47
                );
            }

            .edit-tx-cancel:disabled,
            .edit-tx-save:disabled,
            .edit-tx-close:disabled {
              opacity: .48;
              cursor: not-allowed;
            }

            @keyframes
            editTxSpin {
              to {
                transform:
                  rotate(360deg);
              }
            }

            .edit-tx-spin {
              animation:
                editTxSpin
                .8s linear infinite;
            }

            /* =========================
               RESPONSIVE
            ========================= */

            @media
            (max-width: 700px) {
              .edit-tx-overlay {
                align-items:
                  flex-end;

                padding: calc(7px * var(--app-density,1));
              }

              .edit-tx-modal {
                width: 100%;
                max-height:
                  calc(100vh - 14px);

                border-radius:
                  calc(22px * var(--app-radius-scale,1)) calc(22px * var(--app-radius-scale,1))
                  calc(10px * var(--app-radius-scale,1)) calc(10px * var(--app-radius-scale,1));
              }

              .edit-tx-header {
                padding:
                  calc(14px * var(--app-density,1)) calc(15px * var(--app-density,1));
              }

              .edit-tx-heading p {
                display: none;
              }

              .edit-tx-context-card {
                align-items:
                  flex-start;
                flex-direction:
                  column;

                margin:
                  10px 15px 8px;
              }

              .edit-tx-context-pills {
                width: 100%;

                justify-content:
                  flex-start;
              }

              .edit-tx-summary-grid {
                grid-template-columns:
                  1fr 1fr;

                padding:
                  0 calc(15px * var(--app-density,1)) calc(8px * var(--app-density,1));
              }

              .edit-tx-summary-grid
              .edit-tx-summary-card:last-child {
                grid-column:
                  1 / -1;
              }

              .edit-tx-body {
                padding:
                  0 calc(15px * var(--app-density,1)) calc(13px * var(--app-density,1));
              }

              .edit-tx-points-box {
                grid-template-columns:
                  1fr;
              }

              .edit-tx-footer {
                align-items:
                  stretch;
                flex-direction:
                  column;

                padding:
                  calc(10px * var(--app-density,1)) calc(15px * var(--app-density,1));
              }

              .edit-tx-actions {
                width: 100%;
              }

              .edit-tx-actions button {
                flex: 1;
              }
            }

            @media
            (max-width: 430px) {
              .edit-tx-summary-grid {
                grid-template-columns:
                  1fr;
              }

              .edit-tx-summary-grid
              .edit-tx-summary-card:last-child {
                grid-column:
                  auto;
              }

              .edit-tx-fields-grid {
                grid-template-columns:
                  1fr;
              }

              .edit-tx-heading h2 {
                font-size:
                  calc(17px * var(--app-font-scale,1));
              }
            }
          `}
        </style>
      </div>

      <ConfirmModal
        open={
          showConfirm
        }
        title="تأكيد تعديل العملية"
        message={
          `سيتم تعديل ${isGrant ? "المنحة" : "الخصم"} للطالب ${studentName || ""}.\n\n` +
          `القيمة السابقة: ${isGrant ? "+" : "-"}${originalMagnitude} نقطة\n` +
          `القيمة الجديدة: ${isGrant ? "+" : "-"}${newMagnitude} نقطة\n` +
          `أثر التعديل على الرصيد: ${deltaText}\n` +
          `الرصيد المتوقع بعد التعديل: ${balanceAfter} نقطة`
        }
        onConfirm={
          saveChanges
        }
        onCancel={() =>
          !saving &&
          setShowConfirm(
            false
          )
        }
      />
    </>
  );
}

/* =========================================================
   Summary Card
========================================================= */

function SummaryCard({
  label,
  value,
  suffix,
  icon: Icon,
  tone = "",
}) {
  return (
    <div
      className={`edit-tx-summary-card ${tone}`}
    >
      <div className="edit-tx-summary-icon">
        <Icon
          size={17}
        />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}

          {suffix && (
            <small>
              {" "}
              {suffix}
            </small>
          )}
        </strong>
      </div>
    </div>
  );
}

/* =========================================================
   Read-only Field
========================================================= */

function ReadOnlyField({
  label,
  value,
  icon: Icon,
}) {
  return (
    <div className="edit-tx-readonly">
      <div className="edit-tx-readonly-icon">
        <Icon
          size={16}
        />
      </div>

      <div>
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}
