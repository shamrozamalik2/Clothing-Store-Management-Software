import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

import { FeatureLine } from './ui';
import { EASE, Reveal } from './motion';
import { AppChrome, DashboardPreview, POSPreview, InventoryPreview, ReportsPreview } from './ProductPreview';
import { gsap, useGSAP, prefersReducedMotion } from './gsapSetup';
import { useMediaQuery } from './useMediaQuery';

/* Four interfaces cover eight outcome groups, because several groups genuinely
   live on the same screen. The sticky stage turns that into an advantage: the
   mockup is keyed on the preview rather than the group, so it holds steady
   while related groups scroll past and only cross-fades when the visitor has
   actually moved to a different part of the product. */
const PREVIEWS = {
  dashboard: { node: <DashboardPreview />, title: 'Dashboard',     rail: 0 },
  pos:       { node: <POSPreview />,       title: 'Point of Sale', rail: 1 },
  inventory: { node: <InventoryPreview />, title: 'Inventory',     rail: 2 },
  reports:   { node: <ReportsPreview />,   title: 'Reports',       rail: 5 },
};

const previewFor = (group) => PREVIEWS[group.preview] || PREVIEWS.dashboard;
const pad = (n) => String(n).padStart(2, '0');

/* The sticky arrangement needs two columns and a tall viewport to make sense.
   Below that it is not a smaller version of the same idea, it is a different
   layout — so it gets its own branch rather than a pile of overrides. */
const DESKTOP = '(min-width: 1025px)';

