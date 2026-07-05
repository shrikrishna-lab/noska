/**
 * A minimal, premium "browser/app window" frame — three traffic-light dots,
 * a thin title bar, and a content slot. Used everywhere a real product
 * surface needs to be shown inside a device-like frame without resorting
 * to a literal macOS screenshot.
 */
export function MacWindow({ title, children, className = '' }) {
  return (
    <div className={`mac-window ${className}`}>
      <div className="mac-window-bar">
        <div className="mac-window-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        {title && <span className="mac-window-title">{title}</span>}
      </div>
      <div className="mac-window-body">{children}</div>
    </div>
  );
}
