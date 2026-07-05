import { useEffect, useState } from 'react';

/**
 * Rotates through a list of words with a type / pause / delete cycle.
 * Native reimplementation of the referenced Framer "TypewriterEffect"
 * component (Framer canvas-only, can't be imported into a standalone app).
 */
export function Typewriter({ words, typeSpeed = 55, deleteSpeed = 30, pause = 1400, className = '' }) {
  const [wordIndex, setWordIndex] = useState(0);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState('typing'); // typing | pausing | deleting

  useEffect(() => {
    const current = words[wordIndex];
    let timeout;

    if (phase === 'typing') {
      if (text.length < current.length) {
        timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), typeSpeed);
      } else {
        timeout = setTimeout(() => setPhase('pausing'), pause);
      }
    } else if (phase === 'pausing') {
      timeout = setTimeout(() => setPhase('deleting'), 0);
    } else if (phase === 'deleting') {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), deleteSpeed);
      } else {
        setWordIndex((i) => (i + 1) % words.length);
        setPhase('typing');
      }
    }

    return () => clearTimeout(timeout);
  }, [text, phase, wordIndex, words, typeSpeed, deleteSpeed, pause]);

  return (
    <span className={`mkt-typewriter-word ${className}`}>
      {text}
      <span className="mkt-typewriter-caret" />
    </span>
  );
}
