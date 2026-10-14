import CompactPageHeader from "../CompactPageHeader";
import {
  useMemo,
  useState,
} from "react";

import { AlertTriangle, Ban, CheckCircle2, Gift, MinusCircle, Pencil, Plus, Power, Search, Trash2, X } from "lucide-react";

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

function getPointsDisplay(
  item
) {
  const amount =
    Math.abs(
      Number(
        item?.points
      ) || 0
    );

  return item?.type ===
    "penalty"
    ? `-${formatNumber(
        amount
      )}`
    : `+${formatNumber(
        amount
      )}`;
}

/* =========================================================
   Type Card
========================================================= */

function TypeCard({
  item,
  kind,
  busy,
  onEdit,
  onAskDelete,
  onAskToggle,
}) {
  const isReward =
    kind === "reward";

  const TypeIcon =
    isReward
      ? Gift
      : MinusCircle;

  const active =
    item.is_active !==
    false;

  return (
    <article
      className={`reward-type-card ${kind} ${
        active
          ? "active"
          : "inactive"
      }`}
    >
      <div className="reward-type-card-accent" />

      <div className="reward-type-card-top">
        <div className="reward-type-card-identity">
          <span className="reward-type-card-icon">
            <TypeIcon
              size={17}
            />
          </span>

          <div>
            <small>
              {isReward
                ? "نوع منحة"
                : "نوع خصم"}
            </small>

            <strong>
              {item.name ||
                "بدون اسم"}
            </strong>
          </div>
        </div>

        <span
          className={`reward-type-status ${
            active
              ? "active"
              : "inactive"
          }`}
        >
          {active ? (
            <CheckCircle2
              size={11}
            />
          ) : (
            <Ban
              size={11}
            />
          )}

          {active
            ? "نشط"
            : "متوقف"}
        </span>
      </div>

      <div className="reward-type-value-row">
        <div>
          <span>
            قيمة العملية
          </span>

          <strong>
            {getPointsDisplay(
              item
            )}

            <small>
              نقطة
            </small>
          </strong>
        </div>

        <span className="reward-type-id">
          #{item.id}
        </span>
      </div>

      <div className="reward-type-card-note">
        {active
          ? isReward
            ? "متاح للمعلم ضمن قائمة المنح الجديدة."
            : "متاح للمعلم ضمن قائمة الخصومات الجديدة."
          : "محفوظ في النظام لكنه غير متاح للعمليات الجديدة."}
      </div>

      <div className="reward-type-card-actions">
        <button
          type="button"
          className="reward-type-action edit"
          onClick={() =>
            onEdit?.(item)
          }
          disabled={busy}
        >
          <Pencil
            size={14}
          />

          تعديل
        </button>

        <button
          type="button"
          className={`reward-type-action toggle ${
            active
              ? "disable"
              : "enable"
          }`}
          onClick={() =>
            onAskToggle(item)
          }
          disabled={busy}
        >
          <Power
            size={14}
          />

          {active
            ? "إيقاف"
            : "تفعيل"}
        </button>

        <button
          type="button"
          className="reward-type-action delete"
          onClick={() =>
            onAskDelete(item)
          }
          disabled={busy}
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
   Section
========================================================= */

function TypesSection({
  kind,
  title,
  description,
  rows,
  search,
  onCreate,
  onEdit,
  onAskDelete,
  onAskToggle,
  busyId,
}) {
  const isReward =
    kind === "reward";

  const Icon =
    isReward
      ? Gift
      : MinusCircle;

  const activeCount =
    rows.filter(
      (item) =>
        item.is_active !==
        false
    ).length;

  return (
    <section
      className={`reward-types-section ${kind}`}
    >
      <header className="reward-types-section-header">
        <div className="reward-types-section-heading">
          <span className="reward-types-section-icon">
            <Icon
              size={18}
            />
          </span>

          <div>
            <div className="reward-types-section-kicker">
              {isReward
                ? "المكافآت"
                : "الخصومات"}
            </div>

            <h3>
              {title}
            </h3>

            <p>
              {description}
            </p>
          </div>
        </div>

        <div className="reward-types-section-actions">
          <div className="reward-types-section-counters">
            <span>
              {formatNumber(
                rows.length
              )}
              {" "}
              إجمالي
            </span>

            <span className="active">
              {formatNumber(
                activeCount
              )}
              {" "}
              نشط
            </span>
          </div>

          <button
            type="button"
            className="reward-types-create"
            onClick={() =>
              onCreate?.(kind)
            }
          >
            <Plus
              size={14}
            />

            إضافة نوع
          </button>
        </div>
      </header>

      {rows.length > 0 ? (
        <div className="reward-types-grid">
          {rows.map(
            (item) => (
              <TypeCard
                key={item.id}
                item={item}
                kind={kind}
                busy={
                  busyId ===
                  item.id
                }
                onEdit={
                  onEdit
                }
                onAskDelete={
                  onAskDelete
                }
                onAskToggle={
                  onAskToggle
                }
              />
            )
          )}
        </div>
      ) : (
        <div className="reward-types-empty">
          <span className="reward-types-empty-icon">
            <Icon
              size={22}
            />
          </span>

          <strong>
            {search
              ? "لا توجد نتائج مطابقة"
              : isReward
                ? "لا توجد أنواع منح"
                : "لا توجد أنواع خصم"}
          </strong>

          <p>
            {search
              ? "جرّب تغيير عبارة البحث."
              : "أضف أول نوع حتى يظهر للمعلم عند تسجيل العمليات."}
          </p>

          {!search && (
            <button
              type="button"
              onClick={() =>
                onCreate?.(kind)
              }
            >
              <Plus
                size={13}
              />
              إضافة النوع الأول
            </button>
          )}
        </div>
      )}
    </section>
  );
}

/* =========================================================
   Main
========================================================= */

export default function RewardTypesTab({
  rewardTypes = [],
  onCreate,
  onEdit,
  onDelete,
  onToggleStatus,
}) {
  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    confirmDelete,
    setConfirmDelete,
  ] =
    useState(null);

  const [
    confirmToggle,
    setConfirmToggle,
  ] =
    useState(null);

  const [
    busyId,
    setBusyId,
  ] =
    useState(null);

  const normalizedSearch =
    search
      .trim()
      .toLowerCase();

  const filteredTypes =
    useMemo(() => {
      if (
        !normalizedSearch
      ) {
        return rewardTypes;
      }

      return rewardTypes.filter(
        (item) =>
          String(
            item?.name || ""
          )
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||
          String(
            item?.id || ""
          ).includes(
            normalizedSearch
          )
      );
    }, [
      rewardTypes,
      normalizedSearch,
    ]);

  const rewards =
    filteredTypes.filter(
      (item) =>
        item.type ===
        "reward"
    );

  const penalties =
    filteredTypes.filter(
      (item) =>
        item.type ===
        "penalty"
    );

  const totalActive =
    rewardTypes.filter(
      (item) =>
        item.is_active !==
        false
    ).length;

  const totalInactive =
    rewardTypes.length -
    totalActive;

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

  async function confirmToggleItem() {
    const item =
      confirmToggle;

    if (!item) {
      return;
    }

    setConfirmToggle(
      null
    );

    try {
      setBusyId(
        item.id
      );

      await onToggleStatus?.(
        item
      );
    } finally {
      setBusyId(
        null
      );
    }
  }

  return (
    <>
      <div
        className="reward-types-page"
        dir="rtl"
      >
        {/* =========================================
            HERO
        ========================================= */}

        <CompactPageHeader title="أنواع المنح والخصومات" level={2} showDate={false}>
          <span>إجمالي الأنواع: <strong>{formatNumber(rewardTypes.length)}</strong></span>
          <span>الأنواع النشطة: <strong>{formatNumber(totalActive)}</strong></span>
          <span>المتوقفة: <strong>{formatNumber(totalInactive)}</strong></span>
        </CompactPageHeader>

        {/* =========================================
            TOOLBAR
        ========================================= */}

        <section className="reward-types-toolbar">
          <div className="reward-types-search">
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
              placeholder="ابحث باسم النوع أو رقمه..."
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

          <div className="reward-types-toolbar-note">
            <AlertTriangle
              size={13}
            />

            يفضّل إيقاف النوع المستخدم سابقًا بدل حذفه للحفاظ على السجل التاريخي.
          </div>
        </section>

        {/* =========================================
            SECTIONS
        ========================================= */}

        <TypesSection
          kind="reward"
          title="أنواع المنح"
          description="المكافآت الإيجابية التي تضيف نقاطًا إلى رصيد الطالب."
          rows={rewards}
          search={
            normalizedSearch
          }
          onCreate={
            onCreate
          }
          onEdit={
            onEdit
          }
          onAskDelete={
            setConfirmDelete
          }
          onAskToggle={
            setConfirmToggle
          }
          busyId={
            busyId
          }
        />

        <TypesSection
          kind="penalty"
          title="أنواع الخصومات"
          description="الأسباب التي يترتب عليها خصم نقاط من رصيد الطالب."
          rows={penalties}
          search={
            normalizedSearch
          }
          onCreate={
            onCreate
          }
          onEdit={
            onEdit
          }
          onAskDelete={
            setConfirmDelete
          }
          onAskToggle={
            setConfirmToggle
          }
          busyId={
            busyId
          }
        />

        {/* =========================================
            STYLES
        ========================================= */}

        <style>
          {`
            .reward-types-page {
              width: 100%;
            }

            /* =========================
               HERO
            ========================= */

            .reward-types-hero {
              display: flex;
              align-items: center;
              justify-content: space-between;

              gap: calc(14px * var(--app-density,1));

              margin-bottom: 12px;

              padding: calc(14px * var(--app-density,1)) calc(16px * var(--app-density,1));

              border:
                1px solid #E5EBE7;

              border-radius: calc(17px * var(--app-radius-scale,1));

              background:
                linear-gradient(
                  135deg,
                  #FFFFFF 0%,
                  #F8FCF9 70%,
                  #FFFDF7 100%
                );

              box-shadow:
                0 9px 26px
                rgba(26,54,41,.045);
            }

            .reward-types-hero-main {
              display: flex;
              align-items: center;

              gap: calc(10px * var(--app-density,1));

              min-width: 0;
            }

            .reward-types-hero-icon {
              width: 42px;
              height: 42px;

              flex: 0 0 42px;

              border-radius: calc(12px * var(--app-radius-scale,1));

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
                0 8px 18px
                rgba(15,81,50,.12);
            }

            .reward-types-eyebrow {
              display: flex;
              align-items: center;

              gap: calc(3px * var(--app-density,1));

              margin-bottom: 1px;

              color: #98772C;

              font-size: calc(6.5px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .reward-types-hero h2 {
              margin: 0;

              color: #35463C;

              font-size: calc(13px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .reward-types-hero p {
              margin: 2px 0 0;

              color: #8D9791;

              font-size: calc(6.5px * var(--app-font-scale,1));
              line-height: 1.5;
            }

            .reward-types-overview {
              display: grid;
              grid-template-columns:
                repeat(
                  3,
                  minmax(80px,1fr)
                );

              gap: calc(6px * var(--app-density,1));

              flex: 0 0 auto;
            }

            .reward-types-overview > div {
              min-width: 88px;

              padding: calc(7px * var(--app-density,1)) calc(9px * var(--app-density,1));

              border:
                1px solid #E4EAE6;

              border-radius: calc(10px * var(--app-radius-scale,1));

              background: #FFFFFF;
            }

            .reward-types-overview span,
            .reward-types-overview strong {
              display: block;
            }

            .reward-types-overview span {
              color: #929B95;

              font-size: calc(5.5px * var(--app-font-scale,1));
            }

            .reward-types-overview strong {
              margin-top: 1px;

              color: #3E4E44;

              font-size: calc(11px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .reward-types-overview strong.active {
              color: #0F744C;
            }

            .reward-types-overview strong.inactive {
              color: #A24639;
            }

            /* =========================
               TOOLBAR
            ========================= */

            .reward-types-toolbar {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(10px * var(--app-density,1));

              margin-bottom: 12px;

              padding: calc(8px * var(--app-density,1));

              border:
                1px solid #E7ECE9;

              border-radius: calc(13px * var(--app-radius-scale,1));

              background: #FFFFFF;
            }

            .reward-types-search {
              position: relative;

              width: min(
                360px,
                100%
              );
            }

            .reward-types-search > svg {
              position: absolute;
              right: 10px;
              top: 50%;

              transform:
                translateY(-50%);

              color: #8D9791;

              pointer-events: none;
            }

            .reward-types-search input {
              width: 100%;
              height: 38px;

              padding:
                0 calc(32px * var(--app-density,1)) 0 calc(31px * var(--app-density,1));

              border:
                1px solid #DDE5E0;

              border-radius: calc(9px * var(--app-radius-scale,1));

              outline: none;

              color: #3D4D43;
              background: #FBFDFC;

              font-size: calc(7px * var(--app-font-scale,1));
            }

            .reward-types-search input:focus {
              border-color: #A3C6B0;

              box-shadow:
                0 0 0 3px
                rgba(15,81,50,.05);

              background: #FFFFFF;
            }

            .reward-types-search button {
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

            .reward-types-toolbar-note {
              display: flex;
              align-items: center;

              gap: calc(5px * var(--app-density,1));

              color: #876B2A;

              font-size: calc(5.8px * var(--app-font-scale,1));
              line-height: 1.45;
            }

            /* =========================
               SECTION
            ========================= */

            .reward-types-section {
              margin-bottom: 13px;

              overflow: hidden;

              border:
                1px solid #E5EBE7;

              border-radius: calc(16px * var(--app-radius-scale,1));

              background: #FFFFFF;

              box-shadow:
                0 8px 24px
                rgba(24,50,38,.035);
            }

            .reward-types-section-header {
              display: flex;
              align-items: center;
              justify-content:
                space-between;

              gap: calc(12px * var(--app-density,1));

              padding: calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1));

              border-bottom:
                1px solid #EDF1EE;

              background:
                linear-gradient(
                  135deg,
                  #FCFDFC,
                  #FFFFFF
                );
            }

            .reward-types-section-heading {
              display: flex;
              align-items: center;

              gap: calc(8px * var(--app-density,1));

              min-width: 0;
            }

            .reward-types-section-icon {
              width: 34px;
              height: 34px;

              flex: 0 0 34px;

              border-radius: calc(10px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;
            }

            .reward-types-section.reward
            .reward-types-section-icon {
              color: #0F6D49;
              background: #EAF6EE;
            }

            .reward-types-section.penalty
            .reward-types-section-icon {
              color: #A44337;
              background: #FFF0ED;
            }

            .reward-types-section-kicker {
              margin-bottom: 1px;

              color: #9A792D;

              font-size: calc(5.5px * var(--app-font-scale,1));
              font-weight: 900;
            }

            .reward-types-section h3 {
              margin: 0;

              color: #3C4C42;

              font-size: calc(10px * var(--app-font-scale,1));
              font-weight: 950;
            }

            .reward-types-section p {
              margin: 2px 0 0;

              color: #929B95;

              font-size: calc(5.7px * var(--app-font-scale,1));
              line-height: 1.45;
            }

            .reward-types-section-actions {
              display: flex;
              align-items: center;

              gap: calc(7px * var(--app-density,1));

              flex: 0 0 auto;
            }

            .reward-types-section-counters {
              display: flex;
              align-items: center;

              gap: calc(4px * var(--app-density,1));
            }

            .reward-types-section-counters span {
              min-height: 27px;

              padding: 0 calc(7px * var(--app-density,1));

              border:
                1px solid #E3E9E5;

              border-radius: calc(8px * var(--app-radius-scale,1));

              display: inline-flex;
              align-items: center;

              color: #7B877F;
              background: #FFFFFF;

              font-size: calc(5.5px * var(--app-font-scale,1));
              font-weight: 850;
            }

            .reward-types-section-counters span.active {
              color: #0F704A;
              background: #F3FAF5;
              border-color: #DCEADF;
            }

            .reward-types-create {
              min-height: 31px;

              padding: 0 calc(9px * var(--app-density,1));

              border: none;
              border-radius: calc(8px * var(--app-radius-scale,1));

              display: inline-flex;
              align-items: center;
              justify-content: center;

              gap: calc(4px * var(--app-density,1));

              color: #FFFFFF;

              background:
                linear-gradient(
                  135deg,
                  #0F5132,
                  #0F766E
                );

              font-size: calc(6px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;

              box-shadow:
                0 7px 15px
                rgba(15,81,50,.10);
            }

            .reward-types-section.penalty
            .reward-types-create {
              background:
                linear-gradient(
                  135deg,
                  #9F4639,
                  #BD5745
                );

              box-shadow:
                0 7px 15px
                rgba(159,70,57,.10);
            }

            /* =========================
               GRID / CARDS
            ========================= */

            .reward-types-grid {
              display: grid;

              grid-template-columns:
                repeat(
                  auto-fill,
                  minmax(
                    230px,
                    1fr
                  )
                );

              gap: calc(9px * var(--app-density,1));

              padding: calc(12px * var(--app-density,1));
            }

            .reward-type-card {
              position: relative;

              min-width: 0;
              overflow: hidden;

              padding: calc(11px * var(--app-density,1));

              border:
                1px solid #E5EBE7;

              border-radius: calc(13px * var(--app-radius-scale,1));

              background: #FFFFFF;

              transition:
                transform .17s ease,
                box-shadow .17s ease,
                border-color .17s ease;
            }

            .reward-type-card:hover {
              transform:
                translateY(-2px);

              box-shadow:
                0 10px 22px
                rgba(25,51,39,.055);
            }

            .reward-type-card.reward:hover {
              border-color: #C7DDCF;
            }

            .reward-type-card.penalty:hover {
              border-color: #E8CDC7;
            }

            .reward-type-card.inactive {
              background: #FCFDFC;
              opacity: .78;
            }

            .reward-type-card-accent {
              position: absolute;
              top: 0;
              right: 0;
              left: 0;

              height: 2px;
            }

            .reward-type-card.reward
            .reward-type-card-accent {
              background:
                linear-gradient(
                  90deg,
                  transparent,
                  #0F766E,
                  transparent
                );
            }

            .reward-type-card.penalty
            .reward-type-card-accent {
              background:
                linear-gradient(
                  90deg,
                  transparent,
                  #B64D3D,
                  transparent
                );
            }

            .reward-type-card-top {
              display: flex;
              align-items: flex-start;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));
            }

            .reward-type-card-identity {
              display: flex;
              align-items: center;

              gap: calc(7px * var(--app-density,1));

              min-width: 0;
            }

            .reward-type-card-icon {
              width: 30px;
              height: 30px;

              flex: 0 0 30px;

              border-radius: calc(9px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;
            }

            .reward-type-card.reward
            .reward-type-card-icon {
              color: #0F6D49;
              background: #EAF6EE;
            }

            .reward-type-card.penalty
            .reward-type-card-icon {
              color: #A44337;
              background: #FFF0ED;
            }

            .reward-type-card-identity small,
            .reward-type-card-identity strong {
              display: block;
            }

            .reward-type-card-identity small {
              color: #99A19C;

              font-size: calc(5px * var(--app-font-scale,1));
            }

            .reward-type-card-identity strong {
              margin-top: 1px;

              overflow: hidden;

              color: #3D4C42;

              font-size: calc(8px * var(--app-font-scale,1));
              font-weight: 950;

              text-overflow: ellipsis;
              white-space: nowrap;
            }

            .reward-type-status {
              min-height: 23px;

              padding: 0 calc(6px * var(--app-density,1));

              border-radius: 999px;

              display: inline-flex;
              align-items: center;

              gap: calc(3px * var(--app-density,1));

              font-size: calc(5.2px * var(--app-font-scale,1));
              font-weight: 900;

              white-space: nowrap;
            }

            .reward-type-status.active {
              color: #0F704A;

              border:
                1px solid #D9EADD;

              background: #F0F9F3;
            }

            .reward-type-status.inactive {
              color: #9D463A;

              border:
                1px solid #EED8D3;

              background: #FFF4F1;
            }

            .reward-type-value-row {
              display: flex;
              align-items: flex-end;
              justify-content:
                space-between;

              gap: calc(8px * var(--app-density,1));

              margin-top: 13px;
            }

            .reward-type-value-row > div > span,
            .reward-type-value-row > div > strong {
              display: block;
            }

            .reward-type-value-row > div > span {
              color: #98A09B;

              font-size: calc(5.3px * var(--app-font-scale,1));
            }

            .reward-type-value-row > div > strong {
              margin-top: 1px;

              font-size: calc(20px * var(--app-font-scale,1));
              font-weight: 950;

              direction: ltr;
            }

            .reward-type-card.reward
            .reward-type-value-row > div > strong {
              color: #0F744C;
            }

            .reward-type-card.penalty
            .reward-type-value-row > div > strong {
              color: #AE4336;
            }

            .reward-type-value-row strong small {
              margin-left: 2px;

              color: #8F9992;

              font-size: calc(5.5px * var(--app-font-scale,1));
              font-weight: 800;
            }

            .reward-type-id {
              color: #9AA29D;

              font-size: calc(5.4px * var(--app-font-scale,1));
            }

            .reward-type-card-note {
              min-height: 30px;

              margin-top: 8px;
              padding-top: calc(7px * var(--app-density,1));

              border-top:
                1px solid #EEF2EF;

              color: #8C9690;

              font-size: calc(5.5px * var(--app-font-scale,1));
              line-height: 1.55;
            }

            /* =========================
               ACTIONS
            ========================= */

            .reward-type-card-actions {
              display: grid;

              grid-template-columns:
                repeat(
                  3,
                  minmax(0,1fr)
                );

              gap: calc(5px * var(--app-density,1));

              margin-top: 9px;
            }

            .reward-type-action {
              min-height: 32px;

              padding: 0 calc(6px * var(--app-density,1));

              border: none;
              border-radius: calc(8px * var(--app-radius-scale,1));

              display: inline-flex;
              align-items: center;
              justify-content: center;

              gap: calc(3px * var(--app-density,1));

              font-size: calc(5.7px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;
            }

            .reward-type-action.edit {
              color: #3C6655;
              background: #EDF6F1;
            }

            .reward-type-action.enable {
              color: #0F704A;
              background: #ECF8F0;
            }

            .reward-type-action.disable {
              color: #8A6822;
              background: #FFF8E8;
            }

            .reward-type-action.delete {
              color: #A34236;
              background: #FFF0ED;
            }

            .reward-type-action:hover:not(:disabled) {
              filter: brightness(.975);
            }

            .reward-type-action:disabled {
              opacity: .45;
              cursor: not-allowed;
            }

            /* =========================
               EMPTY
            ========================= */

            .reward-types-empty {
              min-height: 155px;

              display: flex;
              align-items: center;
              justify-content: center;
              flex-direction: column;

              gap: calc(4px * var(--app-density,1));

              margin: 12px;

              border:
                1px dashed #DDE5E0;

              border-radius: calc(12px * var(--app-radius-scale,1));

              color: #929C96;
              background: #FBFDFC;

              text-align: center;
            }

            .reward-types-empty-icon {
              width: 38px;
              height: 38px;

              margin-bottom: 2px;

              border-radius: calc(11px * var(--app-radius-scale,1));

              display: flex;
              align-items: center;
              justify-content: center;

              color: #0F6B49;
              background: #EDF7F1;
            }

            .reward-types-section.penalty
            .reward-types-empty-icon {
              color: #A44337;
              background: #FFF0ED;
            }

            .reward-types-empty strong {
              color: #57645C;

              font-size: calc(7px * var(--app-font-scale,1));
            }

            .reward-types-empty p {
              max-width: 320px;

              margin: 0;

              font-size: calc(5.7px * var(--app-font-scale,1));
            }

            .reward-types-empty button {
              min-height: 29px;

              margin-top: 4px;
              padding: 0 calc(8px * var(--app-density,1));

              border: none;
              border-radius: calc(8px * var(--app-radius-scale,1));

              display: inline-flex;
              align-items: center;

              gap: calc(3px * var(--app-density,1));

              color: #FFFFFF;
              background: #0F6848;

              font-size: calc(5.7px * var(--app-font-scale,1));
              font-weight: 900;

              cursor: pointer;
            }

            /* =========================
               RESPONSIVE
            ========================= */

            @media
            (max-width: 900px) {
              .reward-types-hero {
                align-items:
                  flex-start;
                flex-direction:
                  column;
              }

              .reward-types-overview {
                width: 100%;
              }
            }

            @media
            (max-width: 700px) {
              .reward-types-toolbar {
                align-items:
                  stretch;
                flex-direction:
                  column;
              }

              .reward-types-search {
                width: 100%;
              }

              .reward-types-section-header {
                align-items:
                  flex-start;
                flex-direction:
                  column;
              }

              .reward-types-section-actions {
                width: 100%;

                justify-content:
                  space-between;
              }
            }

            @media
            (max-width: 520px) {
              .reward-types-overview {
                grid-template-columns:
                  1fr;
              }

              .reward-types-grid {
                grid-template-columns:
                  1fr;
              }

              .reward-types-section-counters {
                display: none;
              }

              .reward-types-create {
                width: 100%;
              }

              .reward-type-card-actions {
                grid-template-columns:
                  1fr;
              }
            }
          `}
        </style>
      </div>

      {/* =========================================
          DELETE CONFIRM
      ========================================= */}

      <ConfirmModal
        open={
          Boolean(
            confirmDelete
          )
        }
        title="حذف نوع النقاط"
        message={
          confirmDelete
            ? `هل تريد حذف "${confirmDelete.name}"؟\n\nإذا كان هذا النوع مستخدمًا سابقًا فقد يتعذر حذفه. للحفاظ على السجل التاريخي يُفضّل إيقافه بدل حذفه.`
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

      {/* =========================================
          STATUS CONFIRM
      ========================================= */}

      <ConfirmModal
        open={
          Boolean(
            confirmToggle
          )
        }
        title={
          confirmToggle?.is_active !==
          false
            ? "إيقاف نوع النقاط"
            : "تفعيل نوع النقاط"
        }
        message={
          confirmToggle
            ? confirmToggle.is_active !== false
              ? `سيتم إيقاف "${confirmToggle.name}" ولن يظهر في العمليات الجديدة، مع بقاء السجل السابق محفوظًا. هل تريد المتابعة؟`
              : `سيتم تفعيل "${confirmToggle.name}" وسيعود للظهور ضمن العمليات الجديدة. هل تريد المتابعة؟`
            : ""
        }
        onConfirm={
          confirmToggleItem
        }
        onCancel={() =>
          setConfirmToggle(
            null
          )
        }
      />
    </>
  );
}