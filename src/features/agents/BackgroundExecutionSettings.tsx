import React, { useEffect, useState } from "react";
import { Cloud, KeyRound, Loader2, ShieldCheck, Globe2, Circle, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { supabase, currentAccessToken } from "../../lib/supabase";

interface SettingsRow {
  allow_background: boolean;
  provider: string;
  model_class: string;
  key_hint: string | null;
  timezone: string;
  image_provider: string;
  image_model: string;
  image_base_url: string;
  image_key_hint: string | null;
}

type SetupStatus = "not_configured" | "configuring" | "operational" | "degraded" | "failing" | "disabled";

interface RuntimeStatus {
  edgeFunction: boolean;
  encryptionConfigured: boolean;
  backgroundEnabled: boolean;
  keySaved: boolean;
  keyHint: string | null;
  imageConfigured: boolean;
  imageProvider: string | null;
  imageModel: string | null;
  imageKeyHint: string | null;
  ready: boolean;
}

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Kolkata",
  "Australia/Sydney",
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Background execution setup wizard (#2/#3).
 * Status derives from the REAL runtime (edge fn self-report) — never faked.
 */
export default function BackgroundExecutionSettings({ onToast }: { onToast?: (msg: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsRow>({ allow_background: false, provider: "groq", model_class: "default", key_hint: null, timezone: TIMEZONES[1], image_provider: "", image_model: "", image_base_url: "", image_key_hint: null });
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [imageApiKeyInput, setImageApiKeyInput] = useState("");
  const [imageBaseUrl, setImageBaseUrl] = useState("");
  const [imageModel, setImageModel] = useState("");
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const refreshStatus = async () => {
    try {
      const token = await currentAccessToken();
      if (!token) return;
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-runtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "status" }),
      });
      if (res.ok) setStatus((await res.json()) as RuntimeStatus);
    } catch { /* unreachable → stays null = not configured */ }
  };

  useEffect(() => {
    void (async () => {
      try {
        const base = supabase as unknown as { from: (t: string) => any };
        const { data } = await base.from("agent_execution_settings").select("allow_background,provider,model_class,key_hint,timezone,image_provider,image_model,image_base_url,image_key_hint").maybeSingle();
        if (data) {
          setSettings({
            allow_background: data.allow_background,
            provider: data.provider,
            model_class: data.model_class,
            key_hint: data.key_hint ?? null,
            timezone: data.timezone || TIMEZONES[0],
            image_provider: data.image_provider || "",
            image_model: data.image_model || "",
            image_base_url: data.image_base_url || "",
            image_key_hint: data.image_key_hint ?? null,
          });
          setImageBaseUrl(data.image_base_url || "");
          setImageModel(data.image_model || "");
        }
      } catch { /* pre-migration */ }
      await refreshStatus();
      setLoading(false);
    })();
  }, []);

  const derivedStatus: SetupStatus =
    !status || (!status.edgeFunction || !status.encryptionConfigured)
      ? settings.allow_background ? "configuring" : "not_configured"
      : !settings.allow_background
        ? "disabled"
        : status.ready ? "operational"
        : status.keySaved ? "degraded"
        : "configuring";

  const STATUS_META: Record<SetupStatus, { label: string; cls: string; dot: string }> = {
    not_configured: { label: "Not configured", cls: "text-[var(--muted)]", dot: "border border-[var(--muted)]" },
    configuring: { label: "Configuring…", cls: "text-[var(--warning)]", dot: "bg-[var(--warning)] animate-pulse" },
    operational: { label: "Operational", cls: "text-[var(--success)]", dot: "bg-[var(--success)]" },
    degraded: { label: "Degraded", cls: "text-[var(--warning)]", dot: "bg-[var(--warning)]" },
    failing: { label: "Failing", cls: "text-[var(--danger)]", dot: "bg-[var(--danger)]" },
    disabled: { label: "Disabled", cls: "text-[var(--muted)]", dot: "bg-[var(--muted)]" },
  };
  const meta = STATUS_META[derivedStatus];

  const save = async () => {
    setSaving(true);
    try {
      const token = await currentAccessToken();
      if (!token) { onToast?.("Sign in first"); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/agent-runtime`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "save_settings",
          allow_background: settings.allow_background,
          provider: settings.provider,
          model_class: settings.model_class,
          timezone: settings.timezone,
          api_key: apiKeyInput.trim() || undefined,
          custom_base_url: settings.provider === "custom" ? customBaseUrl.trim() || undefined : undefined,
          custom_model: settings.provider === "custom" ? customModel.trim() || undefined : undefined,
          image_provider: settings.image_provider || null,
          image_model: imageModel.trim() || null,
          image_base_url: settings.image_provider === "custom" ? imageBaseUrl.trim() || null : null,
          image_api_key: imageApiKeyInput.trim() || undefined,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        onToast?.(
          body.message === "AGENT_ENCRYPTION_KEY not configured"
            ? "Background execution isn't configured yet — server encryption key missing"
            : body.message || "Couldn't save settings",
        );
        return;
      }
      setApiKeyInput("");
      setImageApiKeyInput("");
      setSettings((s) => ({ ...s, key_hint: (body.keyHint as string) ?? s.key_hint, image_key_hint: (body.imageKeyHint as string) ?? s.image_key_hint }));
      onToast?.(settings.allow_background ? "Background execution enabled" : "Background execution disabled");
      await refreshStatus();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center gap-2 py-4"><Loader2 size={14} className="animate-spin text-[var(--muted)]" /><span className="text-xs text-[var(--muted)]">Checking background runtime…</span></div>;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 space-y-3">
      {/* Header + honest status */}
      <div className="flex items-start gap-2.5">
        <Cloud size={15} className="text-[var(--accent)] mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-semibold text-[var(--text)]">Background execution</h4>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${meta.cls}`}>
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
          </div>
          <p className="text-[10px] text-[var(--muted)] leading-relaxed mt-0.5">
            Your agents and automations keep working even when Noska is closed —
            scheduled runs, event triggers, retries and approvals all happen on our servers.
          </p>
        </div>
      </div>

      {/* Capability list */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 pl-6">
        {["Scheduled agents", "Scheduled automations", "Event-triggered runs", "Retry & recovery", "Approval resume", "Failure notifications"].map((cap) => (
          <span key={cap} className="flex items-center gap-1.5 text-[9px] text-[var(--secondary)]">
            <CheckCircle2 size={8} className={derivedStatus === "operational" ? "text-[var(--success)]" : "text-[var(--muted)]"} /> {cap}
          </span>
        ))}
      </div>

      {/* Honest unconfigured message (#39) */}
      {(derivedStatus === "not_configured" || derivedStatus === "configuring") && (
        <p className="flex items-start gap-1.5 rounded-lg bg-[var(--warning)]/[0.06] border border-[var(--warning)]/20 px-2.5 py-2 text-[10px] text-[var(--warning)] leading-relaxed">
          <XCircle size={10} className="mt-0.5 shrink-0" />
          Background execution isn't fully configured yet.
          {!status?.edgeFunction && " The runtime service hasn't been deployed."}
          {!status?.encryptionConfigured && status !== null && " Server encryption isn't set up."}
          {" "}Scheduled runs will be recorded as skipped until this is active.
        </p>
      )}

      {/* Activation flow */}
      <div className="pl-6 space-y-2.5">
        <button
          onClick={() => setSettings((s) => ({ ...s, allow_background: !s.allow_background }))}
          className="w-full flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 hover:border-[var(--accent)]/30 transition"
        >
          <span className="text-[11px] font-medium text-[var(--text)]">
            {settings.allow_background ? "Enabled — agents run on our servers" : "Enable background execution"}
          </span>
          <ChevronRight size={12} className={`text-[var(--muted)] transition-transform ${settings.allow_background ? "rotate-90" : ""}`} />
        </button>

        {settings.allow_background && (
          <>
            <div>
              <label className="flex items-center gap-1 text-[10px] font-medium text-[var(--secondary)] mb-1">
                <KeyRound size={9} /> AI provider key for server runs
                {settings.key_hint && <span className="ml-auto text-[9px] font-mono text-[var(--muted)]">saved {settings.key_hint}</span>}
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={settings.key_hint ? "Replace saved key…" : "sk-or-…"}
                className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-mono text-[var(--text)] outline-none focus:border-[var(--accent)]/40"
              />
              <p className="flex items-center gap-1 text-[9px] text-[var(--muted)] mt-1">
                <ShieldCheck size={8} /> Encrypted server-side (AES-GCM). Never displayed again; replace anytime.
              </p>
            </div>

            {/* Advanced — collapsed by default (#48 progressive disclosure) */}
            <button onClick={() => setShowAdvanced(!showAdvanced)} className="text-[9px] text-[var(--muted)] hover:text-[var(--text-secondary)]">
              {showAdvanced ? "− Hide technical details" : "+ Technical details"}
            </button>
            {showAdvanced && (
              <div className="space-y-2.5">
                <div>
                  <label className="text-[10px] font-medium text-[var(--secondary)] mb-1 block">Provider</label>
                  <select value={settings.provider} onChange={(e) => setSettings((s) => ({ ...s, provider: e.target.value }))} className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none">
                     <option value="groq">Groq</option>
                     <option value="openrouter">OpenRouter</option>
                     <option value="openai">OpenAI</option>
                     <option value="together">Together</option>
                     <option value="custom">Custom (any OpenAI-compatible URL)</option>
                  </select>
                  {settings.provider !== "custom" && <p className="text-[9px] text-[var(--muted)] mt-0.5">Must match the key above.</p>}
                </div>
                {settings.provider === "custom" && (
                  <>
                    <div>
                      <label className="text-[10px] font-medium text-[var(--secondary)] mb-1 block">Base URL</label>
                      <input
                        value={customBaseUrl}
                        onChange={(e) => setCustomBaseUrl(e.target.value)}
                        placeholder="https://my-gateway.example.com/v1"
                        className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs font-mono text-[var(--text)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-[var(--secondary)] mb-1 block">Model ID</label>
                      <input
                        value={customModel}
                        onChange={(e) => setCustomModel(e.target.value)}
                        placeholder="model-id sent to your endpoint"
                        className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs font-mono text-[var(--text)] outline-none"
                      />
                    </div>
                  </>
                )}
                 <div className="border-t border-[var(--border)] pt-2.5 space-y-2">
                   <div>
                     <label className="text-[10px] font-medium text-[var(--secondary)] mb-1 block">Image generation provider</label>
                     <select
                       value={settings.image_provider}
                       onChange={(e) => {
                         const value = e.target.value;
                         setSettings((s) => ({ ...s, image_provider: value }));
                         if (!value) setImageModel("");
                       }}
                       className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none"
                     >
                       <option value="">Disabled</option>
                       <option value="openai">OpenAI</option>
                       <option value="gemini">Google Gemini</option>
                       <option value="together">Together</option>
                       <option value="openrouter">OpenRouter</option>
                       <option value="custom">Custom image endpoint</option>
                     </select>
                   </div>
                   {settings.image_provider && (
                     <>
                       <div>
                           <label className="text-[10px] font-medium text-[var(--secondary)] mb-1 block">Image-capable model ID</label>
                         <input
                           value={imageModel}
                           onChange={(e) => setImageModel(e.target.value)}
                           placeholder="gpt-image-1 or provider model ID"
                           className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs font-mono text-[var(--text)] outline-none"
                           />
                           <p className="text-[9px] text-[var(--muted)] mt-1">Noska enables image generation only when this model supports image output; your key remains yours.</p>
                         </div>
                         {settings.image_provider === "custom" && (
                         <div>
                           <label className="text-[10px] font-medium text-[var(--secondary)] mb-1 block">Image base URL</label>
                           <input
                             value={imageBaseUrl}
                             onChange={(e) => setImageBaseUrl(e.target.value)}
                             placeholder="https://gateway.example.com/v1"
                             className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs font-mono text-[var(--text)] outline-none"
                           />
                         </div>
                       )}
                       <div>
                         <label className="flex items-center gap-1 text-[10px] font-medium text-[var(--secondary)] mb-1">
                           Image provider key
                           {settings.image_key_hint && <span className="ml-auto text-[9px] font-mono text-[var(--muted)]">saved {settings.image_key_hint}</span>}
                         </label>
                         <input
                           type="password"
                           value={imageApiKeyInput}
                           onChange={(e) => setImageApiKeyInput(e.target.value)}
                           placeholder={settings.image_key_hint ? "Replace saved image key…" : "Optional when reusing the text key"}
                           className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-mono text-[var(--text)] outline-none focus:border-[var(--accent)]/40"
                         />
                         <p className="text-[9px] text-[var(--muted)] mt-1">Your provider requires its own API key. Leave blank to reuse your saved text key when the providers match; a different image provider needs its own encrypted key.</p>
                       </div>
                     </>
                   )}
                   <p className="text-[9px] text-[var(--muted)]">
                     Server image profile: {status?.imageConfigured ? "✓ configured" : settings.image_provider ? "○ incomplete" : "disabled"}
                   </p>
                 </div>
                 <div>
                   <label className="text-[10px] font-medium text-[var(--secondary)] mb-1 block">Model quality</label>
                  <select value={settings.model_class} onChange={(e) => setSettings((s) => ({ ...s, model_class: e.target.value }))} className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none">
                    <option value="fast">Fast</option>
                    <option value="default">Balanced</option>
                    <option value="reasoning">Reasoning</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-[10px] font-medium text-[var(--secondary)] mb-1"><Globe2 size={9} /> Timezone</label>
                  <select value={settings.timezone} onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))} className="w-full rounded-lg bg-[var(--bg)] border border-[var(--border)] px-2 py-1.5 text-xs text-[var(--text)] outline-none">
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div className="text-[9px] text-[var(--muted)] space-y-0.5">
                  <p>· Runtime service: {status?.edgeFunction ? "✓ reachable" : "✕ not reachable"}</p>
                  <p>· Server-side encryption: {status?.encryptionConfigured ? "✓ configured" : "✕ not configured"}</p>
                  <p>· Scheduler: Supabase cron invokes the runtime every minute (no browser needed)</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <button
        onClick={() => void save()}
        disabled={saving || (settings.allow_background && !apiKeyInput.trim() && !settings.key_hint)}
        title={settings.allow_background && !apiKeyInput.trim() && !settings.key_hint ? "Add an AI key to activate" : undefined}
        className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--accent)]/90 disabled:opacity-50 transition"
      >
        {saving ? <Loader2 size={11} className="animate-spin inline mr-1" /> : null}
        {settings.allow_background ? "Activate background execution" : "Save"}
      </button>
    </div>
  );
}
