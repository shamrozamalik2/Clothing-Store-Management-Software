import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { EASE } from './motion';
import { PhoneFrame } from './DeviceFrames';
import { MobileScreen } from './ProductPreview';
import { gsap, useGSAP, prefersReducedMotion } from './gsapSetup';
import { StoreButtons } from './StoreButtons';

/* ═══════════════════════════════════════════════════════════════════════════
   App download banner

   Store links and badge artwork live in StoreButtons.jsx, shared with the
   footer so the two never drift apart.

   PLACEHOLDER — photography
   The reference design uses a cut-out photograph of a person. Drop a
   transparent PNG at /app-promo.png (roughly 900x1100, subject facing into
   the layout) and it is used automatically. Until then the section falls back
   to the product itself in a phone, which is never wrong to show.
   ═══════════════════════════════════════════════════════════════════════════ */

const PHOTO_SRC = '/app-promo.png';

/* ── Section ──────────────────────────────────────────────────────────────── */
export default function AppDownload() {
  const scope = useRef(null);
  const [hasPhoto, setHasPhoto] = useState(true);
  const reduce = useReducedMotion();

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      /* ── Continuous motion ──────────────────────────────────────────────
         The section previously only moved on scroll, so at rest it looked
         dead. Everything below runs forever, on its own rhythm, so the
         banner is alive whether or not the page is moving. Each target is a
         separate element from anything Framer animates. */

      gsap.to('.pbc-dl-subject', {
        y: -16, duration: 3.8, ease: 'sine.inOut', repeat: -1, yoyo: true,
      });

      gsap.to('.pbc-dl-bubble-float', {
        y: -10, duration: 2.9, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.4,
      });

      /* Arcs rotate slowly behind the subject. */
      gsap.to('.pbc-dl-arc', {
        rotate: 14, transformOrigin: 'center',
        duration: 13, ease: 'sine.inOut', repeat: -1, yoyo: true,
      });

      /* The squiggle redraws itself on a loop. */
      gsap.fromTo(
        '.pbc-dl-squiggle path',
        { strokeDasharray: 200, strokeDashoffset: 200 },
        {
          strokeDashoffset: 0, duration: 1.6, ease: 'power2.inOut',
          repeat: -1, repeatDelay: 2.4, yoyo: true,
        }
      );

      /* Store buttons pulse a soft ring, one after the other, to draw the eye
         to the action without anything blinking. */
      gsap.to('.pbc-dl-store', {
        boxShadow: '0 0 0 6px rgba(255,255,255,0.06)',
        duration: 1.5, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 0.75,
      });

      /* ── Scroll-linked drift, layered on the same subject via yPercent ── */
      gsap.fromTo(
        '.pbc-dl-parallax',
        { yPercent: 6 },
        {
          yPercent: -6, ease: 'none',
          scrollTrigger: { trigger: scope.current, start: 'top bottom', end: 'bottom top', scrub: 0.8 },
        }
      );
    },
    { scope }
  );

  return (
    <div ref={scope} className="pbc-shell">
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: reduce ? 0.25 : 0.7, ease: EASE }}
        className="pbc-dl-card"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--r-xl)',
          background: '#0A0A12',
          color: '#fff',
          display: 'grid',
          gridTemplateColumns: '1fr 0.9fr',
          alignItems: 'center',
          gap: 'var(--s5)',
          padding: 'var(--s8) var(--s8) 0',
          minHeight: 420,
        }}
      >
        {/* Decorative arcs */}
        <svg
          aria-hidden="true"
          viewBox="0 0 400 400"
          className="pbc-dl-arc"
          style={{ position: 'absolute', right: -40, bottom: -110, width: 460, height: 460, pointerEvents: 'none' }}
        >
          <circle cx="200" cy="200" r="176" fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round" strokeDasharray="470 1200" />
          <circle cx="200" cy="200" r="150" fill="none" stroke="rgba(255,255,255,0.20)" strokeWidth="5" strokeLinecap="round" strokeDasharray="330 1200" strokeDashoffset="-140" />
        </svg>

        {/* Hand-drawn squiggle */}
        <svg
          aria-hidden="true"
          viewBox="0 0 90 40"
          className="pbc-dl-squiggle"
          style={{ position: 'absolute', left: '52%', top: 74, width: 78, height: 34, pointerEvents: 'none' }}
        >
          <path
            d="M4 26 C 12 6, 22 6, 26 20 C 29 31, 39 31, 43 18 C 46 6, 57 6, 61 20 C 64 30, 74 31, 84 20"
            fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="2.6" strokeLinecap="round"
          />
        </svg>

        {/* ── Copy ── */}
        <div style={{ position: 'relative', zIndex: 2, paddingBottom: 'var(--s8)' }}>
          <motion.h2
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduce ? 0.2 : 0.55, ease: EASE, delay: 0.05 }}
            className="pbc-display pbc-h2"
            style={{ margin: 0, color: '#fff' }}
          >
            Take the shop with you.
          </motion.h2>

          <motion.p
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduce ? 0.2 : 0.55, ease: EASE, delay: 0.14 }}
            className="pbc-lede"
            style={{ color: 'rgba(255,255,255,0.72)', marginTop: 'var(--s3)', maxWidth: 440 }}
          >
            Android and iOS apps for owners and managers. Check the day&apos;s takings, look up
            a product, review a sale and respond to what needs attention — without going back
            to the counter.
          </motion.p>

          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduce ? 0.2 : 0.55, ease: EASE, delay: 0.22 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: 'var(--s5)' }}
          >
            <StoreButtons variant="ghost" className="pbc-dl-store" />
          </motion.div>
        </div>

        {/* ── Subject ── */}
        <div className="pbc-dl-stage" style={{ position: 'relative', zIndex: 2, alignSelf: 'end', display: 'flex', justifyContent: 'flex-end' }}>
          {/* Speech bubble */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 10 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 380, damping: 20, delay: 0.5 }}
            className="pbc-dl-bubble"
            style={{
              position: 'absolute',
              top: -18,
              left: -30,
              zIndex: 4,
              background: '#fff',
              color: 'var(--on-paper)',
              borderRadius: 14,
              padding: '0.625rem 0.875rem',
              boxShadow: '0 18px 40px -16px rgba(0,0,0,0.6)',
              maxWidth: 210,
            }}
          >
            <span className="pbc-dl-bubble-float" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500 }}>
              Today&apos;s takings: <strong>Rs 128,400</strong>
            </span>
            <span
              aria-hidden="true"
              style={{
                position: 'absolute', bottom: -7, left: 26, width: 14, height: 14,
                background: '#fff', transform: 'rotate(45deg)', borderRadius: 2,
              }}
            />
          </motion.div>

          <div className="pbc-dl-parallax" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', width: '100%' }}>
          <div className="pbc-dl-subject" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', width: '100%' }}>
            {hasPhoto ? (
              <img
                src={PHOTO_SRC}
                alt=""
                onError={() => setHasPhoto(false)}
                className="pbc-dl-photo"
                style={{
                  display: 'block',
                  width: '100%',
                  maxWidth: 460,
                  height: 'auto',
                  objectFit: 'contain',
                  objectPosition: 'bottom',
                  /* Sits on the card's bottom edge rather than floating. */
                  marginBottom: 0,
                  filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.45))',
                }}
              />
            ) : (
              /* Fallback until a cut-out photograph is supplied. */
              <PhoneFrame width={248} style={{ marginBottom: -46 }}>
                <MobileScreen />
              </PhoneFrame>
            )}
          </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
