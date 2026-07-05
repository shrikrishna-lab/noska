import { useEffect, useState } from 'react';

/**
 * The marketing site scrolls inside its own `.marketing` element (see
 * marketing-theme.css), not `window` — framer-motion's `useScroll` needs
 * that element passed explicitly via `container`, otherwise scroll-linked
 * transforms track window scroll (which never changes here) and stay
 * frozen at their initial values. This hook resolves the closest
 * `.marketing` ancestor of a ref once mounted, in the `{ current: el }`
 * shape `useScroll({ container })` expects.
 */
export function useMarketingScrollContainer(ref) {
  const [container, setContainer] = useState(null);

  useEffect(() => {
    const el = ref.current?.closest('.marketing');
    if (el) setContainer({ current: el });
  }, [ref]);

  return container;
}
