import { Link } from 'react-router-dom';
import Logo from '@components/ui/Logo';
import { StoreButtons } from './StoreButtons';

const COLUMNS = [
  {
    heading: 'Platform',
    links: [
      { to: '/platform',            label: 'Overview' },
      { to: '/platform#sell',       label: 'Point of sale' },
      { to: '/platform#stock',      label: 'Inventory & variants' },
      { to: '/platform#buy',        label: 'Purchasing' },
      { to: '/platform#money',      label: 'Reports & finance' },
      { to: '/platform#make',       label: 'Manufacturing' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { to: '/how-it-works', label: 'How it works' },
      { to: '/solutions',    label: 'Solutions' },
      { to: '/security',     label: 'Security & control' },
      { to: '/apps',         label: 'Web, desktop & mobile' },
      { to: '/faq',          label: 'FAQ' },
    ],
  },
  {
    heading: 'Get started',
    links: [
      { to: '/pricing', label: 'Pricing' },
      { to: '/demo',  label: 'Book a demo' },
      { to: '/login', label: 'Sign in' },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="pbc-ink" style={{ borderTop: '1px solid var(--on-ink-line)' }}>
      <div className="pbc-shell" style={{ paddingTop: 'var(--s10)', paddingBottom: 'var(--s6)' }}>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(230px, 1.5fr) repeat(4, minmax(120px, 1fr))', gap: 'var(--s6) var(--s4)' }} className="pbc-footer-grid">

          {/* Brand */}
          <div>
            <Logo variant="lockup" mono height={28} style={{ color: 'var(--on-ink)' }} />
            <p className="pbc-body" style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s2)', maxWidth: 320 }}>
              Retail operations, brought together. One system for selling, stock, purchasing,
              customers, finance, staff and production.
            </p>
            <p className="pbc-meta" style={{ color: 'var(--on-ink-soft)', marginTop: 'var(--s2)' }}>
              Available on web, desktop, Android and iOS.
            </p>

          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <h2 className="pbc-eyebrow" style={{ color: 'var(--on-ink-soft)', marginBottom: 'var(--s2)' }}>
                {col.heading}
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.625rem' }}>
                {col.links.map((l) => (
                  <li key={l.to + l.label}>
                    <Link
                      to={l.to}
                      className="pbc-body"
                      style={{ color: 'var(--on-ink-mute)', textDecoration: 'none' }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Download — its own column, heading aligned with the others */}
          <div>
            <h2 className="pbc-eyebrow" style={{ color: 'var(--on-ink-soft)', marginBottom: 'var(--s2)' }}>
              Download
            </h2>
            <StoreButtons variant="solid" direction="column" />
          </div>
        </div>

        <div
          className="pbc-rule-ink"
          style={{
            marginTop: 'var(--s8)',
            paddingTop: 'var(--s3)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--s2)',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p className="pbc-meta" style={{ color: 'var(--on-ink-soft)', margin: 0 }}>
            © {year} ProBusinessCloud. All rights reserved.
          </p>
          <p className="pbc-meta" style={{ color: 'var(--on-ink-soft)', margin: 0 }}>
            {/* PLACEHOLDER — replace with real legal pages when they exist */}
            Privacy policy and terms of service pending publication.
          </p>
        </div>
      </div>
    </footer>
  );
}
