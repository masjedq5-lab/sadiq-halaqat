export default function DashboardSkeleton() {
  return (
    <div className="teacher-dashboard td-skeleton" aria-busy="true">
      <div className="td-skeleton-line td-skeleton-title" />
      <div className="td-skeleton-heading" />

      <div className="td-skeleton-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="td-skeleton-card" key={index} />
        ))}
      </div>

      <div className="td-skeleton-actions" />

      <div className="td-two-column">
        <div className="td-skeleton-panel" />
        <div className="td-skeleton-panel" />
      </div>

      <div className="td-two-column">
        <div className="td-skeleton-panel td-skeleton-panel--tall" />
        <div className="td-skeleton-panel td-skeleton-panel--tall" />
      </div>
    </div>
  );
}
