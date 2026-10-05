import {displayDateFormatter} from "../../lib/calendar";
import {
  Clock3,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";

function formatUpdateTime(date) {
  if (!date) {
    return "—";
  }

  return displayDateFormatter(
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

export default function PageFooter({
  totalStudents = 0,
  currentPage = 0,
  totalPages = 0,
  secondsLeft = 40,
  pageLabel = "0",
  lastUpdatedAt,
}) {
  const progress =
    Math.max(
      0,
      Math.min(
        100,
        (secondsLeft / 40) * 100
      )
    );

  return (
    <footer className="tv-footer">
      <div className="tv-footer__stats">
        <div className="tv-footer__item">
          <Users size={17} />

          <span>
            إجمالي الطلاب
          </span>

          <strong>
            {totalStudents}
          </strong>
        </div>

        <div className="tv-footer__divider" />

        <div className="tv-footer__item">
          <Trophy size={17} />

          <span>
            المعروض
          </span>

          <strong>
            {pageLabel}
          </strong>
        </div>

        <div className="tv-footer__divider" />

        <div className="tv-footer__item">
          <RefreshCw size={17} />

          <span>
            آخر تحديث
          </span>

          <strong>
            {formatUpdateTime(
              lastUpdatedAt
            )}
          </strong>
        </div>
      </div>

      <div className="tv-footer__pagination">
        <div className="tv-footer__page">
          الصفحة
          <strong>
            {currentPage}
          </strong>
          من
          <strong>
            {totalPages}
          </strong>
        </div>

        <div className="tv-countdown">
          <div className="tv-countdown__meta">
            <span>
              <Clock3 size={15} />
              الانتقال التالي
            </span>

            <strong>
              {secondsLeft} ث
            </strong>
          </div>

          <div className="tv-countdown__track">
            <div
              className="tv-countdown__progress"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
