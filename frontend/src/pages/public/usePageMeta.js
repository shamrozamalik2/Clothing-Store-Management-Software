import { useEffect } from 'react';

/* Keep a handle on the tags we manage so we can update rather than duplicate. */
function setMeta(selector, attr, value) {
  if (!value) return;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    const [key, val] = selector.replace(/[[\]"']/g, '').split('=');
    el.setAttribute(key.replace('meta', '').trim() || 'name', val);
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * usePageMeta — per-route document title, description and Open Graph tags.
 *
 * The app is a single-page hash router, so there is no server-rendered head.
 * This keeps the title and social preview accurate as the visitor navigates,
 * and restores the site default on unmount.
 */
export function usePageMeta({ title, description }) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) document.title = title;

    if (description) {
      setMeta('meta[name="description"]', 'content', description);
      setMeta('meta[property="og:description"]', 'content', description);
      setMeta('meta[name="twitter:description"]', 'content', description);
    }
    if (title) {
      setMeta('meta[property="og:title"]', 'content', title);
      setMeta('meta[name="twitter:title"]', 'content', title);
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, description]);
}

export default usePageMeta;
