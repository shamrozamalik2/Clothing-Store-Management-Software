import { Link } from 'react-router-dom';
import { useInView } from '@hooks/useInView';
import { usePublicTheme, HeroWave } from './ThemeContext';
import {
  CurrencyDollarIcon, CubeIcon, ShoppingBagIcon, ShoppingCartIcon,
  TruckIcon, UserGroupIcon, ChartBarIcon, UsersIcon,
  ShieldCheckIcon, CloudArrowUpIcon, Cog6ToothIcon,
  ArrowsRightLeftIcon, ArrowRightIcon, CheckIcon,
} from '@heroicons/react/24/outline';

function Fade({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : 'translateY(24px)',
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

const FEATURES = [
  { icon: CurrencyDollarIcon, color: '#3b82f6', rgb: '59,130,246',   title: 'Point of Sale',       desc: 'Powerful, fast POS system with product search, cart management, discounts, multiple payment methods, and receipt printing.', points: ['Barcode & name search', 'Multiple payment types', 'Discount & tax support', 'Receipt printing', 'Hold & resume cart'] },
  { icon: ShoppingBagIcon,    color: '#8b5cf6', rgb: '139,92,246',   title: 'Products',            desc: 'Comprehensive product management with categories, brands, pricing tiers, variants and full inventory tracking per product.', points: ['Cost, sale & wholesale pricing', 'Product variants (size/color)', 'Category & brand linking', 'SKU management', 'Stock quantity tracking'] },
  { icon: CubeIcon,           color: '#06b6d4', rgb: '6,182,212',    title: 'Inventory',           desc: 'Real-time inventory control with stock adjustments, tracking, and audit trail for all movements.', points: ['Automatic stock updates', 'Manual stock adjustments', 'Adjustment reasons log', 'Low stock visibility', 'Multi-product tracking'] },
  { icon: ShoppingCartIcon,   color: '#10b981', rgb: '16,185,129',   title: 'Sales',               desc: 'Complete sales management from transaction creation to returns, with full history, status tracking and detail views.', points: ['Sales list & filtering', 'Sale detail view', 'Returns & exchanges', 'Payment status tracking', 'Customer linking'] },
  { icon: ArrowsRightLeftIcon,color: '#f59e0b', rgb: '245,158,11',   title: 'Purchases',           desc: 'Manage supplier purchases, track incoming inventory, and maintain complete purchase history with status updates.', points: ['Purchase order management', 'Supplier linking', 'Receiving tracking', 'Cost recording', 'Purchase history'] },
  { icon: UserGroupIcon,      color: '#ec4899', rgb: '236,72,153',   title: 'Customers',           desc: 'Build and manage your customer database with contact details, purchase history, and balance tracking.', points: ['Customer profiles', 'Purchase history per customer', 'Balance & due tracking', 'Contact management', 'Customer reports'] },
  { icon: TruckIcon,          color: '#14b8a6', rgb: '20,184,166',   title: 'Suppliers',           desc: 'Maintain complete supplier records with contact information, purchase history and balance management.', points: ['Supplier profiles', 'Purchase history', 'Balance tracking', 'Contact details', 'Supplier reports'] },
  { icon: ChartBarIcon,       color: '#6366f1', rgb: '99,102,241',   title: 'Reports',             desc: 'Comprehensive business analytics and reporting. Revenue trends, product performance, customer insights and more.', points: ['Revenue & profit reports', 'Top products & categories', 'Expense analysis', 'Customer reports', 'Date range filtering'] },
  { icon: UsersIcon,          color: '#0ea5e9', rgb: '14,165,233',   title: 'Users & Roles',       desc: 'Multi-user system with role-based access control. Add team members and assign appropriate permissions.', points: ['Multiple user accounts', 'Role assignment', 'User activation/deactivation', 'Profile management', 'Password management'] },
  { icon: ShieldCheckIcon,    color: '#a78bfa', rgb: '167,139,250',  title: 'Permissions',         desc: 'Fine-grained permission control at the module level. Control view, create, edit and delete access per role.', points: ['Module-level permissions', 'View / Create / Edit / Delete', 'Custom roles', 'Admin full access', 'Instant permission updates'] },
  { icon: CloudArrowUpIcon,   color: '#34d399', rgb: '52,211,153',   title: 'Backup & Restore',    desc: 'Keep your business data safe with backup and restore functionality. Never lose critical business information.', points: ['Data export & backup', 'Restore capability', 'Secure data storage', 'Audit trail', 'Business continuity'] },
  { icon: Cog6ToothIcon,      color: '#fb923c', rgb: '251,146,60',   title: 'Business Settings',   desc: 'Configure your business profile, company details, currency, tax settings and system preferences from one place.', points: ['Company profile setup', 'Currency & tax config', 'Receipt customization', 'Theme preferences', 'Notification settings'] },
];

export default function FeaturesPage() {
  const { c } = usePublicTheme();

  return (
    <div style={{ color: c.text }}>

      {/* Hero */}
      <section className="pub-hero-bg" style={{ padding: '6rem 1.5rem 8rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <Fade>
            <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '1.5rem' }}>
              Platform Features
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Everything your business needs,<br />
              in one platform
            </h1>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
              12 powerful modules designed to cover every aspect of your business operations. From the sales floor to the back office.
            </p>
          </Fade>
        </div>
        <HeroWave />
      </section>

      {/* Features grid */}
      <section className="pub-section" style={{ padding: '5rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Fade key={f.title} delay={i * 45}>
                  <div className="pub-card" style={{ padding: '2rem', height: '100%' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, marginBottom: '1.25rem', background: `rgba(${f.rgb},0.12)`, border: `1px solid rgba(${f.rgb},0.2)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon style={{ width: 22, height: 22, color: f.color }} />
                    </div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: c.heading, marginBottom: '0.625rem' }}>{f.title}</h3>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: c.textDim, marginBottom: '1.25rem' }}>{f.desc}</p>
                    <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {f.points.map(pt => (
                        <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: c.textSub }}>
                          <CheckIcon style={{ width: 13, height: 13, color: f.color, flexShrink: 0 }} />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Fade>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 1.5rem', background: c.bgDeep, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(37,99,235,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Fade style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
            All features. One platform.
          </h2>
          <p style={{ fontSize: '1rem', color: c.textDim, marginBottom: '2rem' }}>
            Sign in or contact us to see ProBusinessCloud in action for your business.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="pub-gradient-btn pub-btn-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: 14, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}>
              Get Started <ArrowRightIcon style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/pricing" className="pub-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: 14, fontWeight: 600, fontSize: '1rem', textDecoration: 'none', color: c.accentLink, border: `1px solid ${c.border}`, background: 'rgba(59,130,246,0.06)', transition: 'all 0.2s' }}>
              View Pricing
            </Link>
          </div>
        </Fade>
      </section>
    </div>
  );
}
