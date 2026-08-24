import toast from 'react-hot-toast';

/**
 * Shows a toast with an Undo action. Calls `onUndo` if the user clicks Undo
 * before the toast auto-dismisses.
 *
 * @param {string} message   - Success message, e.g. "Product deleted"
 * @param {() => void} onUndo - Callback invoked when Undo is clicked
 * @param {number} [duration=5000] - Auto-dismiss time in ms
 */
export function toastWithUndo(message, onUndo, duration = 5000) {
  toast.custom(
    (t) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'var(--card, #1e293b)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          color: '#e2e8f0',
          fontSize: '14px',
          fontFamily: 'inherit',
          opacity: t.visible ? 1 : 0,
          transition: 'opacity 150ms ease',
          minWidth: '280px',
          maxWidth: '400px',
        }}
      >
        <span style={{ flex: 1, lineHeight: 1.4 }}>{message}</span>
        <button
          onClick={() => {
            toast.dismiss(t.id);
            onUndo();
          }}
          style={{
            flexShrink: 0,
            padding: '4px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(99,102,241,0.5)',
            background: 'rgba(99,102,241,0.15)',
            color: '#a5b4fc',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 120ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; }}
        >
          Undo
        </button>
      </div>
    ),
    { duration },
  );
}
