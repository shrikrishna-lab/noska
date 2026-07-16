import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedUnderline } from './AnimatedUnderline';
import './Navbar.css';

const drawerMotion = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] },
};

const dropdownMotion = {
  initial: { opacity: 0, y: 6, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
};

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const location = useLocation();

  // Close mobile menu on page change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  return (
    <nav className="navbar-container">
      <div className="navbar-content mkt-container">
        {/* Left Side: Logo & Main Navigation */}
        <div className="navbar-left">
          <Link to="/" className="navbar-logo">
            <img src="/logo.png?v=2" alt="Noska Logo" className="navbar-brand-logo" />
            <span className="logo-text">Noska</span>
          </Link>

          <div className="navbar-links">
            {/* Product Dropdown */}
            <div
              className="nav-item-dropdown"
              onMouseEnter={() => setActiveDropdown('product')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="nav-btn">
                Product <ChevronDown size={14} className={activeDropdown === 'product' ? 'rotate' : ''} />
              </button>
              <AnimatePresence>
                {activeDropdown === 'product' && (
                  <motion.div className="dropdown-panel" {...dropdownMotion}>
                    <div className="dropdown-section">
                      <div className="dropdown-grid">
                        <Link to="/product" className="dropdown-item">
                          <div className="mkt-avatar tint-purple">✨</div>
                          <div className="item-content">
                            <p className="item-title">Noska AI</p>
                            <p className="item-desc">Integrated AI assistant</p>
                          </div>
                        </Link>
                        <Link to="/product" className="dropdown-item">
                          <div className="mkt-avatar tint-blue">📝</div>
                          <div className="item-content">
                            <p className="item-title">Docs</p>
                            <p className="item-desc">Simple, beautiful documents</p>
                          </div>
                        </Link>
                        <Link to="/product" className="dropdown-item">
                          <div className="mkt-avatar tint-red">📚</div>
                          <div className="item-content">
                            <p className="item-title">Wikis</p>
                            <p className="item-desc">Centralize team knowledge</p>
                          </div>
                        </Link>
                        <Link to="/product" className="dropdown-item">
                          <div className="mkt-avatar tint-yellow">✅</div>
                          <div className="item-content">
                            <p className="item-title">Projects</p>
                            <p className="item-desc">Connected tasks & roadmaps</p>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Solutions Dropdown */}
            <div
              className="nav-item-dropdown"
              onMouseEnter={() => setActiveDropdown('solutions')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="nav-btn">
                Solutions <ChevronDown size={14} className={activeDropdown === 'solutions' ? 'rotate' : ''} />
              </button>
              <AnimatePresence>
                {activeDropdown === 'solutions' && (
                  <motion.div className="dropdown-panel" {...dropdownMotion}>
                    <div className="dropdown-grid single-col">
                      <Link to="/solutions" className="dropdown-item">
                        <div className="mkt-avatar tint-sage">🤝</div>
                        <div className="item-content">
                          <p className="item-title">All solutions</p>
                          <p className="item-desc">Personal, students, teams & writers</p>
                        </div>
                      </Link>
                      <Link to="/enterprise" className="dropdown-item">
                        <div className="mkt-avatar tint-blue">🏢</div>
                        <div className="item-content">
                          <p className="item-title">Enterprise</p>
                          <p className="item-desc">What's built, what's on the roadmap</p>
                        </div>
                      </Link>
                      <Link to="/solutions" className="dropdown-item">
                        <div className="mkt-avatar tint-pink">💼</div>
                        <div className="item-content">
                          <p className="item-title">Personal use</p>
                          <p className="item-desc">Organize your life & notes</p>
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Resources Dropdown */}
            <div
              className="nav-item-dropdown"
              onMouseEnter={() => setActiveDropdown('resources')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="nav-btn">
                Resources <ChevronDown size={14} className={activeDropdown === 'resources' ? 'rotate' : ''} />
              </button>
              <AnimatePresence>
                {activeDropdown === 'resources' && (
                  <motion.div className="dropdown-panel" {...dropdownMotion}>
                    <div className="dropdown-grid single-col">
                      <Link to="/resources" className="dropdown-item">
                        <div className="mkt-avatar tint-orange">🎓</div>
                        <div className="item-content">
                          <p className="item-title">Guides & shortcuts</p>
                          <p className="item-desc">Real keyboard shortcuts & feature guides</p>
                        </div>
                      </Link>
                      <Link to="/docs" className="dropdown-item">
                        <div className="mkt-avatar tint-blue">📚</div>
                        <div className="item-content">
                          <p className="item-title">Documentation</p>
                          <p className="item-desc">Guides, API reference & tutorials</p>
                        </div>
                      </Link>
                      <Link to="/changelog" className="dropdown-item">
                        <div className="mkt-avatar tint-purple">📖</div>
                        <div className="item-content">
                          <p className="item-title">Changelog</p>
                          <p className="item-desc">What's actually shipped, dated</p>
                        </div>
                      </Link>
                      <Link to="/login" className="dropdown-item">
                        <div className="mkt-avatar tint-red">🛟</div>
                        <div className="item-content">
                          <p className="item-title">Help center</p>
                          <p className="item-desc">In-app once you sign in</p>
                        </div>
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link to="/pricing" className={`nav-link ${location.pathname === '/pricing' ? 'active' : ''}`}>
              <AnimatedUnderline active={location.pathname === '/pricing'}>Pricing</AnimatedUnderline>
            </Link>
            <Link to="/changelog" className={`nav-link ${location.pathname === '/changelog' ? 'active' : ''}`}>
              <AnimatedUnderline active={location.pathname === '/changelog'}>Changelog</AnimatedUnderline>
            </Link>
          </div>
        </div>

        {/* Right Side: Account Actions */}
        <div className="navbar-right-actions">
          <Link to="/enterprise" className="nav-action-text hide-mobile">Request a demo</Link>
          <div className="divider-vertical hide-mobile"></div>
          <Link to="/login" className="nav-action-text hide-mobile">Log in</Link>
          <Link to="/login" className="btn btn-primary btn-nav-cta hide-mobile">Get Noska free</Link>
          <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div className="mobile-drawer" {...drawerMotion}>
            <div className="mobile-drawer-links">
              <div className="mobile-group">
                <p className="mobile-group-title">Product</p>
                <Link to="/product" className="mobile-item">Noska AI</Link>
                <Link to="/product" className="mobile-item">Docs</Link>
                <Link to="/product" className="mobile-item">Wikis</Link>
                <Link to="/product" className="mobile-item">Projects</Link>
              </div>

              <div className="mobile-group">
                <p className="mobile-group-title">Solutions</p>
                <Link to="/solutions" className="mobile-item">All solutions</Link>
                <Link to="/enterprise" className="mobile-item">Enterprise</Link>
              </div>

              <div className="mobile-group">
                <p className="mobile-group-title">Resources</p>
                <Link to="/resources" className="mobile-item">Guides & shortcuts</Link>
                <Link to="/docs" className="mobile-item">Documentation</Link>
                <Link to="/changelog" className="mobile-item">Changelog</Link>
                <Link to="/login" className="mobile-item">Help Center</Link>
              </div>

              <div className="mobile-flat-links">
                <Link to="/pricing" className="mobile-flat-item">Pricing</Link>
                <Link to="/enterprise" className="mobile-flat-item">Enterprise</Link>
                <Link to="/enterprise" className="mobile-flat-item">Request a demo</Link>
                <Link to="/login" className="mobile-flat-item">Log in</Link>
              </div>

              <Link to="/login" className="btn btn-primary mobile-cta-btn">
                Get Noska free <ArrowRight size={16} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
