import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

/* ═══════════════════════════════════════════════════════════════════════════
   Centralised GSAP setup.
   Plugins are registered exactly once. Components use `useGSAP` with a scope,
   which reverts every tween and kills every ScrollTrigger created inside it on
   unmount — no manual teardown, no leaked triggers between route changes.
   ═══════════════════════════════════════════════════════════════════════════ */

let registered = false;

if (!registered) {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
  registered = true;
}

/** True when the visitor asked for reduced motion — skip scroll choreography. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Recalculate trigger positions after layout settles (fonts, images). */
export function refreshScrollTriggers() {
  ScrollTrigger.refresh();
}

export { gsap, ScrollTrigger, useGSAP };
