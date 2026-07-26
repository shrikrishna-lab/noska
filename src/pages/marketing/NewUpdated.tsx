import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Check, 
  Plus, 
  Minus, 
  ExternalLink,
  Folder,
  Globe,
  Share2,
  MessageSquare
} from 'lucide-react';
import { Reveal, Stagger, staggerItem } from './components/Reveal';
import './NewUpdated.css';

interface WorkItem {
  id: string;
  title: string;
  category: string;
  image: string;
  metrics: string;
}

const workItems: WorkItem[] = [
  {
    id: 'w1',
    title: 'Spatial Canvas Engine 2.0',
    category: 'Infinite Canvas UI',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
    metrics: '120 FPS Rendering'
  },
  {
    id: 'w2',
    title: 'Local-First Sync Engine',
    category: 'Sync Infrastructure',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1000&q=80',
    metrics: '<15ms Latency'
  },
  {
    id: 'w3',
    title: 'AI Co-Thinking Node Matrix',
    category: 'Visual AI Reasoning',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1000&q=80',
    metrics: '3x Faster Synthesis'
  },
  {
    id: 'w4',
    title: 'End-to-End Encrypted Vaults',
    category: 'Zero-Trust Security',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1000&q=80',
    metrics: 'AES-256 Bit'
  }
];

interface TimelineRow {
  role: string;
  company: string;
  period: string;
}

const timelineRows: TimelineRow[] = [
  { role: 'Noska 2.5 Release', company: 'Noska Core Lab', period: '2026 → Now' },
  { role: 'Local-First Sync Engine', company: 'Infrastructure Team', period: '2024 → 2026' },
  { role: 'Encrypted Vault Security', company: 'Security Lab', period: '2022 → 2024' },
  { role: 'Initial Block Architecture', company: 'Founding Team', period: '2021 → 2022' }
];

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'What makes Noska different from standard note tools?',
    answer: 'Noska combines local-first speed with infinite 2D spatial canvas boards, automated AI co-thinking nodes, and end-to-end zero-knowledge encryption.'
  },
  {
    question: 'How does Local-First Sync work when offline?',
    answer: 'All changes are written to an on-device SQLite database in under 2ms. When internet connectivity is restored, Noska streams encrypted CRDT deltas automatically.'
  },
  {
    question: 'Can I import my existing Markdown or Notion notes?',
    answer: 'Yes! Noska includes full one-click import utilities for Markdown files, CSV database tables, and HTML packages while preserving backlinks.'
  },
  {
    question: 'Is my data encrypted on cloud servers?',
    answer: 'Yes. Encrypted Vaults use WebCrypto AES-256 encryption. Master keys are derived locally from your passphrase—not even Noska can access your data.'
  }
];

