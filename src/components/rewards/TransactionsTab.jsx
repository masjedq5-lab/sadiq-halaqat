import {displayDateFormatter} from "../../lib/calendar";
import {
  useMemo,
  useState,
} from "react";

import { CalendarDays, FileText, Gift, History, MinusCircle, Pencil, Search, Sparkles, Trash2, UserRound, WalletCards, X } from "lucide-react";

import ConfirmModal from "../ConfirmModal";

/* =========================================================
   Helpers
========================================================= */

function formatNumber(value) {
  const number =
    Number(value) || 0;

  try {
    return new Intl.NumberFormat(
      "ar-SA"
    ).format(number);
  } catch {
    return String(number);
  }
}

function toLocalDate(value) {
  if (!value) {
    return null;
  }

  const text =
    String(value).slice(
      0,
      10
    );

  const [
    year,
    month,
    day,
  ] =
    text
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
    12,
    0,
    0
  );
}

function formatGregorian(value) {
  const date =
    toLocalDate(value);

  if (!date) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    ).format(date);
  } catch {
    return String(value);
  }
}


function getCategoryMeta(item) {
  if (
    item?.category ===
    "grant"
  ) {
    return {
      key: "grant",
      label: "منحة",
      Icon: Gift,
      sign: "+",
    };
  }

  if (
    item?.category ===
    "deduction"
  ) {
    return {
      key: "deduction",
      label: "خصم",
      Icon: MinusCircle,
      sign: "-",
    };
  }

  return {
    key: "other",
    label: "عملية",
    Icon: WalletCards,
    sign:
      Number(item?.points) >= 0
        ? "+"
        : "-",
  };
}

function getDisplayPoints(item) {
  const meta =
    getCategoryMeta(item);

  const amount =
    Math.abs(
      Number(
        item?.points
      ) || 0
    );

  return `${meta.sign}${formatNumber(
    amount
  )}`;
}

/* =========================================================
   Transaction Card
========================================================= */

function TransactionCard({
  item,
  onEdit,
  onAskDelete,
  busy,
}) {
  const meta =
    getCategoryMeta(item);

  const CategoryIcon =
    meta.Icon;

  const reason =
    item.reward_name ||
    item.reason ||
    "بدون سبب محدد";

  const canEdit =
    meta.key === "grant" ||
    meta.key === "deduction";

  return (
    <article
      className={`transaction-card ${meta.key}`}
    >
      <div className="transaction-card-accent" />

      {/* =====================================
          TOP
      ===================================== */}

      <div className="transaction-card-top">
        <span
          className={`transaction-category-badge ${meta.key}`}
        >
          <CategoryIcon
            size={12}
          />

          {meta.label}
        </span>

        <div className="transaction-date">
          <CalendarDays
            size={12}
          />

          <div>
            <strong>
              {formatGregorian(
                item.transaction_date
              )}
            </strong>


          </div>
        </div>
      </div>

      {/* =====================================
          STUDENT
      ===================================== */}

      <div className="transaction-student">
        <span className="transaction-student-icon">
          <UserRound
            size={17}
          />
        </span>

        <div>
          <small>
            الطالب
          </small>

          <strong>
            {item.student_name ||
              "طالب"}
          </strong>
        </div>
      </div>

      {/* =====================================
          REASON
      ===================================== */}

      <div className="transaction-reason">
        <span>
          <FileText
            size={12}
          />
          السبب
        </span>

        <strong>
          {reason}
        </strong>
      </div>

      {/* =====================================
          VALUE
      ===================================== */}

      <div className="transaction-value-row">
        <div>
          <span>
            قيمة العملية
          </span>

          <strong>
            {getDisplayPoints(
              item
            )}

            <small>
              نقطة
            </small>
          </strong>
        </div>

        <span className="transaction-id">
          #{item.id}
        </span>
      </div>

      {/* =====================================
          NOTES
      ===================================== */}

      {item.notes && (
        <div className="transaction-note">
          {item.notes}
        </div>
      )}

      {/* =====================================
          ACTIONS
      ===================================== */}

      <div className="transaction-actions">
        <button
          type="button"
          className="transaction-action edit"
          disabled={
            !canEdit ||
            busy
          }
          onClick={() =>
            onEdit?.(item)
          }
          title={
            canEdit
              ? "تعديل العملية"
              : "هذا النوع غير قابل للتعديل من هذه النافذة"
          }
        >
          <Pencil
            size={14}
          />

          تعديل
        </button>

        <button
          type="button"
          className="transaction-action delete"
          disabled={busy}
          onClick={() =>
            onAskDelete(item)
          }
        >
          <Trash2
            size={14}
          />

          حذف
        </button>
      </div>
    </article>
  );
}

