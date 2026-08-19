import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '@hooks/useInView';
import { usePublicTheme, HeroWave } from './ThemeContext';
import { ChevronDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

function Fade({ children, delay = 0, style = {} }) {
  const [ref, inView] = useInView();
  return (
    <div ref={ref} style={{
      opacity: inView ? 1 : 0,
      transform: inView ? 'none' : 'translateY(20px)',
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  );
}

const FAQS = [
  { q: 'What is ProBusinessCloud?', a: 'ProBusinessCloud (PBC) is a comprehensive cloud-based POS and business management platform. It helps businesses manage their point of sale operations, inventory, sales, purchases, customers, employees, and generate business reports — all from one connected system. It is designed for retail stores, wholesale businesses, and service providers of all sizes.' },
  { q: 'Who can use ProBusinessCloud?', a: 'ProBusinessCloud is designed for any business that needs to manage sales and operations: retail stores, supermarkets, pharmacies, electronics shops, clothing stores, wholesale distributors, and more. The platform is suitable for both small businesses with a single employee and larger organizations with multiple departments and users.' },
  { q: 'Is ProBusinessCloud cloud-based?', a: 'Yes, ProBusinessCloud is fully cloud-based. Your data is stored securely in the cloud and can be accessed from any device with a browser — desktop, laptop, or tablet. All team members can work simultaneously in real-time, and your data is always synced across all sessions.' },
  { q: 'How does the login system work?', a: 'Each business gets a unique Company Code when they register. To sign in, users enter their Company Code, email address, and password. The system uses secure JWT-based authentication with automatic session refresh. Your company data is completely isolated from other businesses on the platform.' },
  { q: 'Is inventory managed automatically?', a: 'Yes. When a sale is processed through the POS or saved in the sales module, inventory is automatically deducted from the relevant products. When a purchase is received, stock is automatically added. You can also make manual stock adjustments with reasons for corrections or write-offs. The system tracks every movement.' },
  { q: 'Can different employees have different permissions?', a: 'Absolutely. ProBusinessCloud has a robust role-based access control system. You can create custom roles (e.g., Cashier, Manager, Accountant) and assign specific permissions to each role at the module level. Control exactly who can view, create, edit, or delete in each section. A cashier might only see the POS, while a manager can access reports and inventory.' },
  { q: 'How does backup and restore work?', a: 'ProBusinessCloud includes built-in backup functionality that allows you to export and download your business data. In the Settings section, administrators can initiate a backup at any time. The backup includes all your business data — products, sales, customers, and more. Restore functionality allows you to recover from a backup when needed.' },
  { q: 'Is the system suitable for small and large businesses?', a: 'Yes. ProBusinessCloud is designed to scale with your business. Small businesses can start with basic POS and inventory features, while larger businesses can activate advanced modules like HR, manufacturing, ledger management, and multi-user workflows. The pricing plans reflect different business sizes and needs, and you can upgrade as your business grows.' },
  { q: 'Can I manage multiple users on one account?', a: "Yes. You can add as many users as your plan allows. Each user gets their own login credentials and is assigned a role that controls their access level. You can activate, deactivate, or update users at any time. This makes it easy to onboard new staff and ensure they only see what's relevant to their job." },
  { q: 'What payment methods does the POS support?', a: 'The POS system supports multiple payment methods including cash, card, bank transfer, and store credit. You can also process partial payments and track payment status on each sale. The system accommodates various checkout scenarios and keeps a complete record of every transaction.' },
  { q: 'Does ProBusinessCloud handle returns and exchanges?', a: "Yes. The system includes a complete Returns & Exchanges module. From a sale detail page, authorized users can process returns (with stock restored) or exchanges (where the customer swaps items). The system calculates the refund or additional payment amount and keeps a full audit trail of every return transaction." },
  { q: 'What kind of reports are available?', a: 'ProBusinessCloud provides a comprehensive reports module covering: revenue and profit summaries, top-selling products, category performance, customer purchase history, supplier reports, expense summaries, and inventory status. Reports can be filtered by date range, making it easy to track daily, weekly, monthly, or custom period performance.' },
];

function FAQItem({ item, index }) {
  const { c } = usePublicTheme();
  const [open, setOpen] = useState(false);
  return (
    <Fade delay={index * 40}>
      <div className="faq-item" style={{ padding: '0 0.25rem' }}>
        <button
          onClick={() => setOpen(v => !v)}
          style={{ width: '100%', textAlign: 'left', padding: '1.5rem 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}
        >
          <span style={{ fontSize: '1rem', fontWeight: 600, color: open ? c.accentLink : c.text, lineHeight: 1.4, flex: 1 }}>
            {item.q}
          </span>
          <ChevronDownIcon style={{ width: 18, height: 18, color: open ? '#3b82f6' : c.textDimmer, flexShrink: 0, transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
        {open && (
          <div style={{ paddingBottom: '1.5rem', paddingRight: '2rem' }}>
            <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: c.textDim }}>{item.a}</p>
          </div>
        )}
      </div>
    </Fade>
  );
}

export default function FAQPage() {
  const { c } = usePublicTheme();

  return (
    <div style={{ color: c.text }}>

      {/* Hero */}
      <section className="pub-hero-bg" style={{ padding: '6rem 1.5rem 8rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <Fade>
            <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '1.5rem' }}>
              Frequently Asked Questions
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Everything you want to know<br />
              about ProBusinessCloud
            </h1>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
              Find answers to the most common questions about the platform, features, and how it works for your business.
            </p>
          </Fade>
        </div>
        <HeroWave />
      </section>

      {/* FAQ list */}
      <section className="pub-section" style={{ padding: '4rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, padding: '1rem 2rem' }}>
            {FAQS.map((item, i) => (
              <FAQItem key={i} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section style={{ padding: '5rem 1.5rem', background: c.bgDeep, textAlign: 'center' }}>
        <Fade style={{ maxWidth: 520, margin: '0 auto' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>💬</div>
          <h2 style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2rem)', fontWeight: 800, color: c.heading, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Still have questions?
          </h2>
          <p style={{ fontSize: '1rem', color: c.textDim, marginBottom: '2rem' }}>
            Our team is ready to help. Reach out and we'll get back to you quickly.
          </p>
          <Link to="/contact" className="pub-gradient-btn pub-btn-solid" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.875rem 2rem', borderRadius: 14, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}>
            Contact Us <ArrowRightIcon style={{ width: 18, height: 18 }} />
          </Link>
        </Fade>
      </section>
    </div>
  );
}
