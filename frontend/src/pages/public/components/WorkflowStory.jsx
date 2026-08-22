import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { Eyebrow } from './ui';
import { EASE } from './motion';
import { AppChrome, DashboardPreview, POSPreview, InventoryPreview, ReportsPreview } from './ProductPreview';
import { gsap, ScrollTrigger, useGSAP, prefersReducedMotion } from './gsapSetup';

const PREVIEWS = {
  dashboard: { node: <DashboardPreview />,  title: 'Dashboard', rail: 0 },
  pos:       { node: <POSPreview />,        title: 'Point of Sale', rail: 1 },
  inventory: { node: <InventoryPreview />,  title: 'Inventory', rail: 2 },
  reports:   { node: <ReportsPreview />,    title: 'Reports', rail: 5 },
};

/**
 * WorkflowStory — the "one system, many workflows" sequence.
 *
 * On desktop the section pins and the interface swaps as the visitor scrolls
 * through each stage. Below 900px, and whenever reduced motion is requested,
 * it degrades to a plain stacked list with no pinning and no scrub: every
 * stage stays readable without any scrolling choreography.
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

  return (
    <section ref={scope} className="pbc-navy pbc-grain" style={{ position: 'relative' }}>
      {/* Desktop: tall scroll track that the inner panel pins against. */}
      <div className="pbc-story-track" style={{ position: 'relative' }}>
        <div className="pbc-story-panel">
          <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>

            <div style={{ marginBottom: 'var(--s6)', maxWidth: 620 }}>
              <div style={{ marginBottom: 'var(--s2)' }}><Eyebrow tone="ink">One system, many workflows</Eyebrow></div>
              <h2 className="pbc-display pbc-h2" style={{ margin: 0, color: 'var(--on-ink)' }}>
                The same record, from the counter to the closing report.
              </h2>
            </div>

            <div className="pbc-split-wide" style={{ display: 'grid', gridTemplateColumns: '0.85fr 1.15fr', gap: 'var(--s6)', alignItems: 'start' }}>

              {/* Steps */}
              <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.25rem' }}>
                {steps.map((s, i) => {
                  const on = i === active;
                  return (
                    <li key={s.n}>
                      <button
                        type="button"
                        onClick={() => setActive(i)}
                        aria-current={on ? 'step' : undefined}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          background: on ? 'rgba(252,251,248,0.05)' : 'transparent',
                          border: '1px solid',
                          borderColor: on ? 'var(--accent-line)' : 'transparent',
                          borderRadius: 'var(--r)',
                          padding: 'var(--s2)',
                          cursor: 'pointer',
                          color: 'inherit',
                          transition: 'background 0.25s, border-color 0.25s',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'baseline' }}>
                          <span
                            className="pbc-mono"
                            style={{ fontSize: '0.6875rem', fontWeight: 600, color: on ? 'var(--accent-hi)' : 'var(--on-ink-soft)', flexShrink: 0 }}
                          >
                            {s.n}
                          </span>
                          <span style={{ minWidth: 0 }}>
                            <span
                              style={{
                                display: 'block',
                                fontSize: '1.0625rem',
                                fontWeight: 600,
                                color: on ? 'var(--on-ink)' : 'var(--on-ink-mute)',
                              }}
                            >
                              {s.title}
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
                                  <span className="pbc-body" style={{ display: 'block', color: 'var(--on-ink-mute)', paddingTop: '0.5rem' }}>
                                    {s.desc}
                                  </span>
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Interface */}
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
