import {displayDateFormatter} from "../../lib/calendar";
import {
  forwardRef,
  useMemo,
} from "react";

import {
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  Filter,
  RotateCcw,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

import DatePicker from "../CalendarDatePicker";
import "react-datepicker/dist/react-datepicker.css";

import AppSelect from "../AppSelect";

/* =========================================================
   Date helpers
========================================================= */

function toLocalDate(value) {
  if (!value) {
    return new Date();
  }

  if (value instanceof Date) {
    return value;
  }

  const text =
    String(value).slice(0, 10);

  const [
    year,
    month,
    day,
  ] = text
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return new Date();
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

function toYmd(date) {
  if (
    !date ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

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

function todayYmd() {
  return toYmd(
    new Date()
  );
}

function formatHijri(value) {
  if (!value) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(
      toLocalDate(value)
    );
  } catch {
    return "—";
  }
}

function formatGregorian(value) {
  if (!value) {
    return "—";
  }

  try {
    return displayDateFormatter(
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    ).format(
      toLocalDate(value)
    );
  } catch {
    return "—";
  }
}

/* =========================================================
   Custom date trigger
========================================================= */

const DateTrigger =
  forwardRef(
    function DateTrigger(
      {
        onClick,
        selectedDate,
      },
      ref
    ) {
      return (
        <button
          ref={ref}
          type="button"
          onClick={onClick}
          className="rewards-filter-date-trigger"
        >
          <span className="rewards-filter-date-icon">
            <CalendarDays
              size={18}
            />
          </span>

          <span className="rewards-filter-date-copy">
            <small>
              التاريخ
            </small>

            <strong>
              {formatHijri(
                selectedDate
              )}
            </strong>

            <em>
              {formatGregorian(
                selectedDate
              )}
            </em>
          </span>

          <CalendarCheck2
            size={15}
            className="rewards-filter-date-side"
          />
        </button>
      );
    }
  );

/* =========================================================
   Main component
========================================================= */

export default function RewardsFilters({
  selectedDate,
  setSelectedDate,

  selectedHalaqa,
  setSelectedHalaqa,

  selectedTeacher,
  setSelectedTeacher,

  halaqat = [],
  teachers = [],

  search,
  setSearch,
}) {
  const safeSearch =
    search || "";

  const currentDate =
    selectedDate ||
    todayYmd();

  const selectedHalaqaName =
    useMemo(() => {
      return (
        halaqat.find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              selectedHalaqa
            )
        )?.name || ""
      );
    }, [
      halaqat,
      selectedHalaqa,
    ]);

  const selectedTeacherName =
    useMemo(() => {
      return (
        teachers.find(
          (item) =>
            String(
              item.id
            ) ===
            String(
              selectedTeacher
            )
        )?.full_name || ""
      );
    }, [
      teachers,
      selectedTeacher,
    ]);

  const activeCount =
    [
      selectedHalaqa,
      selectedTeacher,
      safeSearch.trim(),
    ].filter(Boolean)
      .length;

  const hasFilters =
    activeCount > 0;

  function handleDateChange(
    date
  ) {
    if (!date) {
      return;
    }

    setSelectedDate?.(
      toYmd(date)
    );
  }

  function goToday() {
    setSelectedDate?.(
      todayYmd()
    );
  }

  function clearSearch() {
    setSearch?.("");
  }

  function resetFilters() {
    setSelectedDate?.(
      todayYmd()
    );

    setSelectedHalaqa?.(
      ""
    );

    setSelectedTeacher?.(
      ""
    );

    setSearch?.("");
  }

  return (
    <section
      className="rewards-filters"
      dir="rtl"
      aria-label="فلاتر المنح والخصومات"
    >
      {/* =========================================
          HEADER
      ========================================= */}

      <div className="rewards-filters-header">
        <div className="rewards-filters-heading">
          <span className="rewards-filters-heading-icon">
            <Filter size={17} />
          </span>

          <div>
            <div className="rewards-filters-eyebrow">
              <Sparkles size={11} />
              أدوات العرض
            </div>

            <h3>
              تصفية سجل النقاط
            </h3>

            <p>
              حدّد التاريخ والحلقة والمعلم أو ابحث باسم الطالب للوصول للبيانات بسرعة.
            </p>
          </div>
        </div>

        <div className="rewards-filters-header-actions">
          <span className="rewards-filters-active-count">
            {activeCount > 0
              ? `${activeCount} فلتر نشط`
              : "بدون فلاتر إضافية"}
          </span>

          <button
            type="button"
            className="rewards-filters-reset"
            onClick={
              resetFilters
            }
            disabled={
              !hasFilters &&
              currentDate ===
                todayYmd()
            }
          >
            <RotateCcw
              size={13}
            />
            إعادة الضبط
          </button>
        </div>
      </div>

      {/* =========================================
          FILTER GRID
      ========================================= */}

      <div className="rewards-filters-grid">
        {/* DATE */}

        <div className="rewards-filter-block date">
          <label>
            التاريخ
          </label>

          <div className="rewards-filter-date-shell">
            <DatePicker
              selected={
                toLocalDate(
                  currentDate
                )
              }
              onChange={
                handleDateChange
              }
              customInput={
                <DateTrigger
                  selectedDate={
                    currentDate
                  }
                />
              }
              dateFormat="yyyy-MM-dd"
              calendarStartDay={6}
              popperPlacement="bottom-start"
              popperClassName="rewards-datepicker-popper"
              portalId="root"
            />

            {currentDate !==
              todayYmd() && (
              <button
                type="button"
                className="rewards-filter-today"
                onClick={
                  goToday
                }
              >
                اليوم
              </button>
            )}
          </div>
        </div>

        {/* HALAQA */}

        <div className="rewards-filter-block">
          <label>
            <BookOpen
              size={12}
            />
            الحلقة
          </label>

          <AppSelect
            value={
              selectedHalaqa ||
              ""
            }
            onChange={
              setSelectedHalaqa
            }
            options={[
              {
                value: "",
                label:
                  "كل الحلقات",
              },
              ...halaqat.map(
                (item) => ({
                  value:
                    item.id,
                  label:
                    item.name,
                })
              ),
            ]}
          />

          <small className="rewards-filter-helper">
            {selectedHalaqaName
              ? `المحدد: ${selectedHalaqaName}`
              : `${halaqat.length} حلقة متاحة`}
          </small>
        </div>

        {/* TEACHER */}

        <div className="rewards-filter-block">
          <label>
            <UserRound
              size={12}
            />
            المعلم
          </label>

          <AppSelect
            value={
              selectedTeacher ||
              ""
            }
            onChange={
              setSelectedTeacher
            }
            options={[
              {
                value: "",
                label:
                  "كل المعلمين",
              },
              ...teachers.map(
                (item) => ({
                  value:
                    item.id,
                  label:
                    item.full_name,
                })
              ),
            ]}
          />

          <small className="rewards-filter-helper">
            {selectedTeacherName
              ? `المحدد: ${selectedTeacherName}`
              : `${teachers.length} معلم متاح`}
          </small>
        </div>

        {/* SEARCH */}

        <div className="rewards-filter-block search">
          <label>
            <Search
              size={12}
            />
            البحث
          </label>

          <div className="rewards-filter-search-shell">
            <Search
              size={15}
              className="rewards-filter-search-icon"
            />

            <input
              type="search"
              value={
                safeSearch
              }
              onChange={(
                event
              ) =>
                setSearch?.(
                  event.target
                    .value
                )
              }
              placeholder="ابحث باسم الطالب..."
              autoComplete="off"
            />

            {safeSearch && (
              <button
                type="button"
                className="rewards-filter-search-clear"
                onClick={
                  clearSearch
                }
                aria-label="مسح البحث"
              >
                <X
                  size={13}
                />
              </button>
            )}
          </div>

          <small className="rewards-filter-helper">
            يمكنك كتابة جزء من اسم الطالب
          </small>
        </div>
      </div>

      {/* =========================================
          ACTIVE FILTER SUMMARY
      ========================================= */}

      {(hasFilters ||
        currentDate !==
          todayYmd()) && (
        <div className="rewards-filters-summary">
          <span className="rewards-filters-summary-title">
            النتائج الحالية:
          </span>

          {currentDate !==
            todayYmd() && (
            <span className="rewards-filter-chip">
              <CalendarDays
                size={11}
              />
              {formatGregorian(
                currentDate
              )}
            </span>
          )}

          {selectedHalaqaName && (
            <span className="rewards-filter-chip">
              <BookOpen
                size={11}
              />
              {
                selectedHalaqaName
              }
            </span>
          )}

          {selectedTeacherName && (
            <span className="rewards-filter-chip">
              <UserRound
                size={11}
              />
              {
                selectedTeacherName
              }
            </span>
          )}

          {safeSearch.trim() && (
            <span className="rewards-filter-chip">
              <Search
                size={11}
              />
              “
              {
                safeSearch.trim()
              }
              ”
            </span>
          )}
        </div>
      )}

      {/* =========================================
          STYLES
      ========================================= */}

      <style>
        {`
          .rewards-filters {
            position: relative;

            margin-bottom: 18px;

            overflow: visible;

            border:
              1px solid #E4EAE6;

            border-radius: calc(18px * var(--app-radius-scale,1));

            background:
              linear-gradient(
                135deg,
                #FFFFFF 0%,
                #FBFDFC 72%,
                #FFFDF8 100%
              );

            box-shadow:
              0 9px 28px
              rgba(31,55,43,.045);
          }

          /* =========================
             HEADER
          ========================= */

          .rewards-filters-header {
            display: flex;
            align-items: center;
            justify-content:
              space-between;

            gap: calc(14px * var(--app-density,1));

            padding:
              calc(14px * var(--app-density,1)) calc(16px * var(--app-density,1)) calc(11px * var(--app-density,1));

            border-bottom:
              1px solid #EDF1EE;
          }

          .rewards-filters-heading {
            display: flex;
            align-items: center;

            gap: calc(9px * var(--app-density,1));

            min-width: 0;
          }

          .rewards-filters-heading-icon {
            width: 36px;
            height: 36px;

            flex: 0 0 36px;

            border-radius: calc(11px * var(--app-radius-scale,1));

            display: flex;
            align-items: center;
            justify-content: center;

            color: #FFFFFF;

            background:
              linear-gradient(
                145deg,
                #0F5132,
                #0F766E
              );

            box-shadow:
              0 7px 16px
              rgba(15,81,50,.12);
          }

          .rewards-filters-eyebrow {
            display: flex;
            align-items: center;

            gap: calc(3px * var(--app-density,1));

            margin-bottom: 1px;

            color: #9A792D;

            font-size: calc(7px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .rewards-filters-heading h3 {
            margin: 0;

            color: #34463B;

            font-size: calc(12px * var(--app-font-scale,1));
            font-weight: 950;
          }

          .rewards-filters-heading p {
            margin: 2px 0 0;

            color: #8E9892;

            font-size: calc(6.5px * var(--app-font-scale,1));
            line-height: 1.5;
          }

          .rewards-filters-header-actions {
            display: flex;
            align-items: center;

            gap: calc(6px * var(--app-density,1));

            flex: 0 0 auto;
          }

          .rewards-filters-active-count {
            min-height: 29px;

            padding: 0 calc(9px * var(--app-density,1));

            border:
              1px solid #E4EAE6;

            border-radius: calc(8px * var(--app-radius-scale,1));

            display: inline-flex;
            align-items: center;

            color: #748078;
            background: #FFFFFF;

            font-size: calc(6.5px * var(--app-font-scale,1));
            font-weight: 800;
          }

          .rewards-filters-reset {
            min-height: 29px;

            padding: 0 calc(9px * var(--app-density,1));

            border:
              1px solid #DDE6E0;

            border-radius: calc(8px * var(--app-radius-scale,1));

            display: inline-flex;
            align-items: center;

            gap: calc(4px * var(--app-density,1));

            color: #466055;
            background: #F8FBF9;

            font-size: calc(6.5px * var(--app-font-scale,1));
            font-weight: 900;

            cursor: pointer;
          }

          .rewards-filters-reset:hover:not(:disabled) {
            border-color: #B7CEC0;

            color: #0F6243;
            background: #F1F8F4;
          }

          .rewards-filters-reset:disabled {
            opacity: .45;
            cursor: not-allowed;
          }

          /* =========================
             GRID
          ========================= */

          .rewards-filters-grid {
            display: grid;

            grid-template-columns:
              minmax(245px, 1.35fr)
              minmax(170px, 1fr)
              minmax(170px, 1fr)
              minmax(210px, 1.15fr);

            gap: calc(10px * var(--app-density,1));

            padding: calc(13px * var(--app-density,1)) calc(16px * var(--app-density,1));
          }

          .rewards-filter-block {
            min-width: 0;
          }

          .rewards-filter-block > label {
            min-height: 18px;

            display: flex;
            align-items: center;

            gap: calc(4px * var(--app-density,1));

            margin-bottom: 5px;

            color: #536159;

            font-size: calc(7px * var(--app-font-scale,1));
            font-weight: 900;
          }

          .rewards-filter-helper {
            display: block;

            min-height: 12px;

            margin-top: 4px;

            overflow: hidden;

            color: #99A19C;

            font-size: calc(5.5px * var(--app-font-scale,1));
            line-height: 1.4;

            text-overflow: ellipsis;
            white-space: nowrap;
          }

          /* =========================
             DATE
          ========================= */

          .rewards-filter-date-shell {
            display: flex;
            align-items: stretch;

            gap: calc(5px * var(--app-density,1));
          }

          .rewards-filter-date-shell
          .react-datepicker-wrapper {
            min-width: 0;
            flex: 1;
          }

          .rewards-filter-date-shell
          .react-datepicker__input-container {
            width: 100%;
          }

          .rewards-filter-date-trigger {
            width: 100%;
            min-height: 48px;

            padding: calc(6px * var(--app-density,1)) calc(8px * var(--app-density,1));

            border:
              1px solid #DDE5E0;

            border-radius: calc(11px * var(--app-radius-scale,1));

            display: grid;

            grid-template-columns:
              auto 1fr auto;

            align-items: center;

            gap: calc(7px * var(--app-density,1));

            color: inherit;
            background: #FFFFFF;

            text-align: right;

            cursor: pointer;

            transition:
              border-color .16s ease,
              box-shadow .16s ease,
              transform .16s ease;
          }

          .rewards-filter-date-trigger:hover {
            border-color: #B8CEC0;

            box-shadow:
              0 5px 14px
              rgba(15,81,50,.045);
          }

          .rewards-filter-date-icon {
            width: 34px;
            height: 34px;

            border-radius: calc(9px * var(--app-radius-scale,1));

            display: flex;
            align-items: center;
            justify-content: center;

            color: #FFFFFF;

            background:
              linear-gradient(
                145deg,
                #0F5132,
                #0F766E
              );
          }

          .rewards-filter-date-copy {
            min-width: 0;
          }

          .rewards-filter-date-copy small,
          .rewards-filter-date-copy strong,
          .rewards-filter-date-copy em {
            display: block;
          }

          .rewards-filter-date-copy small {
            color: #9AA29D;

            font-size: calc(5px * var(--app-font-scale,1));
            font-style: normal;
          }

          .rewards-filter-date-copy strong {
            margin-top: 1px;

            overflow: hidden;

            color: #3C4C42;

            font-size: calc(8px * var(--app-font-scale,1));
            font-weight: 950;

            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .rewards-filter-date-copy em {
            margin-top: 1px;

            overflow: hidden;

            color: #87928B;

            font-size: calc(5.5px * var(--app-font-scale,1));
            font-style: normal;

            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .rewards-filter-date-side {
            color: #A4ADA7;
          }

          .rewards-filter-today {
            min-width: 45px;

            border:
              1px solid #DDE6E0;

            border-radius: calc(10px * var(--app-radius-scale,1));

            color: #0F6848;
            background: #F5FAF7;

            font-size: calc(6px * var(--app-font-scale,1));
            font-weight: 900;

            cursor: pointer;
          }

          .rewards-filter-today:hover {
            background: #EAF6EF;
          }

          /* =========================
             SEARCH
          ========================= */

          .rewards-filter-search-shell {
            position: relative;
          }

          .rewards-filter-search-shell input {
            width: 100%;
            height: 48px;

            padding:
              0 calc(31px * var(--app-density,1)) 0 calc(31px * var(--app-density,1));

            border:
              1px solid #DDE5E0;

            border-radius: calc(11px * var(--app-radius-scale,1));

            outline: none;

            color: #3C4C42;
            background: #FFFFFF;

            font-size: calc(7px * var(--app-font-scale,1));

            transition:
              border-color .16s ease,
              box-shadow .16s ease;
          }

          .rewards-filter-search-shell input:focus {
            border-color: #9EC3AC;

            box-shadow:
              0 0 0 3px
              rgba(15,81,50,.05);
          }

          .rewards-filter-search-icon {
            position: absolute;
            z-index: 2;

            right: 10px;
            top: 50%;

            transform:
              translateY(-50%);

            color: #8B9690;

            pointer-events: none;
          }

          .rewards-filter-search-clear {
            position: absolute;
            z-index: 2;

            left: 8px;
            top: 50%;

            width: 22px;
            height: 22px;

            transform:
              translateY(-50%);

            border: none;
            border-radius: calc(7px * var(--app-radius-scale,1));

            display: flex;
            align-items: center;
            justify-content: center;

            color: #77837B;
            background: #F1F5F2;

            cursor: pointer;
          }

          .rewards-filter-search-clear:hover {
            color: #9D4438;
            background: #FFF0ED;
          }

          /* =========================
             SUMMARY
          ========================= */

          .rewards-filters-summary {
            display: flex;
            align-items: center;
            flex-wrap: wrap;

            gap: calc(5px * var(--app-density,1));

            padding:
              calc(9px * var(--app-density,1)) calc(16px * var(--app-density,1)) calc(11px * var(--app-density,1));

            border-top:
              1px solid #EDF1EE;

            background:
              rgba(248,251,249,.72);
          }

          .rewards-filters-summary-title {
            margin-left: 2px;

            color: #88938D;

            font-size: calc(6px * var(--app-font-scale,1));
            font-weight: 800;
          }

          .rewards-filter-chip {
            min-height: 24px;

            padding: 0 calc(7px * var(--app-density,1));

            border:
              1px solid #DCE7DF;

            border-radius: 999px;

            display: inline-flex;
            align-items: center;

            gap: calc(3px * var(--app-density,1));

            color: #466055;
            background: #FFFFFF;

            font-size: calc(5.8px * var(--app-font-scale,1));
            font-weight: 800;
          }

          /* =========================
             DATEPICKER
          ========================= */

          .rewards-datepicker-popper {
            z-index: 12000 !important;
          }

          .rewards-datepicker-popper
          .react-datepicker {
            overflow: hidden;

            border:
              1px solid #DDE6E0;

            border-radius: calc(14px * var(--app-radius-scale,1));

            font-family: inherit;

            box-shadow:
              0 20px 50px
              rgba(15,36,27,.16);
          }

          .rewards-datepicker-popper
          .react-datepicker__header {
            border-bottom:
              1px solid #E4EBE6;

            background:
              linear-gradient(
                135deg,
                #F3F8F5,
                #FFFDF8
              );
          }

          .rewards-datepicker-popper
          .react-datepicker__current-month {
            color: #35473C;
            font-weight: 900;
          }

          .rewards-datepicker-popper
          .react-datepicker__day--selected,
          .rewards-datepicker-popper
          .react-datepicker__day--keyboard-selected {
            color: #FFFFFF;

            background: #0F6848;
          }

          .rewards-datepicker-popper
          .react-datepicker__day:hover {
            background: #EAF5EE;
          }

          /* =========================
             RESPONSIVE
          ========================= */

          @media
          (max-width: 1100px) {
            .rewards-filters-grid {
              grid-template-columns:
                repeat(
                  2,
                  minmax(0,1fr)
                );
            }
          }

          @media
          (max-width: 680px) {
            .rewards-filters {
              border-radius: calc(15px * var(--app-radius-scale,1));
            }

            .rewards-filters-header {
              align-items: flex-start;
              flex-direction: column;

              padding:
                calc(12px * var(--app-density,1)) calc(13px * var(--app-density,1)) calc(10px * var(--app-density,1));
            }

            .rewards-filters-heading p {
              display: none;
            }

            .rewards-filters-header-actions {
              width: 100%;

              justify-content:
                space-between;
            }

            .rewards-filters-grid {
              grid-template-columns:
                1fr;

              padding:
                calc(11px * var(--app-density,1)) calc(13px * var(--app-density,1));
            }

            .rewards-filters-summary {
              padding:
                calc(8px * var(--app-density,1)) calc(13px * var(--app-density,1)) calc(10px * var(--app-density,1));
            }
          }

          @media
          (max-width: 420px) {
            .rewards-filter-date-trigger {
              min-height: 52px;
            }

            .rewards-filter-date-copy strong {
              font-size: calc(7.5px * var(--app-font-scale,1));
            }

            .rewards-filters-active-count {
              display: none;
            }
          }
        `}
      </style>
    </section>
  );
}
