import { StaggerGroup, StaggerItem } from './motion';

export default function SecurityPanel({ items, tone = 'ink' }) {
  const onTone = tone === 'ink';
  const heading = onTone ? 'var(--on-ink)' : 'var(--on-paper)';
  const muted   = onTone ? 'var(--on-ink-mute)' : 'var(--on-paper-mute)';
  const line    = onTone ? 'var(--on-ink-line)' : 'var(--on-paper-line)';

  return (
    <StaggerGroup
      className="pbc-grid-3"
      style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', background: line, border: `1px solid ${line}`, borderRadius: 'var(--r-lg)', overflow: 'hidden' }}
      stagger={0.06}
    >
      {items.map((it) => (
        <StaggerItem
          key={it.title}
          style={{ background: onTone ? 'var(--navy)' : 'var(--paper)', padding: 'var(--s4)' }}
        >
          <it.icon
            aria-hidden="true"
            style={{ width: 20, height: 20, color: onTone ? 'var(--accent-hi)' : 'var(--accent)' }}
          />
          <h3 style={{ margin: 'var(--s2) 0 0', fontSize: '1rem', fontWeight: 600, color: heading }}>
            {it.title}
          </h3>
          <p className="pbc-body" style={{ color: muted, marginTop: '0.5rem', marginBottom: 0 }}>
            {it.desc}
          </p>
        </StaggerItem>
      ))}
    </StaggerGroup>
  );
}
