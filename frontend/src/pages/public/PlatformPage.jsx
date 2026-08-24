import PlatformHero from './components/PlatformHero';
import CapabilityExplorer from './components/CapabilityExplorer';
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
      <PlatformHero groups={GROUPS} />

      {/* The eight outcome groups. On a wide screen the interface sits still
          while the copy scrolls past it; below that each group becomes a
          self-contained card. */}
      <section className="pbc-paper pbc-section">
        <CapabilityExplorer groups={GROUPS} />
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
