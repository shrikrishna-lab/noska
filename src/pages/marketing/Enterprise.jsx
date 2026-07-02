import { useState } from 'react';
import {
  Building2, Shield, Key, CheckCircle,
  ArrowRight, Lock, Globe2, Send
} from 'lucide-react';
import './Enterprise.css';

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.company) return;
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
          <div className="enterprise-isometric-card">
            <div className="card-top-bar">
              <Shield size={16} className="text-purple" />
              <span>Enterprise Admin Controls</span>
            </div>
            <div className="isometric-content">
              <div className="iso-row">
                <span className="iso-label">SAML Single Sign-On (SSO)</span>
                <span className="iso-status active">Active</span>
              </div>
              <div className="iso-row">
                <span className="iso-label">SCIM User Provisioning</span>
                <span className="iso-status active">Active</span>
              </div>
              <div className="iso-row">
                <span className="iso-label">Audit Logs Export</span>
                <span className="iso-status idle">Ready</span>
              </div>
              <div className="iso-row">
                <span className="iso-label">IP Range Restrictions</span>
                <span className="iso-status idle">Configured</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Trust Banner / Scale stats */}
      <section className="trust-banner-section">
        <div className="mkt-container trust-container">
          <p className="trust-title">Trusted by industry leaders worldwide</p>
          <div className="trust-logos">
            <div className="trust-logo-card">
              <span>Forbes Cloud 100</span>
            </div>
            <div className="trust-logo-card">
              <span>SOC2 Type II</span>
            </div>
            <div className="trust-logo-card">
              <span>ISO 27001 Certified</span>
            </div>
            <div className="trust-logo-card">
              <span>HIPAA Compliant</span>
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
                <h3>Enforce company-wide safety rules.</h3>
                <p>Verify user logins via SAML Single Sign-On (SSO) integrations like Okta, Azure AD, or OneLogin. Block public page sharing and prevent external downloads of sensitive company specs.</p>
                <ul className="bullet-checklist">
                  <li><CheckCircle size={16} className="check-icon" /> Single Sign-On integration</li>
                  <li><CheckCircle size={16} className="check-icon" /> Granular guest sharing permissions</li>
                  <li><CheckCircle size={16} className="check-icon" /> Domain verification policies</li>
                </ul>
              </>
            )}
            {activeSubTab === 'scale' && (
              <>
                <h3>Partition domains & manage growth.</h3>
                <p>Support thousands of employees with private workspaces, departmental wikis, and team-specific integrations. Connect Slack channels directly to engineering teamspaces while keeping executive boards private.</p>
                <ul className="bullet-checklist">
                  <li><CheckCircle size={16} className="check-icon" /> Multi-workspace structure</li>
                  <li><CheckCircle size={16} className="check-icon" /> Custom teamspace templates</li>
                  <li><CheckCircle size={16} className="check-icon" /> Automated guest user cleanups</li>
                </ul>
              </>
            )}
            {activeSubTab === 'admin' && (
              <>
                <h3>Audit user actions and manage API tokens.</h3>
                <p>Monitor change histories, audit page edits, and track document shares with detailed audit logs. Export reports to JSON or connect with security monitoring platforms (SIEM) like Splunk.</p>
                <ul className="bullet-checklist">
                  <li><CheckCircle size={16} className="check-icon" /> Interactive audit log history</li>
                  <li><CheckCircle size={16} className="check-icon" /> SCIM automated member sync</li>
                  <li><CheckCircle size={16} className="check-icon" /> Developer API tokens sandbox</li>
                </ul>
              </>
            )}
          </div>
          <div className="showcase-content-right">
            {activeSubTab === 'security' && (
              <div className="showcase-graphic security-graphic">
                <Lock size={48} className="text-blue centered-icon" />
                <div className="graphic-mini-badge">SSO Verified</div>
                <div className="graphic-mini-badge">GDPR Compliant</div>
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
              <div className="showcase-graphic admin-graphic">
                <div className="log-rows">
                  <div className="log-row"><span>Sarah L.</span> <span>edited</span> <span>Brand Deck</span></div>
                  <div className="log-row"><span>John K.</span> <span>shared</span> <span>API keys</span></div>
                  <div className="log-row"><span>Admin</span> <span>revoked</span> <span>Guest #34</span></div>
                </div>
              </div>
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
              <p className="quote-text">"Noska consolidated 5 separate collaboration platforms into a single source of truth for our 1,200 employees."</p>
              <p className="quote-author">— Head of Engineering, Pixar Animation Studios</p>
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
                <button type="submit" className="btn btn-primary submit-btn">
                  Submit <Send size={14} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
