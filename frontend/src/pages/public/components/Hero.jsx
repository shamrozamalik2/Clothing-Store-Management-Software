import { useRef } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion, useReducedMotion } from 'framer-motion';

import { CTA, Eyebrow } from './ui';
import { EASE } from './motion';
import { AppChrome, DashboardPreview } from './ProductPreview';
import { Squiggle, QuarterCircle, StockCard, TrendCard } from './HeroCards';
import { gsap, useGSAP, prefersReducedMotion } from './gsapSetup';

const parent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export default function Hero() {
  const scope = useRef(null);
  const stack = useRef(null);
  const reduce = useReducedMotion();

  const child = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0.25 : 0.7, ease: EASE } },
  };

  /* Two independent kinds of motion drive the cluster:
     ── an idle float that never stops, on `y` (pixels)
     ── a scroll-linked drift, on `yPercent`
     GSAP composes those two channels into one transform, so they layer
     instead of overwriting each other. Each element is given a different
     amplitude, duration and offset so the group never pulses in unison —
     that synchronicity is what makes floating UI look cheap. */
  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;

      /* ── Idle float ─────────────────────────────────────────────── */
      const float = (target, distance, duration, delay) =>
        gsap.to(target, {
          y: distance,
          duration,
          delay,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        });

      float('.pbc-float-a',    -15, 3.4, 0);
      float('.pbc-float-b',     13, 4.2, 0.55);
      float('.pbc-hero-chrome', -8, 5.2, 0.25);
      float('.pbc-hero-ring',   10, 6.0, 0.9);

      /* ── Scroll-linked drift ────────────────────────────────────── */
      gsap.to('.pbc-float-a', {
        yPercent: -20, ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.7 },
      });
      gsap.to('.pbc-float-b', {
        yPercent: 15, ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.9 },
      });
      gsap.to(stack.current, {
        yPercent: -5, ease: 'none',
        scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.6 },
      });

      /* Draw the underline on, once, as the hero settles. */
      gsap.fromTo(
        '.pbc-squiggle path',
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, duration: 0.9, ease: 'power2.out', stagger: 0.14, delay: 0.75 }
      );
    },
    { scope }
  );

  return (
    <section ref={scope} className="pbc-ink" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Soft tinted washes */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', top: '-26%', left: '-16%',
          width: 820, height: 820, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(18,185,129,0.15) 0%, transparent 62%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '-30%', left: '18%',
          width: 620, height: 620, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(44,107,245,0.09) 0%, transparent 62%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="pbc-shell pbc-hero"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '0.94fr 1.06fr',
          alignItems: 'center',
          gap: 'var(--s6)',
          paddingTop: 'var(--s8)',
          paddingBottom: 'var(--s12)',
        }}
      >
        {/* ── Copy ── */}
        <motion.div variants={parent} initial="hidden" animate="show" style={{ position: 'relative', zIndex: 3 }}>
          <motion.div variants={child} style={{ marginBottom: 'var(--s3)' }}>
            <Eyebrow tone="ink">Retail operations, brought together</Eyebrow>
          </motion.div>

          <motion.h1 variants={child} className="pbc-display pbc-h1" style={{ margin: 0, color: 'var(--on-ink)' }}>
            Run your entire clothing business from one{' '}
            <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--accent)' }}>workspace</span>
              <Squiggle className="pbc-squiggle" />
            </span>
          </motion.h1>

          <motion.p
            variants={child}
            className="pbc-lede"
            style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s4)', marginBottom: 0, maxWidth: 480 }}
          >
            Connect selling, stock, purchasing, customers, finance, staff and production in one
            system — so the number on the screen is the number on the shelf.
          </motion.p>

          <motion.div
            variants={child}
            className="pbc-cta-row"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: 'var(--s5)' }}
          >
            <CTA to="/demo" icon={ArrowRightIcon}>Book a demo</CTA>
            <CTA to="/platform" variant="ghost" tone="ink">Explore the platform</CTA>
          </motion.div>
        </motion.div>

        {/* ── Visual cluster ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reduce ? 0.3 : 0.85, ease: EASE, delay: reduce ? 0 : 0.3 }}
          className="pbc-hero-visual"
          style={{ position: 'relative', minHeight: 500 }}
        >
        <div ref={stack} style={{ position: 'relative' }}>
          {/* Quarter circle anchoring the top-right */}
          <div className="pbc-hero-ring" style={{ position: 'absolute', top: -30, right: -40, zIndex: 0 }}>
            <QuarterCircle size={136} style={{ borderRadius: 4 }} />
          </div>

          {/* The interface itself */}
          <div
            className="pbc-preview-scroll pbc-hero-chrome"
            style={{ position: 'relative', zIndex: 1, width: 640, maxWidth: 'none' }}
          >
            <AppChrome title="Dashboard" active={0}>
              <DashboardPreview />
            </AppChrome>
          </div>

          {/* Floating card — upper left, overlapping the interface */}
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: reduce ? 0 : 0.85 }}
            style={{ position: 'absolute', top: -52, left: -34, zIndex: 2 }}
          >
            {/* Framer owns the entrance above; GSAP owns the float here.
                Splitting them across two elements stops the two libraries
                writing to the same transform and cancelling each other out. */}
            <div className="pbc-float-a pbc-hero-card">
              <StockCard />
            </div>
          </motion.div>

          {/* Floating card — lower right, overlapping the interface */}
          <motion.div
            initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: reduce ? 0 : 1.0 }}
            style={{ position: 'absolute', bottom: -40, right: -48, zIndex: 2 }}
          >
            <div className="pbc-float-b pbc-hero-card">
              <TrendCard />
            </div>
          </motion.div>
        </div>
        </motion.div>
      </div>
    </section>
  );
}
