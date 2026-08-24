import { useEffect, useState } from 'react';

/**
 * Subscribe to a media query from React.
 *
 * The first value is read synchronously rather than defaulting to `false`, so
 * a layout that branches on width paints correctly on the first frame instead
 * of flashing the desktop arrangement on a phone. That is safe here because
 * the app mounts with `createRoot` — the prerendered HTML is replaced, never
 * hydrated, so there is no server markup to reconcile against.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
