import {displayDateFormatter} from "../../lib/calendar";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Ban,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileText,
  Loader2,
  MinusCircle,
  Search,
  ShieldCheck,
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

function getHalaqaId(value) {
  if (
    value &&
    typeof value === "object"
  ) {
    return Number(
      value.id ||
        value.halaqa_id ||
        0
    );
  }

  return Number(
    value || 0
  );
}

function getHalaqaName(value) {
  if (
    value &&
    typeof value === "object"
  ) {
    return (
      value.name ||
      value.halaqa_name ||
      "الحلقة المحددة"
    );
  }

  return "الحلقة المحددة";
}

function normalizeDate(value) {
  if (!value) {
    const date =
      new Date();

    const year =
      date.getFullYear();

    const month =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        date.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  if (
    value instanceof Date
  ) {
    const year =
      value.getFullYear();

    const month =
      String(
        value.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        value.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  return String(value).slice(
    0,
    10
  );
}

function formatDate(value) {
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

/* =========================================================
   Component
========================================================= */

export default function DeductionModal({
  open,
  student,
  penaltyTypes = [],
  selectedDate,
  selectedHalaqa,
  onClose,
  onSaved,
}) {
  const [
    selectedPenalties,
    setSelectedPenalties,
  ] =
    useState([]);

  const [
    notes,
    setNotes,
  ] =
    useState("");

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    showConfirm,
    setShowConfirm,
  ] =
    useState(false);

  const [
    currentBalance,
    setCurrentBalance,
  ] =
    useState(0);

  const [
    loadingBalance,
    setLoadingBalance,
  ] =
    useState(false);

  /* =====================================================
     Derived
  ===================================================== */

  const halaqaId =
    getHalaqaId(
      selectedHalaqa
    );

  const halaqaName =
    getHalaqaName(
      selectedHalaqa
    );

  const transactionDate =
    normalizeDate(
      selectedDate
    );

  const activePenaltyTypes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return (
        penaltyTypes || []
      )
        .filter(
          (item) =>
            item &&
            item.is_active !==
              false
        )
        .filter(
          (item) => {
            if (!query) {
              return true;
            }

            return String(
              item.name || ""
            )
              .toLowerCase()
              .includes(
                query
              );
          }
        );
    }, [
      penaltyTypes,
      search,
    ]);

  const totalPenalty =
    useMemo(() => {
      return selectedPenalties.reduce(
        (
          sum,
          item
        ) =>
          sum +
          Math.abs(
            Number(
              item.points
            ) || 0
          ),
        0
      );
    }, [
      selectedPenalties,
    ]);

  const balanceAfter =
    currentBalance -
    totalPenalty;

  const canSave =
    Boolean(
      student?.id
    ) &&
    Boolean(
      halaqaId
    ) &&
    Boolean(
      transactionDate
    ) &&
    selectedPenalties.length >
      0 &&
    totalPenalty >
      0 &&
    !saving;

  /* =====================================================
     Reset / Open
  ===================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedPenalties(
      []
    );

    setNotes("");
    setSearch("");
    setShowConfirm(false);

    setCurrentBalance(
      Number(
        student?.total_points ||
          0
      )
    );

    loadCurrentBalance();
  }, [
    open,
    student?.id,
  ]);

  /* =====================================================
     Lock page scroll
  ===================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    const previous =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
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
     Balance
  ===================================================== */

  async function loadCurrentBalance() {
    if (!student?.id) {
      return;
    }

    try {
      setLoadingBalance(
        true
      );

      const {
        data,
        error,
      } =
        await supabase
          .from("profiles")
          .select(
            "total_points"
          )
          .eq(
            "id",
            student.id
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      setCurrentBalance(
        Number(
          data?.total_points ||
            0
        )
      );

    } catch (error) {
      console.error(
        "LOAD STUDENT BALANCE:",
        error
      );

      /*
        لا نفشل فتح النافذة بسبب
        تعذر تحديث الرصيد؛ نستخدم
        القيمة الموجودة في student.
      */

    } finally {
      setLoadingBalance(
        false
      );
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
     Selection
  ===================================================== */

  function togglePenalty(
    penalty
  ) {
    if (saving) {
      return;
    }

    setSelectedPenalties(
      (current) => {
        const exists =
          current.some(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                penalty.id
              )
          );

        if (exists) {
          return current.filter(
            (item) =>
              Number(
                item.id
              ) !==
              Number(
                penalty.id
              )
          );
        }

        return [
          ...current,
          penalty,
        ];
      }
    );
  }

  function clearSelection() {
    if (saving) {
      return;
    }

    setSelectedPenalties(
      []
    );
  }

  /* =====================================================
     Scope validation
  ===================================================== */

  async function validateTeacherScope() {
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
          halaqaId
        )
        .maybeSingle();

    if (
      teacherLinkError
    ) {
      throw teacherLinkError;
    }

    if (!teacherLink) {
      throw new Error(
        "الحلقة المحددة لا تتبع حسابك."
      );
    }

    const {
      data: studentLink,
      error:
        studentLinkError,
    } =
      await supabase
        .from(
          "student_halaqat"
        )
        .select("id")
        .eq(
          "student_id",
          student.id
        )
        .eq(
          "halaqa_id",
          halaqaId
        )
        .eq(
          "is_current",
          true
        )
        .maybeSingle();

    if (
      studentLinkError
    ) {
      throw studentLinkError;
    }

    if (!studentLink) {
      throw new Error(
        "الطالب لا يتبع هذه الحلقة حاليًا."
      );
    }

    return teacher;
  }

  /* =====================================================
     Request confirmation
  ===================================================== */

  function requestSave() {
    if (
      !student?.id
    ) {
      showToast(
        "لم يتم تحديد الطالب.",
        "error"
      );

      return;
    }

    if (!halaqaId) {
      showToast(
        "حدد الحلقة أولًا.",
        "error"
      );

      return;
    }

    if (
      !selectedPenalties.length
    ) {
      showToast(
        "اختر سبب خصم واحدًا على الأقل.",
        "error"
      );

      return;
    }

    if (
      totalPenalty <= 0
    ) {
      showToast(
        "إجمالي الخصم يجب أن يكون أكبر من صفر.",
        "error"
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

  async function savePenalty() {
    if (!canSave) {
      return;
    }

    setShowConfirm(
      false
    );

    setSaving(true);

    try {
      /*
        تحقق إضافي من صلاحية الحلقة
        والطالب قبل تنفيذ العملية.

        هذا لا يغني عن RLS، لكنه يمنع
        أخطاء الواجهة ويوضح السبب
        للمستخدم.
      */

      await validateTeacherScope();

      /*
        penalty.points قد تكون موجبة
        في الأنواع الجديدة أو سالبة
        في بيانات قديمة.

        المعاملة نفسها يجب أن تُحفظ
        دائمًا كقيمة سالبة لأنها خصم.
      */

      const rows =
        selectedPenalties.map(
          (penalty) => ({
            student_id:
              student.id,

            points:
              -Math.abs(
                Number(
                  penalty.points
                ) || 0
              ),

            reason:
              penalty.name,

            reward_type_id:
              penalty.id,

            category:
              "deduction",

            halaqa_id:
              halaqaId,

            transaction_date:
              transactionDate,

            notes:
              notes.trim() ||
              "",
          })
        );

      const invalid =
        rows.some(
          (row) =>
            !Number.isFinite(
              row.points
            ) ||
            row.points >= 0
        );

      if (invalid) {
        throw new Error(
          "يوجد نوع خصم بقيمة نقاط غير صحيحة."
        );
      }

      const {
        error: insertError,
      } =
        await supabase
          .from(
            "points_transactions"
          )
          .insert(rows);

      if (insertError) {
        throw insertError;
      }

      /*
        إعادة حساب الرصيد من سجل
        المعاملات هو المصدر الأدق من
        currentBalance الموجود في
        الواجهة.
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
            student.id
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
          profileUpdateError,
      } =
        await supabase
          .from("profiles")
          .update({
            total_points:
              newTotal,
          })
          .eq(
            "id",
            student.id
          );

      if (
        profileUpdateError
      ) {
        throw profileUpdateError;
      }

      setCurrentBalance(
        newTotal
      );

      showToast(
        `تم خصم ${totalPenalty} نقطة من ${student.full_name || "الطالب"} بنجاح.`,
        "success"
      );

      await onSaved?.();

      onClose?.();

    } catch (error) {
      console.error(
        "SAVE DEDUCTION:",
        error
      );

      showToast(
        error?.message ||
          "تعذر حفظ الخصم.",
        "error"
      );

    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     Render
  ===================================================== */

  if (
    !open ||
    !student
  ) {
    return null;
  }

  return (
    <>
      <div
        className="deduction-overlay"
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
          className="deduction-modal"
          role="dialog"
          aria-modal="true"
          aria-label="خصم نقاط الطالب"
        >
          {/* =========================================
              HEADER
          ========================================= */}

          <div className="deduction-header">
            <div className="deduction-heading">
              <div className="deduction-main-icon">
                <MinusCircle
                  size={23}
                />
              </div>

              <div>
                <div className="deduction-eyebrow">
                  <ShieldCheck
                    size={12}
                  />

                  النقاط والمكافآت
                </div>

                <h2>
                  خصم نقاط
                </h2>

                <p>
                  سجل الخصم بوضوح مع
                  الحفاظ على سجل كامل
                  للسبب والتاريخ.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="deduction-close"
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
              STUDENT
          ========================================= */}

          <div className="deduction-student-card">
            <div className="deduction-student-main">
              <div className="deduction-student-avatar">
                <UserRound
                  size={22}
                />
              </div>

              <div>
                <span>
                  الطالب
                </span>

                <strong>
                  {student.full_name ||
                    "طالب"}
                </strong>

                <small>
                  {student.user_number
                    ? `رقم المستخدم: ${student.user_number}`
                    : "عملية خصم مسجلة في سجل الطالب"}
                </small>
              </div>
            </div>

            <div className="deduction-context">
              <span>
                <BookOpen
                  size={13}
                />

                {halaqaName}
              </span>

              <span>
                <CalendarDays
                  size={13}
                />

                {formatDate(
                  transactionDate
                )}
              </span>
            </div>
          </div>

          {/* =========================================
              SUMMARY
          ========================================= */}

          <div className="deduction-summary-grid">
            <SummaryCard
              label="الرصيد الحالي"
              value={
                loadingBalance
                  ? "..."
                  : currentBalance
              }
              suffix="نقطة"
              icon={Coins}
            />

            <SummaryCard
              label="إجمالي الخصم"
              value={`-${totalPenalty}`}
              suffix="نقطة"
              icon={MinusCircle}
              danger
            />

            <SummaryCard
              label="الرصيد بعد الخصم"
              value={
                balanceAfter
              }
              suffix="نقطة"
              icon={
                CheckCircle2
              }
              danger={
                balanceAfter < 0
              }
            />
          </div>

          {/* =========================================
              CONTENT
          ========================================= */}

          <div className="deduction-body">
            <section className="deduction-section">
              <div className="deduction-section-head">
                <div>
                  <h3>
                    أسباب الخصم
                  </h3>

                  <p>
                    يمكنك اختيار أكثر
                    من سبب في نفس
                    العملية.
                  </p>
                </div>

                {selectedPenalties.length >
                  0 && (
                  <button
                    type="button"
                    className="deduction-clear"
                    onClick={
                      clearSelection
                    }
                    disabled={
                      saving
                    }
                  >
                    مسح الاختيار
                  </button>
                )}
              </div>

              <div className="deduction-search">
                <Search
                  size={15}
                />

                <input
                  type="search"
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
                    )
                  }
                  placeholder="ابحث عن سبب الخصم..."
                />
              </div>

              {activePenaltyTypes.length >
              0 ? (
                <div className="deduction-types-grid">
                  {activePenaltyTypes.map(
                    (
                      penalty
                    ) => {
                      const selected =
                        selectedPenalties.some(
                          (
                            item
                          ) =>
                            Number(
                              item.id
                            ) ===
                            Number(
                              penalty.id
                            )
                        );

                      const value =
                        Math.abs(
                          Number(
                            penalty.points
                          ) || 0
                        );

                      return (
                        <button
                          key={
                            penalty.id
                          }
                          type="button"
                          className={
                            selected
                              ? "deduction-type selected"
                              : "deduction-type"
                          }
                          onClick={() =>
                            togglePenalty(
                              penalty
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          <div className="deduction-type-top">
                            <div className="deduction-type-icon">
                              <Ban
                                size={17}
                              />
                            </div>

                            <span
                              className={
                                selected
                                  ? "deduction-check selected"
                                  : "deduction-check"
                              }
                            >
                              {selected && (
                                <CheckCircle2
                                  size={14}
                                />
                              )}
                            </span>
                          </div>

                          <strong>
                            {penalty.name ||
                              "سبب خصم"}
                          </strong>

                          <div className="deduction-type-points">
                            -{value}

                            <small>
                              نقطة
                            </small>
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              ) : (
                <div className="deduction-empty">
                  <Ban
                    size={24}
                  />

                  <strong>
                    لا توجد أنواع خصم
                    مطابقة
                  </strong>

                  <span>
                    غيّر كلمة البحث أو
                    أنشئ نوع خصم جديدًا
                    من إدارة الأنواع.
                  </span>
                </div>
              )}
            </section>

            {/* =====================================
                NOTES
            ===================================== */}

            <section className="deduction-section">
              <div className="deduction-section-head">
                <div>
                  <h3>
                    ملاحظة العملية
                  </h3>

                  <p>
                    أضف سياقًا مختصرًا
                    عند الحاجة لتسهيل
                    المراجعة لاحقًا.
                  </p>
                </div>

                <FileText
                  size={17}
                  className="deduction-section-side-icon"
                />
              </div>

              <textarea
                className="deduction-notes"
                value={notes}
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
                placeholder="مثال: تم التنبيه على الطالب ومناقشة السبب معه..."
                rows={4}
              />

              <div className="deduction-notes-meta">
                <span>
                  الملاحظة اختيارية،
                  ويفضل إضافتها للحالات
                  التي تحتاج متابعة.
                </span>

                <span>
                  {notes.length}/500
                </span>
              </div>
            </section>

            {/* =====================================
                WARNING
            ===================================== */}

            <div
              className={
                balanceAfter < 0
                  ? "deduction-warning critical"
                  : "deduction-warning"
              }
            >
              <AlertTriangle
                size={18}
              />

              <div>
                <strong>
                  {balanceAfter <
                  0
                    ? "تنبيه: الرصيد سيصبح سالبًا"
                    : "عملية خصم"}
                </strong>

                <span>
                  {balanceAfter <
                  0
                    ? `سيصبح رصيد الطالب ${balanceAfter} نقطة بعد تنفيذ العملية. تأكد من صحة الاختيار قبل المتابعة.`
                    : "لن يتم تنفيذ الخصم حتى تؤكد العملية في الخطوة الأخيرة."}
                </span>
              </div>
            </div>
          </div>

          {/* =========================================
              FOOTER
          ========================================= */}

          <div className="deduction-footer">
            <div className="deduction-footer-summary">
              <span>
                المحدد:
                {" "}
                <b>
                  {
                    selectedPenalties.length
                  }
                </b>
              </span>

              <span>
                إجمالي الخصم:
                {" "}
                <b>
                  -{totalPenalty}
                </b>
              </span>
            </div>

            <div className="deduction-actions">
              <button
                type="button"
                className="deduction-cancel-button"
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
                className="deduction-save-button"
                disabled={
                  !canSave
                }
                onClick={
                  requestSave
                }
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="deduction-spin"
                  />
                ) : (
                  <MinusCircle
                    size={16}
                  />
                )}

                {saving
                  ? "جارٍ الحفظ..."
                  : `خصم ${totalPenalty} نقطة`}
              </button>
            </div>
          </div>
        </div>

        <style>
          {`
            .deduction-overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;

              display: flex;
              align-items: center;
              justify-content: center;

              padding: calc(18px * var(--app-density,1));

              background:
                rgba(10, 27, 23, .62);

              backdrop-filter:
                blur(7px);
            }

            .deduction-modal {
              width:
                min(920px, 100%);

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
                rgba(0,0,0,.27);

              animation:
                deductionModalIn
                .18s ease-out;
            }

            @keyframes
            deductionModalIn {
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

            .deduction-header {
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
                1px solid #EAEFEB;

              background:
                linear-gradient(
                  135deg,
                  rgba(255,255,255,.98),
                  rgba(255,248,246,.98)
                );

              backdrop-filter:
                blur(10px);
            }

            .deduction-heading {
              display: flex;
              align-items: center;

              gap: calc(10px * var(--app-density,1));
            }

            .deduction-main-icon {
              width: 46px;
              height: 46px;

              flex: 0 0 46px;

              border:
                1px solid #F0D7D1;

              border-radius:
                calc(14px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #A84235;

              background:
                linear-gradient(
                  145deg,
                  #FFF1EE,
                  #FFF8F6
                );
            }

            .deduction-eyebrow {
              display: flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));

              margin-bottom: 2px;

              color: #94742D;

              font-size: calc(9px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .deduction-heading h2 {
              margin: 0;

              color: #3D342F;

              font-size: calc(19px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .deduction-heading p {
              margin:
                3px 0 0;

              color: #8D918E;

              font-size: calc(9px * var(--app-font-scale,1));
              line-height: 1.5;
            }

            .deduction-close {
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

            .deduction-close:hover {
              color: #B42318;
              border-color:
                #F1D7D2;
              background:
                #FFF8F6;
            }

            /* =========================
               STUDENT
            ========================= */

            .deduction-student-card {
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
                  #FFFCF8
                );
            }

            .deduction-student-main {
              display: flex;
              align-items: center;

              gap: calc(9px * var(--app-density,1));

              min-width: 0;
            }

            .deduction-student-avatar {
              width: 40px;
              height: 40px;

              flex: 0 0 40px;

              border-radius:
                calc(12px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: var(--app-color-0f5132,#0F5132);
              background: #EAF5EE;
            }

            .deduction-student-main span,
            .deduction-student-main strong,
            .deduction-student-main small {
              display: block;
            }

            .deduction-student-main span {
              color: #8A948E;

              font-size: calc(7px * var(--app-font-scale,1));
            }

            .deduction-student-main strong {
              margin-top: 1px;

              color: #35463C;

              font-size: calc(11px * var(--app-font-scale,1));
            }

            .deduction-student-main small {
              margin-top: 2px;

              color: #9AA29D;

              font-size: calc(6.5px * var(--app-font-scale,1));
            }

            .deduction-context {
              display: flex;
              align-items: center;
              justify-content:
                flex-end;
              flex-wrap: wrap;

              gap: calc(5px * var(--app-density,1));
            }

            .deduction-context span {
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

            .deduction-summary-grid {
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

            .deduction-summary-card {
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

            .deduction-summary-card.danger {
              border-color:
                #F0D9D4;

              background:
                #FFF9F7;
            }

            .deduction-summary-icon {
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

            .deduction-summary-card.danger
            .deduction-summary-icon {
              color: #B42318;
              background: #FCEDEA;
            }

            .deduction-summary-card span,
            .deduction-summary-card strong {
              display: block;
            }

            .deduction-summary-card span {
              color: #8A948E;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .deduction-summary-card strong {
              margin-top: 1px;

              color: #3B4B41;

              font-size: calc(13px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .deduction-summary-card strong small {
              margin-right: 2px;

              color: #8A948E;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 800;
            }

            .deduction-summary-card.danger
            strong {
              color: #B42318;
            }

            /* =========================
               BODY
            ========================= */

            .deduction-body {
              padding:
                0 calc(20px * var(--app-density,1)) calc(16px * var(--app-density,1));
            }

            .deduction-section {
              margin-bottom: 10px;

              padding: calc(12px * var(--app-density,1));

              border:
                1px solid #E7ECE9;

              border-radius:
                calc(14px * var(--app-radius-scale,1));

              background: #FFFFFF;
            }

            .deduction-section:last-child {
              margin-bottom: 0;
            }

            .deduction-section-head {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(10px * var(--app-density,1));

              margin-bottom: 9px;
            }

            .deduction-section-head h3 {
              margin: 0;

              color: #405046;

              font-size: calc(10px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .deduction-section-head p {
              margin:
                2px 0 0;

              color: #929B95;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .deduction-section-side-icon {
              color: #8D9891;
            }

            .deduction-clear {
              border: none;

              padding:
                calc(5px * var(--app-density,1)) calc(7px * var(--app-density,1));

              border-radius:
                calc(7px * var(--app-radius-scale,1));

              color: #9B463A;
              background: #FFF2EF;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 850;

              cursor: pointer;
            }

            /* =========================
               SEARCH
            ========================= */

            .deduction-search {
              position: relative;

              margin-bottom: 9px;
            }

            .deduction-search svg {
              position: absolute;
              right: 10px;
              top: 50%;

              transform:
                translateY(-50%);

              color: #8D9891;
            }

            .deduction-search input {
              width: 100%;
              height: 39px;

              padding:
                0 calc(34px * var(--app-density,1)) 0 calc(10px * var(--app-density,1));

              border:
                1px solid #DDE5E0;

              border-radius:
                calc(10px * var(--app-radius-scale,1));

              outline: none;

              color: #3B4B41;
              background: #FBFDFC;

              font-size: calc(8px * var(--app-font-scale,1));
            }

            .deduction-search input:focus {
              border-color:
                #A6C5B2;

              box-shadow:
                0 0 0 3px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
            }

            /* =========================
               TYPES
            ========================= */

            .deduction-types-grid {
              display: grid;

              grid-template-columns:
                repeat(
                  auto-fill,
                  minmax(
                    160px,
                    1fr
                  )
                );

              gap: calc(7px * var(--app-density,1));
            }

            .deduction-type {
              min-height: 112px;

              padding: calc(10px * var(--app-density,1));

              border:
                1px solid #E5EBE7;

              border-radius:
                calc(12px * var(--app-radius-scale,1));

              text-align: right;

              color: #46564B;
              background: #FFFFFF;

              cursor: pointer;

              transition:
                transform .16s ease,
                border-color .16s ease,
                background .16s ease,
                box-shadow .16s ease;
            }

            .deduction-type:hover {
              transform:
                translateY(-1px);

              border-color:
                #E7CFC9;

              box-shadow:
                0 7px 18px
                rgba(40,28,24,.045);
            }

            .deduction-type.selected {
              border-color:
                #D99587;

              background:
                linear-gradient(
                  135deg,
                  #FFF4F1,
                  #FFFBFA
                );

              box-shadow:
                0 8px 20px
                rgba(180,35,24,.055);
            }

            .deduction-type-top {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));

              margin-bottom: 8px;
            }

            .deduction-type-icon {
              width: 31px;
              height: 31px;

              border-radius:
                calc(9px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #A84235;
              background: #FFF0ED;
            }

            .deduction-check {
              width: 23px;
              height: 23px;

              border:
                1px solid #DDE4E0;

              border-radius:
                calc(7px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #FFFFFF;
              background: #FFFFFF;
            }

            .deduction-check.selected {
              border-color:
                #AD4B3D;

              background:
                #AD4B3D;
            }

            .deduction-type > strong {
              display: block;

              min-height: 28px;

              color: #465249;

              font-size: calc(8px * var(--app-font-scale,1));
              line-height: 1.45;
            }

            .deduction-type-points {
              margin-top: 6px;

              color: #B42318;

              font-size: calc(15px * var(--app-font-scale,1));
              font-weight: 950;

              direction: ltr;
              text-align: right;
            }

            .deduction-type-points small {
              margin-left: 3px;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 800;
            }

            /* =========================
               EMPTY
            ========================= */

            .deduction-empty {
              min-height: 130px;

              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;

              gap: calc(4px * var(--app-density,1));

              border:
                1px dashed #E0E7E2;

              border-radius:
                calc(11px * var(--app-radius-scale,1));

              color: #9AA39D;
              background: #FBFDFC;

              text-align: center;
            }

            .deduction-empty strong {
              color: #657169;

              font-size: calc(8px * var(--app-font-scale,1));
            }

            .deduction-empty span {
              max-width: 300px;

              font-size: calc(6px * var(--app-font-scale,1));
              line-height: 1.55;
            }

            /* =========================
               NOTES
            ========================= */

            .deduction-notes {
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

            .deduction-notes:focus {
              border-color:
                #A6C5B2;

              box-shadow:
                0 0 0 3px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);

              background: #FFFFFF;
            }

            .deduction-notes-meta {
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

            .deduction-warning {
              display: flex;
              align-items: flex-start;

              gap: calc(8px * var(--app-density,1));

              padding: calc(10px * var(--app-density,1));

              border:
                1px solid #EADDBA;

              border-radius:
                calc(12px * var(--app-radius-scale,1));

              color: #86651E;

              background:
                #FFF9EA;
            }

            .deduction-warning.critical {
              border-color:
                #EDCFC9;

              color: #9E3C30;

              background:
                #FFF5F2;
            }

            .deduction-warning strong,
            .deduction-warning span {
              display: block;
            }

            .deduction-warning strong {
              font-size: calc(7px * var(--app-font-scale,1));
            }

            .deduction-warning span {
              margin-top: 2px;

              font-size: calc(6px * var(--app-font-scale,1));
              line-height: 1.55;
            }

            /* =========================
               FOOTER
            ========================= */

            .deduction-footer {
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

            .deduction-footer-summary {
              display: flex;
              align-items: center;
              flex-wrap: wrap;

              gap: calc(5px * var(--app-density,1));
            }

            .deduction-footer-summary span {
              padding:
                calc(5px * var(--app-density,1)) calc(7px * var(--app-density,1));

              border:
                1px solid #E1E8E3;

              border-radius:
                calc(8px * var(--app-radius-scale,1));

              color: #7A867E;
              background: #FFFFFF;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .deduction-footer-summary b {
              color: #A84235;
            }

            .deduction-actions {
              display: flex;
              align-items: center;

              gap: calc(6px * var(--app-density,1));
            }

            .deduction-cancel-button,
            .deduction-save-button {
              min-height: 40px;

              padding:
                0 calc(13px * var(--app-density,1));

              border-radius:
                calc(9px * var(--app-radius-scale,1));

              font-size: calc(8px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;
            }

            .deduction-cancel-button {
              border:
                1px solid #DCE4DF;

              color: #647169;
              background: #FFFFFF;
            }

            .deduction-save-button {
              border: none;

              display: inline-flex;
              align-items: center;
              justify-content: center;

              gap: calc(5px * var(--app-density,1));

              color: #FFFFFF;

              background:
                linear-gradient(
                  135deg,
                  #A84235,
                  #C35A47
                );

              box-shadow:
                0 8px 18px
                rgba(168,66,53,.13);
            }

            .deduction-cancel-button:disabled,
            .deduction-save-button:disabled,
            .deduction-close:disabled,
            .deduction-type:disabled,
            .deduction-clear:disabled {
              opacity: .48;
              cursor: not-allowed;
            }

            @keyframes
            deductionSpin {
              to {
                transform:
                  rotate(360deg);
              }
            }

            .deduction-spin {
              animation:
                deductionSpin
                .8s linear infinite;
            }

            /* =========================
               RESPONSIVE
            ========================= */

            @media
            (max-width: 760px) {
              .deduction-overlay {
                align-items:
                  flex-end;

                padding: calc(7px * var(--app-density,1));
              }

              .deduction-modal {
                width: 100%;
                max-height:
                  calc(100vh - 14px);

                border-radius:
                  calc(22px * var(--app-radius-scale,1)) calc(22px * var(--app-radius-scale,1))
                  calc(10px * var(--app-radius-scale,1)) calc(10px * var(--app-radius-scale,1));
              }

              .deduction-header {
                padding:
                  calc(14px * var(--app-density,1)) calc(15px * var(--app-density,1));
              }

              .deduction-heading p {
                display: none;
              }

              .deduction-student-card {
                align-items:
                  flex-start;
                flex-direction:
                  column;

                margin:
                  10px 15px 8px;
              }

              .deduction-context {
                width: 100%;

                justify-content:
                  flex-start;
              }

              .deduction-summary-grid {
                grid-template-columns:
                  1fr 1fr;

                padding:
                  0 calc(15px * var(--app-density,1)) calc(8px * var(--app-density,1));
              }

              .deduction-summary-grid
              .deduction-summary-card:last-child {
                grid-column:
                  1 / -1;
              }

              .deduction-body {
                padding:
                  0 calc(15px * var(--app-density,1)) calc(13px * var(--app-density,1));
              }

              .deduction-types-grid {
                grid-template-columns:
                  repeat(
                    2,
                    minmax(0,1fr)
                  );
              }

              .deduction-footer {
                align-items:
                  stretch;
                flex-direction:
                  column;

                padding:
                  calc(10px * var(--app-density,1)) calc(15px * var(--app-density,1));
              }

              .deduction-footer-summary {
                justify-content:
                  space-between;
              }

              .deduction-actions {
                width: 100%;
              }

              .deduction-actions button {
                flex: 1;
              }
            }

            @media
            (max-width: 430px) {
              .deduction-types-grid {
                grid-template-columns:
                  1fr;
              }

              .deduction-heading h2 {
                font-size:
                  calc(17px * var(--app-font-scale,1));
              }

              .deduction-summary-grid {
                grid-template-columns:
                  1fr;
              }

              .deduction-summary-grid
              .deduction-summary-card:last-child {
                grid-column:
                  auto;
              }
            }
          `}
        </style>
      </div>

      <ConfirmModal
        open={
          showConfirm
        }
        title="تأكيد خصم النقاط"
        message={
          `سيتم خصم ${totalPenalty} نقطة من الطالب ${student?.full_name || ""}.\n\n` +
          `الرصيد الحالي: ${currentBalance} نقطة\n` +
          `الرصيد بعد الخصم: ${balanceAfter} نقطة\n\n` +
          `الأسباب: ${selectedPenalties
            .map(
              (item) =>
                item.name
            )
            .join("، ")}`
        }
        onConfirm={
          savePenalty
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
  danger = false,
}) {
  return (
    <div
      className={
        danger
          ? "deduction-summary-card danger"
          : "deduction-summary-card"
      }
    >
      <div className="deduction-summary-icon">
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
