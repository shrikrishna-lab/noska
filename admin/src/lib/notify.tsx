import type { ReactNode } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───

type NotifyType = "success" | "error" | "warning" | "info";

interface NotifyOptions {
  /** Optional action button rendered on the right side of the card. */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Duration in ms. Defaults to 4500 for success/info, 7000 for error/warning. */
  duration?: number;
  /** Unique id to prevent duplicates. */
  id?: string;
}

// ─── Config per type ───

const TYPE_CONFIG: Record<
  NotifyType,
  { icon: LucideIcon; accentVar: string; label: string }
> = {
  success: {
    icon: CheckCircle2,
    accentVar: "--color-success",
    label: "Success",
  },
  error: {
    icon: XCircle,
    accentVar: "--color-destructive",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    accentVar: "--color-warning",
    label: "Warning",
  },
  info: {
    icon: Info,
    accentVar: "--color-primary",
    label: "Info",
  },
};

const DEFAULT_DURATION: Record<NotifyType, number> = {
  success: 4500,
  error: 7000,
  warning: 6000,
  info: 4500,
};

// ─── Card renderer ───

function ToastCard({
  type,
  title,
  description,
  action,
}: {
  type: NotifyType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;

  return (
    <div className="noska-toast-card noska-toast-card--accent" data-accent={type}>
      {/* Color-coded left bar */}
      <div className="noska-toast-card__bar" data-type={type} />

      <div className="noska-toast-card__body">
        {/* Icon chip */}
        <span className="noska-toast-card__icon" data-type={type}>
          <Icon className="h-4 w-4" />
        </span>

        {/* Content */}
        <div className="noska-toast-card__content">
          <p className="noska-toast-card__title">{title}</p>
          {description && (
            <p className="noska-toast-card__desc">{description}</p>
          )}
        </div>

        {/* Optional action */}
        {action && (
          <button
            type="button"
            className="noska-toast-card__action"
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Public API ───

function notify(
  type: NotifyType,
  title: string,
  description?: string,
  opts?: NotifyOptions,
) {
  return toast.custom(
    (t) => (
      <ToastCard
        type={type}
        title={title}
        description={description}
        action={opts?.action}
      />
    ),
    {
      duration: opts?.duration ?? DEFAULT_DURATION[type],
      id: opts?.id,
      position: "bottom-right",
    },
  );
}

const notifyApi = {
  /** Green check + title + description + optional action */
  success: (title: string, description?: string, opts?: NotifyOptions) =>
    notify("success", title, description, opts),

  /** Red X + title + description + optional action. Longer duration. */
  error: (title: string, description?: string, opts?: NotifyOptions) =>
    notify("error", title, description, opts),

  /** Amber triangle + title + description + optional action */
  warning: (title: string, description?: string, opts?: NotifyOptions) =>
    notify("warning", title, description, opts),

  /** Blue info + title + description + optional action */
  info: (title: string, description?: string, opts?: NotifyOptions) =>
    notify("info", title, description, opts),

  /** Dismiss all toasts */
  dismiss: toast.dismiss,
  /** Dismiss a specific toast by id */
  dismissById: (id: string) => toast.dismiss(id),
  /** React-hot-toast loading helper (returns the update function) */
  loading: (message: string, id?: string) => toast.loading(message, { id }),
  /** Update a loading toast to success/error */
  resolve: (
    id: string,
    type: NotifyType,
    title: string,
    description?: string,
    opts?: NotifyOptions,
  ) => {
    toast.custom(
      (t) => (
        <ToastCard
          type={type}
          title={title}
          description={description}
          action={opts?.action}
        />
      ),
      { id, duration: opts?.duration ?? DEFAULT_DURATION[type] },
    );
  },
};

// ─── Inline success/error helpers (drop-in for toast.success / toast.error) ───
// These let call-sites upgrade gradually without touching the Toaster.

export function successToast(
  titleOrMessage: string,
  description?: string,
  opts?: NotifyOptions,
) {
  return notifyApi.success(titleOrMessage, description, opts);
}

export function errorToast(
  titleOrMessage: string,
  description?: string,
  opts?: NotifyOptions,
) {
  return notifyApi.error(titleOrMessage, description, opts);
}

export default notifyApi;
