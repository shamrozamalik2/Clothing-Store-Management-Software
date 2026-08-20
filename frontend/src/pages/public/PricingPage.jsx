import { Link } from 'react-router-dom';
import { useInView } from '@hooks/useInView';
import { usePublicTheme, HeroWave } from './ThemeContext';
import { CheckIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

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

const PLANS = [
  {
    name: 'Starter', price: 0, period: 'month',
    desc: 'Perfect for small businesses getting started with digital operations.',
    badge: null, highlight: false,
    features: ['POS & Billing', 'Product Management (up to 200)', 'Basic Inventory Tracking', 'Sales Management', 'Customer Management', '2 User Accounts', 'Basic Reports', 'Email Support'],
    cta: 'Get Started Free', ctaStyle: 'outline',
  },
  {
    name: 'Professional', price: 2999, period: 'month', currency: '₨',
    desc: 'Everything a growing business needs to manage operations at scale.',
    badge: 'Most Popular', highlight: true,
    features: ['Everything in Starter', 'Unlimited Products', 'Full Inventory Management', 'Purchases & Supplier Management', 'Expense Tracking', 'Returns & Exchanges', '10 User Accounts', 'Role & Permission Management', 'Advanced Reports & Analytics', 'Ledger & Audit Trail', 'Priority Support'],
    cta: 'Get Started', ctaStyle: 'gradient',
  },
  {
    name: 'Enterprise', price: 7999, period: 'month', currency: '₨',
    desc: 'For large businesses needing full control, customization, and dedicated support.',
    badge: null, highlight: false,
    features: ['Everything in Professional', 'Unlimited User Accounts', 'HR & Payroll Management', 'Manufacturing Module', 'Multi-Branch Support', 'Custom Integrations', 'Data Backup & Restore', 'Dedicated Account Manager', 'SLA Guarantee', '24/7 Phone Support'],
    cta: 'Contact Sales', ctaStyle: 'outline',
  },
];

const COMPARE_FEATURES = [
  { feature: 'POS & Billing',          starter: true,    pro: true,    enterprise: true },
  { feature: 'Product Management',     starter: '200',   pro: '∞',     enterprise: '∞' },
  { feature: 'Inventory Tracking',     starter: 'Basic', pro: 'Full',  enterprise: 'Full' },
  { feature: 'Sales Management',       starter: true,    pro: true,    enterprise: true },
  { feature: 'Purchases Management',   starter: false,   pro: true,    enterprise: true },
  { feature: 'Customer Management',    starter: true,    pro: true,    enterprise: true },
  { feature: 'Supplier Management',    starter: false,   pro: true,    enterprise: true },
  { feature: 'Expense Tracking',       starter: false,   pro: true,    enterprise: true },
  { feature: 'Returns & Exchanges',    starter: false,   pro: true,    enterprise: true },
  { feature: 'User Accounts',          starter: '2',     pro: '10',    enterprise: '∞' },
  { feature: 'Role Permissions',       starter: false,   pro: true,    enterprise: true },
  { feature: 'Reports & Analytics',    starter: 'Basic', pro: 'Full',  enterprise: 'Full' },
  { feature: 'HR & Payroll',           starter: false,   pro: false,   enterprise: true },
  { feature: 'Manufacturing Module',   starter: false,   pro: false,   enterprise: true },
  { feature: 'Audit Trail',            starter: false,   pro: true,    enterprise: true },
  { feature: 'Backup & Restore',       starter: false,   pro: true,    enterprise: true },
];

function formatPrice(plan) {
  if (plan.price === 0) return 'Free';
  return `${plan.currency || ''}${plan.price.toLocaleString()}`;
}

function FeatureValue({ val, c }) {
  if (val === true)  return <CheckIcon style={{ width: 18, height: 18, color: '#3b82f6', margin: '0 auto' }} />;
  if (val === false) return <span style={{ color: c.textDimmest, fontSize: '1rem' }}>—</span>;
  return <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#60a5fa' }}>{val}</span>;
}

export default function PricingPage() {
  const { c } = usePublicTheme();

  return (
    <div style={{ color: c.text }}>

      {/* Hero */}
      <section className="pub-hero-bg" style={{ padding: '6rem 1.5rem 8rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <Fade>
            <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '1.5rem' }}>
              Transparent Pricing
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Simple, honest pricing<br />
              for every business
            </h1>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
              Choose the plan that fits your business size. All plans include core POS and business management features.
            </p>
          </Fade>
        </div>
        <HeroWave />
      </section>

      {/* Pricing cards */}
      <section className="pub-section" style={{ padding: '4rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
            {PLANS.map((plan, i) => (
              <Fade key={plan.name} delay={i * 100}>
                <div style={{
                  background: plan.highlight ? c.planCardBg : c.bgCard,
                  border: `1px solid ${plan.highlight ? c.planCardBorder : c.border}`,
                  borderRadius: 20, padding: '2rem', position: 'relative', overflow: 'hidden',
                  boxShadow: plan.highlight
                    ? `0 0 0 1px rgba(59,130,246,0.15), 0 24px 64px rgba(0,0,0,${c.isDark ? '0.4' : '0.08'})`
                    : `0 4px 24px rgba(0,0,0,${c.isDark ? '0.2' : '0.06'})`,
                }}>
                  {plan.highlight && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563eb, #06b6d4)' }} />
                  )}
                  {plan.badge && (
                    <span style={{ position: 'absolute', top: 16, right: 16, padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.25)' }}>
                      {plan.badge}
                    </span>
                  )}

                  <div style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: c.heading, marginBottom: '0.5rem' }}>{plan.name}</h3>
                    <p style={{ fontSize: '0.85rem', color: c.textDim, lineHeight: 1.6 }}>{plan.desc}</p>
                  </div>

                  <div style={{ marginBottom: '2rem', paddingBottom: '2rem', borderBottom: `1px solid ${c.borderSubtle}` }}>
                    <span style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.04em' }}>
                      {formatPrice(plan)}
                    </span>
                    {plan.price > 0 && (
                      <span style={{ fontSize: '0.875rem', color: c.textDim, marginLeft: '0.5rem' }}>/ {plan.period}</span>
                    )}
                  </div>

                  <Link to="/login" style={{
                    display: 'block', textAlign: 'center', padding: '0.75rem',
                    borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', marginBottom: '2rem',
                    ...(plan.ctaStyle === 'gradient'
                      ? { background: 'linear-gradient(135deg, #2563eb, #0891b2)', color: 'white', boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }
                      : { background: 'rgba(59,130,246,0.08)', color: c.accentLink, border: `1px solid ${c.border}` })
                  }}>
                    {plan.cta}
                  </Link>

                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', fontSize: '0.875rem', color: c.textSub }}>
                        <CheckIcon style={{ width: 15, height: 15, color: plan.highlight ? '#3b82f6' : c.textDimmer, flexShrink: 0, marginTop: 2 }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="pub-section-alt" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 800, color: c.heading, letterSpacing: '-0.03em' }}>
              Full feature comparison
            </h2>
          </Fade>
          <Fade>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '1rem 1.25rem', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.textDimmer, borderBottom: `1px solid ${c.border}` }}>
                      Feature
                    </th>
                    {PLANS.map(p => (
                      <th key={p.name} style={{ textAlign: 'center', padding: '1rem', fontSize: '0.875rem', fontWeight: 700, color: p.highlight ? '#60a5fa' : c.textSub, borderBottom: `1px solid ${c.border}`, minWidth: 120 }}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_FEATURES.map((row, i) => (
                    <tr key={row.feature} style={{ background: i % 2 === 0 ? 'transparent' : c.tableRowAlt }}>
                      <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', color: c.textSub, borderBottom: `1px solid ${c.borderMicro}` }}>
                        {row.feature}
                      </td>
                      {[row.starter, row.pro, row.enterprise].map((val, j) => (
                        <td key={j} style={{ padding: '0.875rem', textAlign: 'center', borderBottom: `1px solid ${c.borderMicro}` }}>
                          <FeatureValue val={val} c={c} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Fade>
        </div>
      </section>

      {/* Contact CTA */}
      <section style={{ padding: '5rem 1.5rem', background: 'linear-gradient(351deg, #8380b4 0%, #14122d 55%, #332c3f 100%)', textAlign: 'center' }}>
        <Fade style={{ maxWidth: 520, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, color: '#f0f5ff', letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Need a custom plan?
          </h2>
          <p style={{ fontSize: '1rem', color: 'rgba(187,210,255,0.70)', marginBottom: '2rem' }}>
            Contact our team for volume discounts, custom integrations, or enterprise requirements.
          </p>
          <Link to="/contact" className="pub-gradient-btn pub-btn-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: 14, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}>
            Contact Sales <ArrowRightIcon style={{ width: 18, height: 18 }} />
          </Link>
        </Fade>
      </section>
    </div>
  );
}
