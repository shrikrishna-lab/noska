import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { useSocialLinks, useCTAButtons, useLaunchSettings } from '../../../hooks/useLaunchSettings';
import './Footer.css';

const SOCIAL_ICONS: Record<string, JSX.Element> = {
  x: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>,
  youtube: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17z" /><polygon points="10 15 15 12 10 9" /></svg>,
  linkedin: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>,
  github: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>,
  discord: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12a1 1 0 1 0 2 0 1 1 0 0 0-2 0Zm6 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0Z" /><path d="M15.5 6.5c3 .5 5.5 2.5 5.5 5.5 0 3.5-3 6-7 6s-7-2.5-7-6c0-3 2.5-5 5.5-5.5" /><path d="m9 17-1 4 3.5-2" /><path d="m15 17 1 4-3.5-2" /></svg>,
};

export default function Footer() {
  const { links } = useSocialLinks();
  const { getButton, getButtonText } = useCTAButtons();
  const { settings } = useLaunchSettings();
  const footerCta = getButton('footer_cta');
  const finalCtaPrimary = getButton('final_cta_primary');
  const finalCtaSecondary = getButton('final_cta_secondary');

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
            {links.filter(l => l.active).map((link) => (
              <a key={link.platform} href={link.url} target="_blank" rel="noreferrer" aria-label={link.label ?? link.platform}>
                {SOCIAL_ICONS[link.platform] ?? <span title={link.platform}>🔗</span>}
              </a>
            ))}
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

        {/* Footer Navigation Columns — every link below points at a real
            in-app route. Nothing links to a placeholder blog/careers/media
            page that doesn't exist yet. */}
        <div className="footer-links-col">
          <p className="footer-col-title">Product</p>
          <ul>
            <li><Link to="/product">Noska AI</Link></li>
            <li><Link to="/product">Docs</Link></li>
            <li><Link to="/product">Databases</Link></li>
            {settings.show_changelog && <li><Link to="/changelog">What's new</Link></li>}
          </ul>
        </div>

        <div className="footer-links-col">
          <p className="footer-col-title">Solutions</p>
          <ul>
            <li><Link to="/solutions">Personal use</Link></li>
            <li><Link to="/solutions">Students & teams</Link></li>
            <li><Link to="/enterprise">Enterprise</Link></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <p className="footer-col-title">Resources</p>
          <ul>
            {settings.show_docs && <li><Link to="/docs">Documentation</Link></li>}
            {settings.show_blog && <li><Link to="/blog">Blog</Link></li>}
            {settings.show_changelog && <li><Link to="/changelog">Changelog</Link></li>}
            <li><Link to="/resources">Guides & shortcuts</Link></li>
            {settings.show_login && <li><Link to="/login">Help center</Link></li>}
          </ul>
        </div>

        <div className="footer-links-col">
          <p className="footer-col-title">Company</p>
          <ul>
            {settings.show_pricing && <li><Link to="/pricing">Pricing</Link></li>}
            <li><Link to="/enterprise">Enterprise</Link></li>
            {settings.show_blog && <li><Link to="/blog">Blog</Link></li>}
            <li><Link to="/launch">What's new</Link></li>
          </ul>
        </div>

        <div className="footer-links-col">
          <p className="footer-col-title">Developers</p>
          <ul>
            {settings.show_docs && <li><Link to="/docs">API Reference</Link></li>}
            {settings.show_changelog && <li><Link to="/changelog">Changelog</Link></li>}
            {settings.show_docs && <li><Link to="/docs">Documentation</Link></li>}
            {settings.show_login && <li><Link to="/login">Status</Link></li>}
          </ul>
        </div>
      </div>

      <div className="footer-bottom mkt-container">
        <div className="footer-bottom-links">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/policy">Cookies</Link>
        </div>
        <p className="copyright-text">© {new Date().getFullYear()} Noska. All rights reserved.</p>
      </div>
    </footer>
  );
}
