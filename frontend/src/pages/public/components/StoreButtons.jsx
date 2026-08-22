/* ═══════════════════════════════════════════════════════════════════════════
   App store buttons

   Shared by the download banner and the footer so the two never drift apart.

   PLACEHOLDER — store links
   The Android and iOS apps exist per the product brief, but their public
   listing URLs are not known here. Both buttons route to the demo request so
   nothing is a dead link. Replace the two constants below once published.

   NOTE — trademark
   These marks are drawn here so the layout is complete. Apple and Google both
   require their own supplied badge artwork, at their specified minimum sizes
   and localised, on a commercial site. Swap in the official assets before
   launch.
   ═══════════════════════════════════════════════════════════════════════════ */

export const APP_STORE_URL = '/demo';
export const PLAY_STORE_URL = '/demo';

export function AppleMark({ size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: size, height: size, fill: 'currentColor', flexShrink: 0 }}>
      <path d="M16.36 12.79c.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.18-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.21 1.1-.05 1.52-.71 2.85-.71 1.33 0 1.71.71 2.87.69 1.19-.02 1.94-1.08 2.67-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.34-3.55zM14.2 6.1c.61-.74 1.02-1.77.91-2.79-.88.04-1.94.59-2.57 1.32-.56.65-1.05 1.7-.92 2.7.98.08 1.98-.5 2.58-1.23z" />
    </svg>
  );
}

export function PlayMark({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: size, height: size, flexShrink: 0 }}>
      <path d="M3.6 2.4c-.3.3-.5.8-.5 1.4v16.4c0 .6.2 1.1.5 1.4l.1.1 9.2-9.2v-.2L3.6 2.4z" fill="#00D0FF" />
      <path d="M16 15.4l-3.1-3.1v-.2l3.1-3.1.1.04 3.6 2.1c1.05.6 1.05 1.6 0 2.2l-3.7 2.1z" fill="#FFC800" />
      <path d="M16.1 15.36L12.9 12.2 3.6 21.6c.35.36.92.4 1.57.04l10.93-6.28z" fill="#FF3A44" />
      <path d="M16.1 8.94L5.17 2.66c-.65-.37-1.22-.32-1.57.04l9.3 9.3 3.2-3.06z" fill="#00E676" />
    </svg>
  );
}

/**
 * StoreButton
 * `solid` — black pill-less badge for light grounds (the footer)
 * `ghost` — translucent, for the dark download banner
 */
export function StoreButton({ href, mark, caption, name, variant = 'solid', className = '' }) {
  const solid = variant === 'solid';

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.5625rem 1rem',
    borderRadius: 10,
    textDecoration: 'none',
    transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
    background: solid ? '#0A0A12' : 'rgba(255,255,255,0.06)',
    border: `1px solid ${solid ? '#0A0A12' : 'rgba(255,255,255,0.22)'}`,
    color: '#fff',
  };

  return (
    <a
      href={href}
      className={className}
      style={base}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = solid ? '#1C1F29' : 'rgba(255,255,255,0.12)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = solid ? '#0A0A12' : 'rgba(255,255,255,0.06)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      {mark}
      <span style={{ display: 'grid', lineHeight: 1.15 }}>
        <span style={{ fontSize: '0.625rem', opacity: 0.78 }}>{caption}</span>
        <span style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{name}</span>
      </span>
    </a>
  );
}

/** Both badges together — the arrangement used in the footer and the banner. */
export function StoreButtons({ variant = 'solid', direction = 'row', className = '' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        flexWrap: 'wrap',
        gap: '0.625rem',
        alignItems: direction === 'column' ? 'flex-start' : 'center',
      }}
    >
      <StoreButton
        href={APP_STORE_URL}
        mark={<AppleMark />}
        caption="Download on the"
        name="App Store"
        variant={variant}
        className={className}
      />
      <StoreButton
        href={PLAY_STORE_URL}
        mark={<PlayMark />}
        caption="Get it on"
        name="Google Play"
        variant={variant}
        className={className}
      />
    </div>
  );
}
