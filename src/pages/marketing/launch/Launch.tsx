import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Lenis from 'lenis';
import { motion } from 'framer-motion';
import { Sparkles, PlayCircle, ArrowRight, ShieldAlert } from 'lucide-react';

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
import { WaitlistSuccessCard } from './components/WaitlistSuccessCard';
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
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [waitlistReferralCode, setWaitlistReferralCode] = useState<string | null>(null);
  const scratchSectionRef = useRef(null);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });
    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // Auto-scroll to the success card when form is submitted & recalculate scroll height for footer
  useEffect(() => {
    if (waitlistSubmitted) {
      setTimeout(() => {
        lenisRef.current?.resize();
        window.dispatchEvent(new Event('resize'));
        if (scratchSectionRef.current) {
          (scratchSectionRef.current as HTMLElement)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  }, [waitlistSubmitted]);

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
          setWaitlistSubmitting(false);
          setWaitlistSubmitted(true);
          setWaitlistError('');
          await lookupWaitlistEntry(email);
          return;
        }
        setWaitlistError(err.error || `HTTP ${res.status}`);
        setWaitlistSubmitting(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (typeof data.position === 'number' && data.position > 0) {
        setWaitlistPosition(data.position);
      }
      if (data.invite_code) {
        setWaitlistReferralCode(data.invite_code);
      } else {
        setWaitlistReferralCode(ref || email.split('@')[0]);
      }
    } catch (err) {
      setWaitlistError(err instanceof Error ? err.message : 'Something went wrong');
      setWaitlistSubmitting(false);
      return;
    }

    setWaitlistSubmitting(false);
    setWaitlistSubmitted(true);
    await lookupWaitlistEntry(email);
  };

  const lookupWaitlistEntry = async (email: string) => {
    try {
      const { supabaseAnon } = await import('../../../lib/supabase');
      if (supabaseAnon) {
        const { data: rpcData } = await supabaseAnon
          .rpc('get_waitlist_position' as never, { p_email: email } as never) as any;
        if (rpcData && typeof rpcData.pos === 'number' && rpcData.pos > 0) {
          setWaitlistPosition(rpcData.pos as number);
        }
        setWaitlistReferralCode((prev) => prev || email.split('@')[0]);
      } else {
        setWaitlistReferralCode(email.split('@')[0]);
      }
    } catch {
      setWaitlistReferralCode((prev) => prev || email.split('@')[0]);
    }
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
      <div ref={scratchSectionRef} id="scratch">
        {waitlistSubmitted ? (
          <section className="nl-container" style={{ padding: '40px 0 60px' }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <WaitlistSuccessCard
                confirmationTitle={waitlistSettings?.confirmation_title}
                confirmationMessage={waitlistSettings?.confirmation_message}
                position={waitlistPosition}
                referralCode={waitlistReferralCode}
                userEmail={waitlistEmail}
                userName={waitlistName}
                onReset={() => {
                  setWaitlistSubmitted(false);
                  setWaitlistEmail('');
                }}
              />
            </motion.div>
          </section>
        ) : (
          <ScratchReveal
            onJoin={scrollToScratch}
            waitlistEmail={waitlistEmail}
            setWaitlistEmail={setWaitlistEmail}
            waitlistName={waitlistName}
            setWaitlistName={setWaitlistName}
            waitlistCountry={waitlistCountry}
            setWaitlistCountry={setWaitlistCountry}
            waitlistError={waitlistError}
            waitlistSubmitting={waitlistSubmitting}
            handleWaitlistSubmit={handleWaitlistSubmit}
            collectName={waitlistSettings?.collect_name}
            collectCountry={waitlistSettings?.collect_country}
          />
        )}
      </div>

      <LaunchFooter />
    </div>
  );
}
