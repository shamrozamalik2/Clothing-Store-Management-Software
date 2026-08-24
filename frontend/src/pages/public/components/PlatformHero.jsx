import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { Eyebrow } from './ui';
import { EASE } from './motion';
import { gsap, useGSAP, prefersReducedMotion } from './gsapSetup';

/* The numbers the page is claiming. Kept here beside the markup that animates
   them so a change to the claim cannot drift from the label. */
const STATS = [
  { value: 24,  suffix: '',  label: 'Modules' },
  { value: 200, suffix: '+', label: 'Capabilities' },
  { value: 8,   suffix: '',  label: 'Outcome groups' },
];

const TITLE = 'Everything the shop needs, in';
const TITLE_ACCENT = 'one record.';

/**
 * PlatformHero — the page opener.
 *
 * Every entrance is written as a GSAP `from`, so the resting state is the
 * plain DOM: if the tween never runs — reduced motion, a JS failure — the
 * headline and the numbers are already on screen and correct. Nothing here
 * gates content on an animation completing.
 */
export default function PlatformHero({ groups = [] }) {
  const scope = useRef(null);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;

      /* ── Headline: words rise out of their own clipping band ─────────── */
      gsap.from('.pbc-ph-word > span', {
        yPercent: 116,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.045,
        delay: 0.05,
      });

      /* ── Everything under the headline follows it up ─────────────────── */
      gsap.from('.pbc-ph-follow', {
        y: 18,
        opacity: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.09,
        delay: 0.42,
      });

      /* ── Counters run to the number already written in the markup ─────
         Reading the target from the DOM keeps one source of truth: the
         static text is what a crawler and a no-JS visitor see. */
      gsap.utils.toArray('.pbc-ph-count').forEach((el) => {
        const target = Number(el.dataset.value);
        const box = { n: 0 };
        gsap.to(box, {
          n: target,
          duration: 1.5,
          ease: 'power2.out',
          delay: 0.5,
          onUpdate: () => { el.textContent = Math.round(box.n).toLocaleString(); },
        });
      });

      /* ── Ambient washes: an endless drift, plus a scroll-linked slide ──
         Two channels on two properties (`y` vs `yPercent`) so GSAP layers
         them into one transform instead of one overwriting the other. */
      gsap.to('.pbc-ph-wash-a', { y: 26, duration: 7, ease: 'sine.inOut', repeat: -1, yoyo: true });
      gsap.to('.pbc-ph-wash-b', { y: -22, duration: 9, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.8 });

      gsap.to('.pbc-ph-wash-a, .pbc-ph-wash-b', {
        yPercent: 22,
        ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.8 },
      });
    },
    { scope }
  );

  /* One clipping band per word. `overflow: hidden` would otherwise shave the
     descenders off "g" and "y", so the band is grown and pulled back. */
  const words = (text, accent) =>
    text.split(' ').map((w, i) => (
      <span
        key={w + i}
        className="pbc-ph-word"
        style={{
          display: 'inline-block',
          overflow: 'hidden',
          verticalAlign: 'bottom',
          paddingBottom: '0.14em',
          marginBottom: '-0.14em',
        }}
      >
        <span style={{ display: 'inline-block', color: accent ? 'var(--accent)' : undefined }}>{w}</span>
        {'\u00A0'}
      </span>
    ));

  return (
    <section ref={scope} className="pbc-ink" style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        className="pbc-ph-wash-a"
        style={{
          position: 'absolute', top: '-38%', left: '-10%',
          width: 720, height: 720, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(44,107,245,0.16) 0%, transparent 64%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        className="pbc-ph-wash-b"
        style={{
          position: 'absolute', top: '-20%', right: '-14%',
          width: 620, height: 620, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(18,185,129,0.15) 0%, transparent 64%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="pbc-shell"
        style={{ position: 'relative', paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}
      >
        <div className="pbc-ph-follow" style={{ marginBottom: 'var(--s3)' }}>
          <Eyebrow tone="ink">The platform</Eyebrow>
        </div>

        <h1 className="pbc-display pbc-h1" style={{ margin: 0, maxWidth: 900, color: 'var(--on-ink)' }}>
          {words(TITLE, false)}
          {words(TITLE_ACCENT, true)}
        </h1>

        <p
          className="pbc-lede pbc-ph-follow"
          style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s3)', marginBottom: 0, maxWidth: 620 }}
        >
          Twenty-four modules and more than two hundred capabilities. Below they are grouped by
          what you are trying to achieve, rather than listed as a menu.
        </p>

        {/* ── The claim, counted up ── */}
        <div className="pbc-ph-stats pbc-ph-follow">
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                className="pbc-display pbc-tabular"
                style={{ fontSize: 'clamp(2rem, 3.4vw, 2.75rem)', lineHeight: 1.1, color: 'var(--on-ink)' }}
              >
                <span className="pbc-ph-count" data-value={s.value}>{s.value}</span>
                {s.suffix}
              </div>
              <div className="pbc-meta" style={{ color: 'var(--on-ink-soft)', marginTop: '0.25rem' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── Jump straight to a group ── */}
        <motion.nav
          aria-label="Capability groups"
          className="pbc-ph-chips pbc-ph-follow"
          initial={reduce ? undefined : 'hidden'}
          animate={reduce ? undefined : 'show'}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.7 } } }}
        >
          {groups.map((g) => (
            <motion.a
              key={g.id}
              href={'#' + g.id}
              className="pbc-ph-chip pbc-meta"
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
              whileHover={reduce ? undefined : { y: -2 }}
              onClick={(e) => {
                const el = document.getElementById(g.id);
                if (!el) return;
                e.preventDefault();
                el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
              }}
            >
              <g.icon aria-hidden="true" style={{ width: 15, height: 15, flexShrink: 0 }} />
              {g.short || g.title}
            </motion.a>
          ))}
        </motion.nav>
      </div>
    </section>
  );
}
