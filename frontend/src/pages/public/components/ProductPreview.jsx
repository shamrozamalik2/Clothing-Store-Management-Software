import {
  Squares2X2Icon, ShoppingCartIcon, CubeIcon, ChartBarIcon,
  UsersIcon, TruckIcon, Cog6ToothIcon, MagnifyingGlassIcon,
  BellIcon, PlusIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';
import { StatusChip } from './ui';

/* ═══════════════════════════════════════════════════════════════════════════
   Product UI mockups
   Reusable components — not screenshots. All data is fictional but realistic.
   Rendered light-on-ink so the interface reads clearly against dark sections.
   ═══════════════════════════════════════════════════════════════════════════ */

const RAIL = [
  { icon: Squares2X2Icon,   label: 'Dashboard' },
  { icon: ShoppingCartIcon, label: 'Point of Sale' },
  { icon: CubeIcon,         label: 'Inventory' },
  { icon: TruckIcon,        label: 'Purchasing' },
  { icon: UsersIcon,        label: 'Customers' },
  { icon: ChartBarIcon,     label: 'Reports' },
];

/* ── App chrome ───────────────────────────────────────────────────────────── */
export function AppChrome({ children, active = 0, title = 'Dashboard', style }) {
  return (
    <div
      style={{
        borderRadius: 'var(--r-lg)',
        overflow: 'hidden',
        background: 'var(--paper)',
        border: '1px solid rgba(11,16,32,0.14)',
        boxShadow: '0 40px 90px -40px rgba(0,0,0,0.65), 0 2px 8px rgba(0,0,0,0.20)',
        display: 'flex',
        minHeight: 400,
        ...style,
      }}
      role="img"
      aria-label={'ProBusinessCloud ' + title + ' interface preview'}
    >
      {/* Left rail */}
      <div
        aria-hidden="true"
        style={{
          width: 52,
          background: 'var(--ink)',
          padding: '14px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--accent)', marginBottom: 12, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>P</div>
        {RAIL.map((r, i) => (
          <div
            key={r.label}
            style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'grid', placeItems: 'center',
              background: i === active ? 'rgba(47,91,245,0.30)' : 'transparent',
              color: i === active ? '#A9C0FF' : 'rgba(252,251,248,0.42)',
            }}
          >
            <r.icon style={{ width: 15, height: 15 }} />
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'grid', placeItems: 'center', color: 'rgba(252,251,248,0.42)' }}>
          <Cog6ToothIcon style={{ width: 15, height: 15 }} />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <div
          aria-hidden="true"
          style={{
            height: 44, borderBottom: '1px solid rgba(11,16,32,0.09)',
            display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px',
            background: 'var(--paper)', flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 12.5, color: 'var(--on-paper)' }}>{title}</span>
          <div style={{ flex: 1, maxWidth: 220, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', borderRadius: 6, padding: '5px 9px', border: '1px solid rgba(11,16,32,0.07)' }}>
            <MagnifyingGlassIcon style={{ width: 12, height: 12, color: 'var(--on-paper-soft)' }} />
            <span style={{ fontSize: 10.5, color: 'var(--on-paper-soft)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search products, SKU, customers…</span>
          </div>
          <div style={{ flex: 1 }} />
          <BellIcon style={{ width: 14, height: 14, color: 'var(--on-paper-soft)' }} />
          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--navy)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 9.5, fontWeight: 700 }}>AR</div>
        </div>

        <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)' }}>{children}</div>
      </div>
    </div>
  );
}

/* ── Small building blocks ────────────────────────────────────────────────── */
function Kpi({ label, value, delta, trend = 'up' }) {
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 9, padding: '10px 12px' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: 'var(--on-paper-soft)' }}>{label}</div>
      <div className="pbc-tabular" style={{ fontSize: 18, fontWeight: 800, color: 'var(--on-paper)', marginTop: 3, letterSpacing: '-0.02em' }}>{value}</div>
      {delta && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, marginTop: 2, color: trend === 'up' ? 'var(--sage)' : 'var(--signal)' }}>
          <ArrowTrendingUpIcon style={{ width: 10, height: 10, transform: trend === 'up' ? 'none' : 'scaleY(-1)' }} />
          {delta}
        </div>
      )}
    </div>
  );
}

