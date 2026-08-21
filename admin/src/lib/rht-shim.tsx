// Shim for "react-hot-toast". Vite aliases the bare specifier here so every
// existing `toast.success(...)` / `toast.error(...)` call site in the app
// automatically mirrors onto the Dynamic Island (via islandToastBridge)
// while still behaving exactly like the real library.
//
// The real package is reached through the "react-hot-toast/original" alias.
// @ts-ignore -- aliased path has no type declarations
import RHT, {
  Toaster as RealToaster,
  resolveValue,
  useToaster,
  useToasterStore,
  CheckmarkIcon,
  ErrorIcon,
  LoaderIcon,
} from "react-hot-toast/original";
import { emitToIsland } from "./islandToastBridge";

type ToastType = "success" | "error" | "warning" | "info";

function mirror(type: ToastType, message?: unknown): void {
  if (typeof message === "string") emitToIsland(type, message);
}

const wrappedToast = {
  ...RHT,
  success(message?: unknown, opts?: Parameters<typeof RHT.success>[1]) {
    mirror("success", message);
    return RHT.success(message as never, opts);
  },
  error(message?: unknown, opts?: Parameters<typeof RHT.error>[1]) {
    mirror("error", message);
    return RHT.error(message as never, opts);
  },
  loading(message?: unknown, opts?: Parameters<typeof RHT.loading>[1]) {
    // Transient spinner — replaced by success/error almost immediately;
    // mirroring would just flash noise on the island.
    return RHT.loading(message as never, opts);
  },
};

export const toast = wrappedToast;
export default wrappedToast;

export function Toaster(props: Record<string, unknown>) {
  return <RealToaster {...props} />;
}

export { resolveValue, useToaster, useToasterStore, CheckmarkIcon, ErrorIcon, LoaderIcon };
