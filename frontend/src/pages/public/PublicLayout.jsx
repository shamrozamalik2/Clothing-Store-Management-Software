import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '@store/slices/authSlice';
import { Bars3Icon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

/* ─── PBC Logo ───────────────────────────────────────────────────────────────── */
function PBCMark({ size = 28 }) {
  return (
    <img
      src="/newlogo.png"
      alt="ProBusinessCloud"
      style={{ height: size, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }}
    />
  );
}

const NAV_LINKS = [
  { label: 'Home',     to: '/',        end: true },
  { label: 'About',    to: '/about',   end: false },
  { label: 'Features', to: '/features',end: false },
  { label: 'Pricing',  to: '/pricing', end: false },
  { label: 'FAQ',      to: '/faq',     end: false },
  { label: 'Contact',  to: '/contact', end: false },
];

const C = {
  bg:        '#070c1c',
  nav:       'rgba(7,12,28,0.88)',
  border:    'rgba(255,255,255,0.07)',
  text:      '#d1daf5',
  textMuted: '#5a7299',
  blue:      '#3b82f6',
  cyan:      '#06b6d4',
};

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */
function Navbar() {
  const [open, setOpen]       = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isAuth                = useSelector(selectIsAuth);
  const navigate              = useNavigate();
  const location              = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const navLinkStyle = ({ isActive }) => ({
    fontSize: '0.875rem',
    fontWeight: 500,
    color: isActive ? '#93c5fd' : C.text,
    textDecoration: 'none',
    padding: '0.375rem 0.5rem',
    borderRadius: '0.5rem',
    transition: 'color 0.2s',
  });

  return (
    <>
      <style>{`
        .pub-nav-link:hover { color: #93c5fd !important; }
        .pub-btn-outline:hover { background: rgba(59,130,246,0.15) !important; border-color: rgba(59,130,246,0.5) !important; color: #bfdbfe !important; }
        .pub-btn-solid:hover { opacity: 0.88; transform: translateY(-1px); }
        @keyframes pub-gradient { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }
        @keyframes pub-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-12px) } }
        @keyframes pub-fade-up { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pub-glow { 0%,100% { opacity:0.3; transform:scale(1) } 50% { opacity:0.7; transform:scale(1.2) } }
        .pub-hero-bg {
          background: radial-gradient(ellipse 80% 60% at 20% 40%, rgba(29,78,216,0.18) 0%, transparent 60%),
                      radial-gradient(ellipse 60% 50% at 80% 20%, rgba(6,182,212,0.12) 0%, transparent 55%),
                      #070c1c;
        }
        .pub-gradient-text {
          background: linear-gradient(135deg, #60a5fa, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .pub-gradient-btn {
          background: linear-gradient(135deg, #2563eb, #0891b2);
          color: white;
          transition: all 0.25s;
        }
        .pub-section { background: #070c1c; }
        .pub-section-alt { background: #080f20; }
        .pub-card {
          background: #0e1a30;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          transition: all 0.25s;
        }
        .pub-card:hover {
          background: #111f3a;
          border-color: rgba(59,130,246,0.2);
          transform: translateY(-3px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(59,130,246,0.08);
        }
        .pub-icon-wrap {
          width: 48px; height: 48px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.15);
        }
        .pub-input {
          width: 100%; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.9rem;
          background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
          color: #d1daf5; outline: none; transition: all 0.2s;
        }
        .pub-input:focus { border-color: rgba(59,130,246,0.5); background: rgba(59,130,246,0.05); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
        .pub-input::placeholder { color: #3d5070; }
        .faq-item { border-bottom: 1px solid rgba(255,255,255,0.07); }
      `}</style>

      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? C.nav : 'transparent',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        transition: 'all 0.35s ease',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 68, gap: '2rem' }}>

            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
              <img src="/newlogo.png" alt="ProBusinessCloud"
                style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
              {NAV_LINKS.map(l => (
                <NavLink key={l.to} to={l.to} end={l.end}
                  className="pub-nav-link"
                  style={navLinkStyle}>
                  {l.label}
                </NavLink>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
              {isAuth ? (
                <button onClick={() => navigate('/dashboard')}
                  className="pub-btn-solid"
                  style={{
                    padding: '0.5rem 1.25rem', borderRadius: 10, fontSize: '0.875rem',
                    fontWeight: 600, cursor: 'pointer', border: 'none',
                  }}>
                  <span className="pub-gradient-btn" style={{ padding: '0.5rem 1.25rem', borderRadius: 10, display: 'block' }}>
                    Go to App
                  </span>
                </button>
              ) : (
                <>
                  <Link to="/login" className="pub-btn-outline" style={{
                    padding: '0.5rem 1.125rem', borderRadius: 10, fontSize: '0.875rem',
                    fontWeight: 500, color: '#93c5fd', textDecoration: 'none',
                    border: '1px solid rgba(59,130,246,0.3)',
                    background: 'rgba(59,130,246,0.06)',
                    transition: 'all 0.2s',
                  }}>
                    Login
                  </Link>
                  <Link to="/login" className="pub-btn-solid pub-gradient-btn" style={{
                    padding: '0.5rem 1.25rem', borderRadius: 10, fontSize: '0.875rem',
                    fontWeight: 600, textDecoration: 'none', display: 'inline-block',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                  }}>
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden"
              onClick={() => setOpen(v => !v)}
              style={{ marginLeft: 'auto', color: C.text, background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
            >
              {open ? <XMarkIcon style={{ width: 24, height: 24 }} /> : <Bars3Icon style={{ width: 24, height: 24 }} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div style={{
            background: '#080f22', borderTop: `1px solid ${C.border}`,
            padding: '1rem 1.5rem 1.5rem',
          }}>
            {NAV_LINKS.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} style={({ isActive }) => ({
                display: 'block', padding: '0.75rem 0', fontSize: '0.95rem', fontWeight: 500,
                color: isActive ? '#93c5fd' : C.text, textDecoration: 'none',
                borderBottom: `1px solid ${C.border}`,
              })}>
                {l.label}
              </NavLink>
            ))}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {isAuth ? (
                <button onClick={() => navigate('/dashboard')}
                  className="pub-gradient-btn"
                  style={{ padding: '0.75rem', borderRadius: 12, fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Go to App
                </button>
              ) : (
                <>
                  <Link to="/login" style={{
                    display: 'block', textAlign: 'center', padding: '0.75rem',
                    borderRadius: 12, fontWeight: 500, color: '#93c5fd', textDecoration: 'none',
                    border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.06)',
                  }}>
                    Login
                  </Link>
                  <Link to="/login" className="pub-gradient-btn" style={{
                    display: 'block', textAlign: 'center', padding: '0.75rem',
                    borderRadius: 12, fontWeight: 600, textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(37,99,235,0.35)',
                  }}>
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

/* ─── Footer ─────────────────────────────────────────────────────────────────── */
function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: '#050914', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4rem 1.5rem 2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>

          {/* Brand */}
          <div style={{ gridColumn: 'span 2' }} className="md:col-span-1">
            <div style={{ marginBottom: '1rem' }}>
              <img src="/newlogo.png" alt="ProBusinessCloud"
                style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#3d5070', maxWidth: 260 }}>
              Complete cloud-based POS and business management platform for modern businesses.
            </p>
            {/* Social links */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              {['𝕏', 'in', 'fb', 'ig'].map(s => (
                <span key={s} style={{
                  width: 34, height: 34, borderRadius: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700,
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#5a7299', cursor: 'pointer',
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Product */}
          <FooterCol title="Product" links={[
            { label: 'Features', to: '/features' },
            { label: 'Pricing',  to: '/pricing' },
            { label: 'FAQ',      to: '/faq' },
          ]} />

          {/* Company */}
          <FooterCol title="Company" links={[
            { label: 'About',   to: '/about' },
            { label: 'Contact', to: '/contact' },
          ]} />

          {/* Support */}
          <FooterCol title="Support" links={[
            { label: 'Login',       to: '/login' },
            { label: 'Get Started', to: '/login' },
            { label: 'Contact Us',  to: '/contact' },
          ]} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: '#253550' }}>
            © {year} ProBusinessCloud. All rights reserved.
          </p>
          <p style={{ fontSize: '0.8rem', color: '#253550' }}>
            Built for modern businesses
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3d5070', marginBottom: '1rem' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {links.map(l => (
          <Link key={l.label} to={l.to} style={{ fontSize: '0.875rem', color: '#475e87', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = '#93c5fd'}
            onMouseLeave={e => e.currentTarget.style.color = '#475e87'}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Public Layout ───────────────────────────────────────────────────────────── */
export default function PublicLayout() {
  return (
    <div style={{ minHeight: '100vh', background: '#070c1c', color: '#d1daf5' }}>
      <Navbar />
      <main style={{ paddingTop: 68 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
