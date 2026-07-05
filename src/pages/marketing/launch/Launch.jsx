import { useEffect, useRef, useState } from 'react';
import Lenis from 'lenis';
import { motion } from 'framer-motion';
import { Sparkles, PlayCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

import { Preloader } from './components/Preloader';
import { LaunchNavbar } from './components/LaunchNavbar';
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
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
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

  const handleWaitlistSubmit = (e) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;
    try {
      const existing = JSON.parse(localStorage.getItem('noska_launch_waitlist') || '[]');
      existing.push({ email: waitlistEmail.trim(), joinedAt: new Date().toISOString() });
      localStorage.setItem('noska_launch_waitlist', JSON.stringify(existing));
    } catch {}
    setWaitlistSubmitted(true);
  };

  const scrollToScratch = () => {
    document.getElementById('scratch')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="noska-launch" id="nl-top">
      <Preloader />
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
                <CheckCircle2 size={18} /> You're on the list — we'll be in touch.
              </div>
            ) : (
              <form className="nl-waitlist-form" onSubmit={handleWaitlistSubmit}>
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  className="nl-waitlist-input"
                  value={waitlistEmail}
                  onChange={(e) => setWaitlistEmail(e.target.value)}
                  aria-label="Email address"
                />
                <button type="submit" className="nl-btn nl-btn-primary">
                  Join Waitlist <ArrowRight size={16} />
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
