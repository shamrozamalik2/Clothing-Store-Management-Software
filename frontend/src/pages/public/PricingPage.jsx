import { useEffect, useState } from 'react';
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { CheckIcon, XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

import { CTA, SectionHeading } from './components/ui';
import { EASE, Reveal, StaggerGroup, StaggerItem } from './components/motion';
import { FinalCta } from './HomePage';
import { usePageMeta } from './usePageMeta';

/* ═══════════════════════════════════════════════════════════════════════════
   Pricing

   Figures supplied by the client:
     Standard   — $25 / month, $250 / year
     Enterprise — $40 / month, multiple locations

   The annual Standard price is exactly two months free ($300 → $250), so the
   Enterprise annual figure applies the same rule ($480 → $400) rather than
   inventing a different discount. Flagged in the handover notes.
   ═══════════════════════════════════════════════════════════════════════════ */

const PLANS = [
  {
    id: 'standard',
    name: 'Standard',
    tagline: 'For a single shop that wants everything in one place.',
    monthly: 25,
    annual: 250,
    featured: true,
    cta: 'Book a demo',
    includes: [
      'All 24 modules',
      'Point of sale with size and colour variants',
      'Inventory, purchasing and suppliers',
      'Customers, credit limits and ledgers',
      'Reports, analytics and stock valuation',
      'Employees, payroll and attendance',
      'Web, desktop, Android and iOS',
      'Role-based permissions and audit trail',
      'Backup and restore',
    ],
    excludes: ['Multiple locations', 'Company-wide reporting across branches'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'For multi-branch retailers and wholesalers.',
    monthly: 40,
    annual: 400,
    featured: false,
    cta: 'Talk to us',
    includes: [
      'Everything in Standard',
      'Multiple locations',
      'Company-wide reporting across branches',
      'Manufacturing, bills of materials and batches',
      'Super-admin panel for company administration',
      'Wholesale pricing and customer groups',
      'Per-module, per-action custom roles',
      'Multi-tenant separation at the data layer',
    ],
    excludes: [],
  },
];

/* ── A price that counts to its new value when the term changes ───────────── */
function AnimatedPrice({ value, reduce }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return undefined;
    }
    const controls = animate(mv, value, { duration: 0.55, ease: EASE });
    return () => controls.stop();
  }, [value, reduce, mv]);

  return (
    <span className="pbc-display pbc-tabular" style={{ fontSize: 'clamp(2.75rem, 5vw, 3.75rem)', lineHeight: 1, color: 'var(--on-paper)' }}>
      <span style={{ fontSize: '0.5em', verticalAlign: 'super', fontWeight: 500 }}>$</span>
      <motion.span>{rounded}</motion.span>
    </span>
  );
}

/* ── The hand-drawn "two months free" annotation ──────────────────────────── */
function SaveMark() {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginLeft: 8 }}>
      <svg viewBox="0 0 62 34" style={{ width: 54, height: 30, overflow: 'visible' }}>
        <path
          d="M4 6 C 20 2, 34 8, 40 20 C 43 26, 40 31, 34 30 C 28 29, 30 21, 38 19 C 46 17, 54 20, 59 25"
          fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round"
        />
        <path d="M59 25 L 51 24 M59 25 L 56 32" fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green)', whiteSpace: 'nowrap' }}>
        Two months free
      </span>
    </span>
  );
}

