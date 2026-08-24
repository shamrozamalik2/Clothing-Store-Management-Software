import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { motion, useReducedMotion } from 'framer-motion';

import { EASE } from './motion';
import { BUSINESS_TYPES, LOCATION_COUNTS } from '../content';

/* ═══════════════════════════════════════════════════════════════════════════
   Demo request submission
   Posts to the public, rate-limited POST /api/leads endpoint, which validates
   the payload and stores it in the demo_leads table. Field-level errors from
   the server are surfaced back onto the matching inputs.
   ═══════════════════════════════════════════════════════════════════════════ */
async function submitDemoRequest(values) {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: values.name,
      business: values.business,
      email: values.email,
      phone: values.phone,
      type: values.type,
      locations: values.locations,
      message: values.message,
      consent: values.consent === true,
      company_website: values.company_website || '',
    }),
  });

  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON error page */ }

  if (!res.ok) {
    const err = new Error((payload && payload.message) || 'We could not send that just now.');
    err.fieldErrors = (payload && payload.errors) || [];
    err.status = res.status;
    throw err;
  }
  return payload;
}

/* ── Field ────────────────────────────────────────────────────────────────── */
function Field({ label, name, error, hint, required, children }) {
  const errorId = `${name}-error`;
  const hintId = `${name}-hint`;

  return (
    <div>
      <label
        htmlFor={name}
        style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--on-ink)', marginBottom: '0.4375rem' }}
      >
        {label}
        {required && <span style={{ color: 'var(--accent-hi)', marginLeft: 3 }} aria-hidden="true">*</span>}
        {!required && <span style={{ color: 'var(--on-ink-soft)', fontWeight: 400, marginLeft: 6 }}>Optional</span>}
      </label>

      {children({ errorId, hintId })}

      {hint && !error && (
        <p id={hintId} className="pbc-meta" style={{ color: 'var(--on-ink-soft)', margin: '0.375rem 0 0' }}>
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="pbc-meta"
          style={{ color: 'var(--signal-hi)', margin: '0.375rem 0 0', display: 'flex', alignItems: 'center', gap: '0.3125rem' }}
        >
          <ExclamationCircleIcon aria-hidden="true" style={{ width: 13, height: 13, flexShrink: 0 }} />
          {error}
        </p>
      )}
    </div>
  );
}

const controlStyle = (invalid) => ({
  width: '100%',
  background: 'var(--accent-wash)',
  border: `1px solid ${invalid ? 'rgba(240,131,121,0.65)' : 'var(--on-ink-line)'}`,
  borderRadius: 'var(--r)',
  padding: '0.6875rem 0.875rem',
  /* Must not drop below 16px: iOS Safari zooms the whole page in when a
     focused control's text is smaller, and never zooms back out. */
  fontSize: '1rem',
  color: 'var(--on-ink)',
  fontFamily: 'inherit',
  outline: 'none',
});