/* Revenue chart — plain SVG, no chart library in the marketing bundle. */
function RevenueChart({ height = 92 }) {
  const pts = [26, 34, 30, 44, 39, 52, 47, 61, 55, 68, 64, 78];
  const w = 300;
  const h = height;
  const max = 88;
  const step = w / (pts.length - 1);
  const y = (v) => h - (v / max) * (h - 12) - 4;
  const line = pts.map((v, i) => (i === 0 ? 'M' : 'L') + ' ' + (i * step) + ' ' + y(v)).join(' ');
  const area = line + ' L ' + w + ' ' + h + ' L 0 ' + h + ' Z';

  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="pbcRev" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pbcRev)" />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={w} cy={y(pts[pts.length - 1])} r="3" fill="var(--accent)" />
    </svg>
  );
}

/* ── Dashboard ────────────────────────────────────────────────────────────── */
export function DashboardPreview() {
  const rows = [
    { id: 'INV-4821', who: 'Walk-in',        amt: 'Rs 4,250',  st: 'paid' },
    { id: 'INV-4820', who: 'Zainab Traders', amt: 'Rs 18,900', st: 'pending' },
    { id: 'INV-4819', who: 'Hassan M.',      amt: 'Rs 2,150',  st: 'exchanged' },
    { id: 'INV-4818', who: 'Walk-in',        amt: 'Rs 1,480',  st: 'refunded' },
  ];

  const alerts = [
    { n: 'Oxford Shirt — White / M',  q: '3 left' },
    { n: 'Denim Jacket — Indigo / L', q: '2 left' },
    { n: 'Cotton Kurta — Black / S',  q: '4 left' },
  ];

  return (
    <div style={{ padding: 14, display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Kpi label="Revenue today" value="Rs 128,400" delta="12.4%" />
        <Kpi label="Transactions" value="86" delta="6.1%" />
        <Kpi label="Avg. basket" value="Rs 1,493" delta="2.8%" />
        <Kpi label="Low stock" value="14" delta="3 new" trend="down" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 9, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-paper)' }}>Revenue — last 12 weeks</span>
            <span className="pbc-tabular" style={{ fontSize: 10, color: 'var(--on-paper-soft)' }}>Rs 1.42M</span>
          </div>
          <RevenueChart />
        </div>

        <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-paper)', marginBottom: 9 }}>Stock alerts</div>
          {alerts.map((s) => (
            <div key={s.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: '1px solid rgba(11,16,32,0.05)' }}>
              <span style={{ fontSize: 10, color: 'var(--on-paper-mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.n}</span>
              <StatusChip kind="low">{s.q}</StatusChip>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 9, overflow: 'hidden' }}>
        <div style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, borderBottom: '1px solid rgba(11,16,32,0.07)', color: 'var(--on-paper)' }}>Recent transactions</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid rgba(11,16,32,0.05)' }}>
                <td className="pbc-mono" style={{ padding: '6px 12px', fontSize: 9.5, color: 'var(--on-paper-soft)' }}>{r.id}</td>
                <td style={{ padding: '6px 4px', fontSize: 10.5, color: 'var(--on-paper)' }}>{r.who}</td>
                <td className="pbc-tabular" style={{ padding: '6px 4px', fontSize: 10.5, fontWeight: 700, textAlign: 'right', color: 'var(--on-paper)' }}>{r.amt}</td>
                <td style={{ padding: '6px 12px', textAlign: 'right' }}><StatusChip kind={r.st} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Point of sale ────────────────────────────────────────────────────────── */
export function POSPreview() {
  const cart = [
    { n: 'Oxford Shirt — Slim', v: 'White · M',  q: 2, p: 'Rs 3,600' },
    { n: 'Chino Trousers',      v: 'Beige · 32', q: 1, p: 'Rs 2,450' },
    { n: 'Leather Belt',        v: 'Brown · L',  q: 1, p: 'Rs 890' },
  ];
  const grid = [
    { n: 'Oxford Shirt',  p: 'Rs 1,800', tone: '#DDE4F2' },
    { n: 'Denim Jacket',  p: 'Rs 4,200', tone: '#C9D3E8' },
    { n: 'Cotton Kurta',  p: 'Rs 2,100', tone: '#E4DED2' },
    { n: 'Chino Trouser', p: 'Rs 2,450', tone: '#D8DCE4' },
    { n: 'Silk Scarf',    p: 'Rs 1,250', tone: '#E8D9DA' },
    { n: 'Leather Belt',  p: 'Rs 890',   tone: '#DFD6CA' },
  ];
  const totals = [
    ['Subtotal', 'Rs 8,540'],
    ['Discount', '− Rs 400'],
    ['Tax (5%)', 'Rs 407'],
  ];

  return (
    <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 10, minHeight: 356 }}>
      {/* Catalogue */}
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          {['All', 'Shirts', 'Trousers', 'Outerwear'].map((t, i) => (
            <span key={t} style={{ fontSize: 9.5, fontWeight: 700, padding: '4px 9px', borderRadius: 999, background: i === 0 ? 'var(--ink)' : 'var(--paper)', color: i === 0 ? '#fff' : 'var(--on-paper-mute)', border: '1px solid rgba(11,16,32,0.09)' }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {grid.map((g) => (
            <div key={g.n} style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 8, overflow: 'hidden' }}>
              <div style={{ height: 42, background: g.tone }} />
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--on-paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.n}</div>
                <div className="pbc-tabular" style={{ fontSize: 9, color: 'var(--on-paper-soft)', marginTop: 1 }}>{g.p}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticket */}
      <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.09)', borderRadius: 9, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '9px 11px', borderBottom: '1px solid rgba(11,16,32,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-paper)' }}>Current sale</span>
          <span className="pbc-mono" style={{ fontSize: 9, color: 'var(--on-paper-soft)' }}>#4822</span>
        </div>

        <div style={{ flex: 1, padding: '4px 11px' }}>
          {cart.map((c) => (
            <div key={c.n} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(11,16,32,0.05)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--on-paper)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.n}</div>
                <div style={{ fontSize: 9, color: 'var(--on-paper-soft)', marginTop: 1 }}>{c.v}</div>
              </div>
              <span className="pbc-tabular" style={{ fontSize: 9.5, color: 'var(--on-paper-soft)' }}>×{c.q}</span>
              <span className="pbc-tabular" style={{ fontSize: 10, fontWeight: 700, color: 'var(--on-paper)' }}>{c.p}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '9px 11px', borderTop: '1px solid rgba(11,16,32,0.07)' }}>
          {totals.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, color: 'var(--on-paper-mute)', marginBottom: 3 }}>
              <span>{k}</span><span className="pbc-tabular">{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(11,16,32,0.08)' }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--on-paper)' }}>Total</span>
            <span className="pbc-tabular" style={{ fontSize: 15, fontWeight: 800, color: 'var(--on-paper)' }}>Rs 8,547</span>
          </div>
          <div style={{ marginTop: 8, background: 'var(--accent)', color: '#fff', borderRadius: 7, padding: '7px 0', textAlign: 'center', fontSize: 10.5, fontWeight: 700 }}>
            Charge Rs 8,547
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Inventory / variants ─────────────────────────────────────────────────── */
export function InventoryPreview() {
  const rows = [
    { sku: 'OXF-WHT', n: 'Oxford Shirt — Slim', v: '4 colours · 5 sizes', s: '128 / 160', low: false },
    { sku: 'DNM-IND', n: 'Denim Jacket',        v: '2 colours · 4 sizes', s: '12 / 80',   low: true },
    { sku: 'KUR-BLK', n: 'Cotton Kurta',        v: '6 colours · 5 sizes', s: '214 / 240', low: false },
    { sku: 'CHN-BEI', n: 'Chino Trousers',      v: '3 colours · 6 sizes', s: '96 / 120',  low: false },
    { sku: 'SCF-SLK', n: 'Silk Scarf',          v: '8 colours',           s: '7 / 60',    low: true },
  ];
  const heads = ['SKU', 'Product', 'Variants', 'In stock', ''];

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--paper)', borderRadius: 6, padding: '6px 9px', border: '1px solid rgba(11,16,32,0.08)' }}>
          <MagnifyingGlassIcon style={{ width: 12, height: 12, color: 'var(--on-paper-soft)' }} />
          <span style={{ fontSize: 10, color: 'var(--on-paper-soft)' }}>Filter by SKU, barcode or category…</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--ink)', color: '#fff', borderRadius: 6, padding: '6px 10px', fontSize: 10, fontWeight: 700 }}>
          <PlusIcon style={{ width: 11, height: 11 }} /> Add product
        </div>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 9, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              {heads.map((h, i) => (
                <th key={i} style={{ padding: '7px 11px', fontSize: 8.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--on-paper-soft)', textAlign: h === 'In stock' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.sku} style={{ borderTop: '1px solid rgba(11,16,32,0.05)' }}>
                <td className="pbc-mono" style={{ padding: '8px 11px', fontSize: 9, color: 'var(--on-paper-soft)' }}>{r.sku}</td>
                <td style={{ padding: '8px 4px', fontSize: 10.5, fontWeight: 600, color: 'var(--on-paper)' }}>{r.n}</td>
                <td style={{ padding: '8px 4px', fontSize: 9.5, color: 'var(--on-paper-soft)' }}>{r.v}</td>
                <td className="pbc-tabular" style={{ padding: '8px 4px', fontSize: 10, textAlign: 'right', color: 'var(--on-paper)', fontWeight: 600 }}>{r.s}</td>
                <td style={{ padding: '8px 11px', textAlign: 'right' }}>{r.low ? <StatusChip kind="low" /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Reports ──────────────────────────────────────────────────────────────── */
export function ReportsPreview() {
  const pay = [
    { k: 'Cash',     v: 46, c: 'var(--accent)' },
    { k: 'Card',     v: 34, c: '#7FA0F7' },
    { k: 'Transfer', v: 14, c: '#B9C9F9' },
    { k: 'Credit',   v: 6,  c: '#DCE3F7' },
  ];
  const top = [
    ['Oxford Shirt — Slim', 'Rs 284,600'],
    ['Cotton Kurta',        'Rs 219,400'],
    ['Denim Jacket',        'Rs 186,200'],
    ['Chino Trousers',      'Rs 142,800'],
  ];

  return (
    <div style={{ padding: 14, display: 'grid', gap: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <Kpi label="Gross revenue" value="Rs 1.42M" delta="9.2%" />
        <Kpi label="Gross profit" value="Rs 486K" delta="7.4%" />
        <Kpi label="Stock value" value="Rs 3.10M" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--on-paper)' }}>Payment mix</div>
          <div style={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
            {pay.map((p) => <div key={p.k} style={{ width: p.v + '%', background: p.c }} />)}
          </div>
          {pay.map((p) => (
            <div key={p.k} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: 2, background: p.c, flexShrink: 0 }} />
              <span style={{ fontSize: 9.5, color: 'var(--on-paper-mute)', flex: 1 }}>{p.k}</span>
              <span className="pbc-tabular" style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--on-paper)' }}>{p.v}%</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--paper)', border: '1px solid rgba(11,16,32,0.08)', borderRadius: 9, padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: 'var(--on-paper)' }}>Top products</div>
          {top.map(([n, v], i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderTop: i ? '1px solid rgba(11,16,32,0.05)' : 'none' }}>
              <span className="pbc-mono" style={{ fontSize: 9, color: 'var(--on-paper-soft)', width: 14 }}>{i + 1}</span>
              <span style={{ fontSize: 10, color: 'var(--on-paper)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              <span className="pbc-tabular" style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--on-paper)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Mobile ───────────────────────────────────────────────────────────────── */
export function MobilePreview({ style }) {
  const quick = [['Sales', '86'], ['Returns', '3']];
  const recent = [['INV-4821', 'paid'], ['INV-4820', 'pending'], ['INV-4819', 'exchanged']];

  return (
    <div
      role="img"
      aria-label="ProBusinessCloud mobile app preview"
      style={{
        width: 208, borderRadius: 26, padding: 7,
        background: 'var(--ink)',
        border: '1px solid rgba(252,251,248,0.16)',
        boxShadow: '0 30px 70px -30px rgba(0,0,0,0.7)',
        ...style,
      }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 20, overflow: 'hidden' }}>
        <div style={{ background: 'var(--ink)', padding: '8px 12px 12px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, opacity: 0.6, marginBottom: 8 }}>
            <span>9:41</span><span>▮▮▮</span>
          </div>
          <div style={{ fontSize: 9, opacity: 0.62 }}>Today</div>
          <div className="pbc-tabular" style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>Rs 128,400</div>
          <div style={{ fontSize: 8.5, color: 'var(--sage-hi)', fontWeight: 700, marginTop: 2 }}>↑ 12.4% vs yesterday</div>
        </div>

        <div style={{ padding: 10, display: 'grid', gap: 7 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
            {quick.map(([k, v]) => (
              <div key={k} style={{ background: 'var(--paper)', borderRadius: 7, padding: '7px 9px', border: '1px solid rgba(11,16,32,0.07)' }}>
                <div style={{ fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.4, color: 'var(--on-paper-soft)', fontWeight: 700 }}>{k}</div>
                <div className="pbc-tabular" style={{ fontSize: 14, fontWeight: 800, color: 'var(--on-paper)' }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--paper)', borderRadius: 7, padding: 9, border: '1px solid rgba(11,16,32,0.07)' }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, marginBottom: 6, color: 'var(--on-paper)' }}>Recent</div>
            {recent.map(([id, st], i) => (
              <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderTop: i ? '1px solid rgba(11,16,32,0.05)' : 'none' }}>
                <span className="pbc-mono" style={{ fontSize: 7.5, color: 'var(--on-paper-soft)' }}>{id}</span>
                <StatusChip kind={st} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
