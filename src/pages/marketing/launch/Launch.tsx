import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Lenis from 'lenis';
import { motion } from 'framer-motion';
import { Sparkles, PlayCircle, ArrowRight, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

import { Preloader } from '../components/Preloader';
import { LaunchNavbar } from './components/LaunchNavbar';
import SEOHead from '../../../components/SEOHead';
import { useLaunchSettings, useWaitlistSettingsData } from '../../../hooks/useLaunchSettings';
import { LiquidBackground } from './components/LiquidBackground';
import { ShinyText } from './components/ShinyText';
import { Typewriter } from './components/Typewriter';
import { PaintReveal } from './components/PaintReveal';
import { ProductPreview } from './components/ProductPreview';
import { TrustTicker } from './components/TrustTicker';
import { StatsFloat } from './components/StatsFloat';
import { FeaturesGrid } from './components/FeaturesGrid';
import { AiShowcase } from './components/AiShowcase';
import { IntegrationsOrbit } from './components/IntegrationsOrbit';
import { ProductStory } from './components/ProductStory';
import { ScrollFadeText } from './components/ScrollFadeText';
import { HowItWorks } from './components/HowItWorks';
import { UseCases } from './components/UseCases';
import { FaqDrawers } from './components/FaqDrawers';
import { ScratchReveal } from './components/ScratchReveal';
import { LaunchFooter } from './components/LaunchFooter';
import './Launch.css';

const TYPEWRITER_WORDS = [
  'Notes', 'Documents', 'Projects', 'Knowledge Base', 'Wikis',
  'Tasks', 'AI Assistant', 'Databases', 'Automation',
];

/**
 * Noska's dedicated pre-launch waitlist experience — a standalone route
 * (kept separate from the live-product homepage at `/`) built around the
 * cinematic, editorial brief: preloader → liquid hero → trust ticker →
 * feature grid → AI showcase → Apple-style product story → scroll fade
 * poetry → how-it-works → use cases → FAQ → scratch-to-reveal → final CTA.
 *
 * Every Framer marketplace component named in the brief
 * (Pre-Loader, Lenis, Modern-Navbar, AnimatedLiquidBackground, Shiny-Text,
 * TypewriterEffect, PaintReveal, WavyTicker, scroll-zoom-reveal,
 * ScrollFadeText, Expandable-Drawers) is a Framer *code component* that
 * only runs inside Framer's own visual canvas — it can't be imported into
 * a standalone Vite/React app. Each one is reimplemented natively here
 * with framer-motion (already a project dependency) and the real `lenis`
 * npm package, reproducing the same visual behavior as owned code.
 */
export default function Launch() {
  const { settings } = useLaunchSettings();
  const { waitlistSettings } = useWaitlistSettingsData();
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistError, setWaitlistError] = useState('');
  const [searchParams] = useSearchParams();
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistCompany, setWaitlistCompany] = useState('');
  const [waitlistRole, setWaitlistRole] = useState('');
  const [waitlistCountry, setWaitlistCountry] = useState('');
  const [waitlistPhone, setWaitlistPhone] = useState('');
  const [waitlistReferralCode, setWaitlistReferralCode] = useState<string | null>(null);
  const scratchSectionRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const handleWaitlistSubmit = async (e) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    setWaitlistSubmitting(true);
    setWaitlistError('');

    const email = waitlistEmail.trim().toLowerCase();
    const name = waitlistName.trim() || null;
    const company = waitlistCompany.trim() || null;
    const role = waitlistRole.trim() || null;
    const country = waitlistCountry.trim() || null;
    const phone = waitlistPhone.trim() || null;
    const ref = searchParams.get('ref') || null;

    try {
      const BASE = import.meta.env.VITE_SUPABASE_URL;
      const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${BASE}/functions/v1/waitlist-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON },
        body: JSON.stringify({ email, name, company, role, country, phone, ref: ref || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (err.error?.toLowerCase().includes('already')) {
          setWaitlistError('This email is already on the waitlist!');
        } else {
          setWaitlistError(err.error || `HTTP ${res.status}`);
        }
        setWaitlistSubmitting(false);
        return;
      }
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Something went wrong');
      setWaitlistSubmitting(false);
      return;
    }

    setWaitlistSubmitting(false);
    setWaitlistSubmitted(true);

    try {
      const { supabaseAnon } = await import('../../../lib/supabase');
      if (supabaseAnon) {
        const { data: entry } = await supabaseAnon
          .from('waitlist_entries' as never)
          .select('position, invite_code')
          .eq('email' as never, email)
          .maybeSingle() as any;
        if (entry) {
          setWaitlistPosition(entry.position as number);
          setWaitlistReferralCode(entry.invite_code as string | null);
        }
      }
    } catch {}
  };

  const scrollToScratch = () => {
    document.getElementById('scratch')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (settings.launch_mode === 'maintenance') {
    return (
      <>
        <SEOHead path="/launch" />
        <div className="marketing" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div>
            <ShieldAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.75rem' }}>{settings.maintenance_title || 'Scheduled Maintenance'}</h1>
            <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto' }}>{settings.maintenance_message || 'We are performing scheduled maintenance. We will be back shortly.'}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="noska-launch" id="nl-top">
      <SEOHead path="/launch" />
      <Preloader persistKey={null} />
      <LaunchNavbar />

      {/* Hero */}
      <section className="nl-hero">
        <LiquidBackground />
        <div className="nl-container nl-hero-inner">
          <motion.span
            className="nl-hero-eyebrow"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Sparkles size={13} /> Now accepting early access requests
          </motion.span>

          <motion.h1
            className="nl-hero-title"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Everything your team needs.
            <br />
            <ShinyText>One beautiful workspace.</ShinyText>
          </motion.h1>

          <div className="nl-hero-typewriter-row">
            <span>Built for your</span>
            <Typewriter words={TYPEWRITER_WORDS} />
          </div>

          <PaintReveal text="Your team's second brain, powered by AI." />

          <motion.div
            className="nl-hero-ctas"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <button className="nl-btn nl-btn-primary" onClick={scrollToScratch}>
              <Sparkles size={16} /> Join Waitlist
            </button>
            <button className="nl-btn nl-btn-secondary">
              <PlayCircle size={16} /> Watch Demo
            </button>
          </motion.div>

          <p className="nl-hero-note">No credit card. Free plan at launch.</p>

          <ProductPreview />
        </div>
      </section>

      <TrustTicker />
      <StatsFloat />
      <FeaturesGrid />
      <AiShowcase />
      <IntegrationsOrbit />
      <ProductStory />
      <ScrollFadeText />
      <HowItWorks />
      <UseCases />
      <FaqDrawers />
      <div ref={scratchSectionRef}>
        <ScratchReveal onJoin={scrollToScratch} />
      </div>

      {/* Final CTA */}
      <section className="nl-final-cta nl-container">
        <div className="nl-cta-banner">
          <div className="nl-cta-banner-bg" aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <h2>Build your next idea inside Noska.</h2>
            <p>Notes, documents, databases, AI, projects, and collaboration—all in one beautiful workspace.</p>

            {waitlistSubmitted ? (
              <div className="nl-waitlist-success">
                <CheckCircle2 size={18} /> {waitlistSettings?.confirmation_title || "You're on the list — we'll be in touch."}
                {waitlistPosition && (
                  <p className="mt-2 text-sm text-zinc-400">
                    Your queue position: <strong className="text-[#7c3aed]">#{waitlistPosition}</strong>
                  </p>
                )}
                {waitlistReferralCode && (
                  <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900 p-4 text-left">
                    <p className="mb-2 text-sm text-zinc-300 font-medium">Share & move up the queue</p>
                    <p className="mb-2 text-xs text-zinc-500">Share your referral link — for each friend who joins, you move up one spot.</p>
                    <div className="flex items-center gap-2">
                      <input
                        readOnly
                        value={`${window.location.origin}/launch?ref=${waitlistReferralCode}`}
                        className="flex-1 rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <button
                        onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/launch?ref=${waitlistReferralCode}`)}
                        className="rounded bg-[#7c3aed] px-3 py-1.5 text-xs text-white hover:bg-[#6d28d9]"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
                {waitlistSettings?.confirmation_message && (
                  <p className="mt-3 text-sm text-zinc-400">{waitlistSettings.confirmation_message}</p>
                )}
              </div>
            ) : (
              <form className="nl-waitlist-form" onSubmit={handleWaitlistSubmit}>
                {(!waitlistSettings || waitlistSettings.collect_name) && (
                  <input
                    type="text"
                    placeholder="Your name"
                    className="nl-waitlist-input"
                    value={waitlistName}
                    onChange={(e) => setWaitlistName(e.target.value)}
                    aria-label="Your name"
                  />
                )}
                {waitlistSettings?.collect_company && (
                  <input
                    type="text"
                    placeholder="Company"
                    className="nl-waitlist-input"
                    value={waitlistCompany}
                    onChange={(e) => setWaitlistCompany(e.target.value)}
                    aria-label="Company"
                  />
                )}
                {waitlistSettings?.collect_role && (
                  <input
                    type="text"
                    placeholder="Role"
                    className="nl-waitlist-input"
                    value={waitlistRole}
                    onChange={(e) => setWaitlistRole(e.target.value)}
                    aria-label="Role"
                  />
                )}
                {waitlistSettings?.collect_country && (
                  <input
                    type="text"
                    placeholder="Country"
                    className="nl-waitlist-input"
                    value={waitlistCountry}
                    onChange={(e) => setWaitlistCountry(e.target.value)}
                    aria-label="Country"
                  />
                )}
                {waitlistSettings?.collect_phone && (
                  <input
                    type="tel"
                    placeholder="Phone number"
                    className="nl-waitlist-input"
                    value={waitlistPhone}
                    onChange={(e) => setWaitlistPhone(e.target.value)}
                    aria-label="Phone number"
                  />
                )}
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="nl-waitlist-input"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  aria-label="Email address"
                />
                {waitlistError && (
                  <div className="nl-waitlist-error">
                    <AlertCircle size={14} /> {waitlistError}
                  </div>
                )}
                <button type="submit" className="nl-btn nl-btn-primary" disabled={waitlistSubmitting}>
                  {waitlistSubmitting ? 'Joining...' : <>Join Waitlist <ArrowRight size={16} /></>}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>

      <LaunchFooter />
    </div>
  );
}
