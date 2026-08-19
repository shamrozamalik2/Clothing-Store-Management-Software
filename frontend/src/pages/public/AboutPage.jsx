import { Link } from 'react-router-dom';
import { useInView } from '@hooks/useInView';
import { usePublicTheme, HeroWave } from './ThemeContext';
import { LightBulbIcon, RocketLaunchIcon, ShieldCheckIcon, HeartIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

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

const VALUES = [
  { icon: LightBulbIcon,    color: '#f59e0b', rgb: '245,158,11',  title: 'Simplicity First',   desc: 'We believe powerful software should be easy to use. Every feature is designed to be intuitive and accessible for any business owner.' },
  { icon: RocketLaunchIcon, color: '#3b82f6', rgb: '59,130,246',  title: 'Built for Growth',   desc: 'ProBusinessCloud scales with your business. Whether you have 1 or 100 employees, the platform adapts to your needs.' },
  { icon: ShieldCheckIcon,  color: '#10b981', rgb: '16,185,129',  title: 'Security & Trust',   desc: 'Your business data is sacred. We use industry-standard encryption and backups to keep your information safe at all times.' },
  { icon: HeartIcon,        color: '#f472b6', rgb: '244,114,182', title: 'Customer Focused',   desc: 'Every feature we build starts with a real business need. We listen to our customers and build the tools they actually need.' },
];

const REASONS = [
  { title: 'All-in-One Solution',       desc: 'No more juggling between different software tools. POS, inventory, sales, HR and reports — all connected in one platform.' },
  { title: 'Cloud-Based Access',        desc: 'Access your business from anywhere. Use it on desktop, laptop, or tablet — your data is always in sync.' },
  { title: 'Role-Based Security',       desc: 'Control who sees what. Cashiers see the POS, managers see reports, admins control everything. Proper access control out of the box.' },
  { title: 'No Technical Skills Needed',desc: 'Designed for business owners and staff — not IT teams. Get started quickly with a clean, intuitive interface.' },
  { title: 'Automatic Backups',         desc: 'Never lose your data. ProBusinessCloud automatically backs up your business data with easy restore options.' },
  { title: 'Multi-User Support',        desc: 'Add all your team members. Assign roles and permissions so everyone has exactly the access they need.' },
];

export default function AboutPage() {
  const { c } = usePublicTheme();

  return (
    <div style={{ color: c.text }}>

      {/* Hero */}
      <section className="pub-hero-bg" style={{ padding: '6rem 1.5rem 8rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <Fade>
            <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '1.5rem' }}>
              About ProBusinessCloud
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Built to power the businesses<br />
              of tomorrow
            </h1>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
              ProBusinessCloud is a comprehensive cloud-based business management platform that helps businesses of all sizes manage their operations efficiently and grow with confidence.
            </p>
          </Fade>
        </div>
        <HeroWave />
      </section>

      {/* What is PBC */}
      <section className="pub-section" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: '5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Fade style={{ flex: '1 1 340px' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#3b82f6', marginBottom: '1rem' }}>What is PBC?</p>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.5rem)', fontWeight: 800, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Your complete business command center
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: c.textDim, marginBottom: '1rem' }}>
              ProBusinessCloud (PBC) is a cloud-based POS and business management software designed specifically for retail, wholesale, and service businesses. It brings together every tool you need to run a modern business.
            </p>
            <p style={{ fontSize: '1rem', lineHeight: 1.8, color: c.textDim }}>
              From the moment a customer walks in to the end-of-month report, PBC handles every step: sales, inventory, purchasing, customer management, staff access, and financial reporting — all in one connected, easy-to-use platform.
            </p>
          </Fade>
          <Fade delay={120} style={{ flex: '1 1 320px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {['POS & Billing', 'Inventory', 'Sales & Purchases', 'Customer Management', 'HR & Payroll', 'Business Reports'].map(item => (
                <div key={item} className="pub-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: c.textSub }}>{item}</span>
                </div>
              ))}
            </div>
          </Fade>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="pub-section-alt" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <Fade>
              <div className="pub-card" style={{ padding: '2.5rem', height: '100%' }}>
                <div style={{ marginBottom: '1.25rem' }}><span style={{ fontSize: '2rem' }}>🎯</span></div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: c.heading, marginBottom: '1rem' }}>Our Mission</h3>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: c.textDim }}>
                  To empower businesses with modern, affordable, and powerful software tools that were once only available to large enterprises. We make enterprise-grade business management accessible to everyone.
                </p>
              </div>
            </Fade>
            <Fade delay={100}>
              <div className="pub-card" style={{ padding: '2.5rem', height: '100%' }}>
                <div style={{ marginBottom: '1.25rem' }}><span style={{ fontSize: '2rem' }}>🔭</span></div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: c.heading, marginBottom: '1rem' }}>Our Vision</h3>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.8, color: c.textDim }}>
                  A world where every business, regardless of size, has access to the tools they need to operate efficiently, make data-driven decisions, and compete in an increasingly digital marketplace.
                </p>
              </div>
            </Fade>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="pub-section" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: c.heading, letterSpacing: '-0.03em' }}>
              What we stand for
            </h2>
          </Fade>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {VALUES.map((v, i) => {
              const Icon = v.icon;
              return (
                <Fade key={v.title} delay={i * 80}>
                  <div className="pub-card" style={{ padding: '1.75rem' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `rgba(${v.rgb},0.12)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                      <Icon style={{ width: 22, height: 22, color: v.color }} />
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: c.heading, marginBottom: '0.5rem' }}>{v.title}</h3>
                    <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: c.textDim }}>{v.desc}</p>
                  </div>
                </Fade>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why choose PBC */}
      <section className="pub-section-alt" style={{ padding: '6rem 1.5rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Fade style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, color: c.heading, letterSpacing: '-0.03em' }}>
              Why businesses choose ProBusinessCloud
            </h2>
          </Fade>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {REASONS.map((r, i) => (
              <Fade key={r.title} delay={i * 60}>
                <div className="pub-card" style={{ padding: '1.75rem' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', fontWeight: 800, fontSize: '0.9rem', color: '#3b82f6' }}>
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: c.heading, marginBottom: '0.5rem' }}>{r.title}</h3>
                  <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: c.textDim }}>{r.desc}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '6rem 1.5rem', background: c.bgDeep, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(37,99,235,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Fade style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 900, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
            Start managing your business smarter
          </h2>
          <p style={{ fontSize: '1rem', lineHeight: 1.7, color: c.textDim, marginBottom: '2rem' }}>
            Get access to the full platform and see how ProBusinessCloud can transform your operations.
          </p>
          <Link to="/login" className="pub-gradient-btn pub-btn-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: 14, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}>
            Get Started <ArrowRightIcon style={{ width: 18, height: 18 }} />
          </Link>
        </Fade>
      </section>
    </div>
  );
}