export default function CapabilityExplorer({ groups }) {
  const isDesktop = useMediaQuery(DESKTOP);
  return isDesktop ? <StickyExplorer groups={groups} /> : <StackedGroups groups={groups} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Desktop — the copy scrolls, the interface stays
   ═══════════════════════════════════════════════════════════════════════════ */

function StickyExplorer({ groups }) {
  const scope = useRef(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;

      /* One trigger per panel, its band centred on the viewport, so the stage
         changes over when the panel being read changes — not when the next
         one first peeks in at the bottom of the screen. */
      gsap.utils.toArray('.pbc-cx-panel').forEach((panel, i) => {
        gsap.to(panel, {
          scrollTrigger: {
            trigger: panel,
            start: 'top 55%',
            end: 'bottom 55%',
            onEnter: () => setActive(i),
            onEnterBack: () => setActive(i),
          },
        });
      });

      /* Progress line, scrubbed across the length of the copy column. */
      gsap.fromTo(
        '.pbc-cx-progress-fill',
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          transformOrigin: 'left center',
          scrollTrigger: {
            trigger: '.pbc-cx-copy',
            start: 'top center',
            end: 'bottom center',
            scrub: 0.4,
          },
        }
      );
    },
    { scope, dependencies: [groups.length] }
  );

  const group = groups[active];
  const preview = previewFor(group);

  return (
    <div ref={scope} className="pbc-shell pbc-cx">
      {/* ── Copy column ── */}
      <div className="pbc-cx-copy">
        {groups.map((g, i) => (
          <article key={g.id} id={g.id} className="pbc-cx-panel" style={{ scrollMarginTop: '96px' }}>
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              {/* Panels that are not being read step back so the current one
                  leads. Mild, and dropped entirely under reduced motion —
                  this is decoration sitting on top of body copy. */}
              <motion.div
                animate={reduce ? undefined : { opacity: active === i ? 1 : 0.42 }}
                transition={{ duration: 0.45, ease: EASE }}
              >
                <div className="pbc-cx-panel-head">
                  <span className="pbc-cx-icon" aria-hidden="true">
                    <g.icon style={{ width: 19, height: 19, color: 'var(--accent)' }} />
                  </span>
                  <span className="pbc-mono pbc-cx-index" aria-hidden="true">{pad(i + 1)}</span>
                </div>

                <h3 className="pbc-display pbc-h3" style={{ margin: '0 0 var(--s2)', color: 'var(--on-paper)' }}>
                  {g.title}
                </h3>
                <p className="pbc-lede" style={{ color: 'var(--on-paper-mute)', margin: '0 0 var(--s3)' }}>
                  {g.lede}
                </p>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.625rem' }}>
                  {g.points.map((p) => (
                    <FeatureLine key={p} tone="paper">{p}</FeatureLine>
                  ))}
                </ul>

                {g.chips && (
                  <div className="pbc-cx-chips">
                    {g.chips.map((c) => (
                      <span key={c} className="pbc-meta pbc-cx-chip">{c}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          </article>
        ))}
      </div>

      {/* ── Sticky stage ── */}
      <div className="pbc-cx-stage" aria-hidden="true">
        <div className="pbc-cx-stage-head">
          <span className="pbc-mono pbc-cx-counter">
            {pad(active + 1)} <span style={{ color: 'var(--on-paper-soft)' }}>/ {pad(groups.length)}</span>
          </span>
          <div className="pbc-cx-progress">
            <i className="pbc-cx-progress-fill" />
          </div>
        </div>

        <div className="pbc-cx-frame">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={group.preview}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, scale: 0.99 }}
              transition={{ duration: reduce ? 0.2 : 0.45, ease: EASE }}
            >
              <AppChrome title={preview.title} active={preview.rail}>
                {preview.node}
              </AppChrome>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* The caption changes on every group, including the ones that share a
            mockup, so the stage always confirms where the reader is. */}
        <div className="pbc-cx-caption-slot">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={group.id}
              className="pbc-cx-caption"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: reduce ? 0.15 : 0.32, ease: EASE }}
            >
              <span className="pbc-cx-icon" aria-hidden="true">
                <group.icon style={{ width: 17, height: 17, color: 'var(--accent)' }} />
              </span>
              <span>
                <strong style={{ display: 'block', fontWeight: 600, color: 'var(--on-paper)' }}>
                  {group.short || group.title}
                </strong>
                <span className="pbc-meta" style={{ color: 'var(--on-paper-mute)' }}>
                  {group.points.length} capabilities
                </span>
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Narrow — no sticky, no scroll choreography, one self-contained card per group
   ═══════════════════════════════════════════════════════════════════════════ */

function StackedGroups({ groups }) {
  return (
    <div className="pbc-shell pbc-cx-stack" style={{ display: 'grid', gap: 'var(--s10)' }}>
      {groups.map((g, i) => {
        const preview = previewFor(g);
        return (
          <Reveal key={g.id}>
            {/* Clears the 77px sticky header. The extra allowance absorbs the
                reveal animations further down the page, which settle by ~20px
                while a smooth anchor scroll is still in flight and would
                otherwise leave the heading tucked under the header. */}
            <article id={g.id} style={{ scrollMarginTop: '116px' }}>
              <div className="pbc-cx-panel-head">
                <span className="pbc-cx-icon" aria-hidden="true">
                  <g.icon style={{ width: 19, height: 19, color: 'var(--accent)' }} />
                </span>
                <span className="pbc-mono pbc-cx-index" aria-hidden="true">{pad(i + 1)}</span>
              </div>

              <h3 className="pbc-display pbc-h3" style={{ margin: '0 0 var(--s2)', color: 'var(--on-paper)' }}>
                {g.title}
              </h3>
              <p className="pbc-lede" style={{ color: 'var(--on-paper-mute)', margin: '0 0 var(--s3)' }}>
                {g.lede}
              </p>

              <ul style={{ listStyle: 'none', margin: '0 0 var(--s4)', padding: 0, display: 'grid', gap: '0.625rem' }}>
                {g.points.map((p) => (
                  <FeatureLine key={p} tone="paper">{p}</FeatureLine>
                ))}
              </ul>

              {g.chips && (
                <div className="pbc-cx-chips" style={{ marginBottom: 'var(--s4)' }}>
                  {g.chips.map((c) => (
                    <span key={c} className="pbc-meta pbc-cx-chip">{c}</span>
                  ))}
                </div>
              )}

              <div className="pbc-preview-scroll">
                <AppChrome title={preview.title} active={preview.rail}>
                  {preview.node}
                </AppChrome>
              </div>
            </article>
          </Reveal>
        );
      })}
    </div>
  );
}
