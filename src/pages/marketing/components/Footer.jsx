import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer-container">
      <div className="footer-content mkt-container">
        {/* Brand Information Column */}
        <div className="footer-brand-col">
          <Link to="/" className="footer-logo">
            <img src="/logo.png" alt="Noska Logo" className="navbar-brand-logo" />
            <span className="logo-text">Noska</span>
          </Link>
          <div className="social-links">
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
              </svg>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="Youtube">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" />
                <polygon points="10 15 15 12 10 9" />
              </svg>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect x="2" y="9" width="4" height="12" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
          </div>
          <div className="language-selector">
            <Globe size={14} />
            <select aria-label="Select Language">
              <option value="en">English (US)</option>
              <option value="ja">日本語</option>
              <option value="es">Español</option>
              <option value="fr">Français</option>
            </select>
          </div>
        </div>

        {/* Footer Navigation Columns */}
        <div className="footer-links-col">
          <p className="footer-col-title">Product</p>
          <ul>
            <li><Link to="/product">Noska AI</Link></li>
            <li><Link to="/product">Docs</Link></li>
            <li><Link to="/product">Wikis</Link></li>
            <li><Link to="/product">Projects</Link></li>
            <li><a href="#whats-new">What's new</a></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <p className="footer-col-title">Solutions</p>
          <ul>
            <li><Link to="/enterprise">Enterprise</Link></li>
            <li><a href="#small-business">Small business</a></li>
            <li><a href="#personal">Personal</a></li>
            <li><a href="#design">Design</a></li>
            <li><a href="#engineering">Engineering</a></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <p className="footer-col-title">Resources</p>
          <ul>
            <li><a href="#help">Help center</a></li>
            <li><a href="#guides">Guides & tutorials</a></li>
            <li><a href="#community">Community</a></li>
            <li><a href="#templates">Templates</a></li>
            <li><a href="#integrations">Integrations</a></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <p className="footer-col-title">Company</p>
          <ul>
            <li><a href="#about">About us</a></li>
            <li><a href="#careers">Careers</a></li>
            <li><a href="#media">Media kit</a></li>
            <li><Link to="/enterprise">Contact sales</Link></li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom mkt-container">
        <p className="copyright-text">© {new Date().getFullYear()} Noska Labs, Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
