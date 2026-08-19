import { useState } from 'react';
import { useInView } from '@hooks/useInView';
import { usePublicTheme, HeroWave } from './ThemeContext';
import { EnvelopeIcon, PhoneIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';

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

const SUBJECTS = ['General Inquiry', 'Sales & Pricing', 'Technical Support', 'Feature Request', 'Partnership', 'Other'];
const CONTACT_INFO = [
  { icon: EnvelopeIcon, label: 'Email',         value: 'support@probusinesscloud.com', sub: 'We reply within 24 hours' },
  { icon: PhoneIcon,    label: 'Phone',         value: '+92 300 0000000',              sub: 'Mon–Sat, 9am–6pm' },
  { icon: MapPinIcon,   label: 'Location',      value: 'Pakistan',                     sub: 'Serving businesses globally' },
  { icon: ClockIcon,    label: 'Support Hours', value: 'Mon–Sat',                      sub: '9:00 AM – 6:00 PM PKT' },
];

function FormField({ label, required, c, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: c.textDim, marginBottom: '0.5rem' }}>
        {label}{required && <span style={{ color: '#3b82f6', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export default function ContactPage() {
  const { c, isDark } = usePublicTheme();
  const [form, setForm]         = useState({ name: '', email: '', phone: '', subject: SUBJECTS[0], message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending]   = useState(false);

  function handleChange(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

  function handleSubmit(e) {
    e.preventDefault();
    setSending(true);
    setTimeout(() => { setSending(false); setSubmitted(true); setForm({ name: '', email: '', phone: '', subject: SUBJECTS[0], message: '' }); }, 1200);
  }

  return (
    <div style={{ color: c.text }}>

      {/* Hero */}
      <section className="pub-hero-bg" style={{ padding: '6rem 1.5rem 8rem', textAlign: 'center', position: 'relative' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <Fade>
            <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: 999, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.95)', marginBottom: '1.5rem' }}>
              Contact Us
            </span>
            <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.25rem)', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
              Let's talk about<br />
              your business
            </h1>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.75)' }}>
              Have questions about ProBusinessCloud? Ready to get started? Our team is here to help.
            </p>
          </Fade>
        </div>
        <HeroWave />
      </section>

      {/* Content */}
      <section className="pub-section" style={{ padding: '4rem 1.5rem 6rem' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'start' }}>

          {/* Contact info */}
          <Fade style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: c.heading, marginBottom: '0.75rem' }}>Get in touch</h2>
              <p style={{ fontSize: '0.925rem', lineHeight: 1.8, color: c.textDim }}>
                Whether you're interested in getting started, have questions about features, or need technical support — reach out and we'll respond quickly.
              </p>
            </div>

            {CONTACT_INFO.map(item => {
              const Icon = item.icon;
              return (
                <div key={item.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon style={{ width: 20, height: 20, color: '#60a5fa' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: c.textDimmer, marginBottom: '0.25rem' }}>{item.label}</p>
                    <p style={{ fontSize: '0.925rem', fontWeight: 600, color: c.heading }}>{item.value}</p>
                    <p style={{ fontSize: '0.8rem', color: c.textDimmer }}>{item.sub}</p>
                  </div>
                </div>
              );
            })}

            <div>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: c.textDimmer, marginBottom: '0.875rem' }}>Follow Us</p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {[{ label: '𝕏 Twitter' }, { label: 'LinkedIn' }, { label: 'Facebook' }].map(s => (
                  <span key={s.label} style={{ padding: '0.4rem 0.875rem', borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)', border: `1px solid ${c.border}`, color: c.textDim, cursor: 'pointer' }}>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </Fade>

          {/* Form */}
          <Fade delay={100}>
            <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 20, padding: '2.25rem' }}>
              {submitted ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: c.heading, marginBottom: '0.75rem' }}>Message Sent!</h3>
                  <p style={{ fontSize: '0.925rem', color: c.textDim, lineHeight: 1.7 }}>
                    Thank you for reaching out. Our team will get back to you within 24 hours.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    style={{ marginTop: '1.5rem', padding: '0.625rem 1.5rem', borderRadius: 10, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', border: `1px solid ${c.border}`, background: 'rgba(59,130,246,0.08)', color: c.accentLink }}
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: c.heading, marginBottom: '0.5rem' }}>Send us a message</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <FormField label="Full Name" required c={c}>
                      <input name="name" value={form.name} onChange={handleChange} required placeholder="Your name" className="pub-input" />
                    </FormField>
                    <FormField label="Email Address" required c={c}>
                      <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="you@company.com" className="pub-input" />
                    </FormField>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <FormField label="Phone Number" c={c}>
                      <input name="phone" value={form.phone} onChange={handleChange} placeholder="+92 300 0000000" className="pub-input" />
                    </FormField>
                    <FormField label="Subject" required c={c}>
                      <select name="subject" value={form.subject} onChange={handleChange} className="pub-input" style={{ appearance: 'none', cursor: 'pointer' }}>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Message" required c={c}>
                    <textarea name="message" value={form.message} onChange={handleChange} required placeholder="Tell us about your business and what you're looking for..." rows={5} className="pub-input" style={{ resize: 'vertical', minHeight: 120 }} />
                  </FormField>

                  <button type="submit" disabled={sending} className="pub-gradient-btn pub-btn-solid" style={{ padding: '0.875rem', borderRadius: 12, fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? 0.7 : 1, width: '100%' }}>
                    {sending ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          </Fade>
        </div>
      </section>
    </div>
  );
}
