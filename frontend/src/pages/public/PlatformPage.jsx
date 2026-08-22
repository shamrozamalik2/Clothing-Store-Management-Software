import FeatureRail from './components/FeatureRail';
import { SectionHeading } from './components/ui';
import { Reveal } from './components/motion';
import { GROUPS } from './content';
import { FinalCta } from './HomePage';
import { usePageMeta } from './usePageMeta';

export default function PlatformPage() {
  usePageMeta({
    title: 'Platform — ProBusinessCloud',
    description:
      'Point of sale, inventory and variants, purchasing, customers, finance, payroll, manufacturing and administrative control — organised around business outcomes.',
  });

  return (
    <>
      {/* Page header */}
      <section className="pbc-ink pbc-grain" style={{ position: 'relative', overflow: 'hidden' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '-45%', left: '50%', transform: 'translateX(-50%)',
            width: 'min(900px, 130%)', height: 560,
            background: 'radial-gradient(ellipse at center, rgba(47,91,245,0.16) 0%, transparent 68%)',
            pointerEvents: 'none',
          }}
        />
        <div className="pbc-shell" style={{ position: 'relative', paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>
          <SectionHeading
            eyebrow="The platform"
            tone="ink"
            max={780}
            title="Everything the shop needs, in one record."
            lede="Twenty-four modules and more than two hundred capabilities. Below they are grouped by what you are trying to achieve, rather than listed as a menu."
          />
        </div>
      </section>

      {/* Capability groups — alternating rails */}
      <section className="pbc-paper pbc-section">
        <div className="pbc-shell" style={{ display: 'grid', gap: 'var(--s16)' }}>
          {GROUPS.map((g, i) => (
            <FeatureRail key={g.id} group={g} index={i} tone="paper" />
          ))}
        </div>
      </section>

      {/* Honest note about scope */}
      <section className="pbc-warm" style={{ paddingTop: 'var(--s8)', paddingBottom: 'var(--s8)' }}>
        <div className="pbc-shell">
          <Reveal>
            <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', maxWidth: 720, margin: 0 }}>
              Every capability shown on this page exists in the product today. Where something is
              planned rather than shipped, we would rather tell you in the demo than imply it here.
            </p>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
