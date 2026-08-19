import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuth } from '@store/slices/authSlice';
import { useInView } from '@hooks/useInView';
import { usePublicTheme, HeroWave } from './ThemeContext';
import {
  BoltIcon, CubeIcon, ChartBarIcon, UsersIcon, CloudIcon,
  ShoppingCartIcon, CurrencyDollarIcon, ShieldCheckIcon,
  ArrowRightIcon, CheckIcon,
} from '@heroicons/react/24/outline';

function Fade({ children, delay = 0, style = {}, className = '' }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} className={className} style={{
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
  { icon: CurrencyDollarIcon, title: 'Point of Sale', desc: 'Fast, intuitive billing system. Process sales, manage cart, apply discounts and print receipts instantly.' },
  { icon: CubeIcon,           title: 'Smart Inventory', desc: 'Real-time stock tracking across all products. Get alerts on low stock and manage adjustments effortlessly.' },
  { icon: ShoppingCartIcon,   title: 'Sales & Purchases', desc: 'Complete transaction management. Track every sale and purchase with full history and status tracking.' },
  { icon: ChartBarIcon,       title: 'Business Reports', desc: 'Detailed analytics and reports. Understand revenue trends, top products, and business performance.' },
  { icon: UsersIcon,          title: 'Roles & Access', desc: 'Fine-grained user permissions. Control exactly what each employee can see and do in the system.' },
  { icon: CloudIcon,          title: 'Secure Cloud', desc: 'Your data is always safe. Automatic backups, encrypted storage and reliable cloud access anywhere.' },
];

const SPOTLIGHTS = [
  {
    icon: BoltIcon, color: '#3b82f6', rgb: '59,130,246',
    label: 'POS & Billing', title: 'Blazing Fast Point of Sale',
    desc: 'Process transactions in seconds. Search products, apply discounts, manage cart quantities, select payment methods and print receipts — all from one clean screen.',
    points: ['Barcode & name product search', 'Multiple payment methods', 'Discount & tax management', 'Instant receipt printing', 'Hold & resume transactions'],
    reverse: false,
  },
  {
    icon: CubeIcon, color: '#06b6d4', rgb: '6,182,212',
    label: 'Inventory Management', title: 'Real-Time Stock Control',
    desc: 'Never run out of stock unexpectedly. Track inventory automatically as sales and purchases happen. Add adjustments, set categories and manage your entire product catalog.',
    points: ['Automatic stock deduction on sales', 'Stock adjustment with reasons', 'Category & brand management', 'Product variants support', 'Low stock visibility'],
    reverse: true,
  },
  {
    icon: ShieldCheckIcon, color: '#8b5cf6', rgb: '139,92,246',
    label: 'Roles & Permissions', title: 'Granular Access Control',
    desc: "Define exactly what each team member can access. Admins get full control while cashiers only see the POS. Create custom roles to match your business's exact structure.",
    points: ['Admin, cashier, and custom roles', 'Module-level permissions', 'Create & edit actions control', 'Role-based navigation', 'Instant permission updates'],
    reverse: false,
  },
  {
    icon: ChartBarIcon, color: '#10b981', rgb: '16,185,129',
    label: 'Analytics & Reports', title: 'Insights That Drive Growth',
    desc: 'Comprehensive business intelligence built in. Track revenue, monitor top-selling products, analyze expenses, and export data for deeper analysis.',
    points: ['Daily, weekly, monthly revenue', 'Top products & categories', 'Customer & supplier reports', 'Expense summaries', 'Profit & loss overview'],
    reverse: true,
  },
];

const STATS = [
  { value: '500+', label: 'Businesses Powered' },
  { value: '99.9%', label: 'Uptime Reliability' },
  { value: '12+', label: 'Core Modules' },
  { value: '24/7', label: 'Cloud Access' },
];

export default function HomePage() {
  const { c } = usePublicTheme();
  const isAuth = useSelector(selectIsAuth);

  return (
    <div style={{ color: c.text }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section className="pub-hero-bg" style={{ padding: '7rem 1.5rem 8rem', minHeight: '92vh', display: 'flex', alignItems: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 80, right: '8%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)', pointerEvents: 'none', animation: 'pub-glow 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', pointerEvents: 'none', animation: 'pub-glow 16s ease-in-out infinite 4s' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', position: 'relative' }}>
          <div style={{ maxWidth: 760 }}>

            <div style={{ animation: 'pub-fade-up 0.6s ease both' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.375rem 1rem', borderRadius: 999,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                fontSize: '0.8rem', fontWeight: 600, color: 'rgba(255,255,255,0.95)', marginBottom: '1.75rem',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', animation: 'pub-glow 2s ease-in-out infinite', display: 'inline-block' }} />
                Complete Business Management Platform
              </span>
            </div>

            <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.25rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-0.03em', color: '#ffffff', marginBottom: '1.5rem', animation: 'pub-fade-up 0.6s ease 0.1s both' }}>
              Power Your Business<br />
              with <span style={{ opacity: 0.9 }}>ProBusinessCloud</span>
            </h1>

            <p style={{ fontSize: 'clamp(1rem, 2vw, 1.2rem)', lineHeight: 1.75, color: 'rgba(255,255,255,0.75)', maxWidth: 600, marginBottom: '2.5rem', animation: 'pub-fade-up 0.6s ease 0.2s both' }}>
              The complete cloud-based POS and business management system. Manage sales, inventory, products, customers, billing and all your business operations — in one professional platform.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', animation: 'pub-fade-up 0.6s ease 0.3s both' }}>
              <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: 50, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', background: 'white', color: '#4f46e5', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', transition: 'all 0.2s' }}>
                {isAuth ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRightIcon style={{ width: 18, height: 18 }} />
              </Link>
              <Link to="/features" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: 50, fontWeight: 600, fontSize: '1rem', textDecoration: 'none', color: 'white', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.1)', transition: 'all 0.2s' }}>
                Explore Features
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '3rem', flexWrap: 'wrap', animation: 'pub-fade-up 0.6s ease 0.4s both' }}>
              {['No Setup Fee', 'Cloud-Based', 'Multi-User', 'Secure & Reliable'].map(t => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                  <CheckIcon style={{ width: 14, height: 14, color: 'rgba(255,255,255,0.8)' }} />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <HeroWave />
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────────── */}
      <section style={{ background: c.bgDeep, borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}`, padding: '2.5rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '2rem' }}>
          {STATS.map((s, i) => (
            <Fade key={s.label} delay={i * 80} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1 }}>
                <span className="pub-gradient-text">{s.value}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: c.textDimmer, marginTop: '0.5rem', fontWeight: 500 }}>{s.label}</div>
            </Fade>
          ))}
        </div>
      </section>

      {/* ── Feature grid ──────────────────────────────────────────────────────── */}
      <section className="pub-section" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3b82f6', marginBottom: '0.75rem' }}>Everything you need</p>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.75rem)', fontWeight: 800, color: c.heading, letterSpacing: '-0.03em' }}>
              Built for every part of your business
            </h2>
            <p style={{ marginTop: '1rem', fontSize: '1rem', color: c.textDim, maxWidth: 520, margin: '1rem auto 0' }}>
              From the storefront to the back office — ProBusinessCloud handles it all in one connected system.
            </p>
          </Fade>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Fade key={f.title} delay={i * 60}>
                  <div className="pub-card" style={{ padding: '1.75rem' }}>
                    <div className="pub-icon-wrap" style={{ marginBottom: '1.25rem' }}>
                      <Icon style={{ width: 22, height: 22, color: '#60a5fa' }} />
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: c.heading, marginBottom: '0.5rem' }}>{f.title}</h3>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: c.textDim }}>{f.desc}</p>
                  </div>
                </Fade>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature spotlights ────────────────────────────────────────────────── */}
      {SPOTLIGHTS.map((s, idx) => {
        const Icon = s.icon;
        return (
          <section key={s.label} className={idx % 2 === 0 ? 'pub-section-alt' : 'pub-section'} style={{ padding: '6rem 1.5rem' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap', flexDirection: s.reverse ? 'row-reverse' : 'row' }}>

                <Fade style={{ flex: '1 1 340px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.875rem', borderRadius: 999, background: `rgba(${s.rgb},0.12)`, border: `1px solid rgba(${s.rgb},0.25)`, fontSize: '0.78rem', fontWeight: 700, color: s.color, marginBottom: '1.25rem' }}>
                    <Icon style={{ width: 14, height: 14 }} />
                    {s.label}
                  </span>
                  <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 800, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
                    {s.title}
                  </h2>
                  <p style={{ fontSize: '1rem', lineHeight: 1.75, color: c.textDim, marginBottom: '1.75rem' }}>{s.desc}</p>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {s.points.map(pt => (
                      <li key={pt} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', fontSize: '0.9rem', color: c.textSub }}>
                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: `rgba(${s.rgb},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <CheckIcon style={{ width: 11, height: 11, color: s.color }} />
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </Fade>

                <Fade delay={120} style={{ flex: '1 1 320px' }}>
                  <div style={{ background: c.bgCardSpotlight, border: `1px solid rgba(${s.rgb},0.15)`, borderRadius: 20, padding: '2rem', boxShadow: `0 32px 64px rgba(0,0,0,${c.isDark ? '0.4' : '0.08'}), 0 0 80px rgba(${s.rgb},0.05)` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `rgba(${s.rgb},0.15)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon style={{ width: 20, height: 20, color: s.color }} />
                      </div>
                      <span style={{ fontWeight: 700, color: c.heading, fontSize: '0.9rem' }}>{s.label}</span>
                    </div>
                    {s.points.map((pt, pi) => (
                      <div key={pi} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 10, marginBottom: '0.5rem', background: pi === 0 ? `rgba(${s.rgb},0.08)` : 'transparent' }}>
                        <CheckIcon style={{ width: 14, height: 14, color: s.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.825rem', color: pi === 0 ? c.text : c.textDim }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </Fade>
              </div>
            </div>
          </section>
        );
      })}

      {/* ── CTA Section ───────────────────────────────────────────────────────── */}
      <section style={{ padding: '7rem 1.5rem', background: c.bgDeep, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(37,99,235,0.12) 0%, transparent 70%)' }} />
        <Fade style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
            Ready to transform<br />your business?
          </h2>
          <p style={{ fontSize: '1.05rem', lineHeight: 1.7, color: c.textDim, marginBottom: '2.5rem' }}>
            Join hundreds of businesses already using ProBusinessCloud to streamline their operations and grow faster.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="pub-gradient-btn pub-btn-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2.25rem', borderRadius: 14, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 32px rgba(37,99,235,0.4)' }}>
              Get Started Free
              <ArrowRightIcon style={{ width: 18, height: 18 }} />
            </Link>
            <Link to="/contact" className="pub-btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2.25rem', borderRadius: 14, fontWeight: 600, fontSize: '1rem', textDecoration: 'none', color: c.accentLink, border: `1px solid ${c.border}`, background: 'rgba(59,130,246,0.06)', transition: 'all 0.2s' }}>
              Contact Sales
            </Link>
          </div>
        </Fade>
      </section>
    </div>
  );
}
