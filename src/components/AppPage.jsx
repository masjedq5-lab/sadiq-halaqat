import CompactPageHeader from "./CompactPageHeader";
import { theme } from "../styles/theme";

export default function AppPage({
  title,
  description,
  actions,
  stats,
  children,
  width = "1600px",
}) {
  return (
    <div
      style={{
        maxWidth: width,
        margin: "0 auto",
        width: "100%",
        padding: theme.layout.pagePadding,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}

      {(title || description || actions) && (
        <CompactPageHeader title={title} actions={actions} />
      )}

      {/* Stats */}

      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: "calc(20px * var(--app-density,1))",
            marginBottom: 24,
          }}
        >
          {stats}
        </div>
      )}

      {/* Content */}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: theme.layout.sectionGap,
        }}
      >
        {children}
      </div>
    </div>
  );
}