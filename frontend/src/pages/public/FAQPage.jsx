import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { PlusIcon } from '@heroicons/react/24/outline';

import { SectionHeading } from './components/ui';
import { EASE } from './components/motion';
import { FinalCta } from './HomePage';
import { usePageMeta } from './usePageMeta';

const FAQS = [
  {
    q: 'Does it handle sizes and colours properly?',
    a: 'Yes. Each size and colour is tracked as its own stock line with its own SKU and barcode, so a medium white shirt and a large white shirt are separate numbers rather than one pooled count.',
  },
  {
    q: 'Can I move my existing catalogue in?',
    a: 'Products, categories, brands, customers and suppliers can be imported from CSV, so an existing catalogue does not have to be retyped.',
  },
  {
    q: 'What happens when a customer returns or exchanges something?',
    a: 'Returns and exchanges are recorded against the original sale. Stock is restored, the refund or exchange is linked to the original record, and the transaction history shows what happened.',
  },
  {
    q: 'Can I stop staff seeing the whole system?',
    a: 'Yes. Permissions are set per role, per module and per action, and you can create custom roles. A cashier can be limited to the counter without access to costs, reports or settings.',
  },
  {
    q: 'Does it work on more than one device at once?',
    a: 'The platform runs in the browser, as a desktop application, and as Android and iOS apps. Staff and owners can work at the same time from different places.',
  },
  {
    q: 'What happens to my data if something goes wrong?',
    a: 'You can take a backup of the business record and restore it. Restoring asks for explicit confirmation first, so a recovery cannot be triggered by accident.',
  },
  {
    q: 'Does it do payroll and attendance too?',
    a: 'Yes — employee records, attendance and payroll are part of the platform, alongside manufacturing with bills of materials and production batches for businesses that make what they sell.',
  },
  {
    q: 'How much does it cost?',
    a: 'Standard is $25 per month, or $250 per year — two months free. Enterprise, for businesses running more than one location, is $40 per month. Every module is included on both plans; the difference is how many locations you operate. Full detail is on the pricing page.',
  },
];

function Item({ item, open, onToggle, id }) {
  const reduce = useReducedMotion();

  return (
    <div style={{ borderTop: '1px solid var(--on-paper-line)' }}>
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          id={`${id}-button`}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--s3)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 'var(--s3) 0',
            textAlign: 'left',
            font: 'inherit',
            fontSize: '1.0625rem',
            fontWeight: 600,
            color: 'var(--on-paper)',
          }}
        >
          {item.q}
          <motion.span
            aria-hidden="true"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
            style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--on-paper-line)' }}
          >
            <PlusIcon style={{ width: 14, height: 14, color: 'var(--accent)' }} />
          </motion.span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-button`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', margin: 0, paddingBottom: 'var(--s3)', maxWidth: 660 }}>
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const [open, setOpen] = useState(0);

  usePageMeta({
    title: 'Frequently asked questions — ProBusinessCloud',
    description:
      'Common questions about variants, imports, returns, permissions, devices, backups and pricing.',
  });

  return (
    <>
      <section className="pbc-ink pbc-grain">
        <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s10)' }}>
          <SectionHeading
            eyebrow="Questions"
            tone="ink"
            max={780}
            title="The things retailers ask us first."
          />
        </div>
      </section>

      <section className="pbc-paper pbc-section">
        <div className="pbc-shell" style={{ maxWidth: 860 }}>
          {FAQS.map((f, i) => (
            <Item
              key={f.q}
              id={`pbc-faq-${i}`}
              item={f}
              open={open === i}
              onToggle={() => setOpen(open === i ? -1 : i)}
            />
          ))}
          <div style={{ borderTop: '1px solid var(--on-paper-line)' }} />
        </div>
      </section>

      <FinalCta />
    </>
  );
}
