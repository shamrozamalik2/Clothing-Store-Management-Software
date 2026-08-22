import { Link } from 'react-router-dom';
import { Reveal } from './motion';

/* ── Eyebrow ──────────────────────────────────────────────────────────────── */
export function Eyebrow({ children, tone = 'ink' }) {
  const color = tone === 'ink' ? 'var(--accent-hi)' : 'var(--accent)';
  return (
    <span className="pbc-eyebrow" style={{ color, display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}>
      <span aria-hidden="true" style={{ width: 18, height: 1, background: 'currentColor', opacity: 0.7 }} />
      {children}
    </span>
  );
}

/* ── Section heading ──────────────────────────────────────────────────────── */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  tone = 'paper',
  align = 'left',
  max = 620,
  id,
}) {
  const muted = tone === 'ink' ? 'var(--on-ink-mute)' : 'var(--on-paper-mute)';
  const center = align === 'center';

  return (
    <Reveal>
      <div style={{ maxWidth: max, margin: center ? '0 auto' : undefined, textAlign: center ? 'center' : 'left' }}>
        {eyebrow && (
          <div style={{ marginBottom: 'var(--s2)' }}>
            <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
          </div>
        )}
        <h2 id={id} className="pbc-display pbc-h2" style={{ margin: 0 }}>
          {title}
        </h2>
        {lede && (
          <p className="pbc-lede" style={{ color: muted, marginTop: 'var(--s2)', marginBottom: 0 }}>
            {lede}
          </p>
        )}
      </div>
    </Reveal>
  );
}

/* ── Buttons ──────────────────────────────────────────────────────────────── */
export function CTA({ to, href, children, variant = 'primary', tone = 'ink', icon: Icon, ...rest }) {
  const cls = [
    'pbc-btn',
    variant === 'primary'
      ? 'pbc-btn-primary'
      : tone === 'ink'
        ? 'pbc-btn-ghost-ink'
        : 'pbc-btn-ghost-paper',
  ].join(' ');

  const inner = (
    <>
      {children}
      {Icon && <Icon aria-hidden="true" style={{ width: 16, height: 16 }} />}
    </>
  );

  if (href) {
    return (
      <a className={cls} href={href} {...rest}>
        {inner}
      </a>
    );
  }
  return (
    <Link className={cls} to={to} {...rest}>
      {inner}
    </Link>
  );
}

/* ── Status chip — never colour alone; always carries a label ─────────────── */
const STATUS = {
  paid:      { label: 'Paid',       fg: 'var(--sage)',   bg: 'rgba(79,122,92,0.12)',  br: 'rgba(79,122,92,0.30)' },
  pending:   { label: 'Pending',    fg: 'var(--amber)',  bg: 'rgba(180,121,31,0.12)', br: 'rgba(180,121,31,0.30)' },
  low:       { label: 'Low stock',  fg: 'var(--signal)', bg: 'rgba(192,57,47,0.10)',  br: 'rgba(192,57,47,0.28)' },
  refunded:  { label: 'Refunded',   fg: 'var(--slate)',  bg: 'rgba(100,116,139,0.12)',br: 'rgba(100,116,139,0.30)' },
  exchanged: { label: 'Exchanged',  fg: 'var(--accent)', bg: 'var(--accent-wash)',    br: 'var(--accent-line)' },
};

const STATUS_INK = {
  paid:      { label: 'Paid',      fg: 'var(--sage-hi)'  },
  pending:   { label: 'Pending',   fg: 'var(--amber-hi)' },
  low:       { label: 'Low stock', fg: 'var(--signal-hi)'},
  refunded:  { label: 'Refunded',  fg: 'var(--on-ink-soft)' },
  exchanged: { label: 'Exchanged', fg: 'var(--accent-hi)'},
};

export function StatusChip({ kind = 'paid', tone = 'paper', children }) {
  const base = STATUS[kind] || STATUS.paid;
  const fg = tone === 'ink' ? (STATUS_INK[kind]?.fg || base.fg) : base.fg;
  const bg = tone === 'ink' ? 'var(--accent-wash)' : base.bg;
  const br = tone === 'ink' ? 'var(--on-ink-line)' : base.br;

  return (
    <span
      className="pbc-meta"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem',
        padding: '0.1875rem 0.5rem',
        borderRadius: 'var(--r-sm)',
        background: bg,
        border: `1px solid ${br}`,
        color: fg,
        fontWeight: 600,
        fontSize: '0.6875rem',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {children || base.label}
    </span>
  );
}

/* ── Metric card ──────────────────────────────────────────────────────────── */
export function MetricCard({ value, label, detail, tone = 'ink' }) {
  const muted = tone === 'ink' ? 'var(--on-ink-mute)' : 'var(--on-paper-mute)';
  const soft = tone === 'ink' ? 'var(--on-ink-soft)' : 'var(--on-paper-soft)';

  return (
    <div style={{ padding: 'var(--s3) 0' }}>
      <div
        className="pbc-display pbc-tabular"
        style={{ fontSize: 'clamp(2rem, 3.4vw, 2.75rem)', lineHeight: 1, color: tone === 'ink' ? 'var(--on-ink)' : 'var(--on-paper)' }}
      >
        {value}
      </div>
      <div style={{ marginTop: '0.625rem', fontWeight: 600, fontSize: '0.875rem', color: muted }}>{label}</div>
      {detail && (
        <div className="pbc-meta" style={{ marginTop: '0.25rem', color: soft }}>
          {detail}
        </div>
      )}
    </div>
  );
}

/* ── Feature detail line ──────────────────────────────────────────────────── */
export function FeatureLine({ children, tone = 'paper' }) {
  const color = tone === 'ink' ? 'var(--on-ink-mute)' : 'var(--on-paper-mute)';
  const dot = tone === 'ink' ? 'var(--accent-hi)' : 'var(--accent)';
  return (
    <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', color }}>
      <span
        aria-hidden="true"
        style={{ width: 5, height: 5, borderRadius: '50%', background: dot, marginTop: '0.5625rem', flexShrink: 0 }}
      />
      <span className="pbc-body">{children}</span>
    </li>
  );
}
