/* ═══════════════════════════════════════════════════════════════════════════
   Hero decoration
   Small floating data cards that overlap the main product visual, a quarter
   circle that anchors the top-right, and the hand-drawn underline. All are
   inline SVG so they stay crisp and cost no network requests.
   ═══════════════════════════════════════════════════════════════════════════ */

/* Hand-drawn double underline, drawn on once when the hero enters. */
export function Squiggle({ style, className }) {
  return (
    <svg
      viewBox="0 0 300 26"
      aria-hidden="true"
      className={className}
      style={{ position: 'absolute', left: 0, bottom: '-0.32em', width: '100%', height: 'auto', overflow: 'visible', ...style }}
    >
      <path
        d="M4 15 C 70 4, 150 4, 240 11 C 262 12.6, 280 14, 294 16"
        fill="none" stroke="var(--green)" strokeWidth="5" strokeLinecap="round"
        pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 0 }}
      />
      <path
        d="M28 23 C 96 15, 168 15, 232 20"
        fill="none" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" opacity="0.85"
        pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 0 }}
      />
    </svg>
  );
}

/* Quarter circle — the shape that anchors the top-right of the composition. */
export function QuarterCircle({ size = 132, style }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" style={{ width: size, height: size, display: 'block', ...style }}>
      <path d="M0 0 A100 100 0 0 1 100 100 L100 0 Z" fill="var(--accent)" />
    </svg>
  );
}

/* ── Small floating card shell ─────────────────────────────────────────────── */
function Card({ title, children, style, width }) {
  return (
    <div
      style={{
        width,
        background: 'var(--white)',
        borderRadius: 'var(--r-lg)',
        border: '1px solid var(--on-ink-line)',
        boxShadow: 'var(--shadow-xl)',
        padding: '0.875rem 1rem 0.75rem',
        ...style,
      }}
    >
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-ink)', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

/* Paired bars — stock in vs stock out. */
export function StockCard({ style }) {
  const bars = [
    [30, 20], [46, 28], [38, 24], [34, 18], [26, 16], [30, 22],
  ];
  const legend = [
    ['Received', 'var(--accent)', '1,135'],
    ['Sold', 'var(--green)', '635'],
  ];

  return (
    <Card title="Stock movement" width={210} style={style}>
      <svg viewBox="0 0 172 56" aria-hidden="true" style={{ width: '100%', height: 56, display: 'block' }}>
        {bars.map(([a, b], i) => {
          const x = i * 29 + 6;
          return (
            <g key={i}>
              <rect x={x} y={52 - a} width="7" height={a} rx="3.5" fill="var(--accent)" />
              <rect x={x + 10} y={52 - b} width="7" height={b} rx="3.5" fill="var(--green)" />
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        {legend.map(([label, color, value]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--on-ink-soft)' }}>{label}</span>
            <span className="pbc-tabular" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--on-ink)' }}>{value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* Multi-series trend with a highlighted point. */
export function TrendCard({ style }) {
  const series = [
    { c: 'var(--accent)', d: 'M2 46 C 26 40, 44 20, 68 24 C 92 28, 108 50, 132 44 C 156 38, 176 18, 198 22' },
    { c: 'var(--green)',  d: 'M2 30 C 26 34, 44 46, 68 42 C 92 38, 108 18, 132 20 C 156 22, 176 40, 198 36' },
    { c: '#E8695E',       d: 'M2 38 C 26 22, 44 30, 68 34 C 92 38, 108 30, 132 16 C 156 24, 176 32, 198 28' },
  ];
  const months = ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov'];
  const legend = [['Loyal', 'var(--accent)'], ['New', '#E8695E'], ['Walk-in', 'var(--green)']];

  return (
    <Card title="Revenue trend" width={266} style={style}>
      <svg viewBox="0 0 200 56" aria-hidden="true" style={{ width: '100%', height: 62, display: 'block' }}>
        <line x1="132" y1="4" x2="132" y2="52" stroke="var(--on-ink-line)" strokeWidth="1" strokeDasharray="3 3" />
        {series.map((s) => (
          <path key={s.c} d={s.d} fill="none" stroke={s.c} strokeWidth="2.2" strokeLinecap="round" />
        ))}
        <circle cx="132" cy="16" r="4" fill="#E8695E" stroke="#fff" strokeWidth="2" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        {months.map((m) => (
          <span key={m} style={{ fontSize: '0.5625rem', color: 'var(--on-ink-soft)' }}>{m}</span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {legend.map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: 2, background: color }} />
            <span style={{ fontSize: '0.6875rem', color: 'var(--on-ink-soft)' }}>{label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