/* =========================================================
   Main
========================================================= */

export default function TransactionsTab({
  transactions = [],
  onDelete,
  onEdit,
}) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState("all");

  const [
    confirmDelete,
    setConfirmDelete,
  ] =
    useState(null);

  const [
    busyId,
    setBusyId,
  ] =
    useState(null);

  /* =====================================================
     Derived
  ===================================================== */

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const filtered =
    useMemo(() => {
      return transactions.filter(
        (item) => {
          const meta =
            getCategoryMeta(
              item
            );

          if (
            category !== "all" &&
            meta.key !== category
          ) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          const haystack =
            [
              item.student_name,
              item.reward_name,
              item.reason,
              item.notes,
              item.id,
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase();

          return haystack.includes(
            normalizedSearch
          );
        }
      );
    }, [
      transactions,
      normalizedSearch,
      category,
    ]);

  const totalGrants =
    transactions.filter(
      (item) =>
        item.category ===
        "grant"
    ).length;

  const totalDeductions =
    transactions.filter(
      (item) =>
        item.category ===
        "deduction"
    ).length;

  const grantsPoints =
    transactions
      .filter(
        (item) =>
          item.category ===
          "grant"
      )
      .reduce(
        (sum, item) =>
          sum +
          Math.abs(
            Number(
              item.points
            ) || 0
          ),
        0
      );

  const deductionPoints =
    transactions
      .filter(
        (item) =>
          item.category ===
          "deduction"
      )
      .reduce(
        (sum, item) =>
          sum +
          Math.abs(
            Number(
              item.points
            ) || 0
          ),
        0
      );

  const netPoints =
    grantsPoints -
    deductionPoints;

  /* =====================================================
     Delete
  ===================================================== */

  async function confirmDeleteItem() {
    const item =
      confirmDelete;

    if (!item) {
      return;
    }

    setConfirmDelete(
      null
    );

    try {
      setBusyId(
        item.id
      );

      await onDelete?.(
        item
      );
    } finally {
      setBusyId(
        null
      );
    }
  }

  /* =====================================================
     Render
  ===================================================== */

  return (
    <>
      <section
        className="transactions-tab"
        dir="rtl"
      >
        {/* =========================================
            HEADER
        ========================================= */}

        <header className="transactions-header">
          <div className="transactions-heading">
            <span className="transactions-heading-icon">
              <History
                size={19}
              />
            </span>

            <div>
              <div className="transactions-eyebrow">
                <Sparkles
                  size={11}
                />

                سجل النقاط
              </div>

              <h2>
                العمليات
              </h2>

              <p>
                مراجعة المنح والخصومات وتعديلها أو حذفها مع عرض التاريخ وفق التقويم الافتراضي.
              </p>
            </div>
          </div>

          <div className="transactions-overview">
            <div>
              <span>
                العمليات
              </span>

              <strong>
                {formatNumber(
                  transactions.length
                )}
              </strong>
            </div>

            <div>
              <span>
                المنح
              </span>

              <strong className="positive">
                {formatNumber(
                  totalGrants
                )}
              </strong>
            </div>

            <div>
              <span>
                الخصومات
              </span>

              <strong className="negative">
                {formatNumber(
                  totalDeductions
                )}
              </strong>
            </div>

            <div>
              <span>
                صافي النقاط
              </span>

              <strong
                className={
                  netPoints < 0
                    ? "negative"
                    : "gold"
                }
              >
                {netPoints > 0
                  ? "+"
                  : ""}
                {formatNumber(
                  netPoints
                )}
              </strong>
            </div>
          </div>
        </header>

        {/* =========================================
            TOOLBAR
        ========================================= */}

        <div className="transactions-toolbar">
          <div className="transactions-search">
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
              placeholder="ابحث باسم الطالب أو السبب أو رقم العملية..."
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                aria-label="مسح البحث"
              >
                <X
                  size={13}
                />
              </button>
            )}
          </div>

          <div className="transactions-category-filter">
            <button
              type="button"
              className={
                category ===
                "all"
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategory(
                  "all"
                )
              }
            >
              الكل
              <span>
                {formatNumber(
                  transactions.length
                )}
              </span>
            </button>

            <button
              type="button"
              className={
                category ===
                "grant"
                  ? "active grant"
                  : "grant"
              }
              onClick={() =>
                setCategory(
                  "grant"
                )
              }
            >
              <Gift
                size={12}
              />

              المنح
              <span>
                {formatNumber(
                  totalGrants
                )}
              </span>
            </button>

            <button
              type="button"
              className={
                category ===
                "deduction"
                  ? "active deduction"
                  : "deduction"
              }
              onClick={() =>
                setCategory(
                  "deduction"
                )
              }
            >
              <MinusCircle
                size={12}
              />

              الخصومات
              <span>
                {formatNumber(
                  totalDeductions
                )}
              </span>
            </button>
          </div>
        </div>

        {/* =========================================
            RESULT BAR
        ========================================= */}

        {(normalizedSearch ||
          category !==
            "all") && (
          <div className="transactions-result-bar">
            <span>
              عرض
              {" "}
              <b>
                {formatNumber(
                  filtered.length
                )}
              </b>
              {" "}
              من
              {" "}
              <b>
                {formatNumber(
                  transactions.length
                )}
              </b>
              {" "}
              عملية
            </span>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory(
                  "all"
                );
              }}
            >
              مسح التصفية
            </button>
          </div>
        )}

        {/* =========================================
            CARDS
        ========================================= */}

        {filtered.length > 0 ? (
          <div className="transactions-grid">
            {filtered.map(
              (item) => (
                <TransactionCard
                  key={item.id}
                  item={item}
                  onEdit={
                    onEdit
                  }
                  onAskDelete={
                    setConfirmDelete
                  }
                  busy={
                    busyId ===
                    item.id
                  }
                />
              )
            )}
          </div>
        ) : (
          <div className="transactions-empty">
            <span>
              {normalizedSearch ||
              category !==
                "all" ? (
                <Search
                  size={24}
                />
              ) : (
                <History
                  size={24}
                />
              )}
            </span>

            <strong>
              {normalizedSearch ||
              category !==
                "all"
                ? "لا توجد عمليات مطابقة"
                : "لا توجد عمليات مسجلة"}
            </strong>

            <p>
              {normalizedSearch ||
              category !==
                "all"
                ? "غيّر البحث أو نوع العملية لعرض نتائج أخرى."
                : "ستظهر هنا المنح والخصومات المسجلة للطلاب."}
            </p>
          </div>
        )}

        {/* =========================================
            STYLES
        ========================================= */}

        <style>
          {`
            .transactions-tab {
              overflow: hidden;

              border:
                1px solid #E5EBE7;

              border-radius: calc(18px * var(--app-radius-scale,1));

              background: #FFFFFF;

              box-shadow:
                0 10px 28px
                rgba(25,51,39,.045);
            }

            /* =========================
               HEADER
            ========================= */

            .transactions-header {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(14px * var(--app-density,1));

              padding:
                calc(14px * var(--app-density,1)) calc(16px * var(--app-density,1));

              border-bottom:
                1px solid #EDF1EE;

              background:
                linear-gradient(
                  135deg,
                  #FFFFFF 0%,
                  #F8FCF9 72%,
                  #FFFDF8 100%
                );
            }

            .transactions-heading {
              display: flex;
              align-items: center;

              gap: calc(9px * var(--app-density,1));

              min-width: 0;
            }

            .transactions-heading-icon {
              width: 40px;
              height: 40px;

              flex: 0 0 40px;

              border-radius: calc(12px * var(--app-radius-scale,1));

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
                0 7px 17px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 12%,transparent);
            }

            .transactions-eyebrow {
              display: flex;
              align-items: center;

              gap: calc(3px * var(--app-density,1));

              margin-bottom: 1px;

              color: #98772C;

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .transactions-heading h2 {
              margin: 0;

              color: #35463C;

              font-size: calc(13px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .transactions-heading p {
              margin: 2px 0 0;

              color: #8D9791;

              font-size: calc(6px * var(--app-font-scale,1));
              line-height: 1.5;
            }

            .transactions-overview {
              display: grid;
              grid-template-columns:
                repeat(
                  4,
                  minmax(72px,1fr)
                );

              gap: calc(5px * var(--app-density,1));

              flex: 0 0 auto;
            }

            .transactions-overview > div {
              min-width: 74px;

              padding: calc(7px * var(--app-density,1)) calc(8px * var(--app-density,1));

              border:
                1px solid #E4EAE6;

              border-radius: calc(9px * var(--app-radius-scale,1));

              background: #FFFFFF;
            }

            .transactions-overview span,
            .transactions-overview strong {
              display: block;
            }

            .transactions-overview span {
              color: #929B95;

              font-size: calc(5px * var(--app-font-scale,1));
            }

            .transactions-overview strong {
              margin-top: 1px;

              color: #3E4E44;

              font-size: calc(9px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .transactions-overview strong.positive {
              color: #0F744C;
            }

            .transactions-overview strong.negative {
              color: #A44337;
            }

            .transactions-overview strong.gold {
              color: #947124;
            }

            /* =========================
               TOOLBAR
            ========================= */

            .transactions-toolbar {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(9px * var(--app-density,1));

              padding: calc(10px * var(--app-density,1)) calc(12px * var(--app-density,1));

              border-bottom:
                1px solid #EDF1EE;

              background: #FBFDFC;
            }

            .transactions-search {
              position: relative;

              width: min(
                420px,
                100%
              );
            }

            .transactions-search > svg {
              position: absolute;
              right: 10px;
              top: 50%;

              transform:
                translateY(-50%);

              color: #8D9791;

              pointer-events: none;
            }

            .transactions-search input {
              width: 100%;
              height: 38px;

              padding:
                0 calc(32px * var(--app-density,1)) 0 calc(31px * var(--app-density,1));

              border:
                1px solid #DDE5E0;

              border-radius: calc(9px * var(--app-radius-scale,1));

              outline: none;

              color: #3D4D43;
              background: #FFFFFF;

              font-size: calc(7px * var(--app-font-scale,1));
            }

            .transactions-search input:focus {
              border-color: #A3C6B0;

              box-shadow:
                0 0 0 3px
                color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
            }

            .transactions-search button {
              position: absolute;
              left: 8px;
              top: 50%;

              width: 22px;
              height: 22px;

              transform:
                translateY(-50%);

              border: none;
              border-radius: calc(6px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #76827A;
              background: #EDF2EF;

              cursor: pointer;
            }

            .transactions-category-filter {
              display: flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));
            }

            .transactions-category-filter button {
              min-height: 31px;

              padding: 0 calc(8px * var(--app-density,1));

              border:
                1px solid #E0E7E2;

              border-radius: calc(8px * var(--app-radius-scale,1));

              display: inline-flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));

              color: #6F7B73;
              background: #FFFFFF;

              font-size: calc(5.7px * var(--app-font-scale,1));
              font-weight: 850;

              cursor: pointer;
            }

            .transactions-category-filter button span {
              min-width: 17px;
              min-height: 17px;

              padding: 0 calc(4px * var(--app-density,1));

              border-radius: 999px;

              display: inline-flex;
              align-items: center;
              justify-content: center;

              color: #77837B;
              background: #F0F4F1;

              font-size: calc(5px * var(--app-font-scale,1));
            }

            .transactions-category-filter button.active {
              border-color: #BFD5C7;

              color: var(--app-color-0f6848,#0F6848);
              background: var(--app-color-edf7f1,#EDF7F1);
            }

            .transactions-category-filter button.active.grant {
              border-color: #BFDCC9;

              color: #0F744C;
              background: #EAF7EE;
            }

            .transactions-category-filter button.active.deduction {
              border-color: #E8CDC7;

              color: #A44337;
              background: #FFF0ED;
            }

            /* =========================
               RESULT BAR
            ========================= */

            .transactions-result-bar {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));

              padding:
                calc(7px * var(--app-density,1)) calc(12px * var(--app-density,1));

              border-bottom:
                1px solid #EDF1EE;

              color: #7A867E;
              background: #FFFFFF;

              font-size: calc(5.6px * var(--app-font-scale,1));
            }

            .transactions-result-bar b {
              color: #405046;
            }

            .transactions-result-bar button {
              border: none;

              color: var(--app-color-0f6848,#0F6848);
              background: transparent;

              font-size: calc(5.6px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;
            }

            /* =========================
               GRID
            ========================= */

            .transactions-grid {
              display: grid;

              grid-template-columns:
                repeat(
                  auto-fill,
                  minmax(
                    285px,
                    1fr
                  )
                );

              gap: calc(10px * var(--app-density,1));

              padding: calc(12px * var(--app-density,1));
            }

            /* =========================
               CARD
            ========================= */

            .transaction-card {
              position: relative;

              min-width: 0;
              overflow: hidden;

              padding: calc(12px * var(--app-density,1));

              border:
                1px solid #E5EBE7;

              border-radius: calc(14px * var(--app-radius-scale,1));

              background: #FFFFFF;

              transition:
                transform .17s ease,
                box-shadow .17s ease,
                border-color .17s ease;
            }

            .transaction-card:hover {
              transform:
                translateY(-2px);

              box-shadow:
                0 10px 23px
                rgba(25,51,39,.055);
            }

            .transaction-card.grant:hover {
              border-color: #C6DDCE;
            }

            .transaction-card.deduction:hover {
              border-color: #E6CCC6;
            }

            .transaction-card-accent {
              position: absolute;
              top: 0;
              right: 0;
              left: 0;

              height: 2px;
            }

            .transaction-card.grant
            .transaction-card-accent {
              background:
                linear-gradient(
                  90deg,
                  transparent,
                  var(--app-color-0f766e,#0F766E),
                  transparent
                );
            }

            .transaction-card.deduction
            .transaction-card-accent {
              background:
                linear-gradient(
                  90deg,
                  transparent,
                  #B64D3D,
                  transparent
                );
            }

            .transaction-card.other
            .transaction-card-accent {
              background:
                linear-gradient(
                  90deg,
                  transparent,
                  #64748B,
                  transparent
                );
            }

            .transaction-card-top {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));
            }

            .transaction-category-badge {
              min-height: 24px;

              padding: 0 calc(7px * var(--app-density,1));

              border-radius: 999px;

              display: inline-flex;
              align-items: center;

              gap: calc(3px * var(--app-density,1));

              font-size: calc(5.4px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .transaction-category-badge.grant {
              color: #0F704A;

              border:
                1px solid #D9EADD;

              background: #F0F9F3;
            }

            .transaction-category-badge.deduction {
              color: #A44337;

              border:
                1px solid #EED8D3;

              background: #FFF4F1;
            }

            .transaction-category-badge.other {
              color: #65717A;

              border:
                1px solid #E1E6EA;

              background: #F5F7F8;
            }

            .transaction-date {
              display: flex;
              align-items: flex-start;

              gap: calc(4px * var(--app-density,1));

              color: #8D9791;
            }

            .transaction-date > div {
              text-align: left;
            }

            .transaction-date strong,
            .transaction-date small {
              display: block;
            }

            .transaction-date strong {
              color: #657169;

              font-size: calc(5.5px * var(--app-font-scale,1));
              font-weight: 850;
            }

            .transaction-date small {
              margin-top: 1px;

              color: #9AA29D;

              font-size: calc(5px * var(--app-font-scale,1));
            }

            /* =========================
               STUDENT
            ========================= */

            .transaction-student {
              display: flex;
              align-items: center;

              gap: calc(7px * var(--app-density,1));

              margin-top: 11px;
            }

            .transaction-student-icon {
              width: 30px;
              height: 30px;

              flex: 0 0 30px;

              border-radius: calc(9px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: var(--app-color-0f6848,#0F6848);
              background: var(--app-color-edf7f1,#EDF7F1);
            }

            .transaction-student small,
            .transaction-student strong {
              display: block;
            }

            .transaction-student small {
              color: #98A09B;

              font-size: calc(5px * var(--app-font-scale,1));
            }

            .transaction-student strong {
              margin-top: 1px;

              color: #3D4C42;

              font-size: calc(8px * var(--app-font-scale,1));
              font-weight: 950;
            }

            /* =========================
               REASON
            ========================= */

            .transaction-reason {
              margin-top: 9px;
              padding: calc(8px * var(--app-density,1));

              border:
                1px solid #E8ECEA;

              border-radius: calc(9px * var(--app-radius-scale,1));

              background: #FBFDFC;
            }

            .transaction-reason > span {
              display: flex;
              align-items: center;

              gap: calc(3px * var(--app-density,1));

              color: #929B95;

              font-size: calc(5px * var(--app-font-scale,1));
            }

            .transaction-reason > strong {
              display: block;

              margin-top: 3px;

              overflow: hidden;

              color: #536159;

              font-size: calc(6.5px * var(--app-font-scale,1));
              font-weight: 900;

              text-overflow: ellipsis;
              white-space: nowrap;
            }

            /* =========================
               VALUE
            ========================= */

            .transaction-value-row {
              display: flex;
              align-items: flex-end;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));

              margin-top: 11px;
            }

            .transaction-value-row > div > span,
            .transaction-value-row > div > strong {
              display: block;
            }

            .transaction-value-row > div > span {
              color: #98A09B;

              font-size: calc(5px * var(--app-font-scale,1));
            }

            .transaction-value-row > div > strong {
              margin-top: 1px;

              font-size: calc(20px * var(--app-font-scale,1));
              font-weight: 950;

              direction: ltr;
            }

            .transaction-card.grant
            .transaction-value-row > div > strong {
              color: #0F744C;
            }

            .transaction-card.deduction
            .transaction-value-row > div > strong {
              color: #AE4336;
            }

            .transaction-card.other
            .transaction-value-row > div > strong {
              color: #5B6878;
            }

            .transaction-value-row strong small {
              margin-left: 2px;

              color: #8F9992;

              font-size: calc(5.5px * var(--app-font-scale,1));
              font-weight: 800;
            }

            .transaction-id {
              color: #9AA29D;

              font-size: calc(5.3px * var(--app-font-scale,1));
            }

            /* =========================
               NOTE
            ========================= */

            .transaction-note {
              margin-top: 8px;
              padding-top: calc(7px * var(--app-density,1));

              border-top:
                1px solid #EEF2EF;

              color: #8B958F;

              font-size: calc(5.4px * var(--app-font-scale,1));
              line-height: 1.55;

              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient:
                vertical;

              overflow: hidden;
            }

            /* =========================
               ACTIONS
            ========================= */

            .transaction-actions {
              display: grid;
              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );

              gap: calc(5px * var(--app-density,1));

              margin-top: 10px;
            }

            .transaction-action {
              min-height: 33px;

              padding: 0 calc(8px * var(--app-density,1));

              border: none;
              border-radius: calc(8px * var(--app-radius-scale,1));

              display: inline-flex;
              align-items: center;
              justify-content: center;

              gap: calc(4px * var(--app-density,1));

              font-size: calc(5.7px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;
            }

            .transaction-action.edit {
              color: #3D6655;
              background: #EDF6F1;
            }

            .transaction-action.delete {
              color: #A34236;
              background: #FFF0ED;
            }

            .transaction-action:hover:not(:disabled) {
              filter: brightness(.975);
            }

            .transaction-action:disabled {
              opacity: .4;
              cursor: not-allowed;
            }

            /* =========================
               EMPTY
            ========================= */

            .transactions-empty {
              min-height: 220px;

              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;

              gap: calc(4px * var(--app-density,1));

              margin: 12px;

              border:
                1px dashed #DDE5E0;

              border-radius: calc(13px * var(--app-radius-scale,1));

              color: #929C96;
              background: #FBFDFC;

              text-align: center;
            }

            .transactions-empty > span {
              width: 42px;
              height: 42px;

              margin-bottom: 3px;

              border-radius: calc(12px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #0F6B49;
              background: var(--app-color-edf7f1,#EDF7F1);
            }

            .transactions-empty strong {
              color: #57645C;

              font-size: calc(8px * var(--app-font-scale,1));
            }

            .transactions-empty p {
              max-width: 350px;

              margin: 0;

              color: #929B95;

              font-size: calc(5.7px * var(--app-font-scale,1));
              line-height: 1.5;
            }

            /* =========================
               RESPONSIVE
            ========================= */

            @media
            (max-width: 980px) {
              .transactions-header {
                align-items:
                  flex-start;
                flex-direction:
                  column;
              }

              .transactions-overview {
                width: 100%;
              }
            }

            @media
            (max-width: 700px) {
              .transactions-toolbar {
                align-items:
                  stretch;
                flex-direction:
                  column;
              }

              .transactions-search {
                width: 100%;
              }

              .transactions-category-filter {
                width: 100%;

                display: grid;
                grid-template-columns:
                  repeat(
                    3,
                    minmax(0,1fr)
                  );
              }

              .transactions-category-filter button {
                justify-content:
                  center;
              }
            }

            @media
            (max-width: 600px) {
              .transactions-header {
                padding: calc(12px * var(--app-density,1)) calc(13px * var(--app-density,1));
              }

              .transactions-heading p {
                display: none;
              }

              .transactions-overview {
                grid-template-columns:
                  repeat(
                    2,
                    minmax(0,1fr)
                  );
              }

              .transactions-grid {
                grid-template-columns:
                  1fr;

                padding: calc(10px * var(--app-density,1));
              }
            }

            @media
            (max-width: 390px) {
              .transactions-category-filter {
                grid-template-columns:
                  1fr;
              }

              .transactions-overview {
                grid-template-columns:
                  1fr;
              }
            }
          `}
        </style>
      </section>

      {/* =========================================
          DELETE CONFIRM
      ========================================= */}

      <ConfirmModal
        open={
          Boolean(
            confirmDelete
          )
        }
        title="حذف العملية"
        message={
          confirmDelete
            ? `هل تريد حذف العملية الخاصة بالطالب ${confirmDelete.student_name || "المحدد"}؟\n\n${getCategoryMeta(confirmDelete).label}: ${getDisplayPoints(confirmDelete)} نقطة\nالسبب: ${confirmDelete.reward_name || confirmDelete.reason || "غير محدد"}\n\nسيؤثر الحذف على رصيد الطالب بعد إعادة احتسابه من الصفحة الأم.`
            : ""
        }
        onConfirm={
          confirmDeleteItem
        }
        onCancel={() =>
          setConfirmDelete(
            null
          )
        }
      />
    </>
  );
}