export default function NewUpdated() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activeWorkItem, setActiveWorkItem] = useState<WorkItem | null>(null);

  return (
    <div className="hanzo-wrapper">
      {/* Top Navbar */}
      <header className="hanzo-nav mkt-container">
        <div className="nav-brand-pill">
          <img src="/logo.png" alt="Noska Logo" style={{ width: 18, height: 18, display: 'inline-block', verticalAlign: 'middle', marginRight: 8 }} />
          <span>Noska</span>
        </div>
        <div className="nav-menu-btn">
          <span className="menu-bar" />
          <span className="menu-bar" />
        </div>
      </header>

      {/* Hero Section */}
      <section className="hanzo-hero mkt-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="hero-inner"
        >
          {/* Status Badge */}
          <div className="hero-status-pill">
            <span className="status-dot" />
            <span>Noska v2.5 Released — 2 Spots Left</span>
          </div>

          {/* Hanzo Split Typography Headline */}
          <h1 className="hanzo-hero-title">
            <span className="title-bold">Unlimited</span>
            <span className="inline-badge-preview">
              <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80" alt="Preview Badge" loading="lazy" />
            </span>
            <span className="title-muted">Power</span>
            <br />
            <span className="title-serif-italic">for</span>
            <span className="inline-dark-badge">
              <span className="dark-badge-text">NOSKA</span>
            </span>
            <span className="title-bold">Solid Teams</span>
          </h1>

          <p className="hanzo-hero-sub">
            We help teams and creators build structured knowledge, brainstorm visually, and organize workspaces — fast, encrypted, and hassle-free.
          </p>

          {/* Action Button & Avatar Stack */}
          <div className="hero-action-row">
            <a href="/login" className="pill-action-btn">
              Choose your plan <ArrowRight size={16} />
            </a>
            <div className="social-proof-wrap">
              <div className="avatar-stack">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="User 1" loading="lazy" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="User 2" loading="lazy" />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="User 3" loading="lazy" />
                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="User 4" loading="lazy" />
              </div>
              <span className="proof-label">Trusted by Leaders</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Embedded Dark Container: Recent Work Showcase */}
      <section className="hanzo-work-container mkt-container">
        <div className="dark-work-box">
          <div className="work-floating-badge">
            <div className="folder-circle">
              <Folder size={18} />
            </div>
            <span className="badge-text">See Recent Work</span>
          </div>

          <Stagger className="work-cards-grid">
            {workItems.map((item) => (
              <motion.div key={item.id} variants={staggerItem}>
                <div className="work-card" onClick={() => setActiveWorkItem(item)}>
                  <div className="work-card-img-wrap">
                    <img src={item.image} alt={item.title} loading="lazy" />
                    <span className="work-metric">{item.metrics}</span>
                  </div>
                  <div className="work-card-body">
                    <span className="work-cat">{item.category}</span>
                    <h3 className="work-title">{item.title}</h3>
                  </div>
                </div>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* About & Timeline Section */}
      <section className="hanzo-about-section mkt-container">
        <div className="about-grid">
          {/* Left Founder Profile Card */}
          <Reveal delay={0.1}>
            <div className="founder-card">
              <div className="founder-image-wrap">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80" alt="Founder Portrait" loading="lazy" />
              </div>
              <div className="founder-info">
                <h3>Krishna H.</h3>
                <span className="founder-role">Noska Lab, Founder</span>
                <div className="social-icons">
                  <a href="#website" aria-label="Website"><Globe size={15} /></a>
                  <a href="#share" aria-label="Share"><Share2 size={15} /></a>
                  <a href="#contact" aria-label="Contact"><MessageSquare size={15} /></a>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Right Bio & Experience Rows */}
          <Reveal delay={0.2}>
            <div className="about-content">
              <p className="bio-paragraph">
                Pushing boundaries in digital tools since 2021. We help startups and studios create clean, spatial note architectures. Based in Utrecht, we blend function with emotion — creating software that feels natural and fast.
              </p>

              <div className="timeline-table">
                {timelineRows.map((row, idx) => (
                  <div key={idx} className="timeline-row">
                    <span className="row-role">{row.role}</span>
                    <span className="row-company">{row.company}</span>
                    <span className="row-period">{row.period}</span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="hanzo-pricing-section mkt-container">
        <div className="pricing-header">
          <h2>Pricing & Plans</h2>
          <div className="pricing-switch">
            <button 
              className={`switch-tab ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </button>
            <button 
              className={`switch-tab ${billingCycle === 'annual' ? 'active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual (Save 20%)
            </button>
          </div>
        </div>

        <div className="pricing-cards-row">
          <div className="price-card">
            <h3>Pro Workspace</h3>
            <p className="card-sub">For creators and small teams needing full power.</p>
            <div className="price-num">
              <span>{billingCycle === 'annual' ? '$12' : '$15'}</span> / month
            </div>
            <a href="/login" className="price-btn primary">Choose Pro Plan</a>
            <ul className="feature-list">
              <li><Check size={16} /> Unlimited spatial canvas boards</li>
              <li><Check size={16} /> Local-first SQLite offline caching</li>
              <li><Check size={16} /> End-to-end WebCrypto encryption</li>
            </ul>
          </div>

          <div className="price-card">
            <h3>Enterprise Team</h3>
            <p className="card-sub">Dedicated cloud instances, SSO, and custom SLAs.</p>
            <div className="price-num">
              <span>{billingCycle === 'annual' ? '$29' : '$35'}</span> / month
            </div>
            <a href="/enterprise" className="price-btn secondary">Contact Sales</a>
            <ul className="feature-list">
              <li><Check size={16} /> SAML Single Sign-On (Clerk SSO)</li>
              <li><Check size={16} /> Dedicated database instance</li>
              <li><Check size={16} /> Priority 24/7 dedicated support</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Accordion FAQ Section */}
      <section className="hanzo-faq-section mkt-container">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`faq-row ${isOpen ? 'open' : ''}`}>
                <button className="faq-btn" onClick={() => setOpenFaq(isOpen ? null : idx)}>
                  <span>{faq.question}</span>
                  <span className="faq-icon">{isOpen ? <Minus size={16} /> : <Plus size={16} />}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div 
                      className="faq-ans"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <p>{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal Detail View */}
      <AnimatePresence>
        {activeWorkItem && (
          <div className="modal-backdrop" onClick={() => setActiveWorkItem(null)}>
            <motion.div 
              className="modal-box"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <button className="modal-close-btn" onClick={() => setActiveWorkItem(null)}>×</button>
              <div className="modal-img"><img src={activeWorkItem.image} alt={activeWorkItem.title} /></div>
              <h2>{activeWorkItem.title}</h2>
              <p className="modal-category-text">{activeWorkItem.category} • {activeWorkItem.metrics}</p>
              <div className="modal-action-bar">
                <button className="btn-close-modal" onClick={() => setActiveWorkItem(null)}>Close</button>
                <a href="/login" className="btn-launch-modal">Open Workspace</a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
