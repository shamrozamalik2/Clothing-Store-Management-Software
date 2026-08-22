import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

import { Reveal, StaggerGroup, StaggerItem, Lift } from './motion';
import { StatusChip } from './ui';
import MicroViz from './MicroViz';

/* ═══════════════════════════════════════════════════════════════════════════
   Capability bento

   A uniform grid of equal cards gives every capability the same weight, which
   is the same as giving none of them any. This lays the same content out with
   a deliberate hierarchy: two lead cells carry a real interface vignette, the
   rest are compact cards. Vignettes are purpose-built for the point being
   made rather than a shrunken screenshot.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Vignette: the size × colour stock matrix ─────────────────────────────── */
function VariantMatrix() {
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const rows = [
    { colour: 'White',  swatch: '#F2F3F5', qty: [8, 24, 3, 19, 11] },
    { colour: 'Navy',   swatch: '#22304A', qty: [6, 18, 22, 14, 5] },
    { colour: 'Sage',   swatch: '#9FB8A6', qty: [4, 12, 16, 2, 7] },
  ];
  const low = (n) => n <= 4;

  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1px solid rgba(10,10,18,0.10)',
        borderRadius: 'var(--r)',
        padding: '0.875rem',
        boxShadow: '0 2px 8px rgba(16,24,40,0.05)',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '68px repeat(5, 1fr)', gap: 4, alignItems: 'center' }}>
        <span />
        {sizes.map((s) => (
          <span key={s} style={{ fontSize: '0.625rem', fontWeight: 600, color: '#8E90A0', textAlign: 'center', letterSpacing: '0.04em' }}>
            {s}
          </span>
        ))}

        {rows.map((r) => (
          <Fragmentish key={r.colour}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: r.swatch, border: '1px solid rgba(10,10,18,0.14)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.6875rem', color: '#0A0A12', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.colour}</span>
            </span>
            {r.qty.map((q, i) => (
              <span
                key={i}
                className="pbc-tabular"
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  padding: '0.25rem 0',
                  borderRadius: 6,
                  color: low(q) ? '#D2453A' : '#0A0A12',
                  background: low(q) ? 'rgba(210,69,58,0.08)' : 'rgba(10,10,18,0.03)',
                }}
              >
                {q}
              </span>
            ))}
          </Fragmentish>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(10,10,18,0.07)' }}>
        <StatusChip kind="low">4 variants low</StatusChip>
        <span style={{ fontSize: '0.6875rem', color: '#8E90A0' }}>15 of 15 combinations tracked</span>
      </div>
    </div>
  );
}

/* React needs a keyed wrapper for the grid rows; a fragment cannot take one
   in this position without extra ceremony, so use a display:contents span. */
function Fragmentish({ children }) {
  return <span style={{ display: 'contents' }}>{children}</span>;
}

