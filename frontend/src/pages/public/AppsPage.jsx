import PlatformSwitcher from './components/PlatformSwitcher';
import AppDownload from './components/AppDownload';
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
      {/* Heading, tabs and device live in one band so the switcher is not
          marooned between two lots of section padding. */}
      <section className="pbc-warm" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s12)' }}>
        <div className="pbc-shell">
          <div
            className="pbc-split"
            style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 'var(--s6)', alignItems: 'end', marginBottom: 'var(--s6)' }}
          >
            <SectionHeading
              eyebrow="Web, desktop and mobile"
              tone="ink"
              max={620}
              title="The counter stays put. You do not have to."
              lede="The same records reach every surface, with each one shaped for the person using it and what their role allows."
            />

            <Reveal delay={0.1}>
              <div
                className="pbc-metrics"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)', paddingTop: 'var(--s3)', borderTop: '1px solid var(--on-ink-line)' }}
              >
                {[
                  ['Web', 'Every module, no install'],
                  ['Desktop', 'A focused till window'],
                  ['Android', 'Owners and managers'],
                  ['iOS', 'The same, on iPhone'],
                ].map(([v, l]) => (
                  <div key={v}>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--accent)' }}>{v}</div>
                    <div className="pbc-meta" style={{ color: 'var(--on-ink-soft)', marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

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

      <section className="pbc-paper" style={{ paddingBottom: 'var(--s12)' }}>
        <AppDownload />
      </section>

      <FinalCta />
    </>
  );
}