/* ── Term toggle ──────────────────────────────────────────────────────────── */
function TermToggle({ annual, onChange, reduce }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.9375rem', fontWeight: annual ? 400 : 600, color: annual ? 'var(--on-paper-mute)' : 'var(--on-paper)' }}>
        Monthly
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={annual}
        aria-label="Bill annually"
        onClick={() => onChange(!annual)}
        style={{
          width: 58, height: 32, borderRadius: 999, cursor: 'pointer', padding: 4,
          background: annual ? 'var(--accent)' : 'rgba(10,10,18,0.14)',
          border: 'none', display: 'flex', justifyContent: annual ? 'flex-end' : 'flex-start',
          transition: 'background 0.25s',
        }}
      >
        <motion.span
          layout
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 34 }}
          style={{ width: 24, height: 24, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
        />
      </button>

      <span style={{ fontSize: '0.9375rem', fontWeight: annual ? 600 : 400, color: annual ? 'var(--on-paper)' : 'var(--on-paper-mute)' }}>
        Annually
      </span>

      <AnimatePresence>
        {annual && (
          <motion.span
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.35, ease: EASE }}
          >
            <SaveMark />
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Plan card ────────────────────────────────────────────────────────────── */
function PlanCard({ plan, annual, reduce }) {
  const price = annual ? plan.annual : plan.monthly;
  const period = annual ? 'Per year, billed annually' : 'Per month, billed monthly';

  return (
    <div
      className="pbc-card"
      style={{
        position: 'relative',
        padding: 'var(--s5)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: plan.featured ? '1px solid var(--accent-line)' : undefined,
        boxShadow: plan.featured ? '0 24px 60px -24px rgba(44,107,245,0.32)' : undefined,
      }}
    >
      {plan.featured && (
        <span
          style={{
            position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
            background: 'var(--accent)', color: '#fff', fontSize: '0.75rem', fontWeight: 600,
            padding: '0.3125rem 0.875rem', borderRadius: 999, whiteSpace: 'nowrap',
            boxShadow: '0 8px 20px -8px rgba(44,107,245,0.8)',
          }}
        >
          Most popular
        </span>
      )}

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent)' }}>{plan.name}</div>
        <p className="pbc-meta" style={{ color: 'var(--on-paper-mute)', margin: '0.375rem 0 var(--s3)' }}>{plan.tagline}</p>

        <AnimatedPrice value={price} reduce={reduce} />

        <AnimatePresence mode="wait">
          <motion.p
            key={period}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.1 : 0.25 }}
            className="pbc-meta"
            style={{ color: 'var(--on-paper-soft)', margin: '0.625rem 0 0' }}
          >
            {period}
          </motion.p>
        </AnimatePresence>

        <div style={{ marginTop: 'var(--s4)' }}>
          <CTA to="/demo" variant={plan.featured ? 'primary' : 'ghost'} tone="paper" icon={ArrowRightIcon}>
            {plan.cta}
          </CTA>
        </div>
      </div>

      <ul
        style={{
          listStyle: 'none',
          margin: 'var(--s5) 0 0',
          padding: 'var(--s4) 0 0',
          borderTop: '1px solid var(--on-paper-line)',
          display: 'grid',
          gap: '0.75rem',
        }}
      >
        {plan.includes.map((f) => (
          <li key={f} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
            <span
              aria-hidden="true"
              style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, borderRadius: '50%', background: 'var(--accent-wash)', flexShrink: 0, marginTop: 1 }}
            >
              <CheckIcon style={{ width: 12, height: 12, color: 'var(--accent)' }} />
            </span>
            <span className="pbc-body" style={{ color: 'var(--on-paper-mute)' }}>{f}</span>
          </li>
        ))}

        {plan.excludes.map((f) => (
          <li key={f} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', opacity: 0.62 }}>
            <span
              aria-hidden="true"
              style={{ display: 'grid', placeItems: 'center', width: 19, height: 19, borderRadius: '50%', background: 'rgba(10,10,18,0.05)', flexShrink: 0, marginTop: 1 }}
            >
              <XMarkIcon style={{ width: 12, height: 12, color: 'var(--on-paper-soft)' }} />
            </span>
            <span className="pbc-body" style={{ color: 'var(--on-paper-soft)', textDecoration: 'line-through' }}>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const reduce = useReducedMotion();

  usePageMeta({
    title: 'Pricing — ProBusinessCloud',
    description:
      'Standard at $25 per month or $250 per year. Enterprise at $40 per month for multi-branch retailers. Every module included on both plans.',
  });

  return (
    <>
      <section className="pbc-warm" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s12)' }}>
        <div className="pbc-shell">
          <SectionHeading
            eyebrow="Pricing"
            tone="paper"
            align="center"
            max={680}
            title="Select the plan that fits how your business runs."
            lede="Every module is included on both plans. The difference is how many locations you are running."
          />

          <Reveal delay={0.05}>
            <div style={{ marginTop: 'var(--s6)', marginBottom: 'var(--s8)' }}>
              <TermToggle annual={annual} onChange={setAnnual} reduce={reduce} />
            </div>
          </Reveal>

          <StaggerGroup
            className="pbc-pricing-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--s4)', maxWidth: 880, margin: '0 auto' }}
            stagger={0.09}
          >
            {PLANS.map((p) => (
              <StaggerItem key={p.id} style={{ height: '100%' }}>
                <PlanCard plan={p} annual={annual} reduce={reduce} />
              </StaggerItem>
            ))}
          </StaggerGroup>

          <Reveal delay={0.1}>
            <p className="pbc-meta" style={{ textAlign: 'center', color: 'var(--on-paper-soft)', marginTop: 'var(--s6)' }}>
              Prices are per company. Ask us about setup, data import from your existing
              system, and training for your team.
            </p>
          </Reveal>
        </div>
      </section>

      {/* What both plans share */}
      <section className="pbc-paper pbc-section">
        <div className="pbc-shell">
          <SectionHeading
            eyebrow="Included on every plan"
            tone="paper"
            align="center"
            max={620}
            title="No module is held back."
            lede="We do not gate the parts of the system a shop actually needs behind a higher tier."
          />

          <StaggerGroup
            className="pbc-grid-3"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--s3)', marginTop: 'var(--s6)' }}
            stagger={0.05}
          >
            {[
              ['Point of sale', 'Barcode checkout, variants, discounts, holds and receipts'],
              ['Inventory', 'Every size and colour tracked with low-stock alerts'],
              ['Purchasing', 'Orders, receiving, supplier balances and payables'],
              ['Customers', 'Profiles, credit limits, loyalty points and ledgers'],
              ['Reporting', 'Revenue, profit, payment mix and stock valuation'],
              ['People', 'Employees, payroll and attendance'],
              ['Security', 'Role-based permissions, audit trail, backup and restore'],
              ['Every surface', 'Web, desktop, Android and iOS'],
              ['Support', 'Help getting your catalogue in and your team started'],
            ].map(([t, d]) => (
              <StaggerItem key={t}>
                <div className="pbc-card" style={{ padding: 'var(--s3) var(--s4)', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span aria-hidden="true" style={{ display: 'grid', placeItems: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--green-wash)' }}>
                      <CheckIcon style={{ width: 11, height: 11, color: 'var(--green)' }} />
                    </span>
                    <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--on-paper)' }}>{t}</span>
                  </div>
                  <p className="pbc-meta" style={{ color: 'var(--on-paper-mute)', margin: '0.4375rem 0 0' }}>{d}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      <FinalCta />
    </>
  );
}
