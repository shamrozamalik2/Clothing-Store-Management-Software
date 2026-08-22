import { CheckIcon } from '@heroicons/react/24/outline';

import DemoForm from './components/DemoForm';
import { Eyebrow } from './components/ui';
import { Reveal } from './components/motion';
import { usePageMeta } from './usePageMeta';

const EXPECT = [
  'A walkthrough built around your catalogue and how you actually sell',
  'Straight answers on what the product does and does not do today',
  'A look at permissions, audit trail and backup before you trust it with real data',
  'No obligation, and no pressure to decide on the call',
];

export default function DemoPage() {
  usePageMeta({
    title: 'Book a demo — ProBusinessCloud',
    description:
      'Arrange a walkthrough of ProBusinessCloud built around how your clothing business actually operates.',
  });

  return (
    <section className="pbc-ink pbc-grain" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: '-30%', right: '-10%',
          width: 720, height: 720,
          background: 'radial-gradient(circle, rgba(47,91,245,0.16) 0%, transparent 66%)',
          pointerEvents: 'none',
        }}
      />

      <div className="pbc-shell" style={{ position: 'relative', paddingTop: 'var(--s10)', paddingBottom: 'var(--s12)' }}>
        <div className="pbc-split" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 'var(--s8)', alignItems: 'start' }}>

          {/* Left — context */}
          <Reveal>
            <div style={{ marginBottom: 'var(--s2)' }}><Eyebrow tone="ink">Book a demo</Eyebrow></div>
            <h1 className="pbc-display pbc-h2" style={{ margin: 0, color: 'var(--on-ink)' }}>
              Start a conversation about how your business runs.
            </h1>
            <p className="pbc-lede" style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s3)' }}>
              Tell us a little about the business and we will arrange a walkthrough focused on
              the parts that matter to you.
            </p>

            <div style={{ marginTop: 'var(--s5)', paddingTop: 'var(--s4)', borderTop: '1px solid var(--on-ink-line)' }}>
              <h2 className="pbc-eyebrow" style={{ color: 'var(--on-ink-soft)', marginBottom: 'var(--s3)' }}>
                What to expect
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.875rem' }}>
                {EXPECT.map((e) => (
                  <li key={e} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <CheckIcon aria-hidden="true" style={{ width: 16, height: 16, color: 'var(--accent-hi)', flexShrink: 0, marginTop: 3 }} />
                    <span className="pbc-body" style={{ color: 'var(--on-ink-mute)' }}>{e}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Right — form */}
          <Reveal delay={0.08}>
            <DemoForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
