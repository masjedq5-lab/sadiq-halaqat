import {displayDateFormatter} from "../lib/calendar";
import Ornament, { OrnamentScene } from '../components/ornaments/Ornament';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Award,
  Clock3,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { supabase } from "../lib/supabase";
import { showToast } from "../components/Toast";

import HalaqaFilter from "../components/tv/HalaqaFilter";
import TopThreePodium from "../components/tv/TopThreePodium";
import LeaderboardTable from "../components/tv/LeaderboardTable";
import QuoteBanner from "../components/tv/QuoteBanner";
import PageFooter from "../components/tv/PageFooter";

import "../styles/TVLeaderboardPage.css";



const PAGE_DURATION = 25;
const DATA_REFRESH_INTERVAL = 60 * 1000;

const QUOTES = [
  "خيركم من تعلم القرآن وعلمه",
  "أهل القرآن هم أهل الله وخاصته",
  "كل آية تحفظها ترفعك درجة",
  "اجعل القرآن ربيع قلبك",
  "من سار على الدرب وصل",
  "بالقرآن تسمو الهمم وتطمئن القلوب",
  "رفيق القرآن لا يضل طريقه",
  "خطوة اليوم في الحفظ، ثمرة العمر غداً",
];

function buildPageRanges(total) {
  if (total <= 0) return [];

  const ranges = [];

  ranges.push({
    start: 0,
    end: Math.min(10, total),
  });

  let start = 10;

  while (start < total) {
    ranges.push({
      start,
      end: Math.min(start + 20, total),
    });

    start += 20;
  }

  return ranges;
}

