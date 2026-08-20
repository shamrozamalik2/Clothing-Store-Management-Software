import { useState, useEffect } from 'react';
import { NavLink, Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '@store/slices/authSlice';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { ThemeProvider, usePublicTheme } from './ThemeContext';

/* Load Inter font once for all public pages */
function FontLoader() {
  useEffect(() => {
    if (document.getElementById('pub-inter-font')) return;
    const link = document.createElement('link');
    link.id   = 'pub-inter-font';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }, []);
  return null;
}

const NAV_LINKS = [
  { label: 'Home',     to: '/',        end: true },
  { label: 'About',    to: '/about',   end: false },
  { label: 'Features', to: '/features',end: false },
  { label: 'FAQ',      to: '/faq',     end: false },
  { label: 'Contact',  to: '/contact', end: false },
];

/* ─── Navbar ─────────────────────────────────────────────────────────────────── */
function Navbar() {
  const { c, isDark, toggle } = usePublicTheme();
  const [open, setOpen]         = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const isAuth                  = useSelector(selectIsAuth);
  const navigate                = useNavigate();
  const location                = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  // On the blue hero (not scrolled) → white text; scrolled over content → themed
  const onHero  = !scrolled;
  const linkCol = onHero ? 'rgba(255,255,255,0.88)' : c.text;
  const activeCol = onHero ? '#ffffff' : c.accentLink;
  const logoFilter = onHero ? 'brightness(0) invert(1)' : c.logoFilter;
  const navHoverHex = onHero ? '#ffffff' : (isDark ? '#93c5fd' : '#1d4ed8');

  const navLinkStyle = ({ isActive }) => ({
    fontSize: '0.875rem', fontWeight: 500,
    color: isActive ? activeCol : linkCol,
    textDecoration: 'none', padding: '0.4rem 0.625rem', borderRadius: 8,
    transition: 'color 0.2s',
  });

  const toggleBtn = (
    <button
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        background: onHero ? 'rgba(255,255,255,0.12)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
        border: `1px solid ${onHero ? 'rgba(255,255,255,0.25)' : c.border}`,
        borderRadius: 8, cursor: 'pointer',
        width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: onHero ? 'white' : c.text, transition: 'all 0.2s', flexShrink: 0,
      }}
    >
      {isDark
        ? <SunIcon style={{ width: 17, height: 17 }} />
        : <MoonIcon style={{ width: 17, height: 17 }} />}
    </button>
  );

  return (
    <>
      <style>{`
        /* ── Hero: always blue-purple gradient ──────────────────── */
        .pub-hero-bg {
          background: linear-gradient(351deg, #8380b4 0%, #14122d 55%, #332c3f 100%);
          position: relative;
        }

        /* ── CSS variable definitions (content sections) ─────────── */
        [data-pub-theme] {
          --pub-bg: #070c1c;
          --pub-bg-alt: #080f20;
          --pub-bg-card: #0e1a30;
          --pub-bg-card-hover: #111f3a;
          --pub-text: #d1daf5;
          --pub-border: rgba(255,255,255,0.07);
          --pub-border-card-hover: rgba(99,102,241,0.3);
          --pub-input-bg: rgba(255,255,255,0.04);
          --pub-input-placeholder: #3d5070;
          --pub-card-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        [data-pub-theme="light"] {
          --pub-bg: #f8f9ff;
          --pub-bg-alt: #f0f2ff;
          --pub-bg-card: #ffffff;
          --pub-bg-card-hover: #f5f7ff;
          --pub-text: #1e293b;
          --pub-border: rgba(0,0,0,0.07);
          --pub-border-card-hover: rgba(99,102,241,0.25);
          --pub-input-bg: rgba(0,0,0,0.04);
          --pub-input-placeholder: #94a3b8;
          --pub-card-shadow: 0 4px 24px rgba(79,70,229,0.08), 0 1px 4px rgba(0,0,0,0.05);
        }

        /* ── Themed CSS classes ─────────────────────────────────── */
        .pub-nav-link:hover { color: var(--nav-lh, #93c5fd) !important; }
        .pub-btn-outline:hover {
          background: rgba(99,102,241,0.12) !important;
          border-color: rgba(99,102,241,0.45) !important;
          color: #6366f1 !important;
        }
        .pub-btn-solid:hover { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 12px 32px rgba(79,70,229,0.45) !important; }

        @keyframes pub-glow { 0%,100% { opacity:0.4; transform:scale(1) } 50% { opacity:0.75; transform:scale(1.15) } }
        @keyframes pub-fade-up { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pub-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }

        /* Hero floating stat cards */
        .pub-hero-float { animation: pub-float 6s ease-in-out infinite; }
        @media (max-width: 860px) {
          .pub-hero-float { display: none !important; }
        }
        @media (max-width: 640px) {
          .pub-hero-bg h1 { font-size: 2.25rem !important; }
        }

        .pub-gradient-text {
          background: linear-gradient(135deg, #818cf8, #c4b5fd);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .pub-gradient-btn {
          background: linear-gradient(135deg, #7c72c2, #1c0b3a);
          color: white; transition: all 0.25s;
          box-shadow: 0 6px 20px rgba(79,70,229,0.35);
        }
        .pub-section     { background: var(--pub-bg); }
        .pub-section-alt { background: var(--pub-bg-alt); }

        .pub-card {
          background: var(--pub-bg-card);
          border: 1px solid var(--pub-border);
          border-radius: 16px; transition: all 0.25s;
          box-shadow: var(--pub-card-shadow);
        }
        .pub-card:hover {
          background: var(--pub-bg-card-hover);
          border-color: var(--pub-border-card-hover);
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(79,70,229,0.14), 0 2px 8px rgba(0,0,0,0.06);
        }
        .pub-icon-wrap {
          width: 52px; height: 52px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(79,70,229,0.08); border: 1px solid rgba(79,70,229,0.15);
        }
        .pub-input {
          width: 100%; padding: 0.75rem 1rem; border-radius: 12px; font-size: 0.9rem;
          background: var(--pub-input-bg); border: 1px solid var(--pub-border);
          color: var(--pub-text); outline: none; transition: all 0.2s; font-family: inherit;
        }
        .pub-input:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.04); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .pub-input::placeholder { color: var(--pub-input-placeholder); }
        .pub-input option { background: var(--pub-bg-card); color: var(--pub-text); }
        .faq-item { border-bottom: 1px solid var(--pub-border); }

        /* ── Mobile responsive ─────────────────────────────────── */
        @media (max-width: 767px) {
          /* Hero */
          .pub-hero-bg { min-height: auto !important; padding-bottom: 3rem !important; }
          .pub-hero-bg h1 { font-size: 2rem !important; }
          .pub-hero-mockup { display: none !important; }

          /* Showcase sections (POS, Analytics) */
          .pub-showcase-mockup { display: none !important; }
          .pub-showcase-text {
            flex-basis: 100% !important;
            max-width: 100% !important;
          }

          /* Section padding */
          .pub-section,
          .pub-section-alt { padding-top: 3.5rem !important; padding-bottom: 3.5rem !important; }

          /* Roles 2-col grid → 1 col */
          .pub-roles-grid { grid-template-columns: 1fr !important; }

          /* Device cards — stack vertically */
          .pub-device-cards { flex-direction: column !important; align-items: center !important; }
          .pub-device-cards > * { width: 100% !important; max-width: 280px !important; }

          /* Footer brand — full width */
          .pub-footer-brand { grid-column: span 1 !important; }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          /* Tablet: keep mockups but shrink */
          .pub-hero-mockup { max-width: 100% !important; }
          .pub-showcase-text { flex-basis: 300px !important; }
          .pub-showcase-mockup { flex-basis: 400px !important; }
        }
      `}</style>

      <nav
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          background: scrolled ? c.navBg : 'transparent',
          borderBottom: scrolled ? `1px solid ${c.border}` : '1px solid transparent',
          backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
          transition: 'all 0.35s ease',
          '--nav-lh': navHoverHex,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', height: 68, gap: '2rem' }}>

            {/* Logo */}
            <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
              <img src="/newlogo.png" alt="ProBusinessCloud"
                style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block', filter: logoFilter, transition: 'filter 0.3s' }} />
            </Link>

            {/* Desktop nav links */}
            {!isMobile && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.125rem' }}>
                {NAV_LINKS.map(l => (
                  <NavLink key={l.to} to={l.to} end={l.end} className="pub-nav-link" style={navLinkStyle}>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            )}

            {/* Desktop CTAs + toggle */}
            {!isMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexShrink: 0 }}>
                {toggleBtn}
                {isAuth ? (
                  <button onClick={() => navigate('/dashboard')}
                    className="pub-gradient-btn pub-btn-solid"
                    style={{ padding: '0.5rem 1.375rem', borderRadius: 50, fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer', border: 'none' }}>
                    Go to App
                  </button>
                ) : (
                  <>
                    <Link to="/login" style={{
                      padding: '0.5rem 1.25rem', borderRadius: 50, fontSize: '0.875rem', fontWeight: 500,
                      color: onHero ? 'rgba(255,255,255,0.9)' : c.text, textDecoration: 'none',
                      border: `1px solid ${onHero ? 'rgba(255,255,255,0.35)' : c.border}`,
                      background: onHero ? 'rgba(255,255,255,0.1)' : 'transparent',
                      transition: 'all 0.2s',
                    }}>
                      Login
                    </Link>
                    <Link to="/login" className="pub-gradient-btn pub-btn-solid" style={{
                      padding: '0.5rem 1.375rem', borderRadius: 50, fontSize: '0.875rem',
                      fontWeight: 700, textDecoration: 'none', display: 'inline-block',
                    }}>
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Mobile: toggle + hamburger */}
            {isMobile && (
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {toggleBtn}
                <button
                  onClick={() => setOpen(v => !v)}
                  style={{ color: onHero ? 'white' : c.text, background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
                >
                  {open ? <XMarkIcon style={{ width: 24, height: 24 }} /> : <Bars3Icon style={{ width: 24, height: 24 }} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div style={{ background: c.bgMobileMenu, borderTop: `1px solid ${c.border}`, padding: '1rem 1.5rem 1.5rem' }}>
            {NAV_LINKS.map(l => (
              <NavLink key={l.to} to={l.to} end={l.end} style={({ isActive }) => ({
                display: 'block', padding: '0.75rem 0', fontSize: '0.95rem', fontWeight: 500,
                color: isActive ? '#6366f1' : c.text, textDecoration: 'none',
                borderBottom: `1px solid ${c.border}`,
              })}>
                {l.label}
              </NavLink>
            ))}
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {isAuth ? (
                <button onClick={() => navigate('/dashboard')}
                  className="pub-gradient-btn"
                  style={{ padding: '0.75rem', borderRadius: 50, fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>
                  Go to App
                </button>
              ) : (
                <>
                  <Link to="/login" style={{
                    display: 'block', textAlign: 'center', padding: '0.75rem',
                    borderRadius: 50, fontWeight: 500, color: c.text, textDecoration: 'none',
                    border: `1px solid ${c.border}`, background: 'transparent',
                  }}>
                    Login
                  </Link>
                  <Link to="/login" className="pub-gradient-btn" style={{
                    display: 'block', textAlign: 'center', padding: '0.75rem',
                    borderRadius: 50, fontWeight: 700, textDecoration: 'none',
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
  const { c, isDark } = usePublicTheme();
  const year = new Date().getFullYear();
  return (
    <footer style={{ background: 'linear-gradient(351deg, #8380b4 0%, #14122d 55%, #332c3f 100%)', borderTop: `1px solid rgba(255,255,255,0.08)`, padding: '4rem 1.5rem 2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '3rem', marginBottom: '3rem' }}>

          {/* Brand */}
          <div style={{ gridColumn: 'span 2' }} className="pub-footer-brand md:col-span-1">
            <div style={{ marginBottom: '1rem' }}>
              <img src="/newlogo.png" alt="ProBusinessCloud"
                style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }} />
            </div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', maxWidth: 260 }}>
              Complete cloud-based POS and business management platform for modern businesses.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              {['𝕏', 'in', 'fb', 'ig'].map(s => (
                <span key={s} style={{
                  width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>

          <FooterCol title="Product" links={[
            { label: 'Features', to: '/features' },
            { label: 'FAQ',      to: '/faq' },
          ]} />
          <FooterCol title="Company" links={[
            { label: 'About',   to: '/about' },
            { label: 'Contact', to: '/contact' },
          ]} />
          <FooterCol title="Support" links={[
            { label: 'Login',       to: '/login' },
            { label: 'Get Started', to: '/login' },
            { label: 'Contact Us',  to: '/contact' },
          ]} />
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>© {year} ProBusinessCloud. All rights reserved.</p>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>Built for modern businesses</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }) {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '1rem' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {links.map(l => (
          <Link key={l.label} to={l.to}
            style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'white'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Layout wrapper ─────────────────────────────────────────────────────────── */
function PublicLayoutInner() {
  const { c, isDark } = usePublicTheme();
  return (
    <div
      data-pub-theme={isDark ? 'dark' : 'light'}
      style={{ minHeight: '100vh', background: c.bg, color: c.text, transition: 'background-color 0.25s ease, color 0.25s ease', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <FontLoader />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default function PublicLayout() {
  return (
    <ThemeProvider>
      <PublicLayoutInner />
    </ThemeProvider>
  );
}
