import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Bars3Icon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { selectIsAuth } from '@store/slices/authSlice';
import Logo from '@components/ui/Logo';
import { EASE } from './motion';

const LINKS = [
  { to: '/platform',     label: 'Platform' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/solutions',    label: 'Solutions' },
  { to: '/security',     label: 'Security' },
];

/* ── One navigation link ──────────────────────────────────────────────────────
   The active state is a soft pill that slides between items via a shared
   layout id, rather than a detached underline floating below the text. */
function NavItem({ to, label, reduce }) {
  const [hover, setHover] = useState(false);

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ textDecoration: 'none', position: 'relative', display: 'block' }}
    >
      {({ isActive }) => (
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            height: 34,
            padding: '0 0.875rem',
            borderRadius: 8,
            fontSize: '0.875rem',
            fontWeight: isActive ? 600 : 500,
            letterSpacing: '-0.005em',
            color: isActive || hover ? 'var(--on-ink)' : 'var(--on-ink-mute)',
            transition: 'color 0.18s',
            whiteSpace: 'nowrap',
          }}
        >
          {isActive && (
            <motion.span
              layoutId="pbc-nav-pill"
              aria-hidden="true"
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 8,
                background: 'rgba(252,251,248,0.09)',
                border: '1px solid rgba(252,251,248,0.10)',
              }}
              transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
            />
          )}
          {!isActive && hover && (
            <span
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, borderRadius: 8, background: 'rgba(252,251,248,0.05)' }}
            />
          )}
          <span style={{ position: 'relative' }}>{label}</span>
        </span>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [lifted, setLifted] = useState(false);
  const isAuth = useSelector(selectIsAuth);
  const { pathname } = useLocation();
  const reduce = useReducedMotion();

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 90,
        background: lifted ? 'rgba(11,16,32,0.82)' : 'transparent',
        backdropFilter: lifted ? 'saturate(150%) blur(16px)' : 'none',
        WebkitBackdropFilter: lifted ? 'saturate(150%) blur(16px)' : 'none',
        borderBottom: '1px solid',
        borderColor: lifted ? 'rgba(252,251,248,0.09)' : 'transparent',
        transition: 'background 0.28s, border-color 0.28s',
      }}
    >
      {/* Three columns: brand | navigation | actions.
          The centre column is optically centred in the shell, which removes
          the wide dead band a flex-with-spacer layout leaves behind. */}
      <nav
        className="pbc-shell pbc-nav"
        aria-label="Primary"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          height: 64,
          gap: 'var(--s3)',
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          aria-label="ProBusinessCloud — home"
          style={{ display: 'inline-flex', alignItems: 'center', justifySelf: 'start' }}
        >
          <Logo variant="lockup" mono height={30} style={{ color: 'var(--on-ink)' }} />
        </Link>

        {/* Navigation */}
        <div className="pbc-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2, justifySelf: 'center' }}>
          {LINKS.map((l) => (
            <NavItem key={l.to} to={l.to} label={l.label} reduce={reduce} />
          ))}
        </div>

        {/* Actions */}
        <div
          className="pbc-nav-actions"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifySelf: 'end' }}
        >
          <Link
            to={isAuth ? '/dashboard' : '/login'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 34,
              padding: '0 0.75rem',
              borderRadius: 8,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--on-ink)',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {isAuth ? 'Dashboard' : 'Sign in'}
          </Link>

          <Link
            to="/demo"
            className="pbc-btn pbc-btn-primary"
            style={{ height: 36, padding: '0 0.9375rem', fontSize: '0.875rem', borderRadius: 8, gap: '0.375rem' }}
          >
            Book a demo
            <ArrowRightIcon aria-hidden="true" style={{ width: 14, height: 14 }} />
          </Link>
        </div>

        {/* Mobile toggle — occupies the last column on small screens */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="pbc-mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="pbc-nav-toggle"
          style={{
            display: 'none',
            justifySelf: 'end',
            alignItems: 'center',
            justifyContent: 'center',
            width: 38,
            height: 38,
            background: 'rgba(252,251,248,0.06)',
            border: '1px solid rgba(252,251,248,0.12)',
            borderRadius: 8,
            color: 'var(--on-ink)',
            cursor: 'pointer',
          }}
        >
          {open ? <XMarkIcon style={{ width: 19, height: 19 }} /> : <Bars3Icon style={{ width: 19, height: 19 }} />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="pbc-mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduce ? 0 : 0.28, ease: EASE }}
            style={{
              overflow: 'hidden',
              background: 'rgba(11,16,32,0.98)',
              backdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(252,251,248,0.09)',
            }}
          >
            <div className="pbc-shell" style={{ paddingTop: 'var(--s2)', paddingBottom: 'var(--s3)' }}>
              {LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '0.9375rem 0',
                    fontSize: '1.0625rem',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? 'var(--accent-hi)' : 'var(--on-ink)',
                    borderBottom: '1px solid rgba(252,251,248,0.08)',
                  })}
                >
                  {l.label}
                </NavLink>
              ))}
              <div style={{ display: 'grid', gap: '0.625rem', marginTop: 'var(--s3)' }}>
                <Link to="/demo" className="pbc-btn pbc-btn-primary">Book a demo</Link>
                <Link to={isAuth ? '/dashboard' : '/login'} className="pbc-btn pbc-btn-ghost-ink">
                  {isAuth ? 'Go to dashboard' : 'Sign in'}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
