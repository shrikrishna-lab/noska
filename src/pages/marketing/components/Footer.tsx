import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, ArrowRight, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocialLinks, useLaunchSettings } from '../../../hooks/useLaunchSettings';
import './Footer.css';

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  x: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  github: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  ),
  discord: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  ),
  youtube: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
      <polygon points="10 15 15 12 10 9" />
    </svg>
  ),
  linkedin: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.2a1.64 1.64 0 1 0 1.64 1.63A1.64 1.64 0 0 0 7.83 6.2z" />
    </svg>
  ),
};

export default function Footer() {
  const { links } = useSocialLinks();
  const { settings } = useLaunchSettings();
  const showSocial = settings.show_social_links ?? true;
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const fallbackSocialLinks = [
    { platform: 'x', url: 'https://x.com/noska_app', label: 'X (Twitter)', active: true },
    { platform: 'github', url: 'https://github.com/shrikrishna-lab/noska', label: 'GitHub', active: true },
    { platform: 'discord', url: 'https://discord.gg/noska', label: 'Discord', active: true },
    { platform: 'linkedin', url: 'https://linkedin.com/company/noska', label: 'LinkedIn', active: true },
  ];

  const activeSocialLinks = links && links.length > 0 && links.some((l) => l.active)
    ? links.filter((l) => l.active)
    : fallbackSocialLinks;

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 4000);
    }, 600);
  };

  return (
    <footer className="liquid-glass-footer-section">
      <div className="liquid-glass-footer-wrap">
        {/* Outer Specular Reflection Border Shell */}
        <div className="liquid-glass-shell">
          {/* Inner Frosted Glass Card Container */}
          <div className="liquid-glass-content">
            {/* Top Row: Brand, Newsletter & Link Columns */}
            <div className="liquid-glass-top-row">
              {/* Brand Column */}
              <div className="liquid-glass-brand-col">
                <Link to="/" className="liquid-glass-logo-link">
                  <div className="liquid-glass-logo-badge">
                    <img src="/logo.png" alt="Noska Logo" className="liquid-glass-logo-img" />
                  </div>
                  <span className="liquid-glass-logo-text">Noska</span>
                </Link>

                {/* Liquid Glass Newsletter Capsule */}
                <form className="liquid-glass-newsletter-form" onSubmit={handleSubscribe}>
                  <div className="liquid-glass-input-capsule">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your email address…"
                      className="liquid-glass-email-input"
                      required
                      disabled={subscribed || loading}
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className={`liquid-glass-submit-btn ${subscribed ? 'subscribed' : ''}`}
                      disabled={loading || subscribed}
                    >
                      {subscribed ? (
                        <>
                          <Check size={13} className="shrink-0" />
                          <span>Joined</span>
                        </>
                      ) : loading ? (
                        <span>…</span>
                      ) : (
                        <>
                          <span>Subscribe</span>
                          <ArrowRight size={12} className="shrink-0" />
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>

                {/* Language Selector Pill */}
                <div className="liquid-glass-pills-row">
                  <div className="liquid-glass-lang-pill">
                    <Globe size={13} className="text-muted-icon" />
                    <select aria-label="Select Language" defaultValue="en">
                      <option value="en">English (US)</option>
                      <option value="ja">日本語</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Link Columns */}
              <div className="liquid-glass-links-grid">
                {/* Column 1: Product */}
                <div className="liquid-glass-link-col">
                  <p className="liquid-glass-col-header">Product</p>
                  <ul className="liquid-glass-link-list">
                    <li><Link to="/product" className="liquid-link-item">Noska AI</Link></li>
                    <li><Link to="/flow" className="liquid-link-item">Noska Flow</Link></li>
                    <li><Link to="/docs" className="liquid-link-item">Docs & Notes</Link></li>
                    <li><Link to="/docs?section=databases" className="liquid-link-item">Databases</Link></li>
                    <li><Link to="/resources" className="liquid-link-item">Templates</Link></li>
                    <li><Link to="/download" className="liquid-link-item">Desktop app</Link></li>
                    <li>
                      <Link to="/new-updated" className="liquid-link-item with-badge">
                        <span>What's new</span>
                        <span className="liquid-glass-mini-tag">v2.4</span>
                      </Link>
                    </li>
                  </ul>
                </div>

                {/* Column 2: Solutions */}
                <div className="liquid-glass-link-col">
                  <p className="liquid-glass-col-header">Solutions</p>
                  <ul className="liquid-glass-link-list">
                    <li><Link to="/solutions" className="liquid-link-item">Personal use</Link></li>
                    <li><Link to="/solutions" className="liquid-link-item">Students & teams</Link></li>
                    <li><Link to="/enterprise" className="liquid-link-item">Enterprise</Link></li>
                    <li><Link to="/solutions" className="liquid-link-item">Startups</Link></li>
                  </ul>
                </div>

                {/* Column 3: Resources */}
                <div className="liquid-glass-link-col">
                  <p className="liquid-glass-col-header">Resources</p>
                  <ul className="liquid-glass-link-list">
                    <li><Link to="/docs" className="liquid-link-item">Documentation</Link></li>
                    <li><Link to="/docs?section=integrations-overview" className="liquid-link-item">Integrations</Link></li>
                    <li><Link to="/ticket" className="liquid-link-item">Submit Ticket</Link></li>
                    <li><Link to="/docs?section=contact-support" className="liquid-link-item">Help & Support</Link></li>
                    <li><Link to="/changelog" className="liquid-link-item">Changelog</Link></li>
                    <li><Link to="/roadmap" className="liquid-link-item">Roadmap</Link></li>
                    <li><Link to="/resources" className="liquid-link-item">Guides & shortcuts</Link></li>
                    <li><Link to="/blog" className="liquid-link-item">Blog</Link></li>
                  </ul>
                </div>

                {/* Column 4: Company */}
                <div className="liquid-glass-link-col">
                  <p className="liquid-glass-col-header">Company</p>
                  <ul className="liquid-glass-link-list">
                    <li><Link to="/pricing" className="liquid-link-item">Pricing</Link></li>
                    <li><Link to="/enterprise" className="liquid-link-item">Enterprise</Link></li>
                    <li><Link to="/support" className="liquid-link-item">Support & Tickets</Link></li>
                    <li><Link to="/new-updated" className="liquid-link-item">What's Updated</Link></li>
                    <li><Link to="/launch" className="liquid-link-item">About Noska</Link></li>
                    <li><Link to="/resources" className="liquid-link-item">Brand assets</Link></li>
                    <li><Link to="/launch" className="liquid-link-item">Join Waitlist</Link></li>
                  </ul>
                </div>

                {/* Column 5: Developers */}
                <div className="liquid-glass-link-col">
                  <p className="liquid-glass-col-header">Developers</p>
                  <ul className="liquid-glass-link-list">
                    <li><Link to="/api-keys" className="liquid-link-item">API Keys</Link></li>
                    <li><Link to="/mcp" className="liquid-link-item">MCP</Link></li>
                    <li><Link to="/plugins" className="liquid-link-item">Plugins</Link></li>
                    <li><Link to="/docs?section=api-reference" className="liquid-link-item">API Reference</Link></li>
                    <li><Link to="/docs/mcp" className="liquid-link-item">Webhooks & MCP docs</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Liquid Hairline Divider */}
            <div className="liquid-glass-divider" />

            {/* Bottom Row: Legal & Liquid Social Pebbles */}
            <div className="liquid-glass-bottom-row">
              <div className="liquid-glass-legal-side">
                <p className="liquid-glass-copyright">
                  © {new Date().getFullYear()} Noska Inc. All rights reserved.
                </p>
                <div className="liquid-glass-legal-links">
                  <Link to="/privacy">Privacy</Link>
                  <span className="liquid-legal-sep">•</span>
                  <Link to="/terms">Terms</Link>
                  <span className="liquid-legal-sep">•</span>
                  <Link to="/policy">Cookies</Link>
                  <span className="liquid-legal-sep">•</span>
                  <Link to="/refund">Refunds</Link>
                </div>
              </div>

              {/* Social Buttons */}
              {showSocial && (
                <div className="liquid-glass-social-row">
                  {activeSocialLinks.map((link) => (
                    <motion.a
                      key={link.platform}
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={link.label ?? link.platform}
                      className="liquid-glass-social-btn"
                      whileHover={{ y: -3, scale: 1.08 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      {SOCIAL_ICONS[link.platform] ?? <span title={link.platform}>🔗</span>}
                    </motion.a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
