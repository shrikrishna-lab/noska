const ANIMATION_DURATION = 250;
const MODAL_WIDTH = 420;

let container: HTMLDivElement | null = null;

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.id = "nbm-custom-dialogs";
  container.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  document.body.appendChild(container);
  return container;
}

function createOverlay() {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.2);backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);display:flex;align-items:center;
    justify-content:center;pointer-events:all;
    opacity:0;transition:opacity ${ANIMATION_DURATION}ms ease;
  `;
  return overlay;
}

function createDialog(html: string): HTMLDivElement {
  const dialog = document.createElement("div");
  dialog.style.cssText = `
    width:${MODAL_WIDTH}px;border-radius:24px;background:#fff;
    box-shadow:0 4px 24px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04);
    position:relative;pointer-events:all;
    transform:scale(0.92) translateY(16px);opacity:0;
    transition:transform ${ANIMATION_DURATION}ms ease, opacity ${ANIMATION_DURATION}ms ease;
  `;
  return dialog;
}

function createIcon(variant: "delete" | "warning" | "info" | "prompt"): string {
  const icons: Record<string, string> = {
    delete: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`,
    warning: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    prompt: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>`,
  };
  return `<div style="display:flex;justify-content:center;margin-bottom:20px;margin-top:-20px;">
    <div style="width:164px;height:60px;border-radius:30px;display:flex;align-items:center;justify-content:center;background:#111;">
      ${icons[variant]}
    </div>
  </div>`;
}

export function customConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const c = ensureContainer();
    const overlay = createOverlay();
    const dialog = createDialog(`
      ${createIcon("warning")}
      <div style="padding:0 28px 24px;position:relative;">
        <div style="position:absolute;top:16px;right:16px;">
          <button class="nbm-close-btn" style="width:28px;height:28px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:14px;">✕</button>
        </div>
        <h2 style="text-align:center;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#111;margin:0;">${message.length > 60 ? message.slice(0, 60) + "…" : message}</h2>
        <div style="margin-top:24px;display:flex;flex-direction:column;gap:8px;">
          <button class="nbm-confirm-btn" style="height:44px;border-radius:12px;border:none;font-weight:600;font-size:14px;cursor:pointer;color:white;background:linear-gradient(135deg,#ef4444,#f43f5e);box-shadow:0 2px 8px rgba(239,68,68,0.25);">OK</button>
          <button class="nbm-cancel-btn" style="height:44px;border-radius:12px;border:none;font-weight:500;font-size:14px;cursor:pointer;color:#6b7280;background:transparent;">Cancel</button>
        </div>
      </div>
    `);
    overlay.appendChild(dialog);
    c.appendChild(overlay);

    const cleanup = (result: boolean) => {
      dialog.style.transform = "scale(0.85) translateY(-40px)";
      dialog.style.opacity = "0";
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.remove(); }, ANIMATION_DURATION);
      resolve(result);
    };

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      dialog.style.transform = "scale(1) translateY(0)";
      dialog.style.opacity = "1";
    });

    dialog.querySelector(".nbm-confirm-btn")?.addEventListener("click", () => cleanup(true));
    dialog.querySelector(".nbm-cancel-btn")?.addEventListener("click", () => cleanup(false));
    dialog.querySelector(".nbm-close-btn")?.addEventListener("click", () => cleanup(false));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(false); });

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { cleanup(false); window.removeEventListener("keydown", keyHandler); }
      if (e.key === "Enter") { cleanup(true); window.removeEventListener("keydown", keyHandler); }
    };
    window.addEventListener("keydown", keyHandler);
  });
}

export function customPrompt(message: string, defaultValue?: string): Promise<string | null> {
  return new Promise((resolve) => {
    const c = ensureContainer();
    const overlay = createOverlay();
    const dialog = createDialog(`
      ${createIcon("prompt")}
      <div style="padding:0 28px 24px;position:relative;">
        <div style="position:absolute;top:16px;right:16px;">
          <button class="nbm-close-btn" style="width:28px;height:28px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:14px;">✕</button>
        </div>
        <h2 style="text-align:center;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#111;margin:0;">${message}</h2>
        <div style="margin-top:16px;">
          <input class="nbm-input" type="text" value="${(defaultValue ?? "").replace(/"/g, "&quot;")}" style="width:100%;border-radius:12px;border:1px solid #e5e7eb;background:#f9fafb;padding:10px 14px;font-size:14px;outline:none;box-sizing:border-box;">
        </div>
        <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px;">
          <button class="nbm-confirm-btn" style="height:44px;border-radius:12px;border:none;font-weight:600;font-size:14px;cursor:pointer;color:white;background:linear-gradient(135deg,#3b82f6,#6366f1);box-shadow:0 2px 8px rgba(59,130,246,0.25);">OK</button>
          <button class="nbm-cancel-btn" style="height:44px;border-radius:12px;border:none;font-weight:500;font-size:14px;cursor:pointer;color:#6b7280;background:transparent;">Cancel</button>
        </div>
      </div>
    `);
    overlay.appendChild(dialog);
    c.appendChild(overlay);

    const input = dialog.querySelector<HTMLInputElement>(".nbm-input")!;

    const cleanup = (result: string | null) => {
      dialog.style.transform = "scale(0.85) translateY(-40px)";
      dialog.style.opacity = "0";
      overlay.style.opacity = "0";
      setTimeout(() => { overlay.remove(); }, ANIMATION_DURATION);
      resolve(result);
    };

    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
      dialog.style.transform = "scale(1) translateY(0)";
      dialog.style.opacity = "1";
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });

    dialog.querySelector(".nbm-confirm-btn")?.addEventListener("click", () => cleanup(input.value));
    dialog.querySelector(".nbm-cancel-btn")?.addEventListener("click", () => cleanup(null));
    dialog.querySelector(".nbm-close-btn")?.addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (e) => { if (e.target === overlay) cleanup(null); });

    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { cleanup(null); window.removeEventListener("keydown", keyHandler); }
      if (e.key === "Enter") { cleanup(input.value); window.removeEventListener("keydown", keyHandler); }
    };
    window.addEventListener("keydown", keyHandler);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") cleanup(input.value); });
  });
}
