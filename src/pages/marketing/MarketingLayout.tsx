import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Lenis from 'lenis';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { AnnouncementBar } from './components/AnnouncementBar';
import { useLaunchSettings } from '../../hooks/useLaunchSettings';
import SEOHead from '../../components/SEOHead';
import { ShieldAlert } from 'lucide-react';
import './marketing-theme.css';

/**
 * Shared shell for every public marketing route (/, /pricing, /enterprise,
 * /product). Wraps content in a `.marketing` scope so marketing-theme.css's
 * tokens/resets never leak into the authenticated app's own design system
 * (src/index.css) — the two stylesheets are namespaced independently.
 *
 * Also drives buttery-smooth scrolling site-wide via the real `lenis` npm
 * package (native reimplementation of the referenced Framer "Lenis" code
 * component, which only runs inside Framer's own canvas). The marketing
 * site scrolls inside this `.marketing` element itself — not `window` —
 * (see the height/overflow rules in marketing-theme.css), so Lenis is
 * pointed at it explicitly via `wrapper`/`content` instead of defaulting
 * to window scroll.
 */
export default function MarketingLayout({ children }) {
  const wrapperRef = useRef(null);
  const contentRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, loading } = useLaunchSettings();

  useEffect(() => {
    if (typeof window === 'undefined' || !wrapperRef.current || !contentRef.current) return;

    const lenis = new Lenis({
      wrapper: wrapperRef.current,
      content: contentRef.current,
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    let rafId;
    function raf(time) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    const p = location.pathname;
    if (p === '/pricing' && !settings.show_pricing) { navigate('/', { replace: true }); return; }
    if (p.startsWith('/blog') && !settings.show_blog) { navigate('/', { replace: true }); return; }
    if (p === '/docs' && !settings.show_docs) { navigate('/', { replace: true }); return; }
    if (p === '/changelog' && !settings.show_changelog) { navigate('/', { replace: true }); return; }
  }, [loading, location.pathname, settings, navigate]);

  return (
    <>
      <SEOHead path={location.pathname} />
      {settings.launch_mode === 'maintenance' ? (
        <div className="marketing" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
          <div>
            <ShieldAlert size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.75rem' }}>{settings.maintenance_title || 'Scheduled Maintenance'}</h1>
            <p style={{ color: 'var(--muted)', maxWidth: 480, margin: '0 auto' }}>{settings.maintenance_message || 'We are performing scheduled maintenance. We will be back shortly.'}</p>
          </div>
        </div>
      ) : (
        <div className="marketing" ref={wrapperRef}>
          <div ref={contentRef}>
            <AnnouncementBar placement="top" />
            <Navbar />
            <main>{children}</main>
            <AnnouncementBar placement="bottom" />
            <Footer />
          </div>
        </div>
      )}
    </>
  );
}
