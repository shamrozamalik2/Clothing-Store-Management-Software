import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LockClosedIcon } from '@heroicons/react/24/outline';

import { EASE } from './motion';
import { gsap, useGSAP, prefersReducedMotion } from './gsapSetup';

/* ═══════════════════════════════════════════════════════════════════════════
   Security orbit

   Every other section on this page is a card grid or a stepped list, so this
   one takes a different form — and one that carries the argument rather than
   decorating it: the business record sits at the centre and each control is
   placed around it, connected. Selecting a control draws its line to the
   centre and explains it there.

   Below the breakpoint an orbit is unusable, so it degrades to a plain
   accordion list with the same content and the same interaction.
   ═══════════════════════════════════════════════════════════════════════════ */

const SIZE = 560;
const C = SIZE / 2;
const R = 214;      // node ring radius
const CORE = 116;   // centre disc radius

const nodePos = (i, total) => {
  const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
  return { x: C + R * Math.cos(angle), y: C + R * Math.sin(angle) };
};

export default function SecurityOrbit({ items }) {
  const scope = useRef(null);
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();

  const current = items[active];
  const CurrentIcon = current.icon;

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      /* Rings breathe, very slowly, so the diagram is never quite static. */
      gsap.to('.pbc-orbit-ring', {
        scale: 1.015,
        transformOrigin: 'center',
        duration: 4.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        stagger: 0.5,
      });

      /* The rings draw themselves in the first time the section is reached. */
      gsap.fromTo(
        '.pbc-orbit-ring',
        { opacity: 0, scale: 0.94, transformOrigin: 'center' },
        {
          opacity: 1,
          scale: 1,
          duration: 1.1,
          ease: 'power2.out',
          stagger: 0.12,
          scrollTrigger: { trigger: scope.current, start: 'top 78%', once: true },
        }
      );
    },
    { scope }
  );

  return (
    <div ref={scope}>
      {/* ── Orbit (wide screens) ─────────────────────────────────────────── */}
      <div className="pbc-orbit" style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative', width: SIZE, height: SIZE, maxWidth: '100%' }}>

          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
          >
            {/* Concentric rings */}
            {[R, R - 48, CORE + 18].map((r, i) => (
              <circle
                key={r}
                className="pbc-orbit-ring"
                cx={C}
                cy={C}
                r={r}
                fill="none"
                stroke="rgba(10,10,18,0.10)"
                strokeWidth={i === 0 ? 1.5 : 1}
                strokeDasharray={i === 1 ? '3 6' : undefined}
              />
            ))}

            {/* Connector from the active control to the centre */}
            {items.map((it, i) => {
              const { x, y } = nodePos(i, items.length);
              const on = i === active;
              const dx = x - C;
              const dy = y - C;
              const len = Math.hypot(dx, dy);
              const fromX = C + (dx / len) * CORE;
              const fromY = C + (dy / len) * CORE;
              const toX = C + (dx / len) * (R - 32);
              const toY = C + (dy / len) * (R - 32);

              return (
                <motion.line
                  key={it.title}
                  x1={fromX}
                  y1={fromY}
                  x2={toX}
                  y2={toY}
                  stroke={on ? 'var(--accent)' : 'rgba(10,10,18,0.10)'}
                  strokeWidth={on ? 2 : 1}
                  strokeLinecap="round"
                  animate={{ opacity: on ? 1 : 0.45 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE }}
                />
              );
            })}
          </svg>

          {/* Centre — explains whichever control is selected */}
          <div
            style={{
              position: 'absolute',
              left: C - CORE,
              top: C - CORE,
              width: CORE * 2,
              height: CORE * 2,
              borderRadius: '50%',
              background: 'var(--white)',
              border: '1px solid rgba(10,10,18,0.10)',
              boxShadow: '0 18px 48px -18px rgba(16,24,40,0.24)',
              display: 'grid',
              placeItems: 'center',
              textAlign: 'center',
              padding: '0 1.75rem',
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={current.title}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduce ? 0.12 : 0.3, ease: EASE }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12,
                    background: 'var(--accent)', color: '#fff', margin: '0 auto 0.625rem',
                    boxShadow: '0 8px 20px -8px rgba(44,107,245,0.75)',
                  }}
                >
                  <CurrentIcon style={{ width: 20, height: 20 }} />
                </span>
                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--on-paper)', lineHeight: 1.3 }}>
                  {current.title}
                </div>
                <p style={{ fontSize: '0.75rem', lineHeight: 1.55, color: 'var(--on-paper-mute)', margin: '0.4375rem 0 0' }}>
                  {current.desc}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* The controls themselves */}
          {items.map((it, i) => {
            const { x, y } = nodePos(i, items.length);
            const on = i === active;
            const Icon = it.icon;

            return (
              <motion.button
                key={it.title}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={on}
                aria-label={it.title}
                initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
                viewport={reduce ? undefined : { once: true, amount: 0.4 }}
                transition={reduce ? undefined : { duration: 0.45, ease: EASE, delay: 0.1 + i * 0.07 }}
                whileHover={reduce ? undefined : { scale: 1.06 }}
                style={{
                  position: 'absolute',
                  left: x - 32,
                  top: y - 32,
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  background: on ? 'var(--accent)' : 'var(--white)',
                  color: on ? '#fff' : 'var(--on-paper-mute)',
                  border: `1px solid ${on ? 'var(--accent)' : 'rgba(10,10,18,0.12)'}`,
                  boxShadow: on
                    ? '0 12px 28px -10px rgba(44,107,245,0.8)'
                    : '0 4px 14px rgba(16,24,40,0.08)',
                  transition: 'background 0.25s, color 0.25s, border-color 0.25s, box-shadow 0.25s',
                }}
              >
                <Icon style={{ width: 22, height: 22 }} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Labels beneath, so the diagram is legible without hovering */}
      <div
        className="pbc-orbit-legend"
        style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.5rem', marginTop: 'var(--s5)' }}
      >
        {items.map((it, i) => (
          <button
            key={it.title}
            type="button"
            onClick={() => setActive(i)}
            aria-pressed={i === active}
            style={{
              cursor: 'pointer',
              fontSize: '0.8125rem',
              fontWeight: 500,
              padding: '0.4375rem 0.875rem',
              borderRadius: 999,
              background: i === active ? 'var(--accent-wash)' : 'transparent',
              border: `1px solid ${i === active ? 'var(--accent-line)' : 'rgba(10,10,18,0.12)'}`,
              color: i === active ? 'var(--accent)' : 'var(--on-paper-mute)',
              transition: 'all 0.2s',
            }}
          >
            {it.title}
          </button>
        ))}
      </div>

      {/* ── Stacked list (narrow screens) ────────────────────────────────── */}
      <ul className="pbc-orbit-list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'none', gap: '0.75rem' }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.title} className="pbc-card" style={{ padding: 'var(--s3)', display: 'flex', gap: '0.875rem' }}>
              <span
                aria-hidden="true"
                style={{
                  display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'var(--accent)', color: '#fff',
                }}
              >
                <Icon style={{ width: 19, height: 19 }} />
              </span>
              <span>
                <span style={{ display: 'block', fontSize: '1rem', fontWeight: 600, color: 'var(--on-paper)' }}>{it.title}</span>
                <span className="pbc-body" style={{ display: 'block', color: 'var(--on-paper-mute)', marginTop: 4 }}>{it.desc}</span>
              </span>
            </li>
          );
        })}
      </ul>

      {/* A quiet statement of what sits at the centre */}
      <p
        className="pbc-meta"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--on-paper-soft)', marginTop: 'var(--s5)' }}
      >
        <LockClosedIcon aria-hidden="true" style={{ width: 14, height: 14 }} />
        Six controls around one record — stock, takings and customer obligations
      </p>
    </div>
  );
}
