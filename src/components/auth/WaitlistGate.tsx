import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { supabase } from "../../lib/supabase";
import { motion } from "framer-motion";
import { Sparkles, LogOut, Clock, Mail, Calendar, ShieldAlert } from "lucide-react";

type GateStatus = "checking" | "approved" | "waiting" | "expired" | "banned" | "suspended" | "error";

export function WaitlistGate({ children }: { children: React.ReactNode }) {
  const { user: clerkUser } = useUser();
  const clerk = useClerk();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [entryData, setEntryData] = useState<{
    position?: number; 
    ahead_count?: number;
    joined_at?: string; 
    status?: string;
    invite_expires_at?: string; 
    ban_reason?: string; 
    suspension_reason?: string;
  } | null>(null);

  useEffect(() => {
    if (!clerkUser) { setStatus("error"); return; }
    const email = clerkUser.emailAddresses?.[0]?.emailAddress;
    if (!email) { setStatus("error"); return; }

    if (!supabase) {
      setStatus("approved");
      return;
    }

    (async () => {
      try {
        const { data } = await supabase
          .from("waitlist_entries" as never)
          .select("id, status, position, joined_at, invite_expires_at, ban_reason, suspension_reason" as never)
          .eq("email" as never, email.toLowerCase())
          .maybeSingle() as never;

        if (!data) {
          const { data: aeData } = await supabase
            .from("approved_emails" as never)
            .select("id, status")
            .eq("email" as never, email.toLowerCase())
            .maybeSingle() as never;
          setStatus(aeData ? "approved" : "waiting");
          return;
        }

        const entry = data as Record<string, unknown>;
        let pos = entry.position as number | undefined;
        let aheadCount: number | undefined = undefined;

        const joinedAt = entry.joined_at as string | undefined;

        // If position is not explicit, calculate how many pending entries joined before this user
        if (!pos && joinedAt) {
          try {
            const { count } = await supabase
              .from("waitlist_entries" as never)
              .select("id" as never, { count: "exact", head: true })
              .lt("joined_at" as never, joinedAt)
              .eq("status" as never, "pending");

            if (typeof count === "number") {
              aheadCount = count;
              pos = count + 1;
            }
          } catch {
            // ignore fallback
          }
        } else if (pos && pos > 0) {
          aheadCount = pos - 1;
        }

        setEntryData({
          position: pos,
          ahead_count: aheadCount,
          joined_at: joinedAt,
          status: entry.status as string | undefined,
          invite_expires_at: entry.invite_expires_at as string | undefined,
          ban_reason: entry.ban_reason as string | undefined,
          suspension_reason: entry.suspension_reason as string | undefined,
        });

        const s = entry.status as string;
        if (s === "banned") { setStatus("banned"); return; }
        if (s === "suspended") { setStatus("suspended"); return; }
        if (s === "approved" || s === "invited" || s === "accepted") {
          if (s === "invited" && entry.invite_expires_at && new Date(entry.invite_expires_at as string) < new Date()) {
            setStatus("expired");
            return;
          }
          setStatus("approved");
          return;
        }
        setStatus("waiting");
      } catch {
        setStatus("approved");
      }
    })();
  }, [clerkUser]);

  if (status === "checking") {
    return (
      <div style={{
        display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #f0f4f8 0%, #e8f0fe 50%, #f5f0ff 100%)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 36, height: 36, border: '3px solid #e2e8f0',
            borderTopColor: '#7c3aed', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{ fontSize: 14, color: '#94a3b8', fontWeight: 500 }}>Checking access...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "approved") return <>{children}</>;

  const renderContainer = (content: React.ReactNode) => {
    return (
      <div style={{
        position: 'relative', display: 'flex', height: '100vh', width: '100vw',
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        userSelect: 'none'
      }}>
        {/* Background Image — High quality, sharp, no blur */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          <img 
            src="/waitlist-bg.png" 
            alt="Background" 
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              imageRendering: 'auto'
            }}
          />
          {/* Very subtle edge fade only — keep image sharp and vivid */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 120% 120% at center, transparent 40%, rgba(255,255,255,0.35) 85%, rgba(248,245,255,0.6) 100%)'
          }} />
        </div>

        {/* Main Glass Card */}
        <motion.div 
          initial={{ opacity: 0, y: 24, scale: 0.97 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }} 
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'relative', zIndex: 10,
            width: '100%', maxWidth: 420,
            borderRadius: 24, padding: '32px 28px',
            background: 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 20px 60px -15px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0,0,0,0.02)',
            margin: 16
          }}
        >
          {content}
        </motion.div>
      </div>
    );
  };

  if (status === "expired") {
    return renderContainer(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)', marginBottom: 20,
          boxShadow: '0 8px 24px -6px rgba(245, 158, 11, 0.25)'
        }}>
          <Clock style={{ width: 26, height: 26, color: '#b45309' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Invite Expired</h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>Your invitation has expired. Please request a new one from our team.</p>
        <button 
          onClick={() => clerk.signOut()} 
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff',
            color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <LogOut style={{ width: 16, height: 16 }} /> Sign out
        </button>
      </div>
    );
  }

  if (status === "banned") {
    return renderContainer(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #fee2e2, #fecaca)', marginBottom: 20,
          boxShadow: '0 8px 24px -6px rgba(239, 68, 68, 0.2)'
        }}>
          <ShieldAlert style={{ width: 26, height: 26, color: '#dc2626' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Access Restricted</h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>{entryData?.ban_reason ?? "Your account has been restricted from accessing this workspace."}</p>
        <button 
          onClick={() => clerk.signOut()} 
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff',
            color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <LogOut style={{ width: 16, height: 16 }} /> Sign out
        </button>
      </div>
    );
  }

  if (status === "suspended") {
    return renderContainer(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #fef9c3, #fef08a)', marginBottom: 20,
          boxShadow: '0 8px 24px -6px rgba(234, 179, 8, 0.2)'
        }}>
          <Clock style={{ width: 26, height: 26, color: '#a16207' }} />
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1e293b', margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>Account Suspended</h1>
        <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>{entryData?.suspension_reason ?? "Your account has been temporarily suspended."}</p>
        <button 
          onClick={() => clerk.signOut()} 
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px',
            borderRadius: 12, border: '1px solid #e2e8f0', background: '#ffffff',
            color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer'
          }}
        >
          <LogOut style={{ width: 16, height: 16 }} /> Sign out
        </button>
      </div>
    );
  }

  const effectivePosition = entryData?.position || 1;
  const aheadCount = entryData?.ahead_count;

  return renderContainer(
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* Noska Logo Badge */}
      <div style={{ position: 'relative', marginBottom: 18 }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#ffffff',
          boxShadow: '0 6px 20px -4px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.04)',
          padding: 10
        }}>
          <img src="/logo.png" alt="Noska Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{
          position: 'absolute', top: 0, right: 0,
          width: 14, height: 14, borderRadius: '50%',
          background: '#22c55e', border: '2.5px solid white',
          boxShadow: '0 2px 6px rgba(34, 197, 94, 0.4)'
        }} />
      </div>

      <h1 style={{
        fontSize: 24, fontWeight: 800, color: '#0f172a',
        margin: '0 0 4px 0', letterSpacing: '-0.025em'
      }}>
        You're on the Noska Waitlist!
      </h1>
      <p style={{ fontSize: 13.5, color: '#64748b', margin: '0 0 18px 0' }}>
        Thanks for your interest in Noska
      </p>

      {/* Queue Position Card */}
      <div style={{
        width: '100%', borderRadius: 16, padding: '18px 20px',
        background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
        border: '1px solid #e9e5ff', marginBottom: 12,
        textAlign: 'center', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.06)'
      }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', marginBottom: 4 }}>
          Your Queue Position
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, color: '#4c1d95', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
          #{effectivePosition}
        </div>
        <p style={{ fontSize: 12, color: '#6d28d9', marginTop: 4, marginBottom: 0, fontWeight: 500 }}>
          {aheadCount !== undefined && aheadCount > 0
            ? `${aheadCount} account${aheadCount === 1 ? '' : 's'} pending ahead of you`
            : "You're next in line for access!"}
        </p>
      </div>

      {/* Status Pill */}
      <div style={{
        width: '100%', borderRadius: 12, padding: '10px 16px',
        background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
          Status:
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>
          Pending Approval
        </span>
      </div>

      {/* Centered Email Pill */}
      <div style={{
        width: '100%', borderRadius: 12, padding: '10px 16px',
        background: '#f8fafc', border: '1px solid #f1f5f9',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, marginBottom: 16
      }}>
        <Mail style={{ width: 14, height: 14, color: '#94a3b8', flexShrink: 0 }} />
        <span style={{ color: '#475569', fontWeight: 500, fontSize: 13 }}>
          {clerkUser?.emailAddresses?.[0]?.emailAddress}
        </span>
      </div>

      <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, maxWidth: 280, margin: '0 auto 20px auto' }}>
        An admin needs to approve your access. You'll receive a confirmation email when you're approved.
      </p>

      {/* Sign Out Button */}
      <button 
        onClick={() => clerk.signOut()} 
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '9px 22px', borderRadius: 10,
          border: '1px solid #e2e8f0', background: '#ffffff',
          color: '#475569', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
          transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
      >
        <LogOut style={{ width: 14, height: 14 }} /> Sign out
      </button>
    </div>
  );
}
