import { FeatureLine } from './ui';
import { Lift } from './motion';

export default function SolutionCard({ item, tone = 'paper' }) {
  const onInk = tone === 'ink';
  const heading = onInk ? 'var(--on-ink)' : 'var(--on-paper)';
  const muted = onInk ? 'var(--on-ink-mute)' : 'var(--on-paper-mute)';
  const soft = onInk ? 'var(--on-ink-soft)' : 'var(--on-paper-soft)';

  return (
    <Lift
      id={item.id}
      className={onInk ? 'pbc-card-ink pbc-lift' : 'pbc-card pbc-lift'}
      style={{ padding: 'var(--s4)', height: '100%', display: 'flex', flexDirection: 'column', scrollMarginTop: '96px' }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 38, height: 38, borderRadius: 'var(--r)',
          display: 'grid', placeItems: 'center',
          background: onInk ? 'rgba(47,91,245,0.16)' : 'var(--accent-wash)',
          border: '1px solid var(--accent-line)',
        }}
      >
        <item.icon style={{ width: 18, height: 18, color: onInk ? 'var(--accent-hi)' : 'var(--accent)' }} />
      </div>

      <h3 style={{ margin: 'var(--s3) 0 0', fontSize: '1.125rem', fontWeight: 600, color: heading }}>
        {item.who}
      </h3>

      <div style={{ marginTop: 'var(--s3)' }}>
        <div className="pbc-eyebrow" style={{ color: soft, fontSize: '0.6875rem' }}>The problem</div>
        <p className="pbc-body" style={{ color: muted, margin: '0.375rem 0 0' }}>{item.problem}</p>
      </div>

      <div style={{ marginTop: 'var(--s3)' }}>
        <div className="pbc-eyebrow" style={{ color: onInk ? 'var(--accent-hi)' : 'var(--accent)', fontSize: '0.6875rem' }}>
          With ProBusinessCloud
        </div>
        <p className="pbc-body" style={{ color: muted, margin: '0.375rem 0 0' }}>{item.answer}</p>
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 'var(--s3) 0 0',
          padding: 'var(--s3) 0 0',
          borderTop: `1px solid ${onInk ? 'var(--on-ink-line)' : 'var(--on-paper-line)'}`,
          display: 'grid',
          gap: '0.5rem',
        }}
      >
        {item.points.map((p) => (
          <FeatureLine key={p} tone={tone}>{p}</FeatureLine>
        ))}
      </ul>
    </Lift>
  );
}
