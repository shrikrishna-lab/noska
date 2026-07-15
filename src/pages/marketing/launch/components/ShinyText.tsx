/**
 * A wash of light sweeps across the text once, via a CSS background-clip
 * gradient animation — used to give the headline's key phrase a premium,
 * "catching the light" quality without any JS-driven per-character work.
 */
export function ShinyText({ children, className = '' }) {
  return <span className={`nl-shiny-text ${className}`}>{children}</span>;
}
