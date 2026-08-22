/* ═══════════════════════════════════════════════════════════════════════════
   Device frames

   Real chrome around the product, not a rounded rectangle: a browser window
   with traffic lights and an address bar, a laptop with a bezel and a base,
   and a phone with a dynamic island, side buttons and a home indicator.

   The frames are decorative — every one is aria-hidden and the interface
   inside carries its own label — so screen readers describe the product, not
   the picture frame around it.
   ═══════════════════════════════════════════════════════════════════════════ */

const BEZEL = '#14161C';
const BEZEL_EDGE = '#2A2E38';

/* ── Browser window ───────────────────────────────────────────────────────── */
export function BrowserFrame({ children, url = 'app.probusinesscloud.com', style }) {
  const lights = ['#FF5F57', '#FEBC2E', '#28C840'];

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        background: '#FFFFFF',
        border: '1px solid rgba(10,16,32,0.14)',
        boxShadow: '0 32px 70px -30px rgba(16,24,40,0.42), 0 2px 6px rgba(16,24,40,0.06)',
        ...style,
      }}
    >
      {/* Title bar */}
      <div
        aria-hidden="true"
        style={{
          background: '#F2F3F6',
          borderBottom: '1px solid rgba(10,16,32,0.09)',
          padding: '9px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {lights.map((c) => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
          ))}
        </span>

        {/* Tab */}
        <span
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#FFFFFF', borderRadius: '7px 7px 0 0',
            padding: '5px 12px', marginBottom: -9,
            fontSize: 10.5, color: '#3C4152', maxWidth: 190,
            border: '1px solid rgba(10,16,32,0.08)', borderBottom: 'none',
          }}
        >
          <span style={{ width: 11, height: 11, borderRadius: 3, background: '#2C6BF5', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ProBusinessCloud</span>
        </span>

        {/* Address bar */}
        <span
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 6,
            background: '#FFFFFF', border: '1px solid rgba(10,16,32,0.09)',
            borderRadius: 999, padding: '4px 12px', fontSize: 10.5, color: '#6B7180',
            minWidth: 0,
          }}
        >
          <svg viewBox="0 0 24 24" style={{ width: 10, height: 10, flexShrink: 0 }} fill="none" stroke="#12B981" strokeWidth="2.4">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</span>
        </span>
      </div>

      {children}
    </div>
  );
}

/* ── Laptop ───────────────────────────────────────────────────────────────── */
export function LaptopFrame({ children, style }) {
  return (
    <div style={{ ...style }}>
      {/* Lid */}
      <div
        style={{
          background: BEZEL,
          borderRadius: '14px 14px 6px 6px',
          padding: '12px 12px 14px',
          border: `1px solid ${BEZEL_EDGE}`,
          boxShadow: '0 30px 64px -28px rgba(16,24,40,0.5)',
        }}
      >
        {/* Camera */}
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3A3F4B' }} />
        </div>
        <div style={{ borderRadius: 5, overflow: 'hidden', background: '#fff' }}>{children}</div>
      </div>

      {/* Base */}
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div
          style={{
            width: '112%',
            height: 12,
            marginLeft: '-6%',
            background: 'linear-gradient(180deg, #23262F 0%, #15171D 62%, #0E1014 100%)',
            borderRadius: '0 0 10px 10px',
            position: 'relative',
            boxShadow: '0 14px 26px -12px rgba(16,24,40,0.5)',
          }}
        >
          {/* Notch on the front lip */}
          <span
            style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              top: 0, width: 92, height: 5,
              background: '#0B0D11', borderRadius: '0 0 6px 6px',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── Phone ────────────────────────────────────────────────────────────────── */
export function PhoneFrame({ children, width = 268, style }) {
  const height = Math.round(width * 2.04);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 46,
        background: `linear-gradient(150deg, #2C3038 0%, ${BEZEL} 42%, #0C0E12 100%)`,
        padding: 11,
        boxShadow: '0 38px 76px -30px rgba(16,24,40,0.55), 0 2px 6px rgba(16,24,40,0.14)',
        ...style,
      }}
    >
      {/* Side buttons */}
      <span aria-hidden="true" style={{ position: 'absolute', left: -2, top: 108, width: 3, height: 30, borderRadius: 2, background: '#23262E' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: -2, top: 150, width: 3, height: 52, borderRadius: 2, background: '#23262E' }} />
      <span aria-hidden="true" style={{ position: 'absolute', left: -2, top: 214, width: 3, height: 52, borderRadius: 2, background: '#23262E' }} />
      <span aria-hidden="true" style={{ position: 'absolute', right: -2, top: 176, width: 3, height: 78, borderRadius: 2, background: '#23262E' }} />

      {/* Screen */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          borderRadius: 36,
          overflow: 'hidden',
          background: '#0A0A12',
          border: '1px solid #34383F',
        }}
      >
        {/* Dynamic island */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)',
            width: 86, height: 24, borderRadius: 999, background: '#05060A', zIndex: 5,
          }}
        />
        {children}

        {/* Home indicator */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: 7, left: '50%', transform: 'translateX(-50%)',
            width: 108, height: 4, borderRadius: 999, background: 'rgba(10,10,18,0.30)', zIndex: 5,
          }}
        />
      </div>
    </div>
  );
}
