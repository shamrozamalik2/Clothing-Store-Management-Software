import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@heroicons/react/24/outline';

import Hero from './components/Hero';
import WorkflowStory from './components/WorkflowStory';
import PlatformSwitcher from './components/PlatformSwitcher';
import SecurityOrbit from './components/SecurityOrbit';
import CapabilityBento from './components/CapabilityBento';
import AppDownload from './components/AppDownload';
import { AppChrome, ReportsPreview } from './components/ProductPreview';
import { Reveal, StaggerGroup, StaggerItem } from './components/motion';
import { CTA, Eyebrow, SectionHeading } from './components/ui';
import { STORY, GROUPS, STEPS, SURFACES, SECURITY } from './content';
import { usePageMeta } from './usePageMeta';

export default function HomePage() {
  usePageMeta({
    title: 'ProBusinessCloud — Retail operations, brought together',
    description:
      'Run every part of your clothing business from one intelligent workspace. POS, inventory, purchasing, customers, finance, payroll and production in a single system.',
  });

  return (
    <>
      <Hero />

      {/* ═══ VALUE STATEMENT ═══════════════════════════════════════════════ */}
      <section className="pbc-ink" style={{ borderTop: '1px solid var(--on-ink-line)' }}>
        <div className="pbc-shell" style={{ paddingTop: 'var(--s8)', paddingBottom: 'var(--s8)' }}>
          <Reveal>
            <p className="pbc-display" style={{ fontSize: 'clamp(1.35rem, 2.6vw, 1.85rem)', lineHeight: 1.35, color: 'var(--on-ink)', maxWidth: 860, margin: 0 }}>
              Most retail businesses run on four disconnected tools — a till, a stock sheet,
              an accounts file and a staff rota. ProBusinessCloud replaces the gaps between them
              with a single record.
            </p>
          </Reveal>

          <StaggerGroup
            className="pbc-metrics"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--s4)', marginTop: 'var(--s8)' }}
          >
            {STORY.map((s) => (
              <StaggerItem key={s.k}>
                <div style={{ paddingTop: 'var(--s3)', borderTop: '1px solid var(--on-ink-line)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 600, color: 'var(--on-ink)' }}>{s.title}</h3>
                  <p className="pbc-body" style={{ color: 'var(--on-ink-mute)', marginTop: '0.5rem', marginBottom: 0 }}>{s.desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* ═══ PINNED WORKFLOW STORY ═════════════════════════════════════════ */}
      <WorkflowStory steps={STEPS} />

      {/* ═══ CAPABILITIES BY OUTCOME ═══════════════════════════════════════ */}
      <section className="pbc-paper pbc-section">
        <div className="pbc-shell">
          {/* Heading sits beside a summary block so the right half of the row
              carries weight instead of running out into white space. */}
          <div
            className="pbc-split"
            style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.75fr', gap: 'var(--s6)', alignItems: 'end', marginBottom: 'var(--s8)' }}
          >
            <SectionHeading
              eyebrow="What it covers"
              tone="paper"
              max={640}
              title="Twenty-four modules, organised around what you are trying to get done."
              lede="Not a checklist of features — a set of outcomes, each backed by the parts of the system that deliver it."
            />

            <Reveal delay={0.1}>
              <div
                className="pbc-metrics"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)', paddingTop: 'var(--s3)', borderTop: '1px solid var(--on-paper-line)' }}
              >
                {[
                  ['24', 'Modules'],
                  ['200+', 'Capabilities'],
                  ['4', 'Surfaces — web, desktop, Android, iOS'],
                  ['1', 'Record behind all of it'],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div className="pbc-display pbc-tabular" style={{ fontSize: '1.75rem', lineHeight: 1, color: 'var(--accent)' }}>{v}</div>
                    <div className="pbc-meta" style={{ color: 'var(--on-paper-soft)', marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>

          <CapabilityBento groups={GROUPS} />

          <Reveal delay={0.1}>
            <div style={{ marginTop: 'var(--s6)' }}>
              <CTA to="/platform" variant="ghost" tone="paper" icon={ArrowRightIcon}>
                Explore the platform in detail
              </CTA>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ ANALYTICS ═════════════════════════════════════════════════════ */}
      <section className="pbc-warm pbc-section">
        <div className="pbc-shell">
          <div className="pbc-split" style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 'var(--s6)', alignItems: 'center' }}>
            <Reveal>
              <div style={{ marginBottom: 'var(--s2)' }}><Eyebrow tone="paper">Know the numbers</Eyebrow></div>
              <h2 className="pbc-display pbc-h2" style={{ margin: 0, color: 'var(--on-paper)' }}>
                The questions an owner actually asks, answered on one screen.
              </h2>
              <p className="pbc-lede" style={{ color: 'var(--on-paper-mute)', marginTop: 'var(--s2)' }}>
                What sold today. Where the margin went. Which lines are stuck on the shelf.
                Which customers owe money. Reporting reads from the same records the counter
                writes, so there is no reconciliation step and no second version of the truth.
              </p>
              <div style={{ marginTop: 'var(--s4)' }}>
                <CTA to="/platform#money" variant="ghost" tone="paper" icon={ArrowRightIcon}>
                  See reporting and finance
                </CTA>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="pbc-preview-scroll">
                <AppChrome title="Reports" active={5}>
                  <ReportsPreview />
                </AppChrome>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ SURFACES ══════════════════════════════════════════════════════ */}
      <section className="pbc-ink pbc-grain pbc-section">
        <div className="pbc-shell" style={{ position: 'relative' }}>
          <SectionHeading
            eyebrow="Web, desktop and mobile"
            tone="ink"
            title="One system, wherever the work happens."
            lede="The counter runs on the shop floor. The reporting runs from wherever you are."
          />
          <div style={{ marginTop: 'var(--s6)' }}>
            <PlatformSwitcher surfaces={SURFACES} />
          </div>
        </div>
      </section>

      {/* ═══ APP DOWNLOAD ══════════════════════════════════════════════════ */}
      <section className="pbc-paper" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>
        <AppDownload />
      </section>

      {/* ═══ SECURITY ══════════════════════════════════════════════════════ */}
      <section className="pbc-warm pbc-section">
        <div className="pbc-shell">
          <SectionHeading
            eyebrow="Security and control"
            tone="ink"
            title="Built to be handed to a team."
            lede="Operational and financial records need more than a password. Access, history and recovery are part of the product, not an afterthought."
          />
          <div style={{ marginTop: 'var(--s6)' }}>
            <SecurityOrbit items={SECURITY.slice(0, 6)} />
          </div>
          <Reveal delay={0.1}>
            <div style={{ marginTop: 'var(--s5)' }}>
              <CTA to="/security" variant="ghost" tone="ink" icon={ArrowRightIcon}>
                How access and recovery work
              </CTA>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FINAL CTA ═════════════════════════════════════════════════════ */}
      <FinalCta />
    </>
  );
}

/* ── Shared closing call to action ────────────────────────────────────────── */
export function FinalCta() {
  return (
    <section className="pbc-navy" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '-40%', left: '50%', transform: 'translateX(-50%)',
          width: 'min(900px, 120%)', height: 560,
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.18) 0%, transparent 68%)',
          pointerEvents: 'none',
        }}
      />
      <div className="pbc-shell" style={{ position: 'relative', paddingTop: 'var(--s12)', paddingBottom: 'var(--s12)', textAlign: 'center' }}>
        <Reveal>
          <h2 className="pbc-display pbc-h2" style={{ margin: '0 auto', maxWidth: 720, color: 'var(--on-ink)' }}>
            See it running against your own catalogue.
          </h2>
          <p className="pbc-lede" style={{ color: 'var(--on-ink-mute)', maxWidth: 540, margin: 'var(--s3) auto 0' }}>
            Book a walkthrough and we will show you the parts that matter for how your
            business actually operates — not a generic tour.
          </p>
          <div className="pbc-cta-row" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: 'var(--s5)' }}>
            <CTA to="/demo" icon={ArrowRightIcon}>Book a demo</CTA>
            <CTA to="/how-it-works" variant="ghost" tone="ink">See how it works</CTA>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