/* ── Form ─────────────────────────────────────────────────────────────────── */
export default function DemoForm() {
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState('');
  const reduce = useReducedMotion();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '', business: '', email: '', phone: '',
      type: '', locations: '', message: '', consent: false,
      company_website: '',
    },
  });

  const onSubmit = async (values) => {
    setFailed('');
    try {
      await submitDemoRequest(values);
      setSent(true);
    } catch (err) {
      const fieldErrors = err.fieldErrors || [];
      if (fieldErrors.length) {
        fieldErrors.forEach((f) => {
          if (f.field) setError(f.field, { type: 'server', message: f.message });
        });
        setFailed('Please check the highlighted fields.');
      } else {
        setFailed(err.message || 'We could not send that just now. Please try again, or email us directly.');
      }
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE }}
        role="status"
        className="pbc-card-ink"
        style={{ padding: 'var(--s6)', textAlign: 'center' }}
      >
        <CheckCircleIcon aria-hidden="true" style={{ width: 40, height: 40, color: 'var(--sage-hi)', margin: '0 auto' }} />
        <h3 className="pbc-display pbc-h3" style={{ margin: 'var(--s3) 0 0', color: 'var(--on-ink)' }}>
          Request received
        </h3>
        <p className="pbc-body" style={{ color: 'var(--on-ink-mute)', marginTop: 'var(--s2)', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
          Thank you. We will be in touch to arrange a walkthrough of ProBusinessCloud
          built around how your business actually runs.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="pbc-btn pbc-btn-ghost-ink"
          style={{ marginTop: 'var(--s4)' }}
        >
          Send another request
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="pbc-card-ink" style={{ padding: 'var(--s5)' }}>
      <div style={{ display: 'grid', gap: 'var(--s3)' }}>

        <div className="pbc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
          <Field label="Your name" name="name" required error={errors.name?.message}>
            {({ errorId }) => (
              <input
                id="name"
                type="text"
                autoComplete="name"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? errorId : undefined}
                style={controlStyle(!!errors.name)}
                {...register('name', { required: 'Please tell us your name.' })}
              />
            )}
          </Field>

          <Field label="Business name" name="business" required error={errors.business?.message}>
            {({ errorId }) => (
              <input
                id="business"
                type="text"
                autoComplete="organization"
                aria-invalid={!!errors.business}
                aria-describedby={errors.business ? errorId : undefined}
                style={controlStyle(!!errors.business)}
                {...register('business', { required: 'Please tell us your business name.' })}
              />
            )}
          </Field>
        </div>

        <div className="pbc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
          <Field label="Work email" name="email" required error={errors.email?.message} hint="We will send the invitation here.">
            {({ errorId, hintId }) => (
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? errorId : hintId}
                style={controlStyle(!!errors.email)}
                {...register('email', {
                  required: 'Please enter a work email address.',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'That does not look like a valid email address.' },
                })}
              />
            )}
          </Field>

          <Field label="Phone" name="phone" error={errors.phone?.message} hint="If you would rather we call.">
            {({ errorId, hintId }) => (
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? errorId : hintId}
                style={controlStyle(!!errors.phone)}
                {...register('phone')}
              />
            )}
          </Field>
        </div>

        <div className="pbc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s3)' }}>
          <Field label="Business type" name="type" required error={errors.type?.message}>
            {({ errorId }) => (
              <select
                id="type"
                aria-invalid={!!errors.type}
                aria-describedby={errors.type ? errorId : undefined}
                style={controlStyle(!!errors.type)}
                {...register('type', { required: 'Please choose the closest match.' })}
              >
                <option value="">Select…</option>
                {BUSINESS_TYPES.map((t) => (
                  <option key={t} value={t} style={{ color: '#0B1020' }}>{t}</option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Locations" name="locations" required error={errors.locations?.message}>
            {({ errorId }) => (
              <select
                id="locations"
                aria-invalid={!!errors.locations}
                aria-describedby={errors.locations ? errorId : undefined}
                style={controlStyle(!!errors.locations)}
                {...register('locations', { required: 'Please choose a range.' })}
              >
                <option value="">Select…</option>
                {LOCATION_COUNTS.map((t) => (
                  <option key={t} value={t} style={{ color: '#0B1020' }}>{t}</option>
                ))}
              </select>
            )}
          </Field>
        </div>

        <Field
          label="What would you like to see?"
          name="message"
          error={errors.message?.message}
          hint="Tell us what is hardest about running your business today, and we will focus the walkthrough there."
        >
          {({ errorId, hintId }) => (
            <textarea
              id="message"
              rows={4}
              aria-describedby={errors.message ? errorId : hintId}
              style={{ ...controlStyle(false), resize: 'vertical' }}
              {...register('message')}
            />
          )}
        </Field>

        {/* Honeypot — hidden from people, attractive to bots. */}
        <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
          <label htmlFor="company_website">Do not fill this in</label>
          <input id="company_website" type="text" tabIndex={-1} autoComplete="off" {...register('company_website')} />
        </div>

        {/* Consent */}
        <div>
          <label htmlFor="consent" style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              id="consent"
              type="checkbox"
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? 'consent-error' : undefined}
              style={{ marginTop: 2, width: 20, height: 20, accentColor: 'var(--accent)', flexShrink: 0 }}
              {...register('consent', { required: 'Please confirm before sending.' })}
            />
            <span className="pbc-meta" style={{ color: 'var(--on-ink-mute)' }}>
              I agree to be contacted about ProBusinessCloud. We will use these details only to
              arrange your demo and answer your questions.
            </span>
          </label>
          {errors.consent && (
            <p id="consent-error" role="alert" className="pbc-meta" style={{ color: 'var(--signal-hi)', margin: '0.375rem 0 0 1.625rem' }}>
              {errors.consent.message}
            </p>
          )}
        </div>

        {failed && (
          <p role="alert" className="pbc-body" style={{ color: 'var(--signal-hi)', margin: 0 }}>
            {failed}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="pbc-btn pbc-btn-primary"
          style={{ width: '100%', opacity: isSubmitting ? 0.6 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}
        >
          {isSubmitting ? 'Sending…' : 'Book a demo'}
        </button>

        <p className="pbc-meta" style={{ color: 'var(--on-ink-soft)', margin: 0, textAlign: 'center' }}>
          Fields marked <span aria-hidden="true">*</span><span className="sr-only">with an asterisk</span> are required.
        </p>
      </div>
    </form>
  );
}
