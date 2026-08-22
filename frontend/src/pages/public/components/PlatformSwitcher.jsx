import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckIcon } from '@heroicons/react/24/outline';

import { EASE } from './motion';
import { AppChrome, DashboardPreview, POSPreview, MobilePreview } from './ProductPreview';

export default function PlatformSwitcher({ surfaces }) {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const s = surfaces[active];

  return (
    <div>
      {/* Tabs — shared layout indicator slides between options */}
      <div
        role="tablist"
        aria-label="Available platforms"
        style={{
          display: 'inline-flex',
          gap: 4,
          padding: 4,
          borderRadius: 'var(--r)',
          background: 'rgba(252,251,248,0.05)',
          border: '1px solid var(--on-ink-line)',
          marginBottom: 'var(--s5)',
        }}
      >
        {surfaces.map((x, i) => {
          const on = i === active;
          return (
            <button
              key={x.id}
              role="tab"
              type="button"
              id={`pbc-tab-${x.id}`}
              aria-selected={on}
              aria-controls={`pbc-panel-${x.id}`}
              onClick={() => setActive(i)}
              style={{
                position: 'relative',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '0.5rem 1.125rem',
                borderRadius: 'var(--r-sm)',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: on ? 'var(--ink)' : 'var(--on-ink-mute)',
                transition: 'color 0.2s',
              }}
            >
              {on && (
                <motion.span
                  layoutId="pbc-surface-pill"
                  aria-hidden="true"
                  style={{ position: 'absolute', inset: 0, background: 'var(--paper)', borderRadius: 'var(--r-sm)' }}
                  transition={{ duration: reduce ? 0 : 0.32, ease: EASE }}
                />
              )}
              <span style={{ position: 'relative' }}>{x.label}</span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={s.id}
          role="tabpanel"
          id={`pbc-panel-${s.id}`}
          aria-labelledby={`pbc-tab-${s.id}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0.15 : 0.38, ease: EASE }}
          className="pbc-split"
          style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 'var(--s6)', alignItems: 'center' }}
        >
          <div>
            <h3 className="pbc-display pbc-h3" style={{ margin: 0, color: 'var(--on-ink)' }}>{s.title}</h3>
            <p className="pbc-body" style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s2)' }}>{s.desc}</p>
            <ul style={{ listStyle: 'none', margin: 'var(--s3) 0 0', padding: 0, display: 'grid', gap: '0.625rem' }}>
              {s.points.map((p) => (
                <li key={p} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                  <CheckIcon aria-hidden="true" style={{ width: 15, height: 15, color: 'var(--accent-hi)', flexShrink: 0, marginTop: 3 }} />
                  <span className="pbc-body" style={{ color: 'var(--on-ink-mute)' }}>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {s.id === 'mobile' ? (
              <MobilePreview />
            ) : (
              <div className="pbc-preview-scroll" style={{ width: '100%' }}>
                <AppChrome title={s.id === 'desktop' ? 'Point of Sale' : 'Dashboard'} active={s.id === 'desktop' ? 1 : 0}>
                  {s.id === 'desktop' ? <POSPreview /> : <DashboardPreview />}
                </AppChrome>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
