import WorkflowStory from './components/WorkflowStory';
import { SectionHeading } from './components/ui';
import { Reveal, StaggerGroup, StaggerItem } from './components/motion';
import { STEPS, STORY } from './content';
import { FinalCta } from './HomePage';
import { usePageMeta } from './usePageMeta';

export default function HowItWorksPage() {
  usePageMeta({
    title: 'How it works — ProBusinessCloud',
    description:
      'Configure the business, sell and receive stock, monitor performance, and grow with control — the four stages of running a clothing business on ProBusinessCloud.',
  });

  return (
    <>
      <section className="pbc-ink pbc-grain">
        <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>
          <SectionHeading
            eyebrow="How it works"
            tone="ink"
            max={780}
            title="Four stages, one continuous record."
            lede="Nothing here is re-keyed. Each stage writes to the same data the next stage reads."
          />
        </div>
      </section>

      <WorkflowStory steps={STEPS} />

      {/* Detail cards — the same four stages, readable without any scrolling */}
      <section className="pbc-paper pbc-section">
        <div className="pbc-shell">
          <SectionHeading
            eyebrow="In practice"
            tone="paper"
            title="What each stage actually involves."
          />

          <StaggerGroup
            className="pbc-grid-2"
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)', marginTop: 'var(--s6)' }}
            stagger={0.06}
          >
            {STEPS.map((s) => (
              <StaggerItem key={s.n}>
                <div className="pbc-card" style={{ padding: 'var(--s4)', height: '100%' }}>
                  <span className="pbc-mono" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--accent)' }}>{s.n}</span>
                  <h3 style={{ margin: '0.5rem 0 0', fontSize: '1.125rem', fontWeight: 600, color: 'var(--on-paper)' }}>{s.title}</h3>
                  <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', marginTop: '0.625rem', marginBottom: 0 }}>{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* The through-line */}
      <section className="pbc-warm pbc-section">
        <div className="pbc-shell">
          <Reveal>
            <p className="pbc-display" style={{ fontSize: 'clamp(1.35rem, 2.6vw, 1.85rem)', lineHeight: 1.35, color: 'var(--on-paper)', maxWidth: 820, margin: 0 }}>
              The point is not that each stage is possible. It is that the sale, the stock
              movement, the ledger entry and the report are the same event, recorded once.
            </p>
          </Reveal>

          <StaggerGroup
            className="pbc-metrics"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)', marginTop: 'var(--s6)' }}
          >
            {STORY.map((s) => (
              <StaggerItem key={s.k}>
                <div style={{ paddingTop: 'var(--s3)', borderTop: '1px solid var(--on-paper-line)' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--on-paper)' }}>{s.title}</h3>
                  <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', marginTop: '0.5rem', marginBottom: 0 }}>{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
