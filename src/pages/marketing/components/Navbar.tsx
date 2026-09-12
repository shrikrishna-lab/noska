import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, ArrowRight, Sparkles, FileText, Database, CheckSquare, Users, Building, Laptop, HelpCircle, BookOpen, Clock, MonitorDown, KeyRound, Terminal, Puzzle, Mic, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@clerk/react';
import { useCTAButtons, useLaunchSettings } from '../../../hooks/useLaunchSettings';
import { useLanguage } from '../../../contexts/LanguageContext';
import './Navbar.css';

const drawerMotion = {
  initial: { opacity: 0, y: -12, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.98 },
  transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

const dropdownMotion = {
  initial: { opacity: 0, y: 8, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();
  const { isSignedIn } = useAuth();
  const { getButton } = useCTAButtons();
  const { settings } = useLaunchSettings();
  const { t } = useLanguage();

  const navLoginBtn = getButton('navbar_login');
  const navCtaBtn = getButton('navbar_cta');
  const navDemoBtn = getButton('navbar_demo');
  const mobileLoginBtn = getButton('mobile_login');
  const mobileCtaBtn = getButton('mobile_cta');

  // Close mobile menu on page change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  return (
    <header className="liquid-glass-nav-header">
      <div className="liquid-glass-nav-wrap">
        {/* Outer Specular Precision Bezel Shell */}
        <div className="liquid-glass-nav-shell">
          {/* Inner Optical Frosted Glass Body */}
          <nav className="liquid-glass-nav-body">
            {/* Left Side: Brand & Links */}
            <div className="liquid-glass-nav-left">
              <Link to="/" className="liquid-glass-nav-brand">
                <div className="liquid-glass-nav-gem">
                  <img src="/logo.png?v=2" alt="Noska Logo" className="liquid-glass-nav-logo-img" />
                </div>
                <span className="liquid-glass-nav-brand-text">Noska</span>
              </Link>

              {/* Desktop Nav Links */}
              <div className="liquid-glass-nav-links">
                {/* Product Dropdown */}
                <div
                  className="liquid-nav-dropdown-wrap"
                  onMouseEnter={() => setActiveDropdown('product')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className={`liquid-nav-btn ${activeDropdown === 'product' ? 'active' : ''}`}>
                    <span>{t('nav.product', 'Product')}</span>
                    <ChevronDown size={13} className={`liquid-chevron ${activeDropdown === 'product' ? 'rotate' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'product' && (
                      <motion.div className="liquid-glass-dropdown-panel" {...dropdownMotion}>
                        <div className="liquid-dropdown-grid">
                          <Link to="/product" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box purple">
                              <Sparkles size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Noska AI</p>
                              <p className="liquid-dropdown-desc">Context-aware assistant & generation</p>
                            </div>
                          </Link>
                          <Link to="/flow" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box emerald">
                              <Mic size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Noska Flow</p>
                              <p className="liquid-dropdown-desc">Speech-to-text & fluid voice dictation</p>
                            </div>
                          </Link>
                          <Link to="/docs" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box blue">
                              <FileText size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Docs & Notes</p>
                              <p className="liquid-dropdown-desc">Fluid markdown canvas & blocks</p>
                            </div>
                          </Link>
                          <Link to="/docs?section=databases" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box red">
                              <Database size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Databases</p>
                              <p className="liquid-dropdown-desc">Relational tables, boards & views</p>
                            </div>
                          </Link>
                          <Link to="/product" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box yellow">
                              <CheckSquare size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Projects</p>
                              <p className="liquid-dropdown-desc">Connected tasks & team roadmaps</p>
                            </div>
                          </Link>
                          <Link to="/docs?section=canvas" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box sage">
                              <LayoutGrid size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Canvas & Wikis</p>
                              <p className="liquid-dropdown-desc">Visual whiteboard & thought graph</p>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Solutions Dropdown */}
                <div
                  className="liquid-nav-dropdown-wrap"
                  onMouseEnter={() => setActiveDropdown('solutions')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className={`liquid-nav-btn ${activeDropdown === 'solutions' ? 'active' : ''}`}>
                    <span>{t('nav.solutions', 'Solutions')}</span>
                    <ChevronDown size={13} className={`liquid-chevron ${activeDropdown === 'solutions' ? 'rotate' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'solutions' && (
                      <motion.div className="liquid-glass-dropdown-panel" {...dropdownMotion}>
                        <div className="liquid-dropdown-grid single-col">
                          <Link to="/solutions" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box sage">
                              <Users size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Personal & Students</p>
                              <p className="liquid-dropdown-desc">Organize life, study notes & thinking</p>
                            </div>
                          </Link>
                          <Link to="/solutions" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box pink">
                              <Laptop size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Startups & Teams</p>
                              <p className="liquid-dropdown-desc">High velocity collaborative workspace</p>
                            </div>
                          </Link>
                          <Link to="/enterprise" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box blue">
                              <Building size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Enterprise</p>
                              <p className="liquid-dropdown-desc">Security, SOC2 compliance & scale</p>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Resources Dropdown */}
                <div
                  className="liquid-nav-dropdown-wrap"
                  onMouseEnter={() => setActiveDropdown('resources')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className={`liquid-nav-btn ${activeDropdown === 'resources' ? 'active' : ''}`}>
                    <span>{t('nav.resources', 'Resources')}</span>
                    <ChevronDown size={13} className={`liquid-chevron ${activeDropdown === 'resources' ? 'rotate' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'resources' && (
                      <motion.div className="liquid-glass-dropdown-panel" {...dropdownMotion}>
                        <div className="liquid-dropdown-grid single-col">
                          <Link to="/download" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box sage">
                              <MonitorDown size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Download for Desktop</p>
                              <p className="liquid-dropdown-desc">Windows, macOS &amp; Linux</p>
                            </div>
                          </Link>
                          <Link to="/resources" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box orange">
                              <BookOpen size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Guides & Shortcuts</p>
                              <p className="liquid-dropdown-desc">Keyboard mastery and workflows</p>
                            </div>
                          </Link>
                          {settings.show_docs !== false && (
                            <Link to="/docs" className="liquid-dropdown-item">
                              <div className="liquid-dropdown-icon-box blue">
                                <FileText size={16} />
                              </div>
                              <div className="liquid-dropdown-info">
                                <p className="liquid-dropdown-title">Documentation</p>
                                <p className="liquid-dropdown-desc">API reference, SDKs & guides</p>
                              </div>
                            </Link>
                          )}
                          {settings.show_changelog && (
                            <Link to="/changelog" className="liquid-dropdown-item">
                              <div className="liquid-dropdown-icon-box purple">
                                <Clock size={16} />
                              </div>
                              <div className="liquid-dropdown-info">
                                <p className="liquid-dropdown-title">Changelog</p>
                                <p className="liquid-dropdown-desc">Weekly releases and improvements</p>
                              </div>
                            </Link>
                          )}
                          <Link to="/login" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box red">
                              <HelpCircle size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Help Center</p>
                              <p className="liquid-dropdown-desc">24/7 support and user community</p>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Developers Dropdown */}
                <div
                  className="liquid-nav-dropdown-wrap"
                  onMouseEnter={() => setActiveDropdown('developers')}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button className={`liquid-nav-btn ${activeDropdown === 'developers' ? 'active' : ''}`}>
                    <span>{t('nav.developers', 'Developers')}</span>
                    <ChevronDown size={13} className={`liquid-chevron ${activeDropdown === 'developers' ? 'rotate' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {activeDropdown === 'developers' && (
                      <motion.div className="liquid-glass-dropdown-panel" {...dropdownMotion}>
                        <div className="liquid-dropdown-grid single-col">
                          <Link to="/api-keys" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box blue">
                              <KeyRound size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">API Keys</p>
                              <p className="liquid-dropdown-desc">Scoped keys for the REST API</p>
                            </div>
                          </Link>
                          <Link to="/mcp" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box sage">
                              <Terminal size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">MCP</p>
                              <p className="liquid-dropdown-desc">Noska in Claude, Cursor & any AI client</p>
                            </div>
                          </Link>
                          <Link to="/plugins" className="liquid-dropdown-item">
                            <div className="liquid-dropdown-icon-box purple">
                              <Puzzle size={16} />
                            </div>
                            <div className="liquid-dropdown-info">
                              <p className="liquid-dropdown-title">Plugins</p>
                              <p className="liquid-dropdown-desc">Extend Noska with verified integrations</p>
                            </div>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {settings.show_pricing && (
                  <Link to="/pricing" className={`liquid-nav-link ${location.pathname === '/pricing' ? 'active' : ''}`}>
                    {t('nav.pricing', 'Pricing')}
                  </Link>
                )}
                {settings.show_changelog && (
                  <Link to="/changelog" className={`liquid-nav-link ${location.pathname === '/changelog' ? 'active' : ''}`}>
                    {t('nav.whatsNew', "What's New")}
                  </Link>
                )}
              </div>
            </div>

            {/* Right Side: CTA Actions */}
            <div className="liquid-glass-nav-right">
              {isSignedIn ? (
                /* Signed-in visitor browsing the marketing site: one clear
                   path back into the product, no login/signup funnel. */
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/dashboard" className="liquid-glass-nav-cta-btn hide-mobile">
                    <span>{t('nav.openApp', 'Open app')}</span>
                    <ArrowRight size={13} className="shrink-0" />
                  </Link>
                </motion.div>
              ) : (
                <>
                  {navDemoBtn.visible && navDemoBtn.enabled && (
                    <Link to={navDemoBtn.destination} className="liquid-nav-link-secondary hide-mobile">
                      {navDemoBtn.button_text}
                    </Link>
                  )}

                  {navLoginBtn.visible && navLoginBtn.enabled && settings.show_login && (
                    <Link to={navLoginBtn.destination} className="liquid-nav-link-secondary hide-mobile">
                      {navLoginBtn.button_text}
                    </Link>
                  )}

                  {navCtaBtn.visible && navCtaBtn.enabled && settings.show_signup && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                      <Link to={navCtaBtn.destination} className="liquid-glass-nav-cta-btn hide-mobile">
                        <span>{navCtaBtn.button_text}</span>
                        <ArrowRight size={13} className="shrink-0" />
                      </Link>
                    </motion.div>
                  )}
                </>
              )}

              {/* Mobile Hamburger Toggle */}
              <button
                className="liquid-glass-mobile-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Glass Drawer Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="liquid-glass-mobile-drawer"
              data-lenis-prevent
              {...drawerMotion}
            >
              <div className="liquid-mobile-links-container">
                <div className="liquid-mobile-group">
                  <p className="liquid-mobile-group-header">Product</p>
                  <Link to="/product" className="liquid-mobile-item">Noska AI</Link>
                  <Link to="/flow" className="liquid-mobile-item">Noska Flow</Link>
                  <Link to="/docs" className="liquid-mobile-item">Docs & Notes</Link>
                  <Link to="/docs?section=databases" className="liquid-mobile-item">Databases</Link>
                  <Link to="/product" className="liquid-mobile-item">Projects</Link>
                  <Link to="/docs?section=canvas" className="liquid-mobile-item">Canvas &amp; Whiteboard</Link>
                </div>

                <div className="liquid-mobile-group">
                  <p className="liquid-mobile-group-header">Solutions</p>
                  <Link to="/solutions" className="liquid-mobile-item">Personal & Students</Link>
                  <Link to="/solutions" className="liquid-mobile-item">Startups & Teams</Link>
                  <Link to="/enterprise" className="liquid-mobile-item">Enterprise</Link>
                </div>

                <div className="liquid-mobile-group">
                  <p className="liquid-mobile-group-header">Resources</p>
                  <Link to="/download" className="liquid-mobile-item">Download for Desktop</Link>
                  <Link to="/resources" className="liquid-mobile-item">Guides & Shortcuts</Link>
                  {settings.show_docs !== false && <Link to="/docs" className="liquid-mobile-item">Documentation</Link>}
                  {settings.show_changelog !== false && <Link to="/changelog" className="liquid-mobile-item">Changelog</Link>}
                  {settings.show_pricing !== false && <Link to="/pricing" className="liquid-mobile-item">Pricing</Link>}
                </div>

                <div className="liquid-mobile-group">
                  <p className="liquid-mobile-group-header">Developers</p>
                  <Link to="/api-keys" className="liquid-mobile-item">API Keys</Link>
                  <Link to="/mcp" className="liquid-mobile-item">MCP</Link>
                  <Link to="/plugins" className="liquid-mobile-item">Plugins</Link>
                </div>

                <div className="liquid-mobile-actions">
                  {isSignedIn ? (
                    <Link to="/dashboard" className="liquid-mobile-btn-primary">
                      Open app
                    </Link>
                  ) : (
                    <>
                      {mobileLoginBtn.visible && mobileLoginBtn.enabled && settings.show_login && (
                        <Link to={mobileLoginBtn.destination} className="liquid-mobile-btn-secondary">
                          {mobileLoginBtn.button_text}
                        </Link>
                      )}
                      {mobileCtaBtn.visible && mobileCtaBtn.enabled && settings.show_signup && (
                        <Link to={mobileCtaBtn.destination} className="liquid-mobile-btn-primary">
                          {mobileCtaBtn.button_text}
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}
