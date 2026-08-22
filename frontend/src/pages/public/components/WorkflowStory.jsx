import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';

import { Eyebrow } from './ui';
import { EASE } from './motion';
import { AppChrome, DashboardPreview, POSPreview, InventoryPreview, ReportsPreview } from './ProductPreview';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from './gsapSetup';

const PREVIEWS = {
  dashboard: { node: <DashboardPreview />,  title: 'Dashboard',     rail: 0, caption: 'Revenue, transactions and stock alerts for the day' },
  pos:       { node: <POSPreview />,        title: 'Point of Sale', rail: 1, caption: 'Barcode checkout with size and colour variants' },
  inventory: { node: <InventoryPreview />,  title: 'Inventory',     rail: 2, caption: 'Every variant tracked as its own stock line' },
  reports:   { node: <ReportsPreview />,    title: 'Reports',       rail: 5, caption: 'Payment mix, top products and stock valuation' },
};

/**
 * WorkflowStory — the "one system, many workflows" sequence.
 *
 * On desktop the section pins and the interface swaps as the visitor scrolls
 * through each stage. Below 900px, and whenever reduced motion is requested,
 * it degrades to a plain stacked list: every stage stays readable with no
 * pinning and no scrub.
 */
export default function WorkflowStory({ steps }) {
  const scope = useRef(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const mm = gsap.matchMedia();
      mm.add('(min-width: 901px)', () => {
        const st = ScrollTriggerFor(scope.current, steps.length, setActive);
        return () => st && st.kill();
      });
      return () => mm.revert();
    },
    { scope, dependencies: [steps.length] }
  );

  const current = steps[active] || steps[0];
  const preview = PREVIEWS[current.preview] || PREVIEWS.dashboard;
  const progress = ((active + 1) / steps.length) * 100;

  return (
    <section ref={scope} className="pbc-warm" style={{ position: 'relative' }}>
      <div className="pbc-story-track" style={{ position: 'relative' }}>
        <div className="pbc-story-panel">
          <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>

            {/* ── Heading ── */}
            <div
              className="pbc-story-head"
              style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 'var(--s4)', marginBottom: 'var(--s6)' }}
            >
              <div style={{ maxWidth: 620 }}>
                <div style={{ marginBottom: 'var(--s2)' }}><Eyebrow tone="ink">One system, many workflows</Eyebrow></div>
                <h2 className="pbc-display pbc-h2" style={{ margin: 0, color: 'var(--on-ink)' }}>
                  The same record, from the counter to the closing report.
                </h2>
              </div>

              {/* Stage counter — tells you where you are in the sequence */}
              <div className="pbc-story-counter" style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="pbc-mono pbc-tabular" style={{ fontSize: '0.8125rem', color: 'var(--on-ink-soft)', marginBottom: 8 }}>
                  Stage <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{current.n}</span> / {steps[steps.length - 1].n}
                </div>
                <div style={{ width: 132, height: 4, borderRadius: 999, background: 'var(--on-ink-line)', overflow: 'hidden', marginLeft: 'auto' }}>
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                    style={{ height: '100%', background: 'var(--accent)', borderRadius: 999 }}
                  />
                </div>
              </div>
            </div>

            <div
              className="pbc-split-wide"
              style={{ display: 'grid', gridTemplateColumns: '0.86fr 1.14fr', gap: 'var(--s6)', alignItems: 'start' }}
            >
              {/* ── Steps, joined by a progress rail ── */}
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, position: 'relative' }}>
                {/* The rail itself, and the portion already travelled */}
                <span
                  aria-hidden="true"
                  style={{ position: 'absolute', left: 19, top: 30, bottom: 30, width: 2, background: 'var(--on-ink-line)', borderRadius: 2 }}
                />
                <motion.span
                  aria-hidden="true"
                  animate={{ height: `${(active / Math.max(steps.length - 1, 1)) * 100}%` }}
                  transition={{ duration: reduce ? 0 : 0.45, ease: EASE }}
                  style={{ position: 'absolute', left: 19, top: 30, width: 2, background: 'var(--accent)', borderRadius: 2 }}
                />

                {steps.map((s, i) => {
                  const on = i === active;
                  const done = i < active;
                  const Icon = s.icon;

                  return (
                    <li key={s.n} style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        aria-current={on ? 'step' : undefined}
                        style={{
                          width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                          cursor: 'pointer', padding: '0.625rem 0', color: 'inherit', font: 'inherit',
                          display: 'flex', gap: '1rem', alignItems: 'flex-start',
                        }}
                      >
                        {/* Badge on the rail */}
                        <span
                          aria-hidden="true"
                          style={{
                            position: 'relative', zIndex: 1, flexShrink: 0,
                            width: 40, height: 40, borderRadius: '50%',
                            display: 'grid', placeItems: 'center',
                            background: on ? 'var(--accent)' : done ? 'var(--accent-wash)' : 'var(--white)',
                            border: `1px solid ${on || done ? 'var(--accent-line)' : 'var(--on-ink-line)'}`,
                            color: on ? '#fff' : done ? 'var(--accent)' : 'var(--on-ink-soft)',
                            boxShadow: on ? '0 8px 20px -8px rgba(44,107,245,0.75)' : 'none',
                            transition: 'background 0.3s, color 0.3s, border-color 0.3s',
                          }}
                        >
                          {done ? <CheckIcon style={{ width: 17, height: 17 }} /> : <Icon style={{ width: 17, height: 17 }} />}
                        </span>

                        <span style={{ minWidth: 0, flex: 1, paddingTop: 2 }}>
                          <span style={{ display: 'flex', alignItems: 'baseline', gap: '0.625rem' }}>
                            <span className="pbc-mono" style={{ fontSize: '0.6875rem', color: on ? 'var(--accent)' : 'var(--on-ink-soft)' }}>
                              {s.n}
                            </span>
                            <span style={{ fontSize: '1.0625rem', fontWeight: 600, color: on ? 'var(--on-ink)' : 'var(--on-ink-mute)' }}>
                              {s.title}
                            </span>
                          </span>

                          {/* A one-line summary is always visible, so no step is ever blank */}
                          <span className="pbc-body" style={{ display: 'block', color: 'var(--on-ink-soft)', marginTop: 2 }}>
                            {s.summary}
                          </span>

                          <AnimatePresence initial={false}>
                            {on && (
                              <motion.span
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
                                style={{ display: 'block', overflow: 'hidden' }}
                              >
                                <span className="pbc-body" style={{ display: 'block', color: 'var(--on-ink-mute)', paddingTop: '0.625rem' }}>
                                  {s.desc}
                                </span>

                                {/* Concrete capabilities, so the stage is more than a claim */}
                                <span style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', paddingTop: '0.75rem' }}>
                                  {(s.points || []).map((pt) => (
                                    <span
                                      key={pt}
                                      className="pbc-meta"
                                      style={{
                                        padding: '0.25rem 0.625rem', borderRadius: 999,
                                        background: 'var(--accent-wash)', border: '1px solid var(--accent-line)',
                                        color: 'var(--accent)', fontWeight: 500, fontSize: '0.75rem',
                                      }}
                                    >
                                      {pt}
                                    </span>
                                  ))}
                                </span>
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* ── Interface ── */}
              <div>
                <div className="pbc-preview-scroll">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={current.preview}
                      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                      transition={{ duration: reduce ? 0.15 : 0.42, ease: EASE }}
                    >
                      <AppChrome title={preview.title} active={preview.rail}>
                        {preview.node}
                      </AppChrome>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Caption ties the interface back to the stage */}
                <AnimatePresence mode="wait">
                  <motion.p
                    key={current.preview + '-cap'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: reduce ? 0.1 : 0.3, ease: EASE }}
                    className="pbc-meta"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      color: 'var(--on-ink-soft)', margin: 'var(--s3) 0 0',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }}
                    />
                    {preview.caption}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ScrollTrigger factory — kept out of the component body for clarity. */
function ScrollTriggerFor(el, count, setActive) {
  if (!el) return null;
  let last = -1;

  return ScrollTrigger.create({
    trigger: el,
    start: 'top top',
    end: () => '+=' + window.innerHeight * (count - 1),
    pin: el.querySelector('.pbc-story-panel'),
    pinSpacing: true,
    scrub: true,
    onUpdate: (self) => {
      const idx = Math.min(count - 1, Math.floor(self.progress * count));
      if (idx !== last) {
        last = idx;
        setActive(idx);
      }
    },
  });
}
