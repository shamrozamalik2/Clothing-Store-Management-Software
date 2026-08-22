import SolutionCard from './components/SolutionCard';
import { SectionHeading } from './components/ui';
import { StaggerGroup, StaggerItem } from './components/motion';
import { SOLUTIONS } from './content';
import { FinalCta } from './HomePage';
import { usePageMeta } from './usePageMeta';

export default function SolutionsPage() {
  usePageMeta({
    title: 'Solutions — ProBusinessCloud',
    description:
      'Built for independent clothing stores, multi-branch retailers, wholesalers and apparel manufacturers.',
  });

  return (
    <>
      <section className="pbc-ink pbc-grain">
        <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>
          <SectionHeading
            eyebrow="Solutions"
            tone="ink"
            max={780}
            title="The same system, shaped to how you trade."
            lede="A single shop, a chain, a wholesale operation and a manufacturer have different problems. Here is what each one runs into, and what changes."
          />
        </div>
      </section>

      <section className="pbc-paper pbc-section">
        <div className="pbc-shell">
          <StaggerGroup
            className="pbc-grid-2"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}
            stagger={0.07}
          >
            {SOLUTIONS.map((s) => (
              <StaggerItem key={s.id} style={{ height: '100%' }}>
                <SolutionCard item={s} tone="paper" />
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