/* ── Vignette: the counter ticket ─────────────────────────────────────────── */
function TicketVignette() {
  const lines = [
    ['Oxford Shirt — Slim', 'White · M', '×2', 'Rs 3,600'],
    ['Chino Trousers', 'Beige · 32', '×1', 'Rs 2,450'],
    ['Leather Belt', 'Brown · L', '×1', 'Rs 890'],
  ];

  return (
    <div
      style={{
        background: 'var(--white)',
        border: '1px solid rgba(10,10,18,0.10)',
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(16,24,40,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0.875rem', borderBottom: '1px solid rgba(10,10,18,0.07)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0A0A12' }}>Current sale</span>
        <span className="pbc-mono" style={{ fontSize: '0.625rem', color: '#8E90A0' }}>#4822</span>
      </div>

      <div style={{ padding: '0.25rem 0.875rem' }}>
        {lines.map(([n, v, q, p]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.4375rem 0', borderBottom: '1px solid rgba(10,10,18,0.05)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: '#0A0A12', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</span>
              <span style={{ display: 'block', fontSize: '0.625rem', color: '#8E90A0' }}>{v}</span>
            </span>
            <span className="pbc-tabular" style={{ fontSize: '0.625rem', color: '#8E90A0' }}>{q}</span>
            <span className="pbc-tabular" style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#0A0A12' }}>{p}</span>
          </div>
        ))}
      </div>

      <div style={{ padding: '0.625rem 0.875rem 0.875rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#0A0A12' }}>Total</span>
          <span className="pbc-tabular" style={{ fontSize: '1rem', fontWeight: 700, color: '#0A0A12' }}>Rs 8,547</span>
        </div>
        <div style={{ marginTop: 8, background: 'var(--accent)', color: '#fff', borderRadius: 999, padding: '0.4375rem 0', textAlign: 'center', fontSize: '0.6875rem', fontWeight: 600 }}>
          Charge Rs 8,547
        </div>
      </div>
    </div>
  );
}

const VIGNETTES = { sell: <TicketVignette />, stock: <VariantMatrix /> };

/* ── Lead cell — copy beside a working vignette ───────────────────────────── */
function LeadCell({ group }) {
  const Icon = group.icon;

  return (
    <Lift
      className="pbc-card pbc-lift pbc-bento-lead"
      style={{ padding: 'var(--s4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', alignItems: 'center', height: '100%' }}
    >
      <div>
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center', width: 46, height: 46, borderRadius: 14,
            background: 'var(--accent)', color: '#fff',
            boxShadow: '0 8px 20px -8px rgba(44,107,245,0.7)',
          }}
        >
          <Icon style={{ width: 22, height: 22 }} />
        </span>

        <h3 className="pbc-display" style={{ fontSize: '1.375rem', margin: 'var(--s3) 0 0', color: 'var(--on-paper)' }}>
          {group.title}
        </h3>
        <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', margin: '0.625rem 0 0' }}>
          {group.lede}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginTop: 'var(--s3)' }}>
          {(group.chips || group.points).slice(0, 4).map((p) => (
            <span
              key={p}
              style={{
                fontSize: '0.75rem', padding: '0.3125rem 0.75rem', borderRadius: 999, whiteSpace: 'nowrap',
                background: 'var(--accent-wash)', border: '1px solid var(--accent-line)',
                color: 'var(--accent)', fontWeight: 500,
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="pbc-bento-vignette">{VIGNETTES[group.id]}</div>
    </Lift>
  );
}

/* ── Compact cell ─────────────────────────────────────────────────────────── */
function Cell({ group }) {
  const Icon = group.icon;

  return (
    <Lift className="pbc-card pbc-lift" style={{ padding: 'var(--s4)', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span
          aria-hidden="true"
          style={{
            display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12,
            background: 'var(--accent)', color: '#fff', flexShrink: 0,
            boxShadow: '0 6px 16px -8px rgba(44,107,245,0.8)',
          }}
        >
          <Icon style={{ width: 19, height: 19 }} />
        </span>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--on-paper)', lineHeight: 1.3 }}>
          {group.title}
        </h3>
      </div>

      <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', margin: 'var(--s3) 0 var(--s3)', fontSize: '0.9375rem' }}>
        {group.lede}
      </p>

      {/* A concrete widget rather than the empty space a two-line card leaves. */}
      <div style={{ marginTop: 'auto' }}>
        <MicroViz id={group.id} />
      </div>
    </Lift>
  );
}

/* ── Section ──────────────────────────────────────────────────────────────── */
export default function CapabilityBento({ groups }) {
  const lead = groups.filter((g) => VIGNETTES[g.id]);
  const rest = groups.filter((g) => !VIGNETTES[g.id]);

  return (
    <>
      <StaggerGroup className="pbc-bento-leads" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }} stagger={0.08}>
        {lead.map((g) => (
          <StaggerItem key={g.id} style={{ height: '100%' }}>
            <Link to={`/platform#${g.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
              <LeadCell group={g} />
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>

      <StaggerGroup
        className="pbc-grid-3"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s3)', marginTop: 'var(--s3)' }}
        stagger={0.05}
      >
        {rest.map((g) => (
          <StaggerItem key={g.id} style={{ height: '100%' }}>
            <Link to={`/platform#${g.id}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
              <Cell group={g} />
            </Link>
          </StaggerItem>
        ))}
      </StaggerGroup>
    </>
  );
}

export { ArrowRightIcon, Reveal };
