import { motion, useReducedMotion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════════════
   Motion primitives

   Rule: motion is never load-bearing. When the visitor asks for reduced
   motion these components render as plain, already-visible elements — they do
   not animate, and critically they do not gate visibility on scrolling into
   view. Content is readable the moment it is in the document.
   ═══════════════════════════════════════════════════════════════════════════ */

export const EASE = [0.22, 1, 0.36, 1];

export function useStagger(stagger = 0.07, delay = 0) {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
}

export function useRise(distance = 18) {
  return {
    hidden: { opacity: 0, y: distance },
    show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
  };
}

/**
 * Reveal — scroll-triggered section entrance via viewport detection.
 * Fires once, 15% into view. Inert under reduced motion.
 */
export function Reveal({ children, delay = 0, y = 20, className = '', style, as = 'div' }) {
  const reduce = useReducedMotion();
  const Tag = motion[as] || motion.div;

  if (reduce) {
    const Plain = as;
    return <Plain className={className} style={style}>{children}</Plain>;
  }

  return (
    <Tag
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/**
 * StaggerGroup — reveals children in sequence as the group scrolls in.
 * Pair with <StaggerItem>. Inert under reduced motion.
 */
export function StaggerGroup({ children, stagger = 0.07, delay = 0, className = '', style, amount = 0.2 }) {
  const reduce = useReducedMotion();
  const variants = useStagger(stagger, delay);

  if (reduce) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '', style, y = 18 }) {
  const reduce = useReducedMotion();
  const variants = useRise(y);

  if (reduce) {
    return <div className={className} style={style}>{children}</div>;
  }

  return (
    <motion.div className={className} style={style} variants={variants}>
      {children}
    </motion.div>
  );
}

/* Hover-lift wrapper for interactive cards — subtle and fast. */
export function Lift({ children, className = '', style, ...rest }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.22, ease: EASE }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion };
