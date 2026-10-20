// Shared visual language for the Super Admin section — glass-morphism cards,
// gradient accents and icon-led inputs, matching the quality bar the login
// page already set (login-gradient-bg, glow blobs, backdrop blur) instead of
// the flat slate-900/flat-purple-button look every inner page had instead.
// Every super admin page should import from here rather than redeclaring its
// own INPUT/Field/modal shell, so the whole section stays visually coherent
// and a future tweak only has to happen in one place.

export const glassCard =
  'rounded-2xl shadow-xl backdrop-blur-md';
export const glassCardStyle = {
  background: 'rgba(15,23,42,0.72)',
  border: '1px solid rgba(148,163,184,0.14)',
};

export const INPUT =
  'w-full bg-slate-950/60 border border-slate-700 text-white text-sm rounded-xl px-3.5 py-2.5 ' +
  'placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/60 ' +
  'focus:border-purple-500/60 transition-colors';

export const PRIMARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold text-white transition-all ' +
  'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 ' +
  'shadow-lg shadow-purple-950/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none';

export const SECONDARY_BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium text-slate-300 transition-colors ' +
  'hover:text-white hover:bg-slate-800/80';

export const SECTION_LABEL = 'text-xs font-semibold text-slate-500 uppercase tracking-widest';

export function Field({ label, children, required, hint }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">
        {label}{required && <span className="text-fuchsia-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

export function PrimaryButton({ children, className = '', ...props }) {
  return (
    <button {...props} className={`${PRIMARY_BTN} px-5 py-2.5 text-sm ${className}`}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }) {
  return (
    <button {...props} className={`${SECONDARY_BTN} px-4 py-2.5 text-sm ${className}`}>
      {children}
    </button>
  );
}

/** Glass-morphism modal shell — header (title + close) and scrollable body. */
export function Modal({ title, onClose, children, maxWidth = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`${glassCard} w-full ${maxWidth} flex flex-col max-h-[90vh]`}
        style={glassCardStyle}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40 shrink-0">
          <h3 className="text-white font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-lg leading-none"
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
  return (
    <div className={`${glassCard} ${className}`} style={glassCardStyle}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
