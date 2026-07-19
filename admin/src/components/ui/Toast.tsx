import toast from "react-hot-toast";
import { X, CheckCircle2, AlertTriangle, Info, Loader2 } from "lucide-react";

type ToastVariant = "success" | "error" | "info" | "loading";

const iconMap = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const colorMap = {
  success: "#22c55e",
  error: "#ef4444",
  info: "#3b82f6",
  loading: "#6b7280",
};

export function showToast(message: string, variant: ToastVariant = "info", duration = 4000) {
  const Icon = iconMap[variant];
  const color = colorMap[variant];
  const id = toast(
    (t) => (
      <div
        style={{
          borderRadius: 20,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.45)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          minWidth: 300,
          maxWidth: 420,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: color + "18",
            flexShrink: 0,
          }}
        >
          <Icon
            className={variant === "loading" ? "animate-spin" : ""}
            style={{ width: 16, height: 16, color }}
          />
        </div>
        <span style={{ fontSize: 14, fontWeight: 500, color: "#1f2937", lineHeight: 1.4, flex: 1 }}>
          {message}
        </span>
        <button
          onClick={() => toast.dismiss(t.id)}
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#9ca3af",
            flexShrink: 0,
          }}
        >
          <X style={{ width: 14, height: 14 }} />
        </button>
      </div>
    ),
    { duration }
  );
  return id;
}

export { toast };
