import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckIcon, ComputerDesktopIcon, DevicePhoneMobileIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

import { EASE } from './motion';
import { AppChrome, DashboardPreview, POSPreview, MobileScreen } from './ProductPreview';
import { BrowserFrame, LaptopFrame, PhoneFrame } from './DeviceFrames';
import { gsap, useGSAP, prefersReducedMotion } from './gsapSetup';

const TAB_ICONS = { web: GlobeAltIcon, desktop: ComputerDesktopIcon, mobile: DevicePhoneMobileIcon };

/**
 * PlatformSwitcher
 *
 * Motion is split by responsibility so the two libraries never fight over the
 * same element — the mistake that silently cancels transforms:
 *   Framer Motion — the tab indicator (shared layout), swapping panels and
 *                   staggering the capability list. All React-state driven.
 *   GSAP          — the device entrance on scroll and a continuous idle float
 *                   on an inner wrapper. Timeline and ScrollTrigger work.
 */
export default function PlatformSwitcher({ surfaces }) {
  const [active, setActive] = useState(0);
  const scope = useRef(null);
  const reduce = useReducedMotion();
  const s = surfaces[active];

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      /* Entrance — the device rises and settles as the section is reached. */
      gsap.fromTo(
        '.pbc-device-stage',
        { y: 40, opacity: 0, scale: 0.97 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: scope.current, start: 'top 76%', once: true },
        }
      );

      /* Idle float on the inner wrapper, so Framer's panel swap on the outer
         element and this never write to the same transform. */
      gsap.to('.pbc-device-float', {
        y: -12, duration: 4.6, ease: 'sine.inOut', repeat: -1, yoyo: true,
      });
    },
    { scope }
  );

  return (
    <div ref={scope}>
      {/* ── Tabs ── */}
      <div
        role="tablist"
        aria-label="Available platforms"
        className="pbc-surface-tabs"
        style={{
          display: 'inline-flex', gap: 4, padding: 5,
          borderRadius: 999,
          background: 'var(--accent-wash)',
          border: '1px solid var(--accent-line)',
          marginBottom: 'var(--s5)',
        }}
      >
        {surfaces.map((x, i) => {
          const on = i === active;
          const Icon = TAB_ICONS[x.id] || GlobeAltIcon;
          return (
            <button
              key={x.id}
              role="tab"
              type="button"
              id={`pbc-tab-${x.id}`}
              aria-selected={on}
              aria-controls={`pbc-panel-${x.id}`}
              onClick={() => setActive(i)}
              className="pbc-surface-tab"
              style={{
                position: 'relative', border: 'none', background: 'transparent', cursor: 'pointer',
                padding: '0.5625rem 1.25rem', borderRadius: 999,
                fontSize: '0.9375rem', fontWeight: 500, fontFamily: 'inherit',
                color: on ? 'var(--accent)' : 'var(--on-ink-mute)',
                display: 'inline-flex', alignItems: 'center', gap: '0.4375rem',
                transition: 'color 0.2s',
              }}
            >
              {on && (
                <motion.span
                  layoutId="pbc-surface-pill"
                  aria-hidden="true"
                  style={{
                    position: 'absolute', inset: 0, background: 'var(--white)', borderRadius: 999,
                    boxShadow: '0 2px 10px rgba(16,24,40,0.10)',
                  }}
                  transition={{ duration: reduce ? 0 : 0.34, ease: EASE }}
                />
              )}
              <Icon aria-hidden="true" className="pbc-surface-tab-icon" style={{ width: 16, height: 16, position: 'relative' }} />
              <span style={{ position: 'relative' }}>{x.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Panel ── */}
      <div
        className="pbc-split"
        style={{ display: 'grid', gridTemplateColumns: '0.82fr 1.18fr', gap: 'var(--s6)', alignItems: 'center' }}
      >
        {/* Copy */}
        <AnimatePresence mode="wait">
          <motion.div
            key={s.id}
            role="tabpanel"
            id={`pbc-panel-${s.id}`}
            aria-labelledby={`pbc-tab-${s.id}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: reduce ? 0.15 : 0.36, ease: EASE }}
          >
            <h3 className="pbc-display pbc-h3" style={{ margin: 0, color: 'var(--on-ink)' }}>{s.title}</h3>
            <p className="pbc-body" style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s2)' }}>{s.desc}</p>

            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.07, delayChildren: 0.1 } } }}
              style={{ listStyle: 'none', margin: 'var(--s4) 0 0', padding: 0, display: 'grid', gap: '0.75rem' }}
            >
              {s.points.map((p) => (
                <motion.li
                  key={p}
                  variants={{
                    hidden: reduce ? { opacity: 0 } : { opacity: 0, x: -10 },
                    show: { opacity: 1, x: 0, transition: { duration: reduce ? 0.2 : 0.4, ease: EASE } },
                  }}
                  style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'grid', placeItems: 'center', width: 20, height: 20, borderRadius: '50%',
                      background: 'var(--accent-wash)', flexShrink: 0, marginTop: 1,
                    }}
                  >
                    <CheckIcon style={{ width: 12, height: 12, color: 'var(--accent)' }} />
                  </span>
                  <span className="pbc-body" style={{ color: 'var(--on-ink-mute)' }}>{p}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </AnimatePresence>

        {/* Device */}
        <div className="pbc-device-stage" style={{ display: 'flex', justifyContent: 'center', minHeight: 420 }}>
          <div className="pbc-device-float" style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={s.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, rotateY: 8 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, rotateY: -6 }}
                transition={{ duration: reduce ? 0.15 : 0.45, ease: EASE }}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', perspective: 1200 }}
              >
                {s.id === 'mobile' && (
                  <PhoneFrame width={262}>
                    <MobileScreen />
                  </PhoneFrame>
                )}

                {s.id === 'desktop' && (
                  <LaptopFrame style={{ width: '100%', maxWidth: 620 }}>
                    <div className="pbc-preview-scroll">
                      <AppChrome title="Point of Sale" active={1} style={{ borderRadius: 0, border: 'none', boxShadow: 'none', minHeight: 340 }}>
                        <POSPreview />
                      </AppChrome>
                    </div>
                  </LaptopFrame>
                )}

                {s.id === 'web' && (
                  <BrowserFrame style={{ width: '100%', maxWidth: 640 }} url="app.probusinesscloud.com/dashboard">
                    <div className="pbc-preview-scroll">
                      <AppChrome title="Dashboard" active={0} style={{ borderRadius: 0, border: 'none', boxShadow: 'none', minHeight: 340 }}>
                        <DashboardPreview />
                      </AppChrome>
                    </div>
                  </BrowserFrame>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
