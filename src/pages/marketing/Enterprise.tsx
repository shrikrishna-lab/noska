import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Building2, Shield, Key, CheckCircle,
  ArrowRight, Lock, Globe2, Send, Terminal, History, UserCog, FileClock,
} from 'lucide-react';
import { HeroWipeSlideshow } from './components/HeroWipeSlideshow';
import { XOrbit } from './components/XOrbit';
import './Enterprise.css';

const ADMIN_ORBIT_ITEMS = [
  { icon: Terminal, label: 'API console' },
  { icon: FileClock, label: 'Page history' },
  { icon: UserCog, label: 'Guest limits' },
  { icon: History, label: 'Note lineage' },
];

export default function Enterprise() {
  const [activeSubTab, setActiveSubTab] = useState('security');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    employees: '100-500',
    message: ''
  });
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.company) return;
    setFormSubmitting(true);
    setFormError('');

    try {
      const BASE = import.meta.env.VITE_SUPABASE_URL;
      const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${BASE}/functions/v1/demo-request-submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': ANON },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || `HTTP ${res.status}`);
        setFormSubmitting(false);
        return;
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
      setFormSubmitting(false);
      return;
    }

    setFormSubmitting(false);
    setFormSubmitted(true);
  };

  return (
    <div className="enterprise-wrapper">
      {/* 1. Enterprise Hero */}
      <section className="enterprise-hero mkt-container">
        <div className="hero-info">
          <span className="enterprise-tag">
            <Building2 size={14} /> Noska Enterprise
          </span>
          <h1>Empower your team. Safeguard your data.</h1>
          <p>The connected workspace built for organization-wide scale. Manage access, ensure data compliance, and centralize documentation across thousands of employees.</p>
          <div className="hero-cta-group">
            <a href="#request-demo-form" className="btn btn-primary btn-lg">
              Request a demo <ArrowRight size={16} />
            </a>
            <a href="#contact" className="btn btn-secondary btn-lg">
              Contact sales
            </a>
          </div>
        </div>
        <div className="hero-visual">
          <HeroWipeSlideshow
            className="enterprise-hero-slideshow"
            slides={[
              <div className="enterprise-isometric-card" key="access">
                <div className="card-top-bar">
                  <Shield size={16} className="text-purple" />
                  <span>Access & Data Controls</span>
                </div>
                <div className="isometric-content">
                  <div className="iso-row">
                    <span className="iso-label">Google / GitHub OAuth</span>
                    <span className="iso-status active">Active</span>
                  </div>
                  <div className="iso-row">
                    <span className="iso-label">Owner-scoped row-level security</span>
                    <span className="iso-status active">Active</span>
                  </div>
                  <div className="iso-row">
                    <span className="iso-label">Client-side page encryption</span>
                    <span className="iso-status active">Active</span>
                  </div>
                  <div className="iso-row">
                    <span className="iso-label">SAML SSO / SCIM</span>
                    <span className="iso-status idle">Roadmap</span>
                  </div>
                </div>
              </div>,
              <div className="enterprise-isometric-card" key="workspace">
                <div className="card-top-bar">
                  <Globe2 size={16} className="text-blue" />
                  <span>Workspace Scale</span>
                </div>
                <div className="isometric-content">
                  <div className="iso-row">
                    <span className="iso-label">Deep page nesting</span>
                    <span className="iso-status active">No practical limit</span>
                  </div>
                  <div className="iso-row">
                    <span className="iso-label">Thought Graph navigation</span>
                    <span className="iso-status active">Active</span>
                  </div>
                  <div className="iso-row">
                    <span className="iso-label">Multi-workspace & team roles</span>
                    <span className="iso-status idle">Roadmap</span>
                  </div>
                </div>
              </div>,
              <div className="enterprise-isometric-card" key="admin">
                <div className="card-top-bar">
                  <Key size={16} className="text-purple" />
                  <span>Admin Control</span>
                </div>
                <div className="isometric-content">
                  <div className="iso-row">
                    <span className="iso-label">In-app API console</span>
                    <span className="iso-status active">Active</span>
                  </div>
                  <div className="iso-row">
                    <span className="iso-label">Page history & note lineage</span>
                    <span className="iso-status active">Active</span>
                  </div>
                  <div className="iso-row">
                    <span className="iso-label">SCIM provisioning & SIEM export</span>
                    <span className="iso-status idle">Roadmap</span>
                  </div>
                </div>
              </div>,
            ]}
          />
        </div>
      </section>

      {/* 2. What's actually in place today — no unearned compliance badges */}
      <section className="trust-banner-section">
        <div className="mkt-container trust-container">
          <p className="trust-title">What's actually built in, today</p>
          <div className="trust-logos">
            <div className="trust-logo-card">
              <span>Postgres row-level security, owner-scoped</span>
            </div>
            <div className="trust-logo-card">
              <span>Auth required for every write</span>
            </div>
            <div className="trust-logo-card">
              <span>Client-side AES-GCM page encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Tabbed Grid */}
      <section className="enterprise-features mkt-container">
        <div className="section-header">
          <h2>Enterprise grade controls</h2>
          <p>Everything you need to secure your documents, manage workspaces, and verify user permissions.</p>
        </div>

        <div className="sub-tab-group">
          <button
            className={`sub-tab-btn ${activeSubTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('security')}
          >
            <Shield size={16} />
            <span>Security & Governance</span>
          </button>
          <button
            className={`sub-tab-btn ${activeSubTab === 'scale' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('scale')}
          >
            <Globe2 size={16} />
            <span>Workspace Scale</span>
          </button>
          <button
            className={`sub-tab-btn ${activeSubTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('admin')}
          >
            <Key size={16} />
            <span>Admin Control</span>
          </button>
        </div>

        {/* Tab Showcase content */}
        <div className="sub-tab-showcase">
          <div className="showcase-content-left">
            {activeSubTab === 'security' && (
              <>
                <h3>Owner-scoped data access, by default.</h3>
                <p>Every table is protected by Postgres row-level security scoped to the authenticated user — not a shared "allow all" policy. Locked pages are encrypted client-side with AES-GCM before anything is stored.</p>
                <ul className="bullet-checklist">
                  <li><CheckCircle size={16} className="check-icon" /> Google / GitHub OAuth via Clerk</li>
                  <li><CheckCircle size={16} className="check-icon" /> Row-level security on every table</li>
                  <li><CheckCircle size={16} className="check-icon" /> SAML SSO — on the roadmap, not yet shipped</li>
                </ul>
              </>
            )}
            {activeSubTab === 'scale' && (
              <>
                <h3>Built for one workspace, growing toward many.</h3>
                <p>Today, Noska supports a single workspace per account with a full page tree, database views, and the Thought Graph to keep large knowledge bases navigable. Multi-workspace and team roles are next on the roadmap.</p>
                <ul className="bullet-checklist">
                  <li><CheckCircle size={16} className="check-icon" /> Deep page nesting, no practical depth limit</li>
                  <li><CheckCircle size={16} className="check-icon" /> Thought Graph for navigating large workspaces</li>
                  <li><CheckCircle size={16} className="check-icon" /> Multi-workspace & team roles — on the roadmap</li>
                </ul>
              </>
            )}
            {activeSubTab === 'admin' && (
              <>
                <h3>An open API console, not a black box.</h3>
                <p>The built-in API console documents every page/block route and lets you generate a token and run live requests against your own workspace data — no separate developer portal needed.</p>
                <ul className="bullet-checklist">
                  <li><CheckCircle size={16} className="check-icon" /> In-app API console with live request playground</li>
                  <li><CheckCircle size={16} className="check-icon" /> Page history and note lineage tracking</li>
                  <li><CheckCircle size={16} className="check-icon" /> SCIM provisioning & SIEM export — on the roadmap</li>
                </ul>
              </>
            )}
          </div>
          <div className="showcase-content-right">
            {activeSubTab === 'security' && (
              <div className="showcase-graphic security-graphic">
                <Lock size={48} className="text-blue centered-icon" />
                <div className="graphic-mini-badge">AES-GCM 256-bit</div>
                <div className="graphic-mini-badge">Row-level security</div>
              </div>
            )}
            {activeSubTab === 'scale' && (
              <div className="showcase-graphic scale-graphic">
                <div className="workspace-boxes">
                  <div className="w-box">📁 Design</div>
                  <div className="w-box">📁 Engineering</div>
                  <div className="w-box">📁 Legal</div>
                </div>
              </div>
            )}
            {activeSubTab === 'admin' && (
              <XOrbit centerIcon={Key} centerLabel="Admin" items={ADMIN_ORBIT_ITEMS} radius={100} size={260} />
            )}
          </div>
        </div>
      </section>

      {/* 4. Request Demo Form Section */}
      <section id="request-demo-form" className="request-demo-section mkt-container">
        <div className="demo-form-grid">
          <div className="demo-form-left">
            <h2>Let's talk about setting up Noska for your organization.</h2>
            <p>Schedule a call with one of our enterprise architects to explore team plans, pricing options, API integrations, and customized security setups.</p>
            <div className="quote-box">
              <p className="quote-text">
                We're early — enterprise features like SSO and SCIM are still on the roadmap.
                If your team needs them, tell us and we'll build with you as a design partner,
                not after the fact.
              </p>
            </div>
          </div>
          <div className="demo-form-right" id="contact">
            {formSubmitted ? (
              <div className="success-message">
                <CheckCircle size={48} className="text-blue" />
                <h3>Thank you!</h3>
                <p>Our sales team will be in touch with you shortly at <strong>{formData.email}</strong> to coordinate a demo.</p>
              </div>
            ) : (
              <form className="contact-form" onSubmit={handleFormSubmit}>
                <h3>Request a Demo</h3>
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Jane Doe"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Work Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="jane@company.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="company">Company Name *</label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    required
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Acme Corporation"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="employees">Company Size *</label>
                  <select
                    id="employees"
                    name="employees"
                    value={formData.employees}
                    onChange={handleInputChange}
                  >
                    <option value="10-99">10 - 99 employees</option>
                    <option value="100-500">100 - 500 employees</option>
                    <option value="500-1000">500 - 1,000 employees</option>
                    <option value="1000+">1,000+ employees</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="message">Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    value={formData.message}
                    onChange={handleInputChange}
                    placeholder="Tell us what you are hoping to solve..."
                  />
                </div>
                {formError && (
                  <div className="form-error" style={{ color: '#ef4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <AlertCircle size={14} /> {formError}
                  </div>
                )}
                <button type="submit" className="btn btn-primary submit-btn" disabled={formSubmitting}>
                  {formSubmitting ? 'Submitting...' : <><Send size={14} /> Submit</>}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
