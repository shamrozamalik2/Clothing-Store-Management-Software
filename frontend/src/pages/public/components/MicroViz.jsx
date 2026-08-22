/* ═══════════════════════════════════════════════════════════════════════════
   Micro-visuals

   One small, specific data widget per capability card. They exist to replace
   the dead space that a title-plus-sentence card always leaves, and to make
   each claim concrete: a supplier balance, an attendance week, a permission
   row. Fixed light palette so they read the same on any ground.
   ═══════════════════════════════════════════════════════════════════════════ */

const INK = '#0A0A12';
const MUTE = '#5F6070';
const SOFT = '#8E90A0';
const LINE = 'rgba(10,10,18,0.09)';
const BLUE = '#2C6BF5';
const GREEN = '#12B981';
const RED = '#D2453A';
const AMBER = '#B4791F';

function Frame({ children, label }) {
  return (
    <div
      aria-label={label}
      role="img"
      style={{
        background: '#FBFCFE',
        border: `1px solid ${LINE}`,
        borderRadius: 12,
        padding: '0.625rem 0.75rem',
        display: 'grid',
        gap: 6,
      }}
    >
      {children}
    </div>
  );
}

const rowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 };
const nameStyle = { fontSize: '0.6875rem', color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
const numStyle = { fontSize: '0.6875rem', fontWeight: 600, color: INK, whiteSpace: 'nowrap' };

/* ── Purchasing: what you owe, per supplier ───────────────────────────────── */
function Suppliers() {
  const rows = [
    ['Karachi Textiles', 'Rs 84,200', AMBER, 'Due 12d'],
    ['Lahore Fabrics', 'Rs 31,750', GREEN, 'Paid'],
  ];
  return (
    <Frame label="Supplier balances">
      {rows.map(([n, amt, c, tag]) => (
        <div key={n} style={rowStyle}>
          <span style={nameStyle}>{n}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span className="pbc-tabular" style={numStyle}>{amt}</span>
            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: c, background: `${c}14`, padding: '0.125rem 0.375rem', borderRadius: 999 }}>{tag}</span>
          </span>
        </div>
      ))}
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>Outstanding</span>
        <span className="pbc-tabular" style={{ fontSize: '0.6875rem', fontWeight: 700, color: INK }}>Rs 115,950</span>
      </div>
    </Frame>
  );
}

/* ── Customers: who owes, and how much credit is out ──────────────────────── */
function Customers() {
  const people = [['ZT', BLUE], ['HM', GREEN], ['AK', AMBER], ['+9', '#C9CDD6']];
  return (
    <Frame label="Customer credit">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ display: 'flex' }}>
          {people.map(([t, c], i) => (
            <span
              key={t}
              style={{
                width: 22, height: 22, borderRadius: '50%', background: c, color: '#fff',
                fontSize: '0.5625rem', fontWeight: 700, display: 'grid', placeItems: 'center',
                border: '2px solid #FBFCFE', marginLeft: i ? -7 : 0,
              }}
            >
              {t}
            </span>
          ))}
        </span>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>12 on account</span>
      </div>
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 6, ...rowStyle }}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>Credit used</span>
        <span className="pbc-tabular" style={numStyle}>Rs 268k / 400k</span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'rgba(10,10,18,0.07)', overflow: 'hidden' }}>
        <div style={{ width: '67%', height: '100%', background: BLUE, borderRadius: 999 }} />
      </div>
    </Frame>
  );
}

/* ── Money: revenue against margin ────────────────────────────────────────── */
function Money() {
  const pts = [18, 26, 22, 34, 30, 41, 38, 49, 46, 58];
  const w = 176, h = 34, max = 62;
  const step = w / (pts.length - 1);
  const y = (v) => h - (v / max) * (h - 4) - 2;
  const line = pts.map((v, i) => (i ? 'L' : 'M') + ' ' + (i * step) + ' ' + y(v)).join(' ');

  return (
    <Frame label="Revenue and margin">
      <div style={rowStyle}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>Gross margin</span>
        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: GREEN }}>34.2% ↑</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }} aria-hidden="true">
        <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill="rgba(44,107,245,0.10)" />
        <path d={line} fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={rowStyle}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>Revenue · 12 wks</span>
        <span className="pbc-tabular" style={numStyle}>Rs 1.42M</span>
      </div>
    </Frame>
  );
}

