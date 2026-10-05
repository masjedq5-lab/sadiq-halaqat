import CalendarInput from "./CalendarInput";
export default function FormField({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
  required = false,
  disabled = false,
  icon: Icon,
}) {
  const Input = type === "date" ? CalendarInput : "input";
  return (
    <div style={{ minWidth: 0 }}>
      <label
        style={{
          display: "block",
          marginBottom: "7px",
          color: "#465149",
          fontSize: "calc(12px * var(--app-font-scale,1))",
          fontWeight: "700",
        }}
      >
        {label}

        {required && (
          <span
            style={{
              color: "#b42318",
              marginRight: "4px",
            }}
          >
            *
          </span>
        )}
      </label>

      <div
        style={{
          position: "relative",
        }}
      >
        {Icon && (
          <Icon
            size={17}
            strokeWidth={1.7}
            style={{
              position: "absolute",
              right: "13px",
              top: "50%",
              transform:
                "translateY(-50%)",
              color: "#89918b",
              pointerEvents: "none",
            }}
          />
        )}

        <Input
          type={type}
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          style={{
            width: "100%",
            height: "48px",
            padding: (Icon) ? ("0 calc(42px * var(--app-density,1)) 0 calc(13px * var(--app-density,1))") : ("0 calc(13px * var(--app-density,1))"),
            boxSizing: "border-box",
            border:
              "1px solid #d9dfdb",
            borderRadius: "calc(11px * var(--app-radius-scale,1))",
            outline: "none",
            background:
              disabled
                ? "#f5f6f5"
                : "#fff",
            color: "#26332c",
            fontSize: "calc(13px * var(--app-font-scale,1))",
            direction: "rtl",
          }}
        />
      </div>
    </div>
  );
}
