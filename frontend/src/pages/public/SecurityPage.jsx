import SecurityOrbit from './components/SecurityOrbit';
import { SectionHeading } from './components/ui';
import { Reveal } from './components/motion';
import { SECURITY } from './content';
import { FinalCta } from './HomePage';
import { usePageMeta } from './usePageMeta';

export default function SecurityPage() {
  usePageMeta({
    title: 'Security and control — ProBusinessCloud',
    description:
      'Multi-tenant authentication, role-based permissions, refresh-token sessions, audit trail, backup and restore, and a separate super-admin panel.',
  });

  return (
    <>
      <section className="pbc-ink pbc-grain">
        <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>
          <SectionHeading
            eyebrow="Security and control"
            tone="ink"
            max={780}
            title="Your records, under your control."
            lede="This system holds what a business is worth: its stock, its takings and its customer obligations. These are the controls that protect it."
          />
        </div>
      </section>

      <section className="pbc-warm pbc-section">
        <div className="pbc-shell">
          <SecurityOrbit items={SECURITY} />
        </div>
      </section>

      <section className="pbc-paper pbc-section">
        <div className="pbc-shell">
          <SectionHeading
            eyebrow="Being precise"
            tone="paper"
            title="What we do not claim."
            max={720}
          />
          <Reveal delay={0.05}>
            <div style={{ marginTop: 'var(--s4)', maxWidth: 720, display: 'grid', gap: 'var(--s2)' }}>
              <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', margin: 0 }}>
                ProBusinessCloud holds no regulatory certification and we make no compliance claim
                on this page. The controls described above are product features, not an audit result.
              </p>
              <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', margin: 0 }}>
                If your business has a specific security or data-residency requirement, raise it in
                the demo and we will tell you plainly whether the product meets it today.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
