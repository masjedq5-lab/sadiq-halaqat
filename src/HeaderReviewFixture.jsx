import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {BookOpen,LibraryBig,RefreshCw,ShieldCheck} from 'lucide-react';
import CompactPageHeader from './components/CompactPageHeader';
import TeacherHero from './pages/teacher/dashboard/TeacherHero';
import './index.css';import './styles/responsive.css';import './styles/SadiqSurfaces.css';import './pages/teacher/dashboard/TeacherDashboard.css';
function PageStyles() {
  return (
    <style>
      {`
        .surah-consolidation-card {
          border: 1px solid #b8d9c8; border-radius: 17px;
          background: linear-gradient(135deg, #eef8f1, #fffdf8);
          padding: 17px 18px; margin: 14px 0; color: #194b38;
        }
        .surah-consolidation-heading { display:flex; align-items:center; gap:12px; }
        .surah-consolidation-heading > svg { flex-shrink:0; color:#147153; }
        .surah-consolidation-heading strong { display:block; font-size:16px; }
        .surah-consolidation-heading span { display:block; font-size:13px; margin-top:4px; color:#587769; }
        .surah-consolidation-options { display:flex; gap:9px; margin-top:15px; flex-wrap:wrap; }
        .surah-consolidation-options button {
          flex:1; min-height:43px; border:1px solid #cbded1;
          border-radius:11px; background:#fff; color:#225840;
          padding:8px 12px; font-size:13px; font-weight:750;
        }
        .surah-consolidation-options button.selected {
          background:#166047; color:#fff; border-color:#166047;
        }
        .surah-consolidation-options button:disabled { opacity:.55; cursor:not-allowed; }
        .surah-consolidation-card > small { display:block; margin-top:10px; color:#657f71; }
        .surah-consolidation-card > p { font-size:12px; color:#597467; margin:12px 0 0; line-height:1.7; }
        @media (max-width:550px) {
          .surah-consolidation-card { padding:13px; }
          .surah-consolidation-options { gap:7px; }
          .surah-consolidation-options button { min-width:120px; }
        }

        .recitation-plan-diagnostic {
          display: flex; align-items: flex-start; gap: 10px;
          border: 1px solid #e7cc94; background: #fffaf0; color: #7a5621;
          padding: 13px 14px; border-radius: 14px; margin: 13px 0;
        }
        .recitation-plan-diagnostic > svg { flex-shrink: 0; margin-top: 3px; }
        .recitation-plan-diagnostic strong { font-size: 13px; display: block; }
        .recitation-plan-diagnostic p { margin: 6px 0 0; font-size: 12px; line-height: 1.8; }
        .quran-recording-mode {
          border: 1px solid #d6e7de; border-radius: 17px;
          background: #f7fbf9; padding: 14px; margin: 14px 0;
        }
        .quran-recording-mode-label {
          display: flex; gap: 8px; align-items: center;
          color: #194e3c; font-size: 15px; margin-bottom: 11px;
        }
        .quran-recording-mode-options {
          display: grid; grid-template-columns: 1fr 1fr; gap: 9px;
        }
        .quran-recording-mode-options button {
          min-height: 48px; border: 1px solid #ccdcd3;
          border-radius: 12px; background: #fff; color: #2e5342;
          display: flex; align-items: center; justify-content: center;
          gap: 7px; font-size: 13px; font-weight: 800;
          padding: 9px 7px; cursor: pointer;
        }
        .quran-recording-mode-options button.selected {
          background: #145c45; color: white; border-color: #145c45;
          box-shadow: 0 5px 14px rgba(20, 92, 69, .14);
        }
        .quran-recording-mode-options button:disabled {
          cursor: not-allowed; opacity: .65;
        }
        .quran-recording-mode-options button.selected:disabled { opacity: .92; }
        .quran-recording-mode > small {
          display: block; margin-top: 10px; line-height: 1.7;
          color: #648174; font-size: 11px;
        }
        .quran-amount-mode { display: grid; gap: 12px; }
        .quran-amount-info {
          display: flex; gap: 11px; align-items: flex-start;
          padding: 12px; border-radius: 13px;
          background: #eef8f1; color: #16543f;
        }
        .quran-amount-info > svg { flex-shrink: 0; margin-top: 2px; }
        .quran-amount-info strong { display: block; font-size: 13px; }
        .quran-amount-info span {
          display: block; font-size: 11px; line-height: 1.8; margin-top: 4px;
        }
        .quran-amount-track {
          border: 1px solid #dce8e1; border-radius: 17px;
          background: #fff; padding: 15px; min-width: 0;
        }
        .quran-amount-track-heading {
          display: flex; align-items: center; gap: 10px; margin-bottom: 13px;
        }
        .quran-amount-track-heading strong {
          display: block; font-size: 16px; color: #194e3c;
        }
        .quran-amount-track-heading small {
          display: block; margin-top: 3px; font-size: 10px; color: #6b8377;
        }
        .quran-amount-track-icon {
          width: 38px; height: 38px; border-radius: 11px;
          display: grid; place-items: center;
          color: #19644a; background: #eef7f1;
        }
        .quran-amount-track-fields {
          display: grid; grid-template-columns: minmax(0,1fr) minmax(110px,.65fr);
          gap: 11px; align-items: end; margin-bottom: 10px;
        }
        .quran-amount-track-fields > * { min-width: 0; }
        .quran-amount-conversion {
          display: block; margin: 0 0 10px;
          color: #147151; font-size: 11px;
        }
        .quran-amount-disabled {
          color: #9a6b28; background: #fff8e8;
          border-radius: 11px; padding: 12px; margin: 0; font-size: 12px;
        }
        .quran-amount-note {
          color: #56786b; font-size: 11px; line-height: 1.8;
          margin: 0 4px 8px;
        }
        @media(max-width: 490px) {
          .quran-recording-mode, .quran-amount-track { padding: 12px; }
          .quran-recording-mode-options button { font-size: 11px; gap: 5px; }
          .quran-amount-track-fields { gap: 8px; }
        }

        .recitations-page {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          color: #0f172a;
        }

        .recitations-page * {
          box-sizing: border-box;
        }

        .recitations-page button,
        .recitations-page input,
        .recitations-page select,
        .recitations-page textarea {
          font-family: inherit;
        }

        /* =============================================
           HERO
        ============================================= */

        .recitations-hero {
          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(18px * var(--app-density,1));

          padding: calc(22px * var(--app-density,1)) calc(24px * var(--app-density,1));
          margin-bottom: 16px;

          border:
            1px solid
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 10%,transparent);

          border-radius: calc(23px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              135deg,
              #ffffff,
              var(--app-color-f5faf7,#f5faf7)
            );

          box-shadow:
            0 12px 34px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
        }

        .recitations-hero::after {
          content: "";

          position: absolute;

          width: 260px;
          height: 260px;

          left: -130px;
          top: -150px;

          border-radius: 50%;

          background:
            radial-gradient(
              circle,
              rgba(201,162,39,.14),
              transparent 68%
            );

          pointer-events: none;
        }

        .hero-main {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;

          gap: calc(12px * var(--app-density,1));

          min-width: 0;
        }

        .hero-icon {
          width: 49px;
          height: 49px;

          flex: 0 0 49px;

          border-radius: calc(15px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );

          box-shadow:
            0 10px 23px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 17%,transparent);
        }

        .hero-eyebrow {
          display: flex;
          align-items: center;
          gap: calc(5px * var(--app-density,1));

          margin-bottom: 3px;

          color: var(--app-color-0f766e,#0f766e);

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .hero-main h1 {
          margin: 0;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(25px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .hero-main p {
          margin: 5px 0 0;

          color: #78857e;

          font-size: calc(11px * var(--app-font-scale,1));
          line-height: 1.7;
        }

        .hero-actions {
          position: relative;
          z-index: 2;

          display: flex;
          align-items: center;

          gap: calc(7px * var(--app-density,1));
        }

        .refresh-button,
        .create-button {
          min-height: 42px;

          padding: 0 calc(13px * var(--app-density,1));

          border-radius: calc(12px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(6px * var(--app-density,1));

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .refresh-button {
          border:
            1px solid #dfe7e2;

          color: var(--app-color-0f5132,#0f5132);
          background: #fff;
        }

        .create-button {
          border: none;

          color: #fff;
        }

        .create-button.quran {
          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .create-button.noorania {
          background:
            linear-gradient(
              135deg,
              #9a741f,
              #b18a31
            );
        }

        .refresh-button:disabled,
        .create-button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        /* =============================================
           SCOPE
        ============================================= */

        .recitation-scope {
          display: flex;
          align-items: center;

          gap: calc(7px * var(--app-density,1));

          margin-bottom: 16px;
          padding: calc(10px * var(--app-density,1)) calc(13px * var(--app-density,1));

          border:
            1px solid #dcebe3;

          border-radius: calc(13px * var(--app-radius-scale,1));

          color: #37624c;
          background: #f4faf6;

          font-size: calc(9px * var(--app-font-scale,1));
          line-height: 1.7;
        }

        /* =============================================
           HALAQA SESSION
        ============================================= */

        .halaqa-session-card {
          position: relative;
          overflow: hidden;
          margin-bottom: 18px;
          padding: calc(16px * var(--app-density,1));
          border: 1px solid #dfe9e3;
          border-radius: calc(19px * var(--app-radius-scale,1));
          background: #fff;
          box-shadow: 0 10px 28px rgba(15,81,50,.05);
        }

        .halaqa-session-card.active {
          border-color: color-mix(in srgb,var(--app-color-0f5132,#0f5132) 18%,#dfe9e3);
          background:
            radial-gradient(circle at 0 0,rgba(201,162,39,.10),transparent 34%),
            linear-gradient(135deg,#ffffff,#f7fbf8);
        }

        .halaqa-session-card.launcher {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .halaqa-session-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .halaqa-session-heading {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .halaqa-session-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          color: #fff;
          background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
          box-shadow: 0 8px 18px rgba(15,81,50,.13);
        }

        .halaqa-session-kicker {
          display: block;
          margin-bottom: 2px;
          color: #9a741f;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .halaqa-session-heading h2 {
          margin: 0;
          color: var(--app-color-173d2b,#173d2b);
          font-size: calc(15px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .halaqa-session-heading p {
          margin: 4px 0 0;
          color: #728079;
          font-size: calc(9px * var(--app-font-scale,1));
          line-height: 1.7;
        }

        .halaqa-session-actions,
        .halaqa-session-launch-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .halaqa-session-launch-controls select,
        .halaqa-session-launch-controls input {
          min-height: 40px;
          border: 1px solid #dfe7e2;
          border-radius: 11px;
          padding: 0 10px;
          background: #fff;
          color: #28483a;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 800;
          outline: none;
        }

        .session-start-button,
        .session-resume-button,
        .session-absent-button {
          min-height: 40px;
          border-radius: 11px;
          padding: 0 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 950;
          cursor: pointer;
        }

        .session-start-button,
        .session-resume-button {
          border: none;
          color: #fff;
          background: linear-gradient(135deg,var(--app-color-0f5132,#0f5132),var(--app-color-0f766e,#0f766e));
        }

        .session-absent-button {
          border: 1px solid #ead9d4;
          color: #9b3a2b;
          background: #fff8f6;
        }

        .session-start-button:disabled,
        .session-resume-button:disabled,
        .session-absent-button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .halaqa-session-progress {
          position: relative;
          height: 6px;
          overflow: hidden;
          margin: 14px 0 10px;
          border-radius: 999px;
          background: #e8efeb;
        }

        .halaqa-session-progress-bar {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
          background: linear-gradient(90deg,var(--app-color-0f766e,#0f766e),#c9a227);
          transition: width .28s ease;
        }

        .halaqa-session-meta {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          color: #607168;
          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .halaqa-session-meta > div {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .halaqa-session-meta strong { color: #173d2b; }

        .halaqa-session-roster {
          display: flex;
          gap: 7px;
          overflow-x: auto;
          padding-top: 12px;
          scrollbar-width: thin;
        }

        .session-student-chip {
          min-width: 126px;
          max-width: 180px;
          min-height: 38px;
          padding: 6px 8px;
          display: grid;
          grid-template-columns: 22px minmax(0,1fr) 16px;
          align-items: center;
          gap: 5px;
          border: 1px solid #e2e9e5;
          border-radius: 11px;
          color: #42564b;
          background: #fff;
          cursor: pointer;
          text-align: right;
        }

        .session-student-chip > span {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: #eef5f1;
          font-size: 8px;
          font-weight: 950;
        }

        .session-student-chip strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: calc(8px * var(--app-font-scale,1));
        }

        .session-student-chip.current {
          border-color: rgba(15,118,110,.38);
          box-shadow: 0 0 0 3px rgba(15,118,110,.06);
        }

        .session-student-chip.completed {
          color: #25734d;
          background: #f1faf5;
          border-color: #cde9d8;
        }

        .session-student-chip.absent {
          color: #9b3a2b;
          background: #fff7f5;
          border-color: #eed8d2;
        }

        .session-student-chip:disabled {
          cursor: default;
          opacity: .82;
        }

        .session-modal-progress {
          display: grid;
          grid-template-columns: auto minmax(140px,1fr) auto;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          padding: 11px 12px;
          border: 1px solid #dcebe3;
          border-radius: 13px;
          background: linear-gradient(135deg,#f8fcfa,#fff);
        }

        .session-modal-progress > div:first-child {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .session-modal-progress span,
        .session-modal-progress small {
          color: #718078;
          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .session-modal-progress strong {
          color: #173d2b;
          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .session-modal-progress-track {
          height: 5px;
          overflow: hidden;
          border-radius: 999px;
          background: #e6eeea;
        }

        .session-modal-progress-track i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg,var(--app-color-0f766e,#0f766e),#c9a227);
        }

        .session-modal-progress button {
          min-height: 34px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          border: 1px solid #ead9d4;
          border-radius: 9px;
          color: #9b3a2b;
          background: #fff8f6;
          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 900;
          cursor: pointer;
        }

        /* =============================================
           STATS
        ============================================= */

        .recitation-stats {
          display: grid;

          grid-template-columns:
            repeat(
              5,
              minmax(0,1fr)
            );

          gap: calc(9px * var(--app-density,1));

          margin-bottom: 18px;
        }

        .recitation-stat {
          min-width: 0;

          display: flex;
          align-items: center;

          gap: calc(9px * var(--app-density,1));

          padding: calc(13px * var(--app-density,1));

          border:
            1px solid #e6ece8;

          border-radius: calc(16px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 6px 20px
            rgba(15,23,42,.03);
        }

        .recitation-stat-icon {
          width: 36px;
          height: 36px;

          flex: 0 0 36px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .recitation-stat span {
          display: block;

          color: #7f8b83;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 750;
        }

        .recitation-stat strong {
          display: block;

          margin-top: 1px;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(18px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .recitation-stat small {
          display: block;

          margin-top: 1px;

          color: #9ba39e;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        /* =============================================
           FILTERS
        ============================================= */

        .records-toolbar {
          display: grid;

          grid-template-columns:
            minmax(230px,1fr)
            175px
            175px
            150px;

          gap: calc(8px * var(--app-density,1));

          padding: calc(12px * var(--app-density,1));
          margin-bottom: 18px;

          border:
            1px solid #e5ebe7;

          border-radius: calc(17px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 6px 20px
            rgba(15,23,42,.025);
        }

        .records-toolbar select,
        .records-search input {
          width: 100%;
          height: 41px;

          border:
            1px solid #dce4df;

          border-radius: calc(10px * var(--app-radius-scale,1));

          outline: none;

          color: #33443a;
          background: #fbfdfc;

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 700;
        }

        .records-toolbar select {
          padding: 0 calc(9px * var(--app-density,1));
        }

        .records-search {
          position: relative;
        }

        .records-search > svg {
          position: absolute;

          right: 12px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #8c9690;

          pointer-events: none;
        }

        .records-search input {
          padding:
            0 calc(37px * var(--app-density,1)) 0 calc(34px * var(--app-density,1));
        }

        .records-search button {
          position: absolute;

          left: 6px;
          top: 50%;

          width: 26px;
          height: 26px;

          transform:
            translateY(-50%);

          border: none;
          border-radius: calc(7px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #667169;
          background: #edf1ef;

          cursor: pointer;
        }

        /* =============================================
           RECORDS HEADER
        ============================================= */

        .records-title-row {
          margin-bottom: 11px;
        }

        .records-title-row h2 {
          margin: 0;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(17px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .records-title-row p {
          margin: 3px 0 0;

          color: #909993;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        /* =============================================
           RECORD GRID
        ============================================= */

        .records-grid {
          display: grid;

          grid-template-columns:
            repeat(
              auto-fit,
              minmax(
                min(100%,340px),
                1fr
              )
            );

          gap: calc(13px * var(--app-density,1));
        }

        .record-card {
          position: relative;
          overflow: hidden;

          min-width: 0;

          border:
            1px solid #e4eae6;

          border-radius: calc(19px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 7px 24px
            rgba(15,23,42,.035);

          transition:
            transform .2s ease,
            box-shadow .2s ease;
        }

        .record-card:hover {
          transform:
            translateY(-2px);

          box-shadow:
            0 13px 32px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 7.000000000000001%,transparent);
        }

        .record-accent {
          height: 3px;
        }

        .record-accent.quran {
          background:
            linear-gradient(
              90deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .record-accent.noorania {
          background:
            linear-gradient(
              90deg,
              #9a741f,
              #d1ab4d
            );
        }

        .record-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));

          padding: calc(14px * var(--app-density,1)) calc(14px * var(--app-density,1)) calc(10px * var(--app-density,1));
        }

        .record-student {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          min-width: 0;
        }

        .record-avatar {
          width: 38px;
          height: 38px;

          flex: 0 0 38px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .record-avatar.quran {
          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .record-avatar.noorania {
          color: #927536;
          background: #fff8e7;
        }

        .record-student h3 {
          margin: 0;

          overflow: hidden;

          color: #26382e;

          font-size: calc(12px * var(--app-font-scale,1));
          font-weight: 950;

          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .record-type-label {
          margin-top: 2px;

          color: #929b95;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .record-badges {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;

          gap: calc(4px * var(--app-density,1));
        }

        .type-badge,
        .legacy-badge {
          padding: calc(4px * var(--app-density,1)) calc(7px * var(--app-density,1));

          border-radius: 999px;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .type-badge.quran {
          color: #047857;
          background: #ecfdf5;
        }

        .type-badge.noorania {
          color: #8a681e;
          background: #fff8e7;
        }

        .legacy-badge {
          color: #64748b;
          background: #f1f5f9;
        }

        /* DATE */

        .record-date {
          display: flex;
          align-items: flex-start;

          gap: calc(6px * var(--app-density,1));

          margin: 0 14px 9px;
          padding: calc(8px * var(--app-density,1)) calc(9px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-f5faf7,#f5faf7);
        }

        .record-date strong {
          display: block;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .record-date span {
          display: block;

          margin-top: 2px;

          color: #87928b;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        /* HALAQA */

        .record-halaqa {
          display: flex;
          flex-wrap: wrap;

          gap: calc(4px * var(--app-density,1)) calc(10px * var(--app-density,1));

          margin:
            0 14px 10px;

          color: #78857d;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .record-halaqa div {
          display: inline-flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));
        }

        /* SECTION */

        .record-section {
          margin:
            0 14px 8px;
          padding: calc(9px * var(--app-density,1));

          border:
            1px solid #edf1ef;

          border-radius: calc(11px * var(--app-radius-scale,1));

          background: #fbfdfc;
        }

        .record-section-title {
          display: flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          margin-bottom: 6px;

          color: #78847c;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .record-section-content {
          color: #33443a;

          font-size: calc(9px * var(--app-font-scale,1));
        }

        .quran-text {
          display: inline-flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          color: #33443a;

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .quran-arrow {
          color: #a0aaa3;
        }

        .muted {
          color: #a0a7a2;
        }

        .record-values {
          display: flex;
          flex-wrap: wrap;

          gap: calc(5px * var(--app-density,1));

          margin-top: 7px;
        }

        .evaluation-badge,
        .face-badge {
          display: inline-flex;
          align-items: center;

          gap: calc(3px * var(--app-density,1));

          padding: calc(4px * var(--app-density,1)) calc(7px * var(--app-density,1));

          border-radius: 999px;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .evaluation-badge.excellent {
          color: #047857;
          background: #e9f9ef;
        }

        .evaluation-badge.very-good {
          color: #0f766e;
          background: #edf8f7;
        }

        .evaluation-badge.good {
          color: #927536;
          background: #fff8e7;
        }

        .evaluation-badge.bad {
          color: #b42318;
          background: #fff0ef;
        }

        .evaluation-badge.neutral {
          color: #64748b;
          background: #f1f3f2;
        }

        .face-badge {
          color: #0f5132;
          background: #edf7f1;
        }

        .face-badge.legacy {
          color: #64748b;
          background: #f1f5f9;
        }

        .sub-record-line {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(7px * var(--app-density,1));

          padding: calc(4px * var(--app-density,1)) 0;
        }

        .text-record-value {
          color: #33443a;

          font-size: calc(9px * var(--app-font-scale,1));
        }

        /* NOTES */

        .record-notes {
          display: flex;
          align-items: flex-start;

          gap: calc(5px * var(--app-density,1));

          margin:
            0 14px 10px;
          padding: calc(8px * var(--app-density,1)) calc(9px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          color: #756843;
          background: #fffaf0;

          font-size: calc(7px * var(--app-font-scale,1));
          line-height: 1.6;
        }

        /* FOOTER */

        .record-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(8px * var(--app-density,1));

          padding:
            calc(10px * var(--app-density,1)) calc(14px * var(--app-density,1)) calc(13px * var(--app-density,1));

          border-top:
            1px solid #edf1ef;
        }

        .record-points {
          display: flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          color: #927536;

          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .record-points span {
          color: #9aa39d;

          font-size: calc(6px * var(--app-font-scale,1));
          font-weight: 700;
        }

        .record-actions {
          display: flex;

          gap: calc(5px * var(--app-density,1));
        }

        .record-edit,
        .record-delete {
          min-height: 31px;

          padding: 0 calc(9px * var(--app-density,1));

          border-radius: calc(8px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(4px * var(--app-density,1));

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 850;

          cursor: pointer;
        }

        .record-edit {
          border:
            1px solid #b9d6c5;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-f5faf7,#f5faf7);
        }

        .record-delete {
          border:
            1px solid #f1d1ce;

          color: #b42318;
          background: #fff5f4;
        }

        /* =============================================
           MODAL
        ============================================= */

        .recitation-modal-overlay {
          position: fixed;
          inset: 0;

          z-index: 5000;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: calc(16px * var(--app-density,1));

          background:
            rgba(15,23,42,.58);

          backdrop-filter:
            blur(5px);
        }

        .recitation-modal {
          width:
            min(
              980px,
              100%
            );

          max-height:
            calc(
              100dvh - 32px
            );

          overflow-y: auto;

          border-radius: calc(24px * var(--app-radius-scale,1));

          background: #f8faf9;

          box-shadow:
            0 32px 90px
            rgba(15,23,42,.3);
        }

        .modal-header {
          position: sticky;
          top: 0;

          z-index: 20;

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(10px * var(--app-density,1));

          padding: calc(15px * var(--app-density,1)) calc(17px * var(--app-density,1));

          border-bottom:
            1px solid #e8eeea;

          background:
            rgba(255,255,255,.97);

          backdrop-filter:
            blur(14px);
        }

        .modal-heading {
          display: flex;
          align-items: center;

          gap: calc(9px * var(--app-density,1));
        }

        .modal-icon {
          width: 39px;
          height: 39px;

          flex: 0 0 39px;

          border-radius: calc(12px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-icon.quran {
          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .modal-icon.noorania {
          color: #927536;
          background: #fff8e7;
        }

        .modal-eyebrow {
          color: #909993;

          font-size: calc(7px * var(--app-font-scale,1));
          font-weight: 800;
        }

        .modal-heading h2 {
          margin: 1px 0 0;

          color: var(--app-color-173d2b,#173d2b);

          font-size: calc(15px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .modal-close {
          width: 37px;
          height: 37px;

          border: none;
          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #64748b;
          background: #f1f5f3;

          cursor: pointer;
        }

        .edit-notice {
          display: flex;
          align-items: center;

          gap: calc(6px * var(--app-density,1));

          padding: calc(9px * var(--app-density,1)) calc(16px * var(--app-density,1));

          border-bottom:
            1px solid #f0dfb7;

          color: #84651e;
          background: #fff8e7;

          font-size: calc(8px * var(--app-font-scale,1));
          line-height: 1.6;
        }

        .modal-body {
          padding: calc(15px * var(--app-density,1));
        }

        /* =============================================
           FORM SECTION
        ============================================= */

        .form-section {
          padding: calc(15px * var(--app-density,1));
          margin-bottom: 12px;

          border:
            1px solid #e5ebe7;

          border-radius: calc(17px * var(--app-radius-scale,1));

          background: #fff;

          box-shadow:
            0 4px 14px
            rgba(15,23,42,.02);
        }

        .form-section-header {
          display: flex;
          align-items: center;

          gap: calc(8px * var(--app-density,1));

          margin-bottom: 13px;
        }

        .form-section-icon {
          width: 34px;
          height: 34px;

          flex: 0 0 34px;

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .form-section-header h3 {
          margin: 0;

          color: #26382e;

          font-size: calc(11px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .form-section-header p {
          margin: 2px 0 0;

          color: #939c96;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        /* =============================================
           INPUTS
        ============================================= */

        .form-grid {
          display: grid;

          gap: calc(10px * var(--app-density,1));
        }

        .form-grid.three {
          grid-template-columns:
            repeat(
              3,
              minmax(0,1fr)
            );
        }

        .form-grid.two {
          grid-template-columns:
            repeat(
              2,
              minmax(0,1fr)
            );
        }

        .field {
          min-width: 0;
        }

        .field-label {
          display: flex;
          align-items: center;

          gap: calc(4px * var(--app-density,1));

          margin-bottom: 5px;

          color: #566259;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .required {
          color: #b42318;

          margin-right: 2px;
        }

        .field input,
        .field select,
        .notes-box textarea {
          width: 100%;

          box-sizing: border-box;

          border:
            1px solid #dce4df;

          border-radius: calc(10px * var(--app-radius-scale,1));

          outline: none;

          color: #33443a;
          background: #fbfdfc;

          font-size: calc(9px * var(--app-font-scale,1));
          font-weight: 650;
        }

        .field input,
        .field select {
          height: 40px;

          padding: 0 calc(9px * var(--app-density,1));
        }

        .field input:focus,
        .field select:focus,
        .notes-box textarea:focus {
          border-color:
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 45%,transparent);

          box-shadow:
            0 0 0 3px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 5%,transparent);
        }

        .field select:disabled {
          color: #7f8b83;
          background: #f3f5f4;

          cursor: not-allowed;
        }

        .select-wrap,
        .number-wrap,
        .date-input-wrap {
          position: relative;
        }

        .select-wrap select {
          appearance: none;

          padding-left: calc(30px * var(--app-density,1));
        }

        .select-wrap > svg {
          position: absolute;

          left: 10px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #859089;

          pointer-events: none;
        }

        .number-wrap input {
          padding-left: calc(45px * var(--app-density,1));
        }

        .number-wrap > span {
          position: absolute;

          left: 9px;
          top: 50%;

          transform:
            translateY(-50%);

          color: #89938c;

          font-size: calc(7px * var(--app-font-scale,1));

          pointer-events: none;
        }

        .date-input-wrap > svg {
          position: absolute;

          right: 10px;
          top: 50%;

          transform:
            translateY(-50%);

          color: var(--app-color-0f5132,#0f5132);

          pointer-events: none;
        }

        .date-input-wrap input {
          padding-right: calc(33px * var(--app-density,1));
        }

        /* =============================================
           DUAL DATE
        ============================================= */

        .dual-date {
          display: grid;

          grid-template-columns:
            1fr 1fr;

          gap: calc(7px * var(--app-density,1));

          margin-top: 10px;
        }

        .dual-date > div {
          padding: calc(8px * var(--app-density,1)) calc(10px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          background: var(--app-color-f5faf7,#f5faf7);
        }

        .dual-date span {
          display: block;

          color: #8c9690;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .dual-date strong {
          display: block;

          margin-top: 2px;

          color: var(--app-color-0f5132,#0f5132);

          font-size: calc(8px * var(--app-font-scale,1));
        }

        /* =============================================
           QURAN RANGE
        ============================================= */

        .quran-range {
          display: grid;

          grid-template-columns:
            minmax(140px,1fr)
            minmax(90px,.55fr)
            25px
            minmax(140px,1fr)
            minmax(90px,.55fr);

          gap: calc(7px * var(--app-density,1));

          align-items: end;
        }

        .range-divider {
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          color: #98a29c;

          font-size: calc(14px * var(--app-font-scale,1));
        }

        /* =============================================
           EVALUATIONS
        ============================================= */

        .evaluation-area {
          margin-top: 13px;
        }

        .evaluation-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0,1fr)
            );

          gap: calc(6px * var(--app-density,1));
        }

        .evaluation-option {
          min-height: 40px;

          border:
            1px solid #dfe5e1;

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: calc(4px * var(--app-density,1));

          padding: 0 calc(9px * var(--app-density,1));

          color: #606c64;
          background: #fff;

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 850;

          cursor: pointer;
        }

        .evaluation-option small {
          opacity: .7;
          font-size: calc(6px * var(--app-font-scale,1));
        }

        .evaluation-option.excellent.active {
          border-color: var(--app-color-0f5132,#0f5132);

          color: var(--app-color-0f5132,#0f5132);
          background: #e8f6ed;
        }

        .evaluation-option.very-good.active {
          border-color: var(--app-color-0f766e,#0f766e);

          color: var(--app-color-0f766e,#0f766e);
          background: var(--app-color-edf8f7,#edf8f7);
        }

        .evaluation-option.good.active {
          border-color: #c79d43;

          color: #927536;
          background: #fff8e7;
        }

        .evaluation-option.bad.active {
          border-color: #b42318;

          color: #b42318;
          background: #fff0ef;
        }

        /* =============================================
           LESSON AMOUNT
        ============================================= */

        .lesson-amount-block {
          margin-top: 13px;
        }

        .lesson-amount-grid {
          display: grid;

          grid-template-columns:
            repeat(
              4,
              minmax(0,1fr)
            );

          gap: calc(6px * var(--app-density,1));
        }

        .amount-option {
          min-height: 52px;

          border:
            1px solid #dfe5e1;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          gap: calc(2px * var(--app-density,1));

          color: #59665e;
          background: #fff;

          cursor: pointer;
        }

        .amount-option strong {
          font-size: calc(9px * var(--app-font-scale,1));
        }

        .amount-option span {
          color: #97a09a;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .amount-option.active {
          border-color: var(--app-color-0f5132,#0f5132);

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);

          box-shadow:
            inset 0 0 0 1px
            color-mix(in srgb,var(--app-color-0f5132,#0f5132) 8%,transparent);
        }

        .faces-preview {
          display: flex;
          align-items: center;

          gap: calc(5px * var(--app-density,1));

          margin-top: 7px;
          padding: calc(7px * var(--app-density,1)) calc(9px * var(--app-density,1));

          border-radius: calc(9px * var(--app-radius-scale,1));

          color: #66736a;
          background: #f5f8f6;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .faces-preview strong {
          color: var(--app-color-0f5132,#0f5132);
        }

        .evaluation-faces-grid {
          margin-top: 0;
        }

        /* =============================================
           BOTTOM FORM
        ============================================= */

        .bottom-form-grid {
          display: grid;

          grid-template-columns:
            190px
            minmax(0,1fr);

          gap: calc(10px * var(--app-density,1));
        }

        .points-preview {
          min-height: 135px;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          border:
            1px solid #f0e2c2;

          border-radius: calc(16px * var(--app-radius-scale,1));

          background:
            linear-gradient(
              145deg,
              #fffaf0,
              #fffdf8
            );
        }

        .points-icon {
          width: 37px;
          height: 37px;

          margin-bottom: 5px;

          border-radius: calc(11px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: #927536;
          background: #fff2cf;
        }

        .points-preview > span {
          color: #9b844f;

          font-size: calc(7px * var(--app-font-scale,1));
        }

        .points-preview > strong {
          margin-top: 2px;

          color: #8c6919;

          font-size: calc(23px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .points-preview > small {
          margin-top: 2px;

          color: #a99c7c;

          font-size: calc(6px * var(--app-font-scale,1));
        }

        .notes-box {
          padding: calc(13px * var(--app-density,1));

          border:
            1px solid #e5ebe7;

          border-radius: calc(16px * var(--app-radius-scale,1));

          background: #fff;
        }

        .notes-box textarea {
          min-height: 91px;

          padding: calc(9px * var(--app-density,1));

          resize: vertical;

          line-height: 1.7;
        }

        /* =============================================
           MODAL FOOTER
        ============================================= */

        .modal-footer {
          position: sticky;
          bottom: 0;

          z-index: 20;

          display: flex;
          justify-content: flex-end;

          gap: calc(7px * var(--app-density,1));

          padding: calc(12px * var(--app-density,1)) calc(16px * var(--app-density,1));

          border-top:
            1px solid #e7ede9;

          background:
            rgba(255,255,255,.97);

          backdrop-filter:
            blur(14px);
        }

        .modal-save,
        .modal-cancel {
          min-height: 40px;

          padding: 0 calc(15px * var(--app-density,1));

          border-radius: calc(10px * var(--app-radius-scale,1));

          display: inline-flex;
          align-items: center;
          justify-content: center;

          gap: calc(5px * var(--app-density,1));

          font-size: calc(8px * var(--app-font-scale,1));
          font-weight: 900;

          cursor: pointer;
        }

        .modal-save {
          min-width: 135px;

          border: none;

          color: #fff;

          background:
            linear-gradient(
              135deg,
              var(--app-color-0f5132,#0f5132),
              var(--app-color-0f766e,#0f766e)
            );
        }

        .modal-cancel {
          border:
            1px solid #dce3df;

          color: #637068;
          background: #fff;
        }

        .modal-save:disabled,
        .modal-cancel:disabled {
          opacity: .55;
          cursor: wait;
        }

        /* =============================================
           EMPTY
        ============================================= */

        .records-empty {
          padding: calc(48px * var(--app-density,1)) calc(20px * var(--app-density,1));

          border:
            1px dashed #ccd8d1;

          border-radius: calc(19px * var(--app-radius-scale,1));

          text-align: center;

          background: #fff;
        }

        .empty-icon,
        .loading-icon {
          width: 54px;
          height: 54px;

          margin:
            0 auto 10px;

          border-radius: calc(16px * var(--app-radius-scale,1));

          display: flex;
          align-items: center;
          justify-content: center;

          color: var(--app-color-0f5132,#0f5132);
          background: var(--app-color-edf7f1,#edf7f1);
        }

        .records-empty h3,
        .recitations-loading h3 {
          margin: 0;

          color: #35453b;

          font-size: calc(13px * var(--app-font-scale,1));
        }

        .records-empty p,
        .recitations-loading p {
          margin: 4px 0 0;

          color: #8d9790;

          font-size: calc(8px * var(--app-font-scale,1));
        }

        .recitations-loading {
          min-height: 55vh;

          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          text-align: center;
        }

        /* =============================================
           ANIMATION
        ============================================= */

        @keyframes recitationSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        .spin {
          animation:
            recitationSpin
            .8s linear infinite;
        }

        /* =============================================
           TABLET
        ============================================= */

        @media (
          max-width: 1100px
        ) {
          .recitation-stats {
            grid-template-columns:
              repeat(
                3,
                minmax(0,1fr)
              );
          }

          .records-toolbar {
            grid-template-columns:
              1fr 1fr;
          }

          .records-search {
            grid-column:
              1 / -1;
          }

          .quran-range {
            grid-template-columns:
              1fr 1fr;

            gap: calc(9px * var(--app-density,1));
          }

          .range-divider {
            display: none;
          }
        }

        /* =============================================
           MOBILE
        ============================================= */

        @media (
          max-width: 720px
        ) {
          .recitations-hero {
            align-items:
              flex-start;

            padding: calc(17px * var(--app-density,1));

            border-radius: calc(19px * var(--app-radius-scale,1));
          }

          .hero-icon {
            width: 42px;
            height: 42px;

            flex-basis: 42px;
          }

          .hero-main h1 {
            font-size: calc(20px * var(--app-font-scale,1));
          }

          .hero-main p {
            display: none;
          }

          .hero-actions {
            gap: calc(5px * var(--app-density,1));
          }

          .refresh-button,
          .create-button {
            width: 40px;
            min-height: 40px;

            padding: 0;
          }

          .refresh-button span,
          .create-button span {
            display: none;
          }

          .recitation-stats {
            grid-template-columns:
              repeat(
                2,
                minmax(0,1fr)
              );

            gap: calc(7px * var(--app-density,1));
          }

          .recitation-stat {
            padding: calc(10px * var(--app-density,1));
          }

          .recitation-stat-icon {
            width: 32px;
            height: 32px;

            flex-basis: 32px;
          }

          .recitation-stat strong {
            font-size: calc(16px * var(--app-font-scale,1));
          }

          .records-toolbar {
            grid-template-columns:
              1fr;
          }

          .records-search {
            grid-column: auto;
          }

          /* MODAL */

          .recitation-modal-overlay {
            padding: calc(7px * var(--app-density,1));

            align-items:
              flex-end;
          }

          .recitation-modal {
            max-height: 95dvh;

            border-radius:
              calc(22px * var(--app-radius-scale,1)) calc(22px * var(--app-radius-scale,1))
              calc(10px * var(--app-radius-scale,1)) calc(10px * var(--app-radius-scale,1));
          }

          .modal-body {
            padding: calc(11px * var(--app-density,1));
          }

          .form-grid.three,
          .form-grid.two {
            grid-template-columns:
              1fr;
          }

          .dual-date {
            grid-template-columns:
              1fr;
          }

          .quran-range {
            grid-template-columns:
              1fr 1fr;
          }

          .evaluation-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .lesson-amount-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .bottom-form-grid {
            grid-template-columns:
              1fr;
          }

          .points-preview {
            min-height: 100px;
          }

          .modal-footer {
            padding: calc(10px * var(--app-density,1)) calc(12px * var(--app-density,1));
          }

          .modal-save,
          .modal-cancel {
            flex: 1;
          }

          .record-card:hover {
            transform: none;
          }
        }

        /* =============================================
           SMALL MOBILE
        ============================================= */

        @media (
          max-width: 430px
        ) {
          .recitations-hero {
            padding: calc(14px * var(--app-density,1));
          }

          .hero-main {
            gap: calc(8px * var(--app-density,1));
          }

          .hero-main h1 {
            font-size: calc(18px * var(--app-font-scale,1));
          }

          .hero-eyebrow {
            font-size: calc(7px * var(--app-font-scale,1));
          }

          .hero-icon {
            width: 38px;
            height: 38px;

            flex-basis: 38px;
          }

          .refresh-button,
          .create-button {
            width: 36px;
            min-height: 36px;
          }

          .recitation-scope {
            font-size: calc(7px * var(--app-font-scale,1));
          }

          .quran-range {
            grid-template-columns:
              1fr;
          }

          .evaluation-grid {
            grid-template-columns:
              1fr 1fr;
          }

          .record-card-header {
            align-items:
              flex-start;
          }

          .record-footer {
            flex-direction:
              column;

            align-items:
              stretch;
          }

          .record-actions {
            display: grid;

            grid-template-columns:
              1fr 1fr;
          }

          .record-edit,
          .record-delete {
            width: 100%;
          }
        }

        /* =============================================
           QUICK PRO v1 — وضوح وسرعة
        ============================================= */

        .recitations-page {
          --quick-green: var(--app-color-0f4c45,#0f4c45);
          --quick-deep: var(--app-color-082f2a,#082f2a);
          --quick-gold: #d1b34c;
          --quick-ink: #173a33;
          --quick-muted: #6f827b;
          --quick-border: #dce6e2;
          color: var(--quick-ink);
        }

        .hero-eyebrow,
        .recitation-scope,
        .stat-card span,
        .stat-card small,
        .records-title-row p,
        .modal-eyebrow,
        .form-section-header p,
        .field-label,
        .field label,
        .dual-date span,
        .record-type-badge,
        .record-halaqa,
        .record-footer,
        .face-badge span,
        .evaluation-badge,
        .empty-state span {
          font-size: calc(12px * var(--app-font-scale,1));
          line-height: 1.55;
        }

        .hero-main h1 {
          font-size: calc(28px * var(--app-font-scale,1));
          line-height: 1.2;
        }

        .hero-main p {
          max-width: 700px;
          margin-top: 7px;
          font-size: calc(14px * var(--app-font-scale,1));
          line-height: 1.8;
          color: #667b73;
        }

        .recitation-scope {
          min-height: 48px;
          padding: calc(11px * var(--app-density,1)) calc(14px * var(--app-density,1));
          border-radius: calc(13px * var(--app-radius-scale,1));
        }

        .stat-card strong {
          font-size: calc(24px * var(--app-font-scale,1));
        }

        .records-toolbar input,
        .records-toolbar select,
        .field input,
        .field select,
        .field textarea,
        .select-field select,
        .text-field input,
        .number-field input,
        .date-field input {
          font-size: calc(14px * var(--app-font-scale,1));
        }

        .records-title-row h2,
        .form-section-header h3 {
          font-size: calc(17px * var(--app-font-scale,1));
        }

        .modal-header h2 {
          font-size: calc(22px * var(--app-font-scale,1));
          line-height: 1.3;
        }

        .recitation-modal {
          width: min(980px, 96vw);
          border-radius: calc(24px * var(--app-radius-scale,1));
        }

        .modal-body {
          padding: calc(18px * var(--app-density,1)) calc(20px * var(--app-density,1)) calc(24px * var(--app-density,1));
        }

        .form-section {
          border-radius: calc(17px * var(--app-radius-scale,1));
          padding: calc(16px * var(--app-density,1));
        }

        .quick-entry-banner {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: calc(11px * var(--app-density,1));
          align-items: center;
          margin-bottom: 13px;
          padding: calc(13px * var(--app-density,1)) calc(14px * var(--app-density,1));
          border: 1px solid rgba(209,179,76,.28);
          border-radius: calc(15px * var(--app-radius-scale,1));
          background:
            linear-gradient(
              135deg,
              #fffaf0,
              #fffdf8
            );
        }

        .quick-entry-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          border-radius: calc(12px * var(--app-radius-scale,1));
          background: #f6e9b6;
          color: #8d6f16;
        }

        .quick-entry-banner strong {
          display: block;
          color: #6b5314;
          font-size: calc(14px * var(--app-font-scale,1));
          font-weight: 950;
        }

        .quick-entry-banner span {
          display: block;
          margin-top: 4px;
          color: #887642;
          font-size: calc(12px * var(--app-font-scale,1));
          line-height: 1.7;
          font-weight: 700;
        }

        .quick-section-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.25fr) minmax(260px, .75fr);
          gap: calc(15px * var(--app-density,1));
          align-items: start;
        }

        .quick-amount-column,
        .quick-evaluation-column {
          min-width: 0;
        }

        .lesson-amount-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: calc(8px * var(--app-density,1));
        }

        .amount-option {
          min-height: 72px;
          border-radius: calc(13px * var(--app-radius-scale,1));
        }

        .amount-option strong {
          font-size: calc(14px * var(--app-font-scale,1));
        }

        .amount-option span {
          margin-top: 5px;
          font-size: calc(11px * var(--app-font-scale,1));
        }

        .quick-faces-preview {
          min-height: 42px;
          margin-top: 9px;
          font-size: calc(12px * var(--app-font-scale,1));
        }

        .evaluation-grid {
          gap: calc(8px * var(--app-density,1));
        }

        .evaluation-option {
          min-height: 50px;
          border-radius: calc(12px * var(--app-radius-scale,1));
          font-size: calc(13px * var(--app-font-scale,1));
          font-weight: 900;
        }

        .quick-side-grid {
          align-items: end;
        }

        .quick-side-grid .text-field input {
          min-height: 46px;
        }

        .quick-record-values {
          justify-content: flex-start;
          gap: calc(8px * var(--app-density,1));
        }

        .quick-side-record {
          align-items: center;
          gap: calc(9px * var(--app-density,1));
        }

        .text-record-value {
          font-size: calc(13px * var(--app-font-scale,1));
          line-height: 1.55;
        }

        .record-card {
          border-radius: calc(18px * var(--app-radius-scale,1));
        }

        .record-student strong {
          font-size: calc(14px * var(--app-font-scale,1));
        }

        .record-student span,
        .record-date strong,
        .record-date span {
          font-size: calc(11px * var(--app-font-scale,1));
        }

        .record-section h4 {
          font-size: calc(12px * var(--app-font-scale,1));
        }

        .modal-save,
        .modal-cancel,
        .refresh-button,
        .create-button {
          font-size: calc(12px * var(--app-font-scale,1));
          font-weight: 900;
        }

        @media (max-width: 820px) {
          .quick-section-grid {
            grid-template-columns: 1fr;
          }

          .lesson-amount-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .recitation-modal {
            width: min(100%, 720px);
          }
        }

        @media (max-width: 520px) {
          .hero-main h1 {
            font-size: calc(23px * var(--app-font-scale,1));
          }

          .hero-main p {
            font-size: calc(13px * var(--app-font-scale,1));
          }

          .hero-eyebrow,
          .recitation-scope,
          .stat-card span,
          .stat-card small,
          .records-title-row p,
          .modal-eyebrow,
          .form-section-header p,
          .field-label,
          .field label,
          .dual-date span,
          .record-halaqa,
          .record-footer {
            font-size: calc(11px * var(--app-font-scale,1));
          }

          .lesson-amount-grid,
          .evaluation-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .quick-entry-banner {
            grid-template-columns: 38px 1fr;
            padding: calc(11px * var(--app-density,1));
          }

          .quick-entry-icon {
            width: 37px;
            height: 37px;
          }

          .modal-body {
            padding: calc(13px * var(--app-density,1));
          }

          .form-section {
            padding: calc(13px * var(--app-density,1));
          }
        }


        /* =============================================
           SMART PLAN DEFAULT + FREE LESSON AMOUNT
        ============================================= */

        .plan-suggestion-card {
          display: grid;
          grid-template-columns: 43px 1fr;
          gap: calc(10px * var(--app-density,1));
          align-items: center;
          margin-bottom: 13px;
          padding: calc(12px * var(--app-density,1)) calc(13px * var(--app-density,1));
          border: 1px solid #cfe3dc;
          border-radius: calc(14px * var(--app-radius-scale,1));
          background: linear-gradient(135deg, #eef8f4, #fbfdfc);
        }

        .plan-suggestion-card.extra-day {
          border-color: #eadca7;
          background: linear-gradient(135deg, #fffaf0, #fffdf8);
        }

        .plan-suggestion-icon {
          width: 41px;
          height: 41px;
          display: grid;
          place-items: center;
          border-radius: calc(12px * var(--app-radius-scale,1));
          background: #dff1ea;
          color: var(--app-color-147a5e,#147a5e);
        }

        .plan-suggestion-card.extra-day .plan-suggestion-icon {
          background: #f8ebbd;
          color: #8d6f16;
        }

        .plan-suggestion-copy span,
        .plan-suggestion-copy strong,
        .plan-suggestion-copy small {
          display: block;
        }

        .plan-suggestion-copy span {
          color: #71857d;
          font-size: calc(10px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .plan-suggestion-copy strong {
          margin-top: 3px;
          color: #173f37;
          font-size: calc(13px * var(--app-font-scale,1));
          line-height: 1.45;
          font-weight: 950;
        }

        .plan-suggestion-copy small {
          margin-top: 4px;
          color: #70827b;
          font-size: calc(10px * var(--app-font-scale,1));
          line-height: 1.55;
          font-weight: 700;
        }

        .lesson-free-field {
          min-width: 0;
        }

        .lesson-free-control {
          display: grid;
          grid-template-columns: minmax(100px,1fr) auto;
          gap: calc(8px * var(--app-density,1));
        }

        .lesson-free-control > input {
          width: 100%;
          height: 48px;
          border: 1px solid #d9e3df;
          border-radius: calc(12px * var(--app-radius-scale,1));
          outline: none;
          padding: 0 calc(12px * var(--app-density,1));
          background: #fff;
          color: #23433b;
          font-family: inherit;
          font-size: calc(14px * var(--app-font-scale,1));
          font-weight: 850;
        }

        .lesson-free-control > input:focus {
          border-color: #9fc8bc;
          box-shadow: 0 0 0 4px color-mix(in srgb,var(--app-color-0f4c45,#0f4c45) 6%,transparent);
        }

        .lesson-unit-switch {
          min-width: 145px;
          display: grid;
          grid-template-columns: repeat(2,1fr);
          overflow: hidden;
          border: 1px solid #d9e3df;
          border-radius: calc(12px * var(--app-radius-scale,1));
          background: #fff;
        }

        .lesson-unit-switch button {
          border: 0;
          background: transparent;
          color: #72857e;
          font-family: inherit;
          font-size: calc(11px * var(--app-font-scale,1));
          font-weight: 900;
          cursor: pointer;
        }

        .lesson-unit-switch button + button {
          border-right: 1px solid #e1e9e6;
        }

        .lesson-unit-switch button.active {
          background: #eaf7f1;
          color: var(--app-color-147a5e,#147a5e);
        }

        .lesson-free-hint {
          display: block;
          margin-top: 7px;
          color: #82938d;
          font-size: calc(10px * var(--app-font-scale,1));
          line-height: 1.5;
        }

        @media (max-width: 560px) {
          .lesson-free-control {
            grid-template-columns: 1fr;
          }

          .lesson-unit-switch {
            min-width: 0;
            min-height: 42px;
          }

          .plan-suggestion-card {
            grid-template-columns: 37px 1fr;
          }

          .plan-suggestion-icon {
            width: 36px;
            height: 36px;
          }
        }

        /* ===== Quiet recitation modal v2 ===== */
        .recitation-modal {
          width: min(840px, 100%) !important;
        }

        .modal-body {
          padding: calc(12px * var(--app-density,1)) !important;
        }

        .modal-header {
          padding: calc(12px * var(--app-density,1)) calc(14px * var(--app-density,1)) !important;
        }

        .modal-icon {
          width: 34px !important;
          height: 34px !important;
          flex-basis: 34px !important;
        }

        .modal-heading h2 {
          font-size: calc(13px * var(--app-font-scale,1)) !important;
        }

        .form-section {
          margin-bottom: 8px !important;
        }

        .compact-form-section-toggle {
          min-height: 50px !important;
          grid-template-columns: 30px minmax(0,1fr) auto !important;
          padding: 8px 10px !important;
        }

        .compact-form-section .form-section-icon {
          width: 30px !important;
          height: 30px !important;
          flex-basis: 30px !important;
        }

        .compact-form-section-copy strong {
          font-size: 10.5px !important;
        }

        .compact-form-section-copy small {
          margin-top: 2px !important;
          font-size: 8px !important;
        }

        .compact-form-section-body {
          gap: 8px !important;
          padding: 9px 10px 10px !important;
        }

        .field input,
        .field select {
          height: 38px !important;
        }

        .field-label {
          margin-bottom: 4px !important;
          font-size: calc(7.5px * var(--app-font-scale,1)) !important;
        }

        .evaluation-area {
          margin-top: 8px !important;
        }

        .evaluation-grid {
          gap: 5px !important;
        }

        .evaluation-option {
          min-height: 34px !important;
          justify-content: center !important;
          padding: 0 7px !important;
          font-size: calc(7.5px * var(--app-font-scale,1)) !important;
        }

        .evaluation-option small {
          display: none !important;
        }

        .planned-quran-task.compact {
          padding: 8px 9px !important;
        }

        .planned-quran-task-head > div > span {
          font-size: 8px !important;
        }

        .planned-quran-task-head > div > strong {
          font-size: 10px !important;
        }

        .planned-quran-cycle-route {
          display: grid;
          gap: 6px;
          margin-top: 9px;
          padding: 9px;
          border-radius: 12px;
          background: linear-gradient(145deg, rgba(235,248,242,.9), rgba(255,255,255,.96));
          border: 1px solid rgba(20,122,94,.1);
        }

        .planned-quran-cycle-title {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #1b6550;
          font-size: 9px;
          font-weight: 950;
        }

        .planned-quran-cycle-step {
          display: grid;
          grid-template-columns: 20px minmax(0,1fr);
          align-items: center;
          gap: 7px;
          padding: 6px 7px;
          border-radius: 9px;
          background: rgba(255,255,255,.82);
          color: #48675e;
          font-size: 8.5px;
          font-weight: 850;
          line-height: 1.6;
        }

        .planned-quran-cycle-step b {
          width: 20px;
          height: 20px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: #e5f5ed;
          color: #17664e;
          font-size: 8px;
        }

        .planned-quran-speed {
          min-height: 28px !important;
          padding: 4px 7px !important;
          font-size: 8px !important;
        }

        .completion-status-options.compact .completion-status-btn {
          min-height: 33px !important;
        }

        .side-policy-none-state {
          align-items: center !important;
          padding: 9px 10px !important;
          border-radius: 11px !important;
        }

        .side-policy-none-state span {
          display: none !important;
        }

        .side-policy-none-state strong {
          font-size: 9px !important;
        }

        .side-lesson-full-range-edit {
          margin-top: 10px;
          padding: 12px;
          border: 1px solid rgba(24, 96, 78, .12);
          border-radius: 18px;
          background: rgba(250, 252, 251, .92);
        }

        .side-lesson-manual-amount {
          margin-top: 10px;
          padding: 12px;
          border: 1px solid rgba(24, 96, 78, .12);
          border-radius: 18px;
          background: linear-gradient(145deg, rgba(248,252,250,.96), rgba(255,255,255,.98));
        }

        .side-lesson-manual-title {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 10px;
          color: #315e52;
          font-size: 12px;
          font-weight: 900;
        }

        .side-lesson-manual-controls {
          display: grid;
          grid-template-columns: minmax(90px,.8fr) minmax(110px,1fr) auto;
          gap: 8px;
          align-items: end;
        }

        .side-lesson-manual-apply {
          min-height: 44px;
          padding: 0 14px;
          border: 1px solid rgba(18,101,78,.14);
          border-radius: 13px;
          background: #edf7f3;
          color: #17654f;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }

        .side-lesson-manual-apply:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        @media (max-width: 620px) {
          .side-lesson-manual-controls {
            grid-template-columns: 1fr 1fr;
          }

          .side-lesson-manual-apply {
            grid-column: 1 / -1;
          }
        }

        .side-policy-live-badge {
          margin-bottom: 0 !important;
          padding: 7px 9px !important;
          font-size: 8.5px !important;
        }

        .side-policy-live-badge small {
          display: none !important;
        }

        .completion-repeat-note {
          padding: 7px 9px !important;
          font-size: 8.5px !important;
        }

        .compact-noorania-grid {
          gap: 8px !important;
        }

        .bottom-form-grid {
          grid-template-columns: 128px minmax(0,1fr) !important;
          gap: 8px !important;
          margin-top: 8px !important;
        }

        .points-preview {
          min-height: 62px !important;
          padding: 7px 9px !important;
          display: grid !important;
          grid-template-columns: 28px 1fr auto !important;
          grid-template-rows: auto auto !important;
          align-items: center !important;
          justify-content: initial !important;
          column-gap: 7px !important;
          border-radius: 12px !important;
        }

        .points-icon {
          width: 28px !important;
          height: 28px !important;
          margin: 0 !important;
          grid-row: 1 / 3 !important;
        }

        .points-preview > span {
          font-size: 7px !important;
        }

        .points-preview > strong {
          margin: 0 !important;
          grid-row: 1 / 3 !important;
          grid-column: 3 !important;
          font-size: calc(17px * var(--app-font-scale,1)) !important;
        }

        .points-preview > small {
          margin: 0 !important;
          font-size: 6px !important;
        }

        .recitation-notes-details > summary {
          min-height: 38px !important;
        }

        .modal-footer {
          padding: calc(9px * var(--app-density,1)) calc(12px * var(--app-density,1)) !important;
        }

        .modal-save,
        .modal-cancel {
          min-height: 38px !important;
        }

        @media (max-width: 620px) {
          .recitation-modal-overlay {
            padding: 8px !important;
          }

          .recitation-modal {
            max-height: calc(100dvh - 16px) !important;
            border-radius: 18px !important;
          }

          .modal-body {
            padding: 9px !important;
          }

          .form-grid.three {
            grid-template-columns: 1fr 1fr !important;
          }

          .form-grid.three > :last-child {
            grid-column: 1 / -1;
          }

          .form-grid.two,
          .compact-noorania-grid {
            grid-template-columns: 1fr !important;
          }

          .compact-form-section-toggle {
            min-height: 48px !important;
          }

          .bottom-form-grid {
            grid-template-columns: 1fr !important;
          }

          .points-preview {
            grid-template-columns: 28px 1fr auto !important;
            min-height: 54px !important;
          }
        }

        .noorania-amount-control {
          display: grid;
          grid-template-columns: minmax(0,1fr) auto;
          gap: 6px;
          align-items: stretch;
        }

        .noorania-amount-control > input {
          width: 100%;
          height: 38px;
          border: 1px solid #dce4df;
          border-radius: 10px;
          outline: none;
          padding: 0 9px;
          color: #33443a;
          background: #fbfdfc;
          font-family: inherit;
          font-size: 9px;
          font-weight: 700;
        }

        .noorania-unit-toggle {
          display: grid;
          grid-template-columns: repeat(2,auto);
          gap: 3px;
          padding: 3px;
          border-radius: 10px;
          background: #f0f4f1;
        }

        .noorania-unit-toggle button {
          min-width: 52px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #718079;
          font-family: inherit;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .noorania-unit-toggle button.active {
          background: #fff;
          color: #175b47;
          box-shadow: 0 2px 8px rgba(17,79,61,.08);
        }

        .noorania-pages-preview {
          display: block;
          margin-top: 4px;
          color: #8b753d;
          font-size: 7.5px;
          font-weight: 850;
        }

        @media (max-width: 520px) {
          .noorania-amount-control {
            grid-template-columns: 1fr;
          }

          .noorania-unit-toggle {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .noorania-unit-toggle button {
            min-height: 30px;
          }
        }

        /* ===== Compact recitation modal ===== */
        .recitation-plan-brief {
          min-height: 38px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 7px 10px;
          margin-bottom: 8px;
          border: 1px solid rgba(22,92,69,.10);
          border-radius: 11px;
          background: #f3f8f5;
          color: #2a6652;
          font-size: 9.5px;
          font-weight: 900;
        }

        .recitation-plan-brief small {
          margin-right: auto;
          color: #9b792c;
          font-size: 8px;
        }

        .compact-form-section {
          padding: 0 !important;
          overflow: hidden;
          border-radius: 14px !important;
          box-shadow: none !important;
        }

        .compact-form-section-toggle {
          width: 100%;
          min-height: 56px;
          display: grid;
          grid-template-columns: 34px minmax(0,1fr) auto;
          align-items: center;
          gap: 9px;
          padding: 9px 11px;
          border: 0;
          background: #fff;
          color: #2f5548;
          font-family: inherit;
          text-align: right;
          cursor: pointer;
        }

        .compact-form-section.open .compact-form-section-toggle {
          border-bottom: 1px solid rgba(24,86,66,.08);
          background: linear-gradient(135deg,#f6faf8,#fffdf7);
        }

        .compact-form-section-copy {
          min-width: 0;
        }

        .compact-form-section-copy strong {
          display: block;
          color: #24483b;
          font-size: 11px;
          font-weight: 950;
        }

        .compact-form-section-copy small {
          display: block;
          margin-top: 3px;
          overflow: hidden;
          color: #83908b;
          font-size: 8.5px;
          font-weight: 700;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .compact-form-section-toggle > svg:last-child {
          color: #73827c;
          transition: transform .18s ease;
        }

        .compact-form-section-toggle > svg.open:last-child {
          transform: rotate(180deg);
        }

        .compact-form-section-body {
          display: grid;
          gap: 10px;
          padding: 10px 11px 12px;
        }

        .planned-quran-task.compact {
          margin: 0 !important;
          padding: 9px 10px !important;
          border-radius: 11px !important;
        }

        .planned-quran-task.compact .planned-quran-task-meta {
          display: none !important;
        }

        .completion-status-block.compact {
          margin: 0 !important;
          padding: 0 !important;
          border: 0 !important;
          background: transparent !important;
        }

        .completion-status-options.compact {
          grid-template-columns: repeat(4,minmax(0,1fr)) !important;
          gap: 6px !important;
        }

        .completion-status-options.compact .completion-status-btn {
          min-height: 36px !important;
          padding: 6px !important;
        }

        .completion-status-options.compact .completion-status-btn span {
          display: none !important;
        }

        .completion-status-options.compact .completion-status-btn strong {
          font-size: 9px !important;
        }

        .actual-end-editor {
          padding: 9px !important;
        }

        .actual-end-heading {
          margin-bottom: 7px !important;
        }

        .actual-end-heading > strong {
          font-size: 9px !important;
        }

        .secondary-side-details > summary {
          min-height: 40px !important;
          font-size: 9px !important;
        }

        .recitation-notes-details {
          border: 1px solid rgba(24,86,66,.09);
          border-radius: 12px;
          background: #fafcfb;
          overflow: hidden;
        }

        .recitation-notes-details > summary {
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          color: #60746c;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
          list-style: none;
        }

        .recitation-notes-details > summary::-webkit-details-marker {
          display: none;
        }

        .recitation-notes-details .notes-box.compact {
          margin: 0 !important;
          padding: 0 10px 10px !important;
        }

        .recitation-notes-details .notes-box.compact textarea {
          min-height: 74px !important;
        }

        .form-section:not(.compact-form-section) .form-section-header p {
          display: none;
        }

        @media (max-width: 620px) {
          .compact-form-section-toggle {
            min-height: 52px;
            grid-template-columns: 31px minmax(0,1fr) auto;
            padding: 8px 9px;
          }

          .completion-status-options.compact {
            grid-template-columns: repeat(4,minmax(0,1fr)) !important;
          }

          .completion-status-options.compact .completion-status-btn {
            min-width: 0 !important;
          }

          .form-grid.three {
            grid-template-columns: 1fr !important;
          }
        }

        .quran-engine-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 16px;
          border: 1px solid rgba(16, 86, 66, 0.16);
          border-radius: 18px;
          background:
            radial-gradient(circle at top left, rgba(201, 166, 88, 0.12), transparent 34%),
            linear-gradient(135deg, rgba(248, 252, 249, 0.98), rgba(255, 255, 255, 0.98));
          margin-bottom: 14px;
        }

        .quran-engine-banner strong,
        .quran-engine-banner span {
          display: block;
        }

        .quran-engine-banner strong {
          color: #123f33;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .quran-engine-banner span {
          color: #60736d;
          font-size: 12px;
          line-height: 1.7;
        }

        .side-policy-live-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          padding: 9px 11px;
          border-radius: 13px;
          background: rgba(68, 101, 72, 0.08);
          color: #426144;
        }
        .side-policy-live-badge small { margin-right: auto; color: #858f86; }
        .side-policy-none-state {
          display:flex;
          align-items:flex-start;
          gap:10px;
          padding:14px;
          border:1px dashed #d8dfd5;
          border-radius:16px;
          background:#fbfcfa;
          color:#667168;
        }
        .side-policy-none-state strong { display:block; color:#354838; }
        .side-policy-none-state span { display:block; margin-top:3px; font-size:12px; }

        .planned-quran-task {
          border: 1px solid rgba(18, 92, 70, 0.15);
          border-radius: 17px;
          padding: 13px 14px;
          background:
            radial-gradient(circle at top left, rgba(201,166,88,.11), transparent 38%),
            linear-gradient(135deg, rgba(244,250,247,.96), rgba(255,255,255,.99));
          box-shadow: 0 8px 24px rgba(25, 74, 60, 0.05);
        }

        .planned-quran-task-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .planned-quran-task-head span,
        .planned-quran-task-head strong {
          display: block;
        }

        .planned-quran-task-head > div:first-child > span {
          color: #6d7f79;
          font-size: 10px;
          font-weight: 800;
          margin-bottom: 4px;
        }

        .planned-quran-task-head > div:first-child > strong {
          color: #123f33;
          font-size: 14px;
          font-weight: 950;
          line-height: 1.7;
        }

        .planned-quran-speed {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(201,166,88,.12);
          color: #806628;
          font-size: 10px;
          font-weight: 900;
        }

        .planned-quran-task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 9px;
        }

        .planned-quran-task-meta span {
          padding: 5px 8px;
          border-radius: 9px;
          background: rgba(20,122,94,.07);
          color: #547168;
          font-size: 9px;
          font-weight: 850;
        }

        .completion-status-block {
          margin-top: 12px;
        }

        .completion-status-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .completion-status-heading span {
          color: #315d50;
          font-size: 11px;
          font-weight: 950;
        }

        .completion-status-heading small {
          color: #8a9893;
          font-size: 9px;
        }

        .completion-status-options {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px;
        }

        .completion-status-btn {
          min-height: 60px;
          border: 1px solid #e1e9e6;
          border-radius: 14px;
          padding: 8px;
          background: #fff;
          color: #60736c;
          font-family: inherit;
          cursor: pointer;
          transition: .18s ease;
        }

        .completion-status-btn strong,
        .completion-status-btn span {
          display: block;
        }

        .completion-status-btn strong {
          font-size: 12px;
          font-weight: 950;
          margin-bottom: 3px;
        }

        .completion-status-btn span {
          font-size: 8px;
          line-height: 1.45;
          opacity: .82;
        }

        .completion-status-btn:hover {
          transform: translateY(-1px);
          border-color: rgba(20,122,94,.28);
        }

        .completion-status-btn.active {
          border-color: rgba(20,122,94,.34);
          background: #edf8f3;
          color: #12684f;
          box-shadow: 0 7px 18px rgba(20,122,94,.08);
        }

        .completion-status-btn.under.active {
          border-color: rgba(181,126,26,.28);
          background: #fff9e9;
          color: #87651d;
        }

        .completion-status-btn.over.active {
          border-color: rgba(23,105,149,.24);
          background: #eef8fc;
          color: #236885;
        }

        .completion-status-btn.repeat.active {
          border-color: rgba(154,68,68,.22);
          background: #fff2f2;
          color: #914747;
        }

        .actual-end-editor {
          margin-top: 11px;
          padding: 12px;
          border: 1px dashed rgba(20,122,94,.28);
          border-radius: 15px;
          background: rgba(248,252,250,.92);
        }

        .actual-end-heading {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 10px;
          color: #315d50;
        }

        .actual-end-heading strong,
        .actual-end-heading span {
          display: block;
        }

        .actual-end-heading strong {
          font-size: 11px;
          font-weight: 950;
        }

        .actual-end-heading span {
          margin-top: 2px;
          color: #7d8d87;
          font-size: 9px;
        }

        .completion-repeat-note {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 10px;
          padding: 9px 11px;
          border-radius: 12px;
          background: #fff5f5;
          color: #8b4949;
          font-size: 10px;
          font-weight: 800;
        }

        .quran-range-editor {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 34px minmax(0, 1fr);
          gap: 10px;
          align-items: end;
        }

        .quran-range-side {
          border: 1px solid #e3ebe7;
          border-radius: 16px;
          padding: 12px;
          background: #fbfdfc;
        }

        .quran-range-side-title {
          display: block;
          margin-bottom: 8px;
          color: #3f6257;
          font-size: 11px;
          font-weight: 900;
        }

        .quran-range-fields {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(90px, .65fr);
          gap: 8px;
        }

        .quran-range-arrow {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          color: #9a7b35;
          background: rgba(201, 166, 88, 0.12);
          margin-bottom: 20px;
        }

        .range-metric-preview {
          margin-top: 10px;
          border-radius: 15px;
          border: 1px solid #e3ebe7;
          min-height: 48px;
        }

        .range-metric-preview.empty,
        .range-metric-preview.loading {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 11px 13px;
          color: #72817c;
          background: #fbfdfc;
          font-size: 12px;
        }

        .range-metric-preview.ready {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
          gap: 8px;
          padding: 10px;
          background: linear-gradient(135deg, rgba(239, 248, 244, .9), rgba(255,255,255,.98));
        }

        .range-metric-preview.ready > div:not(.range-source-chip) {
          padding: 7px 9px;
          border-radius: 11px;
          background: rgba(255,255,255,.88);
        }

        .range-metric-preview.ready span,
        .range-metric-preview.ready strong {
          display: block;
        }

        .range-metric-preview.ready span {
          color: #71817b;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .range-metric-preview.ready strong {
          color: #163f34;
          font-size: 12px;
          font-weight: 900;
        }

        .range-source-chip {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 0 9px;
          border-radius: 11px;
          color: #7b632b;
          background: rgba(201,166,88,.11);
          font-size: 10px;
          font-weight: 900;
        }

        .precision-warning {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin-top: 8px;
          color: #7f6427;
          font-size: 11px;
          line-height: 1.6;
        }

        .secondary-side-details {
          border: 1px dashed #dbe6e1;
          border-radius: 16px;
          background: rgba(250,252,251,.75);
          padding: 0 14px;
          margin: 12px 0;
        }

        .secondary-side-details summary {
          min-height: 46px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #526b63;
          font-size: 12px;
          font-weight: 900;
        }

        .secondary-side-body {
          padding: 0 0 14px;
        }

        .quran-range-record {
          color: #173f34;
          font-size: 12px;
          font-weight: 900;
          line-height: 1.65;
        }

        @media (max-width: 760px) {
          .halaqa-session-card.launcher,
          .halaqa-session-top {
            align-items: stretch;
            flex-direction: column;
          }

          .halaqa-session-actions,
          .halaqa-session-launch-controls {
            width: 100%;
          }

          .halaqa-session-launch-controls select,
          .halaqa-session-launch-controls input,
          .session-start-button,
          .session-resume-button,
          .session-absent-button {
            flex: 1 1 150px;
          }

          .session-modal-progress {
            grid-template-columns: 1fr;
          }

          .completion-status-options {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .completion-status-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .planned-quran-task-head {
            align-items: flex-start;
            flex-direction: column;
          }

          .planned-quran-speed {
            align-self: flex-start;
          }

          .quran-range-editor {
            grid-template-columns: 1fr;
          }

          .quran-range-arrow {
            transform: rotate(-90deg);
            margin: -2px auto;
          }

          .quran-range-fields {
            grid-template-columns: 1fr 92px;
          }

          .range-metric-preview.ready {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .range-source-chip {
            min-height: 38px;
            justify-content: center;
          }
        }
      `}
    </style>
  );
}
const assignments=[{halaqa_id:1,halaqa_name:'حلقة القرآن',mosque_name:'المسجد الأول',teacher_role:'main',halaqa_period:'after_asr'},{halaqa_id:2,halaqa_name:'حلقة المراجعة',mosque_name:'المسجد الثاني',teacher_role:'assistant',halaqa_period:'after_maghrib'}];
function Rows(){return <table className="header-review-table"><thead><tr><th>الطالب</th><th>الحضور</th><th>التسميع</th></tr></thead><tbody>{['طالب أول','طالب ثان','طالب ثالث','طالب رابع'].map(name=><tr key={name}><td>{name}</td><td>حاضر</td><td>تم التسجيل</td></tr>)}</tbody></table>}
function Frame({mobile}){const[active,setActive]=useState(1);const[message,setMessage]=useState('');const halaqat=assignments;const refreshing=false;const loadData=()=>setMessage('تم تحديث المعاينة');const openCreate=program=>setMessage(program==='quran'?'تم اختيار تسميع القرآن':'تم اختيار تسميع النورانية');return <section id={mobile?'mobile-review':'desktop-review'} className={'header-review-frame '+(mobile?'header-review-mobile':'')}><p className="header-review-caption">{mobile?'لوحة المعلم · عرض ضيق':'التسميع · الحاسوب'}</p><div className={mobile?'td-dashboard':'recitations-page'}>{mobile?<TeacherHero teacher={{full_name:'أحمد محمد'}} assignments={assignments} activeHalaqaId={active} onHalaqaChange={setActive} assignment={assignments.find(row=>row.halaqa_id===active)} stats={{studentsCount:18,presentCount:14,recitationsCount:8}}/>:<CompactPageHeader title="التسميع" actions={<>
<div
          className="hero-actions"
        >
          <button
            type="button"
            className="refresh-button"
            onClick={() =>
              loadData(true)
            }
            disabled={
              refreshing
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            <span>
              تحديث
            </span>
          </button>

          <button
            type="button"
            className="create-button quran"
            onClick={() =>
              openCreate(
                "quran"
              )
            }
            disabled={
              halaqat.length ===
              0
            }
          >
            <BookOpen
              size={16}
            />

            <span>
              إضافة تسميع قرآن
            </span>
          </button>

          <button
            type="button"
            className="create-button noorania"
            onClick={() =>
              openCreate(
                "noorania"
              )
            }
            disabled={
              halaqat.length ===
              0
            }
          >
            <LibraryBig
              size={16}
            />

            <span>
              إضافة تسميع نورانية
            </span>
          </button>
        </div>
</>} />}<p className="header-review-status" role="status">{message}</p><Rows/>{!mobile&&<div className="header-legacy-baseline" aria-hidden="true" inert><section
        className="recitations-hero"
      >
        <div
          className="hero-main"
        >
          <div
            className="hero-icon"
          >
            <BookOpen
              size={24}
            />
          </div>

          <div>
            <div
              className="hero-eyebrow"
            >
              <ShieldCheck
                size={13}
              />

              بوابة المعلم
            </div>

            <h1>
              التسميع
            </h1>

            <p>
              تسجيل سريع وواضح للقرآن والقاعدة النورانية،
              بدون إدخال «من سورة / من آية / إلى سورة / إلى آية» في الجلسة اليومية.
            </p>
          </div>
        </div>

        <div
          className="hero-actions"
        >
          <button
            type="button"
            className="refresh-button"
            onClick={() =>
              loadData(true)
            }
            disabled={
              refreshing
            }
          >
            <RefreshCw
              size={16}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            <span>
              تحديث
            </span>
          </button>

          <button
            type="button"
            className="create-button quran"
            onClick={() =>
              openCreate(
                "quran"
              )
            }
            disabled={
              halaqat.length ===
              0
            }
          >
            <BookOpen
              size={16}
            />

            <span>
              إضافة تسميع قرآن
            </span>
          </button>

          <button
            type="button"
            className="create-button noorania"
            onClick={() =>
              openCreate(
                "noorania"
              )
            }
            disabled={
              halaqat.length ===
              0
            }
          >
            <LibraryBig
              size={16}
            />

            <span>
              إضافة تسميع نورانية
            </span>
          </button>
        </div>
      </section></div>}</div></section>}
function Preview(){return <><PageStyles/><style>{".header-review{max-width:1320px;margin:auto;padding:24px;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:24px}.header-review-frame{padding:20px;background:white;border-radius:12px;position:relative;min-width:0}.header-review-caption{font-size:12px;color:#728576;margin:0 0 12px}.header-review-mobile{padding:14px}.header-review-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:16px}.header-review-table th,.header-review-table td{font-size:12px;text-align:right;padding:14px 10px;border-bottom:1px solid #edf2ee}.header-review-table th{color:#748679;background:#f7faf8}.header-review-status{min-height:18px;font-size:12px;color:#527b61;margin:8px 0}.header-legacy-baseline{position:absolute;left:-10000px;visibility:hidden;pointer-events:none;width:calc(100% - 40px)}@media(max-width:1000px){.header-review{display:flex;flex-direction:column}.header-review-mobile{width:360px;max-width:100%}}"}</style><main className="header-review" dir="rtl"><Frame/><Frame mobile/></main></>}
createRoot(document.getElementById('root')).render(<Preview/>);
