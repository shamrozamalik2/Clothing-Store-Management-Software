import { Reveal, StaggerGroup, StaggerItem } from './motion';
import { FeatureLine } from './ui';
import { AppChrome, DashboardPreview, POSPreview, InventoryPreview, ReportsPreview } from './ProductPreview';

const PREVIEWS = {
  dashboard: { node: <DashboardPreview />, title: 'Dashboard',     rail: 0 },
  pos:       { node: <POSPreview />,       title: 'Point of Sale', rail: 1 },
  inventory: { node: <InventoryPreview />, title: 'Inventory',     rail: 2 },
  reports:   { node: <ReportsPreview />,   title: 'Reports',       rail: 5 },
};

/**
 * FeatureRail — one outcome-led capability group.
 * Alternates the interface between left and right so the page reads as a
 * composed sequence rather than a stack of identical rows.
 */
export default function FeatureRail({ group, index = 0, tone = 'paper' }) {
  const flip = index % 2 === 1;
  const onInk = tone === 'ink';
  const heading = onInk ? 'var(--on-ink)' : 'var(--on-paper)';
  const muted = onInk ? 'var(--on-ink-mute)' : 'var(--on-paper-mute)';
  const preview = PREVIEWS[group.preview] || PREVIEWS.dashboard;

  return (
    <div
      id={group.id}
      className="pbc-split"
      style={{
        display: 'grid',
        gridTemplateColumns: '0.92fr 1.08fr',
        gap: 'var(--s6)',
        alignItems: 'center',
        scrollMarginTop: '96px',
      }}
    >
      {/* Copy */}
      <Reveal style={{ order: flip ? 2 : 1 }}>
        <div
          aria-hidden="true"
          style={{
            width: 40, height: 40, borderRadius: 'var(--r)',
            display: 'grid', placeItems: 'center',
            background: onInk ? 'rgba(47,91,245,0.16)' : 'var(--accent-wash)',
            border: `1px solid ${onInk ? 'var(--accent-line)' : 'var(--accent-line)'}`,
            marginBottom: 'var(--s3)',
          }}
        >
          <group.icon style={{ width: 19, height: 19, color: onInk ? 'var(--accent-hi)' : 'var(--accent)' }} />
        </div>

        <h3 className="pbc-display pbc-h3" style={{ margin: 0, color: heading }}>{group.title}</h3>
        <p className="pbc-lede" style={{ color: muted, marginTop: 'var(--s2)', marginBottom: 'var(--s3)' }}>
          {group.lede}
        </p>

        <StaggerGroup stagger={0.05}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.625rem' }}>
            {group.points.map((p) => (
              <StaggerItem key={p} y={10}>
                <FeatureLine tone={tone}>{p}</FeatureLine>
              </StaggerItem>
            ))}
          </ul>
        </StaggerGroup>
      </Reveal>

      {/* Interface */}
      <Reveal delay={0.08} style={{ order: flip ? 1 : 2 }}>
        <div className="pbc-preview-scroll">
          <AppChrome title={preview.title} active={preview.rail}>
            {preview.node}
          </AppChrome>
        </div>
      </Reveal>
    </div>
  );
}
