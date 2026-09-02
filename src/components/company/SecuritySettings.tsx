import React, { useState } from "react"
import { motion } from "framer-motion"
import { Shield, Lock, Key, Smartphone, Eye, EyeOff, Loader2, Check, AlertTriangle } from "lucide-react"
import { supabase } from "../../lib/supabase"
import { useCompany } from "../../contexts/CompanyContext"

interface SecuritySettingsProps {}

export function SecuritySettings({}: SecuritySettingsProps) {
  const { currentCompany, currentMember } = useCompany()
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState("30")
  const [ipWhitelist, setIpWhitelist] = useState("")
  const [requireSso, setRequireSso] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")

  const handleSave = async () => {
    setSaving(true)
    try {
      if (currentCompany) {
        await (supabase as any)
          .from("organizations")
          .update({
            security_settings: {
              session_timeout: parseInt(sessionTimeout),
              ip_whitelist: ipWhitelist.split("\n").filter(Boolean),
              require_sso: requireSso,
            }
          })
          .eq("id", currentCompany.id)
      }
      setSuccess("Settings saved")
      setTimeout(() => setSuccess(""), 2000)
    } catch {}
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-6">
      <h4 className="text-[12px] font-bold text-[var(--text)]">Security Settings</h4>

      {/* 2FA */}
      <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
              <Smartphone size={14} className="text-[var(--muted)]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text)]">Two-Factor Authentication</p>
              <p className="text-[10px] text-[var(--muted)]">Require 2FA for all members</p>
            </div>
          </div>
          <button
            onClick={() => setTwoFactorEnabled(!twoFactorEnabled)}
            className={`w-10 h-5 rounded-full transition cursor-pointer ${twoFactorEnabled ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${twoFactorEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Session Timeout */}
      <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
            <Clock size={14} className="text-[var(--muted)]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[var(--text)]">Session Timeout</p>
            <p className="text-[10px] text-[var(--muted)]">Auto-logout after inactivity</p>
          </div>
        </div>
        <select
          value={sessionTimeout}
          onChange={e => setSessionTimeout(e.target.value)}
          className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[11px] text-[var(--text)] cursor-pointer"
        >
          <option value="15">15 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
          <option value="120">2 hours</option>
          <option value="480">8 hours</option>
          <option value="0">Never</option>
        </select>
      </div>

      {/* IP Whitelist */}
      <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
            <Lock size={14} className="text-[var(--muted)]" />
          </div>
          <div>
            <p className="text-[12px] font-semibold text-[var(--text)]">IP Whitelist</p>
            <p className="text-[10px] text-[var(--muted)]">Restrict access to specific IPs</p>
          </div>
        </div>
        <textarea
          value={ipWhitelist}
          onChange={e => setIpWhitelist(e.target.value)}
          placeholder={"192.168.1.0/24\n10.0.0.0/8"}
          rows={3}
          className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-xl text-[11px] text-[var(--text)] font-mono resize-none"
        />
      </div>

      {/* Require SSO */}
      <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--surface)] flex items-center justify-center">
              <Key size={14} className="text-[var(--muted)]" />
            </div>
            <div>
              <p className="text-[12px] font-semibold text-[var(--text)]">Require SSO</p>
              <p className="text-[10px] text-[var(--muted)]">Force single sign-on for all logins</p>
            </div>
          </div>
          <button
            onClick={() => setRequireSso(!requireSso)}
            className={`w-10 h-5 rounded-full transition cursor-pointer ${requireSso ? "bg-[var(--accent)]" : "bg-[var(--surface-3)]"}`}
          >
            <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${requireSso ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-[11px] font-semibold hover:bg-[var(--accent-deep)] transition disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Save Settings
        </button>
        {success && (
          <span className="text-[11px] text-green-500 font-medium">{success}</span>
        )}
      </div>
    </div>
  )
}

function Clock(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
}
