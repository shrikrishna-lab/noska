import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './marketing-theme.css';

/**
 * Shared shell for every public marketing route (/, /pricing, /enterprise,
 * /product). Wraps content in a `.marketing` scope so marketing-theme.css's
 * tokens/resets never leak into the authenticated app's own design system
 * (src/index.css) — the two stylesheets are namespaced independently.
 */
export default function MarketingLayout({ children }) {
  return (
    <div className="marketing">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
