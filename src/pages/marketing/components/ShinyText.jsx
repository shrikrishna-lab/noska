/**
 * A slow light-sweep across text via an animated background-clip gradient
 * — gives a headline's key phrase a "catching the light" quality. Native
 * reimplementation of the referenced Framer "Shiny-Text" component.
 */
export function ShinyText({ children, className = '' }) {
  return <span className={`mkt-shiny-text ${className}`}>{children}</span>;
}