function formatTime(date) {
  return displayDateFormatter( {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(date) {
  return displayDateFormatter( {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}


function IlluminatedCorner({ className = "" }) {
  return <Ornament name="07-rukn" className={`${className} sq-tv-corner`} />;
}

export default function TVLeaderboardPage() {
  const [halaqat, setHalaqat] = useState([]);
  const [selectedHalaqatIds, setSelectedHalaqatIds] = useState([]);

  const [students, setStudents] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [currentPage, setCurrentPage] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PAGE_DURATION);

  const [now, setNow] = useState(new Date());
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchHalaqat = useCallback(async () => {
    const { data, error } = await supabase
      .from("halaqat")
      .select("id, name, status")
      .order("name", {
        ascending: true,
      });

    if (error) {
      console.error("TV halaqat error:", error);
      throw error;
    }

    setHalaqat(data || []);
  }, []);

  const fetchStudents = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        /*
          نقرأ روابط الطلاب الحالية أولاً.
          هذه الطريقة أكثر أماناً من الاعتماد على اسم FK محدد
          داخل Supabase.
        */
        let linksQuery = supabase
          .from("student_halaqat")
          .select("student_id, halaqa_id")
          .eq("is_current", true);

        if (selectedHalaqatIds.length > 0) {
          linksQuery = linksQuery.in(
            "halaqa_id",
            selectedHalaqatIds
          );
        }

        const {
          data: links,
          error: linksError,
        } = await linksQuery;

        if (linksError) throw linksError;

        if (!links?.length) {
          setStudents([]);
          setCurrentPage(0);
          setSecondsLeft(PAGE_DURATION);
          setLastUpdatedAt(new Date());
          return;
        }

        const studentIds = [
          ...new Set(
            links
              .map((item) => item.student_id)
              .filter(Boolean)
          ),
        ];

        const halaqaIds = [
          ...new Set(
            links
              .map((item) => item.halaqa_id)
              .filter(Boolean)
          ),
        ];

        const [
          profilesResult,
          halaqatResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select(
              "id, full_name, total_points"
            )
            .in("id", studentIds),

          supabase
            .from("halaqat")
            .select("id, name")
            .in("id", halaqaIds),
        ]);

        if (profilesResult.error) {
          throw profilesResult.error;
        }

        if (halaqatResult.error) {
          throw halaqatResult.error;
        }

        const profilesMap = new Map(
          (profilesResult.data || []).map(
            (profile) => [
              profile.id,
              profile,
            ]
          )
        );

        const halaqatMap = new Map(
          (halaqatResult.data || []).map(
            (halaqa) => [
              halaqa.id,
              halaqa,
            ]
          )
        );

        /*
          لو كان الطالب مرتبطاً بأكثر من حلقة حالية - لأي سبب -
          نظهره مرة واحدة فقط.
        */
        const studentsMap = new Map();

        links.forEach((link) => {
          if (
            studentsMap.has(link.student_id)
          ) {
            return;
          }

          const profile = profilesMap.get(
            link.student_id
          );

          if (!profile) return;

          const halaqa = halaqatMap.get(
            link.halaqa_id
          );

          studentsMap.set(
            link.student_id,
            {
              id: profile.id,
              full_name:
                profile.full_name ||
                "طالب بدون اسم",
              total_points: Number(
                profile.total_points || 0
              ),
              halaqa_id: link.halaqa_id,
              halaqa_name:
                halaqa?.name ||
                "بدون حلقة",
            }
          );
        });

        const sorted = Array.from(
          studentsMap.values()
        ).sort((a, b) => {
          const pointsDifference =
            b.total_points -
            a.total_points;

          if (pointsDifference !== 0) {
            return pointsDifference;
          }

          return a.full_name.localeCompare(
            b.full_name,
            "ar"
          );
        });

        /*
          الترتيب الرسمي.
          في حالة التساوي بالنقاط، يُحسم أبجدياً.
        */
        const ranked = sorted.map(
          (student, index) => ({
            ...student,
            rank: index + 1,
          })
        );

        setStudents(ranked);
        setCurrentPage(0);
        setSecondsLeft(PAGE_DURATION);
        setLastUpdatedAt(new Date());
      } catch (error) {
        console.error(
          "TV leaderboard error:",
          error
        );

        showToast(
          "تعذر تحميل بيانات لوحة الشرف.",
          "error"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedHalaqatIds]
  );

  useEffect(() => {
    async function initialize() {
      try {
        await fetchHalaqat();
      } catch (error) {
        showToast(
          "تعذر تحميل قائمة الحلقات.",
          "error"
        );
      }
    }

    initialize();
  }, [fetchHalaqat]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  /*
    تحديث الساعة كل ثانية.
  */
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /*
    تحديث البيانات تلقائياً كل دقيقة بدون إزعاج الشاشة.
  */
  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchStudents({
        silent: true,
      });
    }, DATA_REFRESH_INTERVAL);

    return () => {
      window.clearInterval(interval);
    };
  }, [fetchStudents]);

  const pageRanges = useMemo(
    () => buildPageRanges(students.length),
    [students.length]
  );

  /*
    إذا تغير عدد الطلاب وصار رقم الصفحة الحالي غير موجود.
  */
  useEffect(() => {
    if (
      pageRanges.length > 0 &&
      currentPage >= pageRanges.length
    ) {
      setCurrentPage(0);
      setSecondsLeft(PAGE_DURATION);
    }
  }, [
    currentPage,
    pageRanges.length,
  ]);

  /*
    العد التنازلي والتنقل بين الصفحات.
  */
  useEffect(() => {
    if (pageRanges.length <= 1) {
      setSecondsLeft(PAGE_DURATION);
      return undefined;
    }

    const interval = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          setCurrentPage(
            (page) =>
              (page + 1) %
              pageRanges.length
          );

          setQuoteIndex(
            (index) =>
              (index + 1) %
              QUOTES.length
          );

          return PAGE_DURATION;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [pageRanges.length]);

  const currentRange =
    pageRanges[currentPage] || {
      start: 0,
      end: 0,
    };

  const isFirstPage =
    currentPage === 0;

  const podiumStudents =
    students.slice(0, 3);

  const visibleStudents =
    isFirstPage
      ? students.slice(
          Math.max(3, currentRange.start),
          currentRange.end
        )
      : students.slice(
          currentRange.start,
          currentRange.end
        );

  const halaqaOptions = useMemo(
    () =>
      halaqat.map((halaqa) => ({
        value: halaqa.id,
        label: halaqa.name,
      })),
    [halaqat]
  );

  const handleHalaqaChange = (
    newValue
  ) => {
    setSelectedHalaqatIds(
      Array.isArray(newValue)
        ? newValue
        : []
    );

    setCurrentPage(0);
    setSecondsLeft(PAGE_DURATION);
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        const target = document.querySelector(".tv-page");
        if (!target) throw new Error("TV page not found");
        await target.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error(error);

      showToast(
        "تعذر تشغيل وضع ملء الشاشة.",
        "error"
      );
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        Boolean(document.fullscreenElement)
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  const currentPageLabel =
    currentRange.end > 0
      ? `${currentRange.start + 1} - ${
          currentRange.end
        }`
      : "0";

  return (
    <div
      className="tv-page"
      dir="rtl"
    >
      <OrnamentScene variant="tv" palette="emerald" primary="03-falak" secondary="02-shams" />

      <IlluminatedCorner className="tv-illumination tv-illumination--tr" />
      <IlluminatedCorner className="tv-illumination tv-illumination--tl" />
      <IlluminatedCorner className="tv-illumination tv-illumination--br" />
      <IlluminatedCorner className="tv-illumination tv-illumination--bl" />

      <main className="tv-shell">
        <header className="tv-header">
          <OrnamentScene primary="02-shams" />
          <div className="tv-header__brand">
            <div className="tv-header__logo">
              <Trophy
                size={34}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <div className="tv-header__eyebrow">
                <Sparkles size={15} />
                برنامج الصِّدّيق
              </div>

              <h1>
                لوحة شرف طلاب الصِّدّيق
              </h1>

              <p>
                تنافسٌ في الخير • وارتقاءٌ
                مع كتاب الله
              </p>
            </div>
          </div>

          <div className="tv-header__actions">
            <div className="tv-clock-card">
              <Clock3 size={20} />

              <div>
                <strong>
                  {formatTime(now)}
                </strong>

                <span>
                  {formatDate(now)}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="tv-icon-button"
              onClick={() =>
                fetchStudents({
                  silent: true,
                })
              }
              disabled={refreshing}
              title="تحديث البيانات"
            >
              <RefreshCw
                size={20}
                className={
                  refreshing
                    ? "tv-spin"
                    : ""
                }
              />
            </button>

            <button
              type="button"
              className="tv-icon-button"
              onClick={toggleFullscreen}
              title="ملء الشاشة"
            >
              {isFullscreen ? (
                <Minimize2 size={20} />
              ) : (
                <Maximize2 size={20} />
              )}
            </button>
          </div>
        </header>

        <section className="tv-toolbar">
          <div className="tv-toolbar__filter">
            <div className="tv-section-label">
              <Award size={18} />
              نطاق لوحة الشرف
            </div>

            <HalaqaFilter
              value={selectedHalaqatIds}
              onChange={handleHalaqaChange}
              options={halaqaOptions}
            />
          </div>

          <div className="tv-toolbar__summary">
            <div className="tv-mini-stat">
              <Users size={19} />

              <div>
                <span>
                  الطلاب
                </span>

                <strong>
                  {students.length}
                </strong>
              </div>
            </div>

            <div className="tv-mini-stat">
              <Trophy size={19} />

              <div>
                <span>
                  أعلى نقاط
                </span>

                <strong>
                  {students[0]
                    ?.total_points || 0}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <QuoteBanner
          quote={QUOTES[quoteIndex]}
        />

        {loading ? (
          <div className="tv-state-card">
            <div className="tv-loader" />

            <strong>
              جارٍ إعداد لوحة الشرف
            </strong>

            <span>
              يتم تحميل الطلاب وترتيب
              النقاط...
            </span>
          </div>
        ) : students.length === 0 ? (
          <div className="tv-state-card">
            <Trophy
              size={48}
              strokeWidth={1.5}
            />

            <strong>
              لا توجد بيانات للعرض
            </strong>

            <span>
              لا يوجد طلاب مرتبطون
              بالحلقات المحددة حالياً.
            </span>
          </div>
        ) : (
          <>
            {isFirstPage &&
              podiumStudents.length >
                0 && (
                <TopThreePodium
                  students={
                    podiumStudents
                  }
                />
              )}

            <LeaderboardTable
              students={
                visibleStudents
              }
              compact={!isFirstPage}
            />
          </>
        )}

        <PageFooter
          totalStudents={students.length}
          currentPage={
            pageRanges.length
              ? currentPage + 1
              : 0
          }
          totalPages={pageRanges.length}
          secondsLeft={secondsLeft}
          pageLabel={currentPageLabel}
          lastUpdatedAt={
            lastUpdatedAt
          }
        />
      </main>

      <style>{`
        /* =========================================================
           الصِّدّيق TV — ILLUMINATED MANUSCRIPT EDITION
           Visual layer only. No data/query/ranking behavior changed.
           ========================================================= */

        .tv-page {
          --tv-ink: #123f34;
          --tv-ink-deep: #062f28;
          --tv-green: #075444;
          --tv-green-2: #0b6954;
          --tv-gold: #b78a2b;
          --tv-gold-light: #e5c86f;
          --tv-paper: #fbfaf5;
          --tv-paper-2: #f5f0e4;
          --tv-line: rgba(135, 105, 38, .20);
          position: relative;
          isolation: isolate;
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(circle at 50% -10%, rgba(211,181,102,.16), transparent 34%),
            radial-gradient(circle at 92% 12%, rgba(7,84,68,.13), transparent 28%),
            radial-gradient(circle at 8% 88%, rgba(183,138,43,.10), transparent 30%),
            linear-gradient(145deg, #f7f4ea 0%, #fcfbf7 45%, #f2eee2 100%) !important;
          color: var(--tv-ink);
        }

        /* ورق مخطوط هادئ بدلاً من خلفية ألعاب أو neon */
        .tv-page::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -4;
          pointer-events: none;
          opacity: .28;
          background-image:
            repeating-linear-gradient(
              0deg,
              rgba(92,70,28,.025) 0,
              rgba(92,70,28,.025) 1px,
              transparent 1px,
              transparent 4px
            );
          mix-blend-mode: multiply;
        }

        /* إطار مستوحى من تذهيب صفحات المخطوطات */
        .tv-page::after {
          content: "";
          position: fixed;
          inset: 13px;
          z-index: 2;
          pointer-events: none;
          border: 1px solid rgba(171,128,34,.34);
          border-radius: 24px;
          box-shadow:
            inset 0 0 0 4px rgba(255,255,255,.62),
            inset 0 0 0 5px rgba(171,128,34,.10);
        }

        .tv-background-pattern {
          pointer-events: none !important;
          filter: sepia(.22) saturate(.75) contrast(.9) !important;
          opacity: .075 !important;
          background-repeat: no-repeat !important;
          background-size: contain !important;
          mix-blend-mode: multiply;
        }

        .tv-background-pattern--one {
          width: min(31vw, 520px) !important;
          height: min(31vw, 520px) !important;
          top: -9vw !important;
          right: -8vw !important;
          transform: rotate(8deg);
        }

        .tv-background-pattern--two {
          width: min(28vw, 460px) !important;
          height: min(28vw, 460px) !important;
          left: -7vw !important;
          bottom: -8vw !important;
          transform: rotate(180deg);
        }

        .tv-page__glow {
          opacity: .14 !important;
          filter: blur(90px) !important;
        }

        .tv-page__glow--one {
          background: #b78a2b !important;
        }

        .tv-page__glow--two {
          background: #0b6954 !important;
        }

        .tv-shell {
          position: relative;
          z-index: 3;
          width: 100% !important;
          min-height: calc(100dvh - 38px);
          margin: 19px auto !important;
          padding: clamp(16px, 1.65vw, 30px) !important;
          border: 1px solid rgba(160,124,43,.18);
          border-radius: 25px;
          background:
            linear-gradient(rgba(255,255,255,.80), rgba(255,255,255,.80)),
            linear-gradient(135deg, rgba(214,191,126,.10), transparent 42%);
          box-shadow:
            0 30px 90px rgba(24,49,39,.09),
            inset 0 1px 0 rgba(255,255,255,.95);
          backdrop-filter: blur(7px);
        }

        /* الهيدر: رسمي، هادئ، أقرب إلى واجهة مؤسسة */
        .tv-header {
          position: relative;
          overflow: hidden;
          padding: clamp(16px, 1.55vw, 25px) !important;
          border: 1px solid rgba(201,166,73,.35) !important;
          border-radius: 20px !important;
          background:
            linear-gradient(118deg, rgba(5,52,43,.985), rgba(7,82,66,.975) 66%, rgba(5,57,47,.985)) !important;
          box-shadow: 0 16px 38px rgba(6,60,49,.13) !important;
        }

        .tv-header::before {
          content: none;
        }

        .tv-header::after {
          content: "";
          position: absolute;
          right: 0;
          left: 0;
          bottom: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent 3%, #a97e22 24%, #ead486 50%, #a97e22 76%, transparent 97%);
          opacity: .76;
        }

        .tv-header__brand,
        .tv-header__actions {
          position: relative;
          z-index: 1;
        }

        .tv-header__logo {
          position: relative;
          width: 58px !important;
          height: 58px !important;
          border-radius: 16px !important;
          color: #f0d477 !important;
          border: 1px solid rgba(235,207,121,.34) !important;
          background:
            linear-gradient(145deg, rgba(255,255,255,.10), rgba(255,255,255,.035)) !important;
          box-shadow:
            inset 0 0 0 4px rgba(255,255,255,.025),
            0 10px 24px rgba(0,0,0,.12) !important;
        }

        .tv-header__logo::after {
          content: "";
          position: absolute;
          inset: 6px;
          border: 1px solid rgba(236,207,116,.18);
          border-radius: 11px;
        }

        .tv-header__eyebrow {
          color: #e6c86e !important;
          letter-spacing: .02em;
          font-size: clamp(10px, .75vw, 13px) !important;
        }

        .tv-header h1 {
          margin-top: 4px !important;
          color: #fffdf7 !important;
          font-size: clamp(25px, 2.2vw, 39px) !important;
          font-weight: 900 !important;
          letter-spacing: -.025em;
          text-shadow: none !important;
        }

        .tv-header p {
          color: rgba(255,255,255,.68) !important;
          font-size: clamp(10px, .8vw, 14px) !important;
          letter-spacing: .01em;
        }

        .tv-clock-card,
        .tv-icon-button {
          border: 1px solid rgba(255,255,255,.14) !important;
          background: rgba(255,255,255,.075) !important;
          color: #fff !important;
          box-shadow: none !important;
          backdrop-filter: blur(8px);
        }

        .tv-clock-card {
          border-radius: 13px !important;
        }

        .tv-clock-card svg {
          color: #e4c669 !important;
        }

        .tv-clock-card span {
          color: rgba(255,255,255,.61) !important;
        }

        .tv-icon-button {
          border-radius: 12px !important;
          transition: background .18s ease, border-color .18s ease, transform .18s ease !important;
        }

        .tv-icon-button:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(230,201,110,.40) !important;
          background: rgba(255,255,255,.12) !important;
        }

        /* شريط النطاق: كرت إداري لا شريط ألعاب */
        .tv-toolbar {
          margin-top: 12px !important;
          padding: 11px 13px !important;
          border: 1px solid rgba(29,77,62,.12) !important;
          border-radius: 16px !important;
          background: rgba(255,255,255,.88) !important;
          box-shadow: 0 7px 22px rgba(27,61,49,.045) !important;
        }

        .tv-section-label {
          color: #284f42 !important;
          font-weight: 850 !important;
        }

        .tv-section-label svg {
          color: #ad8427 !important;
        }

        .tv-mini-stat {
          border: 1px solid rgba(32,82,65,.10) !important;
          border-radius: 12px !important;
          background: #f8faf7 !important;
          box-shadow: none !important;
        }

        .tv-mini-stat svg {
          color: #a98022 !important;
        }

        .tv-mini-stat span {
          color: #7f8d86 !important;
        }

        .tv-mini-stat strong {
          color: #164b3c !important;
        }

        /* أي مكونات داخلية موجودة في ملفات منفصلة:
           نوحّد لغتها البصرية بدون تغيير منطقها */
        .tv-page [class*="quote"] {
          border-color: rgba(182,139,42,.22) !important;
          box-shadow: none !important;
        }

        .tv-page [class*="podium"] {
          filter: saturate(.88);
        }

        .tv-page [class*="podium"] [class*="card"],
        .tv-page [class*="leaderboard"] [class*="card"],
        .tv-page [class*="table"] {
          border-color: rgba(28,76,61,.12) !important;
          box-shadow: 0 9px 28px rgba(25,62,49,.05) !important;
        }

        .tv-page [class*="leaderboard"] thead,
        .tv-page [class*="table"] thead {
          background: #f1f5f1 !important;
          color: #456157 !important;
        }

        .tv-page [class*="leaderboard"] tbody tr:nth-child(even),
        .tv-page [class*="table"] tbody tr:nth-child(even) {
          background: rgba(247,249,246,.82) !important;
        }

        .tv-page [class*="leaderboard"] tbody tr:hover,
        .tv-page [class*="table"] tbody tr:hover {
          background: #f4f8f4 !important;
        }

        .tv-state-card {
          min-height: 290px !important;
          border: 1px solid rgba(34,79,64,.12) !important;
          border-radius: 18px !important;
          background: rgba(255,255,255,.86) !important;
          color: #244c3f !important;
          box-shadow: 0 12px 34px rgba(29,63,51,.05) !important;
        }

        .tv-state-card > svg {
          color: #b2892d !important;
        }

        .tv-loader {
          border-color: rgba(11,101,80,.16) !important;
          border-top-color: #0b6954 !important;
        }

        /* زخرفة تذهيب نباتية حقيقية:
           palmette + split leaves + scrolling vine */
        .tv-illumination {
          position: fixed;
          z-index: 4;
          width: clamp(105px, 10vw, 180px);
          height: clamp(105px, 10vw, 180px);
          pointer-events: none;
          opacity: .28;
          color: #a77d21;
          filter: drop-shadow(0 2px 1px rgba(255,255,255,.55));
        }

        .tv-illumination--tr { top: 17px; right: 17px; }
        .tv-illumination--tl { top: 17px; left: 17px; transform: scaleX(-1); }
        .tv-illumination--br { bottom: 17px; right: 17px; transform: scaleY(-1); }
        .tv-illumination--bl { bottom: 17px; left: 17px; transform: scale(-1); }

        .tv-illumination .ill-vine {
          fill: none;
          stroke: currentColor;
          stroke-width: 1.45;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .tv-illumination .ill-leaf {
          fill: currentColor;
          opacity: .88;
        }

        .tv-illumination .ill-dot {
          fill: #0a6652;
          opacity: .62;
        }

        .tv-illumination .ill-fine {
          fill: none;
          stroke: currentColor;
          stroke-width: .75;
          opacity: .55;
        }

        /* تنعيم العناصر السفلية */
        .tv-page footer,
        .tv-page [class*="footer"] {
          border-color: rgba(36,79,65,.11) !important;
          color: #607269 !important;
        }

        @media (max-width: 900px) {
          .tv-page::after {
            inset: 7px;
            border-radius: 18px;
          }

          .tv-shell {
            width: 100% !important;
            margin: 11px auto !important;
            padding: 12px !important;
            border-radius: 18px;
          }

          .tv-header {
            padding: 15px !important;
          }

          .tv-illumination {
            width: 100px;
            height: 100px;
            opacity: .18;
          }

          .tv-illumination--tr,
          .tv-illumination--tl {
            top: 8px;
          }

          .tv-illumination--br,
          .tv-illumination--bl {
            bottom: 8px;
          }

          .tv-illumination--tr,
          .tv-illumination--br {
            right: 8px;
          }

          .tv-illumination--tl,
          .tv-illumination--bl {
            left: 8px;
          }
        }

        @media (max-width: 600px) {
          .tv-shell {
            width: 100% !important;
            margin: 7px auto !important;
            padding: 8px !important;
          }

          .tv-header {
            border-radius: 15px !important;
          }

          .tv-header__logo {
            width: 44px !important;
            height: 44px !important;
          }

          .tv-header h1 {
            font-size: 20px !important;
          }

          .tv-toolbar {
            border-radius: 13px !important;
          }

          .tv-illumination {
            width: 76px;
            height: 76px;
            opacity: .12;
          }
        }


        /* داخل لوحة الإدارة: لا نعتمد على 100vw حتى لا تُقص الصفحة بسبب الـ sidebar */
        .tv-page {
          width: 100% !important;
          max-width: 100% !important;
        }

        .tv-shell {
          box-sizing: border-box;
          max-width: 1760px !important;
        }

        /* ملء الشاشة الحقيقي للعرض فقط: يخرج .tv-page من AdminLayout تلقائياً */
        .tv-page:fullscreen,
        .tv-page:-webkit-full-screen {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          max-width: none !important;
          height: 100dvh !important;
          min-height: 100dvh !important;
          overflow: auto !important;
          padding: 0 !important;
          margin: 0 !important;
          background:
            radial-gradient(circle at 50% -10%, rgba(211,181,102,.16), transparent 34%),
            radial-gradient(circle at 92% 12%, rgba(7,84,68,.13), transparent 28%),
            radial-gradient(circle at 8% 88%, rgba(183,138,43,.10), transparent 30%),
            linear-gradient(145deg, #f7f4ea 0%, #fcfbf7 45%, #f2eee2 100%) !important;
        }

        .tv-page:fullscreen .tv-shell,
        .tv-page:-webkit-full-screen .tv-shell {
          width: calc(100vw - 28px) !important;
          max-width: none !important;
          min-height: calc(100dvh - 28px) !important;
          margin: 14px auto !important;
          padding: clamp(16px, 1.35vw, 28px) !important;
        }

        .tv-page:fullscreen::after,
        .tv-page:-webkit-full-screen::after {
          position: fixed;
          inset: 8px;
        }

        /* في الشاشة الكاملة نحافظ على المشهد كله داخل مساحة العرض قدر الإمكان */
        @media (min-width: 1200px) and (min-height: 720px) {
          .tv-page:fullscreen .tv-header,
          .tv-page:-webkit-full-screen .tv-header {
            padding-block: 17px !important;
          }

          .tv-page:fullscreen .tv-toolbar,
          .tv-page:-webkit-full-screen .tv-toolbar {
            margin-top: 9px !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .tv-page *,
          .tv-page *::before,
          .tv-page *::after {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .001ms !important;
          }
        }
      `}</style>
    </div>
  );
}
