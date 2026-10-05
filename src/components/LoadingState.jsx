export default function LoadingState({
  message = "جاري التحميل...",
  minHeight = "220px",
}) {
  return (
    <div className="sadiq-loading-state"
      style={{
        width: "100%",
        minHeight,
        background: "#fff",
        border: "1px solid #e5e9e6",
        borderRadius: "calc(18px * var(--app-radius-scale,1))",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#7d8781",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          border: "3px solid #e1e8e3",
          borderTopColor: "#0f5132",
          borderRadius: "50%",
          animation:
            "sharedLoadingSpin .8s linear infinite",
        }}
      />

      <div
        style={{
          marginTop: "12px",
          fontSize: "calc(12px * var(--app-font-scale,1))",
        }}
      >
        {message}
      </div>

      <style>
        {`
          @keyframes sharedLoadingSpin {
            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
    </div>
  );
}