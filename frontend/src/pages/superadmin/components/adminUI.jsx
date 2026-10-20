// Shared visual language for the Super Admin section. This now reuses the
// product's own design system (Card, the surface/primary/card CSS-variable
// tokens, the .icon-grad-*/.modal-surface/.gradient-text utility classes,
// framer-motion) instead of a parallel, hand-rolled slate/purple palette —
// that mismatch (an admin section that looked and animated nothing like the
// rest of the product) was the actual "looks cheap" complaint.
import { motion } from 'framer-motion';
import Card from '@components/ui/Card';

// ── Motion ───────────────────────────────────────────────────────────────────
// Same stagger + spring recipe as DashboardPage's KPI row.
export const STAGGER_PARENT = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
export const CARD_ITEM = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 22, stiffness: 300 } },
};

// ── Gradient KPI tile — identical recipe to DashboardPage's KpiCard ─────────
const KPI_THEMES = {
  green:  { grad: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', glow: 'rgba(16,185,129,0.35)' },
  blue:   { grad: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)', glow: 'rgba(59,130,246,0.35)' },
  violet: { grad: 'linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%)', glow: 'rgba(139,92,246,0.35)' },
  amber:  { grad: 'linear-gradient(135deg, #b45309 0%, #f59e0b 100%)', glow: 'rgba(245,158,11,0.35)' },
  red:    { grad: 'linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)', glow: 'rgba(239,68,68,0.35)' },
};

export function KpiTile({ label, value, sub, icon: Icon, theme = 'blue', loading }) {
  const t = KPI_THEMES[theme] || KPI_THEMES.blue;
  return (
    <motion.div
      variants={CARD_ITEM}
      whileHover={{ y: -4, boxShadow: `0 16px 40px ${t.glow}` }}
      className="relative overflow-hidden rounded-2xl p-5 cursor-default"
      style={{ background: t.grad, boxShadow: `0 8px 28px ${t.glow}`, transition: 'box-shadow 0.2s' }}
    >
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="absolute -bottom-8 -right-2 w-20 h-20 rounded-full pointer-events-none" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.65)' }}>{label}</p>
          {loading ? (
            <div className="h-9 w-24 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.20)' }} />
          ) : (
            <p className="text-3xl font-black text-white leading-none tracking-tight truncate">{value}</p>
          )}
          {!loading && sub && <p className="text-xs font-medium mt-2.5" style={{ color: 'rgba(255,255,255,0.65)' }}>{sub}</p>}
        </div>
        <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.20)' }}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

// ── Form bits ────────────────────────────────────────────────────────────────

export const SECTION_LABEL = 'text-xs font-semibold text-surface-500 uppercase tracking-widest';

export const INPUT =
  'w-full text-sm rounded-xl px-3.5 py-2.5 border transition-colors ' +
  'bg-surface-800 border-surface-600 text-surface-100 placeholder:text-surface-500';

export function Field({ label, children, required, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-400 mb-1.5">
        {label}{required && <span className="text-fuchsia-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-surface-500 mt-1">{hint}</p>}
    </div>
  );
}

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #2563eb, #7c3aed)';

export function PrimaryButton({ children, className = '', style, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white
        transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${className}`}
      style={{ background: PRIMARY_GRADIENT, boxShadow: '0 4px 18px rgba(99,102,241,0.40)', ...style }}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium
        text-surface-300 hover:text-surface-100 hover:bg-surface-700/60 transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

/** Same header pattern every DashboardPage card uses: icon-grad chip + title + subtitle. */
export function SectionIcon({ icon: Icon, theme = 'violet' }) {
  return (
    <div className={`h-7 w-7 rounded-lg flex items-center justify-center icon-grad-${theme} shrink-0`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}

/** Modal shell on the product's own .modal-surface utility, not a bespoke glass recipe. */
export function Modal({ title, subtitle, onClose, children, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`modal-surface w-full ${maxWidth} flex flex-col max-h-[90vh]`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700 shrink-0">
          <div>
            <h3 className="text-surface-100 font-semibold">{title}</h3>
            {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-surface-400 hover:text-surface-100 hover:bg-surface-700/60 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Flat content card used outside modals — tables, dashboard panels, etc. */
export function Panel({ children, className = '' }) {
  return <Card className={className}>{children}</Card>;
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-2xl font-black text-surface-100 tracking-tight leading-none">{title}</h2>
        {subtitle && <p className="text-xs text-surface-500 mt-1.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
