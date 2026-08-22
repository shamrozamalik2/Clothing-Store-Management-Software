import { useRef } from 'react';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import { motion, useReducedMotion } from 'framer-motion';

import { CTA, Eyebrow, StatusChip } from './ui';
import { EASE } from './motion';
import { AppChrome, DashboardPreview } from './ProductPreview';
import { gsap, useGSAP, prefersReducedMotion } from './gsapSetup';

/* Parent/child variants — the hero enters as one choreographed unit. */
const parent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

export default function Hero() {
  const scope = useRef(null);
  const visual = useRef(null);
  const reduce = useReducedMotion();

  const child = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 22 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0.25 : 0.7, ease: EASE } },
  };

  /* Subtle scroll-linked parallax on the product visual. */
  useGSAP(
    () => {
      if (prefersReducedMotion() || !visual.current) return;
      gsap.to(visual.current, {
        yPercent: -7,
        ease: 'none',
        scrollTrigger: {
          trigger: scope.current,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
    },
    { scope }
  );

  return (
    <section ref={scope} className="pbc-ink pbc-grain" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* A single soft light source — not a field of blobs. */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'min(1100px, 130%)',
          height: 700,
          background: 'radial-gradient(ellipse at center, rgba(47,91,245,0.20) 0%, rgba(47,91,245,0.06) 42%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="pbc-shell" style={{ position: 'relative', paddingTop: 'var(--s12)', paddingBottom: 'var(--s10)' }}>
        <motion.div variants={parent} initial="hidden" animate="show" style={{ maxWidth: 760 }}>

          <motion.div variants={child} style={{ marginBottom: 'var(--s3)' }}>
            <Eyebrow tone="ink">Retail operations, brought together</Eyebrow>
          </motion.div>

          <motion.h1 variants={child} className="pbc-display pbc-h1" style={{ margin: 0, color: 'var(--on-ink)' }}>
            Run every part of your clothing business from one{' '}
            <span style={{ color: 'var(--accent-hi)' }}>intelligent workspace.</span>
          </motion.h1>

          <motion.p
            variants={child}
            className="pbc-lede"
            style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s3)', marginBottom: 0, maxWidth: 580 }}
          >
            ProBusinessCloud connects selling, stock, purchasing, customers, finance, staff and
            production in a single system — so the number on the screen is the number on the shelf,
            and the day closes with figures that already agree.
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

        {/* Product visual */}
        <motion.div
          ref={visual}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0.3 : 0.85, ease: EASE, delay: reduce ? 0 : 0.42 }}
          style={{ marginTop: 'var(--s8)', position: 'relative' }}
        >
          <div className="pbc-preview-scroll">
            <AppChrome title="Dashboard" active={0}>
              <DashboardPreview />
            </AppChrome>
          </div>

          {/* One floating detail — evidence, not decoration */}
          <motion.div
            initial={{ opacity: 0, x: reduce ? 0 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: reduce ? 0 : 1 }}
            className="pbc-hero-chip"
            style={{
              position: 'absolute',
              right: -14,
              bottom: 54,
              background: 'var(--paper)',
              borderRadius: 'var(--r)',
              padding: '0.6875rem 0.875rem',
              boxShadow: '0 22px 50px -22px rgba(0,0,0,0.7)',
              border: '1px solid rgba(11,16,32,0.10)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
            }}
          >
            <div>
              <div className="pbc-meta" style={{ color: 'var(--on-paper-soft)', fontWeight: 600 }}>Sale #4821</div>
              <div className="pbc-tabular" style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--on-paper)' }}>Rs 4,250</div>
            </div>
            <StatusChip kind="paid" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
