import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import './site.css';

export default function PublicLayout() {
  const { pathname, hash } = useLocation();

  /* Restore scroll on navigation; honour in-page anchors. */
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, hash]);

  return (
    <div className="pbc">
      <a className="pbc-skip" href="#pbc-main">Skip to main content</a>
      <Navbar />
      <main id="pbc-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
