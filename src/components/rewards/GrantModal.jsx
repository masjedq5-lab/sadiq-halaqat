import {displayDateFormatter} from "../../lib/calendar";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Award, BookOpen, CalendarDays, CheckCircle2, Coins, FileText, Gift, Loader2, PlusCircle, Search, Sparkles, Star, Trophy, UserRound, X } from "lucide-react";

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

function getInitialHalaqaName(value) {
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

/* =========================================================
   Component
========================================================= */

export default function GrantModal({
  open,
  student,
  rewardTypes = [],
  selectedDate,
  selectedHalaqa,
  onClose,
  onSaved,
}) {
  const [
    selectedRewards,
    setSelectedRewards,
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
    loadingContext,
    setLoadingContext,
  ] =
    useState(false);

  const [
    halaqaName,
    setHalaqaName,
  ] =
    useState(
      getInitialHalaqaName(
        selectedHalaqa
      )
    );

  /* =====================================================
     Derived
  ===================================================== */

  const halaqaId =
    getHalaqaId(
      selectedHalaqa
    );

  const transactionDate =
    normalizeDate(
      selectedDate
    );

  const activeRewardTypes =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return (
        rewardTypes || []
      )
        .filter(
          (item) =>
            item &&
            item.is_active !==
              false
        )
        .filter(
          (item) =>
            !item.type ||
            item.type ===
              "reward"
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
      rewardTypes,
      search,
    ]);

  const totalPoints =
    useMemo(() => {
      return selectedRewards.reduce(
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
      selectedRewards,
    ]);

  const balanceAfter =
    currentBalance +
    totalPoints;

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
    selectedRewards.length >
      0 &&
    totalPoints >
      0 &&
    !saving;

  /* =====================================================
     Open / Reset
  ===================================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedRewards(
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

    setHalaqaName(
      getInitialHalaqaName(
        selectedHalaqa
      )
    );

    loadContext();
  }, [
    open,
    student?.id,
    halaqaId,
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
     Context
  ===================================================== */

  async function loadContext() {
    if (!student?.id) {
      return;
    }

    try {
      setLoadingContext(
        true
      );

      const requests = [
        supabase
          .from("profiles")
          .select(
            "total_points"
          )
          .eq(
            "id",
            student.id
          )
          .maybeSingle(),
      ];

      if (halaqaId) {
        requests.push(
          supabase
            .from("halaqat")
            .select("name")
            .eq(
              "id",
              halaqaId
            )
            .maybeSingle()
        );
      }

      const results =
        await Promise.all(
          requests
        );

      const balanceResult =
        results[0];

      if (
        !balanceResult.error
      ) {
        setCurrentBalance(
          Number(
            balanceResult.data
              ?.total_points ||
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
        "LOAD GRANT CONTEXT:",
        error
      );

      /*
        لا نمنع فتح النافذة
        لو فشل تحديث معلومات
        السياق؛ نستخدم القيم
        القادمة من الصفحة.
      */

    } finally {
      setLoadingContext(
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

  function toggleReward(
    reward
  ) {
    if (saving) {
      return;
    }

    setSelectedRewards(
      (current) => {
        const exists =
          current.some(
            (item) =>
              Number(
                item.id
              ) ===
              Number(
                reward.id
              )
          );

        if (exists) {
          return current.filter(
            (item) =>
              Number(
                item.id
              ) !==
              Number(
                reward.id
              )
          );
        }

        return [
          ...current,
          reward,
        ];
      }
    );
  }

  function clearSelection() {
    if (saving) {
      return;
    }

    setSelectedRewards(
      []
    );
  }

  /* =====================================================
     Teacher Scope Validation
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
     Confirmation
  ===================================================== */

  function requestSave() {
    if (!student?.id) {
      showToast(
        "تعذر تحديد الطالب.",
        "error"
      );

      return;
    }

    if (!halaqaId) {
      showToast(
        "تعذر تحديد الحلقة.",
        "error"
      );

      return;
    }

    if (
      !transactionDate
    ) {
      showToast(
        "تعذر تحديد التاريخ.",
        "error"
      );

      return;
    }

    if (
      !selectedRewards.length
    ) {
      showToast(
        "اختر نوع منحة واحدًا على الأقل.",
        "error"
      );

      return;
    }

    if (
      totalPoints <= 0
    ) {
      showToast(
        "إجمالي المنحة يجب أن يكون أكبر من صفر.",
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

  async function saveGrant() {
    if (!canSave) {
      return;
    }

    setShowConfirm(
      false
    );

    setSaving(true);

    try {
      /*
        هذا تحقق واجهة إضافي.
        الحماية الحقيقية يجب أن
        تبقى في RLS.
      */

      await validateTeacherScope();

      /*
        الأنواع القديمة قد تحتوي
        قيمة موجبة أو سالبة.
        المنحة نفسها يجب أن تدخل
        دائمًا بقيمة موجبة.
      */

      const rows =
        selectedRewards.map(
          (reward) => ({
            student_id:
              student.id,

            points:
              Math.abs(
                Number(
                  reward.points
                ) || 0
              ),

            reason:
              reward.name,

            reward_type_id:
              reward.id,

            category:
              "grant",

            halaqa_id:
              halaqaId,

            transaction_date:
              transactionDate,

            notes:
              notes.trim() ||
              null,
          })
        );

      const invalid =
        rows.some(
          (row) =>
            !Number.isFinite(
              row.points
            ) ||
            row.points <= 0
        );

      if (invalid) {
        throw new Error(
          "يوجد نوع منحة بقيمة نقاط غير صحيحة."
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
        إعادة حساب جميع معاملات
        الطالب بعد الحفظ.
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
            student.id
          );

      if (
        profileError
      ) {
        throw profileError;
      }

      setCurrentBalance(
        newTotal
      );

      showToast(
        `تم منح ${totalPoints} نقطة للطالب ${student.full_name || ""} بنجاح.`,
        "success"
      );

      setSelectedRewards(
        []
      );

      setNotes("");
      setSearch("");

      await onSaved?.();

      onClose?.();

    } catch (error) {
      console.error(
        "SAVE GRANT:",
        error
      );

      showToast(
        error?.message ||
          "تعذر حفظ المنحة.",
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
        className="grant-overlay"
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
          className="grant-modal"
          role="dialog"
          aria-modal="true"
          aria-label="منح نقاط للطالب"
        >
          {/* =========================================
              HEADER
          ========================================= */}

          <div className="grant-header">
            <div className="grant-heading">
              <div className="grant-main-icon">
                <Gift
                  size={23}
                />
              </div>

              <div>
                <div className="grant-eyebrow">
                  <Sparkles
                    size={12}
                  />

                  النقاط والمكافآت
                </div>

                <h2>
                  منح نقاط
                </h2>

                <p>
                  كافئ الطالب على
                  الإنجاز والالتزام مع
                  الاحتفاظ بسجل واضح
                  للعملية.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="grant-close"
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

          <div className="grant-student-card">
            <div className="grant-student-main">
              <div className="grant-student-avatar">
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
                    : "عملية منحة مسجلة في سجل الطالب"}
                </small>
              </div>
            </div>

            <div className="grant-context">
              <span>
                <BookOpen
                  size={13}
                />

                {loadingContext
                  ? "جارٍ التحميل..."
                  : halaqaName}
              </span>

              <span>
                <CalendarDays
                  size={13}
                />

                {formatGregorianDate(
                  transactionDate
                )}
              </span>

              <span>
                <CalendarDays
                  size={13}
                />

                {formatHijriDate(
                  transactionDate
                )}
              </span>
            </div>
          </div>

          {/* =========================================
              SUMMARY
          ========================================= */}

          <div className="grant-summary-grid">
            <SummaryCard
              label="الرصيد الحالي"
              value={
                loadingContext
                  ? "..."
                  : currentBalance
              }
              suffix="نقطة"
              icon={Coins}
            />

            <SummaryCard
              label="إجمالي المنحة"
              value={`+${totalPoints}`}
              suffix="نقطة"
              icon={Award}
              positive
            />

            <SummaryCard
              label="الرصيد بعد المنحة"
              value={
                balanceAfter
              }
              suffix="نقطة"
              icon={
                Trophy
              }
              positive={
                totalPoints > 0
              }
            />
          </div>

          {/* =========================================
              BODY
          ========================================= */}

          <div className="grant-body">
            <section className="grant-section">
              <div className="grant-section-head">
                <div>
                  <h3>
                    أنواع المنح
                  </h3>

                  <p>
                    اختر منحة واحدة أو
                    أكثر حسب إنجاز
                    الطالب.
                  </p>
                </div>

                {selectedRewards.length >
                  0 && (
                  <button
                    type="button"
                    className="grant-clear"
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

              <div className="grant-search">
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
                  placeholder="ابحث عن منحة..."
                />
              </div>

              {activeRewardTypes.length >
              0 ? (
                <div className="grant-types-grid">
                  {activeRewardTypes.map(
                    (
                      reward
                    ) => {
                      const selected =
                        selectedRewards.some(
                          (
                            item
                          ) =>
                            Number(
                              item.id
                            ) ===
                            Number(
                              reward.id
                            )
                        );

                      const value =
                        Math.abs(
                          Number(
                            reward.points
                          ) || 0
                        );

                      return (
                        <button
                          key={
                            reward.id
                          }
                          type="button"
                          className={
                            selected
                              ? "grant-type selected"
                              : "grant-type"
                          }
                          onClick={() =>
                            toggleReward(
                              reward
                            )
                          }
                          disabled={
                            saving
                          }
                        >
                          <div className="grant-type-top">
                            <div className="grant-type-icon">
                              <Star
                                size={17}
                              />
                            </div>

                            <span
                              className={
                                selected
                                  ? "grant-check selected"
                                  : "grant-check"
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
                            {reward.name ||
                              "منحة"}
                          </strong>

                          <div className="grant-type-points">
                            +{value}

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
                <div className="grant-empty">
                  <Gift
                    size={25}
                  />

                  <strong>
                    لا توجد منح مطابقة
                  </strong>

                  <span>
                    غيّر كلمة البحث أو
                    أنشئ نوع منحة جديدًا
                    من إدارة الأنواع.
                  </span>
                </div>
              )}
            </section>

            {/* =====================================
                NOTES
            ===================================== */}

            <section className="grant-section">
              <div className="grant-section-head">
                <div>
                  <h3>
                    ملاحظة المنحة
                  </h3>

                  <p>
                    أضف وصفًا مختصرًا
                    للإنجاز عند الحاجة.
                  </p>
                </div>

                <FileText
                  size={17}
                  className="grant-section-side-icon"
                />
              </div>

              <textarea
                className="grant-notes"
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
                placeholder="مثال: تميز في المراجعة اليوم وأظهر تحسنًا واضحًا في الضبط..."
                rows={4}
              />

              <div className="grant-notes-meta">
                <span>
                  الملاحظة اختيارية،
                  وتظهر في سجل
                  المعاملات.
                </span>

                <span>
                  {notes.length}/500
                </span>
              </div>
            </section>

            {/* =====================================
                POSITIVE PREVIEW
            ===================================== */}

            <div className="grant-positive-note">
              <Trophy
                size={18}
              />

              <div>
                <strong>
                  تعزيز السلوك الإيجابي
                </strong>

                <span>
                  سيصبح رصيد الطالب
                  {" "}
                  <b>
                    {balanceAfter}
                  </b>
                  {" "}
                  نقطة بعد تنفيذ هذه
                  المنحة.
                </span>
              </div>
            </div>
          </div>

          {/* =========================================
              FOOTER
          ========================================= */}

          <div className="grant-footer">
            <div className="grant-footer-summary">
              <span>
                المحدد:
                {" "}
                <b>
                  {
                    selectedRewards.length
                  }
                </b>
              </span>

              <span>
                إجمالي المنحة:
                {" "}
                <b>
                  +{totalPoints}
                </b>
              </span>
            </div>

            <div className="grant-actions">
              <button
                type="button"
                className="grant-cancel-button"
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
                className="grant-save-button"
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
                    className="grant-spin"
                  />
                ) : (
                  <PlusCircle
                    size={16}
                  />
                )}

                {saving
                  ? "جارٍ الحفظ..."
                  : `منح ${totalPoints} نقطة`}
              </button>
            </div>
          </div>
        </div>

        <style>
          {`
            .grant-overlay {
              position: fixed;
              inset: 0;
              z-index: 9999;

              display: flex;
              align-items: center;
              justify-content: center;

              padding: calc(18px * var(--app-density,1));

              background:
                rgba(10, 30, 24, .60);

              backdrop-filter:
                blur(7px);
            }

            .grant-modal {
              width:
                min(920px, 100%);

              max-height:
                calc(100vh - 36px);

              overflow:
                auto;

              border:
                1px solid
                rgba(255,255,255,.50);

              border-radius:
                calc(24px * var(--app-radius-scale,1));

              background:
                #FFFFFF;

              box-shadow:
                0 30px 90px
                rgba(0,0,0,.25);

              animation:
                grantModalIn
                .18s ease-out;
            }

            @keyframes
            grantModalIn {
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

            .grant-header {
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
                  rgba(246,252,248,.98)
                );

              backdrop-filter:
                blur(10px);
            }

            .grant-heading {
              display: flex;
              align-items: center;

              gap: calc(10px * var(--app-density,1));
            }

            .grant-main-icon {
              width: 46px;
              height: 46px;

              flex: 0 0 46px;

              border:
                1px solid #DCEADF;

              border-radius:
                calc(14px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #FFFFFF;

              background:
                linear-gradient(
                  145deg,
                  var(--app-color-0f5132,#0F5132),
                  var(--app-color-0f766e,#0F766E)
                );

              box-shadow:
                0 8px 20px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 14.000000000000002%,transparent);
            }

            .grant-eyebrow {
              display: flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));

              margin-bottom: 2px;

              color: #94742D;

              font-size: calc(9px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .grant-heading h2 {
              margin: 0;

              color: #2E4136;

              font-size: calc(19px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .grant-heading p {
              margin:
                3px 0 0;

              color: #8A948E;

              font-size: calc(9px * var(--app-font-scale,1));
              line-height: 1.5;
            }

            .grant-close {
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

            .grant-close:hover {
              color: #9A4035;

              border-color:
                #EBD8D3;

              background:
                #FFF9F7;
            }

            /* =========================
               STUDENT
            ========================= */

            .grant-student-card {
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
                  #F7FBF8,
                  #FFFCF6
                );
            }

            .grant-student-main {
              display: flex;
              align-items: center;

              gap: calc(9px * var(--app-density,1));

              min-width: 0;
            }

            .grant-student-avatar {
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

            .grant-student-main span,
            .grant-student-main strong,
            .grant-student-main small {
              display: block;
            }

            .grant-student-main span {
              color: #8A948E;

              font-size: calc(7px * var(--app-font-scale,1));
            }

            .grant-student-main strong {
              margin-top: 1px;

              color: #35463C;

              font-size: calc(11px * var(--app-font-scale,1));
            }

            .grant-student-main small {
              margin-top: 2px;

              color: #9AA29D;

              font-size: calc(6.5px * var(--app-font-scale,1));
            }

            .grant-context {
              display: flex;
              align-items: center;
              justify-content:
                flex-end;
              flex-wrap: wrap;

              gap: calc(5px * var(--app-density,1));
            }

            .grant-context span {
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

            .grant-summary-grid {
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

            .grant-summary-card {
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

            .grant-summary-card.positive {
              border-color:
                #D8E9DE;

              background:
                #F8FCF9;
            }

            .grant-summary-icon {
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

            .grant-summary-card.positive
            .grant-summary-icon {
              color: #8A6A22;
              background: #FFF7E4;
            }

            .grant-summary-card span,
            .grant-summary-card strong {
              display: block;
            }

            .grant-summary-card span {
              color: #8A948E;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .grant-summary-card strong {
              margin-top: 1px;

              color: #3B4B41;

              font-size: calc(13px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .grant-summary-card strong small {
              margin-right: 2px;

              color: #8A948E;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 800;
            }

            .grant-summary-card.positive
            strong {
              color: #0F6A46;
            }

            /* =========================
               BODY
            ========================= */

            .grant-body {
              padding:
                0 calc(20px * var(--app-density,1)) calc(16px * var(--app-density,1));
            }

            .grant-section {
              margin-bottom: 10px;

              padding: calc(12px * var(--app-density,1));

              border:
                1px solid #E7ECE9;

              border-radius:
                calc(14px * var(--app-radius-scale,1));

              background: #FFFFFF;
            }

            .grant-section:last-child {
              margin-bottom: 0;
            }

            .grant-section-head {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(10px * var(--app-density,1));

              margin-bottom: 9px;
            }

            .grant-section-head h3 {
              margin: 0;

              color: #405046;

              font-size: calc(10px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .grant-section-head p {
              margin:
                2px 0 0;

              color: #929B95;

              font-size: calc(6px * var(--app-font-scale,1));
            }

            .grant-section-side-icon {
              color: #8D9891;
            }

            .grant-clear {
              border: none;

              padding:
                calc(5px * var(--app-density,1)) calc(7px * var(--app-density,1));

              border-radius:
                calc(7px * var(--app-radius-scale,1));

              color: #0F6A4A;
              background: #EDF8F1;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 850;

              cursor: pointer;
            }

            /* =========================
               SEARCH
            ========================= */

            .grant-search {
              position: relative;

              margin-bottom: 9px;
            }

            .grant-search svg {
              position: absolute;
              right: 10px;
              top: 50%;

              transform:
                translateY(-50%);

              color: #8D9891;
            }

            .grant-search input {
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

            .grant-search input:focus {
              border-color:
                #A6C5B2;

              box-shadow:
                0 0 0 3px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
            }

            /* =========================
               TYPES
            ========================= */

            .grant-types-grid {
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

            .grant-type {
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

            .grant-type:hover {
              transform:
                translateY(-1px);

              border-color:
                #BFD8C7;

              box-shadow:
                0 7px 18px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 4.5%,transparent);
            }

            .grant-type.selected {
              border-color:
                #78AE8A;

              background:
                linear-gradient(
                  135deg,
                  #F0FAF4,
                  #FCFEFD
                );

              box-shadow:
                0 8px 20px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5.5%,transparent);
            }

            .grant-type-top {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));

              margin-bottom: 8px;
            }

            .grant-type-icon {
              width: 31px;
              height: 31px;

              border-radius:
                calc(9px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #96752B;
              background: #FFF7E4;
            }

            .grant-check {
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

            .grant-check.selected {
              border-color:
                #0F6A4A;

              background:
                #0F6A4A;
            }

            .grant-type > strong {
              display: block;

              min-height: 28px;

              color: #465249;

              font-size: calc(8px * var(--app-font-scale,1));
              line-height: 1.45;
            }

            .grant-type-points {
              margin-top: 6px;

              color: #0F7A4F;

              font-size: calc(15px * var(--app-font-scale,1));
              font-weight: 950;

              direction: ltr;
              text-align: right;
            }

            .grant-type-points small {
              margin-left: 3px;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 800;
            }

            /* =========================
               EMPTY
            ========================= */

            .grant-empty {
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

            .grant-empty strong {
              color: #657169;

              font-size: calc(8px * var(--app-font-scale,1));
            }

            .grant-empty span {
              max-width: 300px;

              font-size: calc(6px * var(--app-font-scale,1));
              line-height: 1.55;
            }

            /* =========================
               NOTES
            ========================= */

            .grant-notes {
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

            .grant-notes:focus {
              border-color:
                #A6C5B2;

              box-shadow:
                0 0 0 3px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);

              background: #FFFFFF;
            }

            .grant-notes-meta {
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
               POSITIVE NOTE
            ========================= */

            .grant-positive-note {
              display: flex;
              align-items: flex-start;

              gap: calc(8px * var(--app-density,1));

              padding: calc(10px * var(--app-density,1));

              border:
                1px solid #D9E8DD;

              border-radius:
                calc(12px * var(--app-radius-scale,1));

              color: var(--app-color-0f6848,#0F6848);

              background:
                linear-gradient(
                  135deg,
                  #F0FAF4,
                  #FFFDF6
                );
            }

            .grant-positive-note strong,
            .grant-positive-note span {
              display: block;
            }

            .grant-positive-note strong {
              font-size: calc(7px * var(--app-font-scale,1));
            }

            .grant-positive-note span {
              margin-top: 2px;

              color: #728178;

              font-size: calc(6px * var(--app-font-scale,1));
              line-height: 1.55;
            }

            .grant-positive-note b {
              color: var(--app-color-0f6848,#0F6848);
            }

            /* =========================
               FOOTER
            ========================= */

            .grant-footer {
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

            .grant-footer-summary {
              display: flex;
              align-items: center;
              flex-wrap: wrap;

              gap: calc(5px * var(--app-density,1));
            }

            .grant-footer-summary span {
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

            .grant-footer-summary b {
              color: #0F6A4A;
            }

            .grant-actions {
              display: flex;
              align-items: center;

              gap: calc(6px * var(--app-density,1));
            }

            .grant-cancel-button,
            .grant-save-button {
              min-height: 40px;

              padding:
                0 calc(13px * var(--app-density,1));

              border-radius:
                calc(9px * var(--app-radius-scale,1));

              font-size: calc(8px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;
            }

            .grant-cancel-button {
              border:
                1px solid #DCE4DF;

              color: #647169;
              background: #FFFFFF;
            }

            .grant-save-button {
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

              box-shadow:
                0 8px 18px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 13%,transparent);
            }

            .grant-cancel-button:disabled,
            .grant-save-button:disabled,
            .grant-close:disabled,
            .grant-type:disabled,
            .grant-clear:disabled {
              opacity: .48;
              cursor: not-allowed;
            }

            @keyframes
            grantSpin {
              to {
                transform:
                  rotate(360deg);
              }
            }

            .grant-spin {
              animation:
                grantSpin
                .8s linear infinite;
            }

            /* =========================
               RESPONSIVE
            ========================= */

            @media
            (max-width: 760px) {
              .grant-overlay {
                align-items:
                  flex-end;

                padding: calc(7px * var(--app-density,1));
              }

              .grant-modal {
                width: 100%;
                max-height:
                  calc(100vh - 14px);

                border-radius:
                  calc(22px * var(--app-radius-scale,1)) calc(22px * var(--app-radius-scale,1))
                  calc(10px * var(--app-radius-scale,1)) calc(10px * var(--app-radius-scale,1));
              }

              .grant-header {
                padding:
                  calc(14px * var(--app-density,1)) calc(15px * var(--app-density,1));
              }

              .grant-heading p {
                display: none;
              }

              .grant-student-card {
                align-items:
                  flex-start;
                flex-direction:
                  column;

                margin:
                  10px 15px 8px;
              }

              .grant-context {
                width: 100%;

                justify-content:
                  flex-start;
              }

              .grant-summary-grid {
                grid-template-columns:
                  1fr 1fr;

                padding:
                  0 calc(15px * var(--app-density,1)) calc(8px * var(--app-density,1));
              }

              .grant-summary-grid
              .grant-summary-card:last-child {
                grid-column:
                  1 / -1;
              }

              .grant-body {
                padding:
                  0 calc(15px * var(--app-density,1)) calc(13px * var(--app-density,1));
              }

              .grant-types-grid {
                grid-template-columns:
                  repeat(
                    2,
                    minmax(0,1fr)
                  );
              }

              .grant-footer {
                align-items:
                  stretch;
                flex-direction:
                  column;

                padding:
                  calc(10px * var(--app-density,1)) calc(15px * var(--app-density,1));
              }

              .grant-footer-summary {
                justify-content:
                  space-between;
              }

              .grant-actions {
                width: 100%;
              }

              .grant-actions button {
                flex: 1;
              }
            }

            @media
            (max-width: 430px) {
              .grant-types-grid {
                grid-template-columns:
                  1fr;
              }

              .grant-heading h2 {
                font-size:
                  calc(17px * var(--app-font-scale,1));
              }

              .grant-summary-grid {
                grid-template-columns:
                  1fr;
              }

              .grant-summary-grid
              .grant-summary-card:last-child {
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
        title="تأكيد منح النقاط"
        message={
          `سيتم منح ${totalPoints} نقطة للطالب ${student?.full_name || ""}.\n\n` +
          `الرصيد الحالي: ${currentBalance} نقطة\n` +
          `الرصيد بعد المنحة: ${balanceAfter} نقطة\n\n` +
          `المنح: ${selectedRewards
            .map(
              (item) =>
                item.name
            )
            .join("، ")}`
        }
        onConfirm={
          saveGrant
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
  positive = false,
}) {
  return (
    <div
      className={
        positive
          ? "grant-summary-card positive"
          : "grant-summary-card"
      }
    >
      <div className="grant-summary-icon">
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