/* ── People: an attendance week ───────────────────────────────────────────── */
function People() {
  const days = ['M', 'T', 'W', 'T', 'F', 'S'];
  const state = [1, 1, 1, 2, 1, 0]; // 1 present, 2 late, 0 off
  const colour = [ '#E4E6EB', GREEN, AMBER ];

  return (
    <Frame label="Attendance and payroll">
      <div style={rowStyle}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>This week</span>
        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: INK }}>8 staff</span>
      </div>
      <div style={{ display: 'flex', gap: 5 }}>
        {days.map((d, i) => (
          <span key={i} style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ display: 'block', height: 20, borderRadius: 5, background: colour[state[i]] }} />
            <span style={{ fontSize: '0.5625rem', color: SOFT, marginTop: 3, display: 'block' }}>{d}</span>
          </span>
        ))}
      </div>
      <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 6, ...rowStyle }}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>Payroll run</span>
        <span className="pbc-tabular" style={numStyle}>Rs 412,000</span>
      </div>
    </Frame>
  );
}

/* ── Manufacturing: a batch consuming its bill of materials ───────────────── */
function Making() {
  const mats = [['Cotton twill', 82], ['Buttons', 64], ['Thread', 41]];
  return (
    <Frame label="Production batch">
      <div style={rowStyle}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>Batch #218 · Kurta</span>
        <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: BLUE, background: 'rgba(44,107,245,0.10)', padding: '0.125rem 0.375rem', borderRadius: 999 }}>In progress</span>
      </div>
      {mats.map(([n, pct]) => (
        <div key={n} style={{ display: 'grid', gridTemplateColumns: '64px 1fr 26px', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: '0.5625rem', color: MUTE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
          <span style={{ height: 5, borderRadius: 999, background: 'rgba(10,10,18,0.07)', overflow: 'hidden', display: 'block' }}>
            <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: BLUE, borderRadius: 999 }} />
          </span>
          <span className="pbc-tabular" style={{ fontSize: '0.5625rem', color: SOFT, textAlign: 'right' }}>{pct}%</span>
        </div>
      ))}
    </Frame>
  );
}

/* ── Control: what a role can reach ───────────────────────────────────────── */
function Control() {
  const perms = [['Point of Sale', true], ['Reports', false], ['Settings', false]];
  return (
    <Frame label="Role permissions">
      <div style={rowStyle}>
        <span style={{ fontSize: '0.625rem', color: SOFT }}>Role</span>
        <span style={{ fontSize: '0.625rem', fontWeight: 600, color: INK }}>Cashier</span>
      </div>
      {perms.map(([n, on]) => (
        <div key={n} style={{ ...rowStyle, borderTop: `1px solid ${LINE}`, paddingTop: 5 }}>
          <span style={{ fontSize: '0.625rem', color: MUTE }}>{n}</span>
          <span
            style={{
              width: 24, height: 14, borderRadius: 999, background: on ? BLUE : '#D8DBE2',
              position: 'relative', flexShrink: 0,
            }}
          >
            <span style={{ position: 'absolute', top: 2, left: on ? 12 : 2, width: 10, height: 10, borderRadius: '50%', background: '#fff' }} />
          </span>
        </div>
      ))}
    </Frame>
  );
}

const MAP = {
  buy: Suppliers,
  customers: Customers,
  money: Money,
  people: People,
  make: Making,
  control: Control,
};

export default function MicroViz({ id }) {
  const C = MAP[id];
  return C ? <C /> : null;
}
