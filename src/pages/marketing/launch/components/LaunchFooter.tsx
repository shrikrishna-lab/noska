import { Link } from 'react-router-dom';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Docs', to: '/product' },
  { label: 'Pricing', to: '/pricing' },
  { label: 'Roadmap', to: '/changelog' },
  { label: 'GitHub', href: 'https://github.com', external: true },
  { label: 'Discord', href: 'https://discord.com', external: true },
  { label: 'Contact', href: 'mailto:hello@noska.app' },
];

export function LaunchFooter() {
  const scrollTo = (id) => (e) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="nl-footer">
      <div className="nl-container">
        <div className="nl-footer-top">
          <a href="#nl-top" onClick={scrollTo('nl-top')} className="nl-footer-logo">
            <img src="/logo.png" alt="Noska" />
            <span>Noska</span>
          </a>
          <div className="nl-footer-links">
            {LINKS.map((link) =>
              link.to ? (
                <Link key={link.label} to={link.to}>{link.label}</Link>
              ) : link.href.startsWith('#') ? (
                <a key={link.label} href={link.href} onClick={scrollTo(link.href.slice(1))}>{link.label}</a>
              ) : (
                <a key={link.label} href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noreferrer' : undefined}>
                  {link.label}
                </a>
              )
            )}
          </div>
        </div>
        <div className="nl-footer-bottom">
          <span className="nl-footer-copyright">© {new Date().getFullYear()} Noska. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
