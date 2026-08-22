import PlatformSwitcher from './components/PlatformSwitcher';
import { SectionHeading } from './components/ui';
import { Reveal } from './components/motion';
import { SURFACES } from './content';
import { FinalCta } from './HomePage';
import { usePageMeta } from './usePageMeta';

export default function AppsPage() {
  usePageMeta({
    title: 'Web, desktop and mobile — ProBusinessCloud',
    description:
      'ProBusinessCloud runs in the browser, as a desktop application for the counter, and as Android and iOS apps for owners and managers.',
  });

  return (
    <>
      <section className="pbc-ink pbc-grain">
        <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>
          <SectionHeading
            eyebrow="Web, desktop and mobile"
            tone="ink"
            max={780}
            title="The counter stays put. You do not have to."
            lede="The same records reach every surface, with each one shaped for the person using it and what their role allows."
          />
        </div>
      </section>

      <section className="pbc-navy pbc-section">
        <div className="pbc-shell">
          <PlatformSwitcher surfaces={SURFACES} />
        </div>
      </section>

      <section className="pbc-paper pbc-section">
        <div className="pbc-shell">
          <Reveal>
            <p className="pbc-display" style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.75rem)', lineHeight: 1.38, color: 'var(--on-paper)', maxWidth: 800, margin: 0 }}>
              A cashier sees the till. A manager sees the stock room. An owner sees the business —
              from the shop, the office, or a phone somewhere else entirely.
            </p>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
