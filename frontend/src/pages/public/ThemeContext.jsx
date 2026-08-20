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

/* ─── Animated wave divider ─────────────────────────────────────────────────── */
export function HeroWave() {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, overflow: 'hidden', lineHeight: 0, pointerEvents: 'none', height: 90 }}>
      <style>{`
        @keyframes wave-slide-1 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes wave-slide-2 {
          0%   { transform: translateX(0); }
          100% { transform: translateX(50%); }
        }
      `}</style>

      {/* Back wave — slower, slightly transparent */}
      <svg
        viewBox="0 0 2880 90"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, width: '200%', height: '100%', animation: 'wave-slide-2 14s linear infinite', opacity: 0.55 }}
      >
        <path d="M0,55 C360,10 720,90 1080,55 C1440,10 1800,90 2160,55 C2520,10 2880,90 2880,55 L2880,90 L0,90 Z" style={{ fill: 'var(--pub-bg)' }} />
      </svg>

      {/* Front wave — faster, full opacity */}
      <svg
        viewBox="0 0 2880 90"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        style={{ position: 'absolute', bottom: 0, width: '200%', height: '100%', animation: 'wave-slide-1 9s linear infinite' }}
      >
        <path d="M0,45 C480,90 960,0 1440,45 C1920,90 2400,0 2880,45 L2880,90 L0,90 Z" style={{ fill: 'var(--pub-bg)' }} />
      </svg>
    </div>
  );
}
