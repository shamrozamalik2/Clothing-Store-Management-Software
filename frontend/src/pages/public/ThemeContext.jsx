import { createContext, useContext, useState, useEffect } from 'react';

const DARK = {
  isDark: true,
  bg: '#070c1c', bgAlt: '#080f20', bgDeep: '#050912',
  bgCard: '#0e1a30', bgCardSpotlight: '#0c1628', bgMobileMenu: '#080f22',
  navBg: 'rgba(7,12,28,0.88)',
  heading: '#f0f5ff', text: '#d1daf5', textSub: '#7a90b8',
  textDim: '#4a6080', textDimmer: '#3d5070', textDimmest: '#253550',
  border: 'rgba(255,255,255,0.07)',
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderMicro: 'rgba(255,255,255,0.04)',
  accentLink: '#93c5fd',
  logoFilter: 'brightness(0) invert(1)',
  planCardBg: 'linear-gradient(180deg, #0d1f40 0%, #0c1830 100%)',
  planCardBorder: 'rgba(59,130,246,0.4)',
  tableRowAlt: 'rgba(255,255,255,0.015)',
};

const LIGHT = {
  isDark: false,
  bg: '#f5f8ff', bgAlt: '#eff6ff', bgDeep: '#dce8ff',
  bgCard: '#ffffff', bgCardSpotlight: '#f0f7ff', bgMobileMenu: '#f0f5ff',
  navBg: 'rgba(255,255,255,0.97)',
  heading: '#0f172a', text: '#1e293b', textSub: '#475569',
  textDim: '#64748b', textDimmer: '#94a3b8', textDimmest: '#cbd5e1',
  border: 'rgba(0,0,0,0.08)',
  borderSubtle: 'rgba(0,0,0,0.05)',
  borderMicro: 'rgba(0,0,0,0.04)',
  accentLink: '#1d4ed8',
  logoFilter: 'none',
  planCardBg: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%)',
  planCardBorder: 'rgba(59,130,246,0.35)',
  tableRowAlt: 'rgba(0,0,0,0.015)',
};

const Ctx = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem('pub_theme') === 'dark'; }
    catch { return false; } // default: light
  });

  useEffect(() => {
    localStorage.setItem('pub_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const c = isDark ? DARK : LIGHT;
  return (
    <Ctx.Provider value={{ c, isDark, toggle: () => setIsDark(v => !v) }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePublicTheme() { return useContext(Ctx); }

/* ─── Wave divider — renders at bottom of every blue hero section ──────────── */
export function HeroWave() {
  const { c } = usePublicTheme();
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden', lineHeight: 0, pointerEvents: 'none' }}>
      <svg
        viewBox="0 0 1440 80"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', width: '100%' }}
        preserveAspectRatio="none"
      >
        <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill={c.bg} />
      </svg>
    </div>
  );
}
