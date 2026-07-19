import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCTAButtons } from '../../../../hooks/useLaunchSettings';

const ANCHOR_LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'ai', label: 'AI' },
  { id: 'projects', label: 'Projects' },
  { id: 'faq', label: 'FAQ' },
];

const ROUTE_LINKS = [
  { to: '/product', label: 'Docs' },
  { to: '/pricing', label: 'Pricing' },
];

function LaunchNavCTAs({ scrollToScratch, setMobileOpen, mobile }: { scrollToScratch: (id: string) => (e: React.MouseEvent) => void; setMobileOpen: (v: boolean) => void; mobile?: boolean }) {
  const { getButton } = useCTAButtons();
  const loginBtn = getButton('launch_navbar_login');
  const ctaBtn = getButton('launch_navbar_cta');

  if (mobile) {
    return (
      <>
        {loginBtn.visible && loginBtn.enabled && (
          <Link to={loginBtn.destination} onClick={() => setMobileOpen(false)}>{loginBtn.button_text}</Link>
        )}
        {ctaBtn.visible && ctaBtn.enabled && (
          <a href="#scratch" onClick={scrollToScratch('scratch')} className="nl-btn nl-btn-primary">{ctaBtn.button_text}</a>
        )}
      </>
    );
  }

  return (
    <>
      {loginBtn.visible && loginBtn.enabled && (
        <Link to={loginBtn.destination} className="nl-hide-mobile" style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--nl-text-secondary)' }}>
          {loginBtn.button_text}
        </Link>
      )}
      {ctaBtn.visible && ctaBtn.enabled && (
        <a href="#scratch" onClick={scrollToScratch('scratch')} className="nl-btn nl-btn-primary nl-btn-sm nl-hide-mobile">
          {ctaBtn.button_text}
        </a>
      )}
    </>
  );
}

export function LaunchNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className={`nl-navbar ${scrolled ? 'nl-scrolled' : ''}`}>
      <div className="nl-container nl-navbar-inner">
        <a href="#nl-top" onClick={scrollTo('nl-top')} className="nl-navbar-logo">
          <img src="/logo.png" alt="Noska" />
          <span>Noska</span>
        </a>

        <div className="nl-navbar-links">
          {ANCHOR_LINKS.map((l) => (
            <a key={l.id} href={`#${l.id}`} onClick={scrollTo(l.id)}>{l.label}</a>
          ))}
          {ROUTE_LINKS.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
        </div>

        <div className="nl-navbar-actions">
          <LaunchNavCTAs scrollToScratch={scrollTo} setMobileOpen={setMobileOpen} />
          <button className="nl-navbar-mobile-toggle" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="nl-mobile-drawer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="nl-mobile-drawer-links">
              {ANCHOR_LINKS.map((l) => (
                <a key={l.id} href={`#${l.id}`} onClick={scrollTo(l.id)}>{l.label}</a>
              ))}
              {ROUTE_LINKS.map((l) => (
                <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}>{l.label}</Link>
              ))}
              <LaunchNavCTAs scrollToScratch={scrollTo} setMobileOpen={setMobileOpen} mobile />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
