import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  EyeIcon, EyeSlashIcon, EnvelopeIcon,
  LockClosedIcon, BuildingOffice2Icon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { authApi } from '@api/auth.api';
import { setCredentials, selectIsAuth } from '@store/slices/authSlice';
import Logo from '@components/ui/Logo';
import { gsap, useGSAP, prefersReducedMotion } from './components/gsapSetup';

/* The public site's design system. Importing it — rather than re-typing the
   palette — is what keeps this page on the site's colours: the grounds, the
   one blue accent, the radii and the pill button all come from the same
   tokens the marketing pages use, and follow them if they ever change.
   Everything in that sheet is scoped to `.pbc`, so it cannot reach the
   authenticated app shell rendered by the same bundle. */
import './site.css';

/* The site's shared easing curve. */
const EASE = [0.22, 1, 0.36, 1];

const FEATURES = [
  'Point of Sale & Billing',
  'Real-time Inventory Tracking',
  'Sales & Purchase Management',
  'Multi-user Role Permissions',
  'Business Reports & Analytics',
  'Secure Cloud Data Backup',
];

export default function PublicLoginPage() {
  const dispatch   = useDispatch();
  const navigate   = useNavigate();
  const isAuth     = useSelector(selectIsAuth);
  const [showPwd, setShowPwd]           = useState(false);
  const [suspendedMsg, setSuspendedMsg] = useState('');
  const scope  = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (isAuth) navigate('/dashboard', { replace: true });
    const msg = sessionStorage.getItem('login_error');
    if (msg) { setSuspendedMsg(msg); sessionStorage.removeItem('login_error'); }
  }, [isAuth]);

  const savedSlug = localStorage.getItem('sas_company_slug') || '';

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { company_slug: savedSlug, email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: (creds) => {
      localStorage.setItem('sas_company_slug', creds.company_slug.trim());
      return authApi.login({ ...creds, company_slug: creds.company_slug.trim() });
    },
    onSuccess: (data) => {
      dispatch(setCredentials(data.data));
      toast.success(`Welcome back, ${data.data.user.name}!`);
      navigate('/dashboard', { replace: true });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Sign in failed. Please check your credentials.');
    },
  });

  /* ── GSAP: the brand side and the ambient light ────────────────────────────
     Written as `from` tweens, so the resting state is the plain DOM. If this
     never runs — reduced motion, a script failure — the panel is already on
     screen and readable rather than stuck at opacity zero. */
  useGSAP(
    () => {
      if (prefersReducedMotion() || !scope.current) return;

      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.pl-logo', { opacity: 0, y: -12, duration: 0.6 })
        /* Each headline line rises out of its own clipping band. */
        .from('.pl-line > span', { yPercent: 115, duration: 0.85, stagger: 0.1 }, '-=0.35')
        .from('.pl-lede', { opacity: 0, y: 14, duration: 0.6 }, '-=0.45')
        .from('.pl-feat', { opacity: 0, x: -14, duration: 0.5, stagger: 0.07 }, '-=0.3')
        .from('.pl-legal', { opacity: 0, duration: 0.5 }, '-=0.2');

      /* The washes breathe on their own clocks. Matching durations would make
         the whole background pulse in unison, which reads as a loading state
         rather than as light. */
      const drift = (target, scale, duration, delay) =>
        gsap.to(target, { scale, duration, delay, ease: 'sine.inOut', repeat: -1, yoyo: true });

      drift('.pl-wash-a', 1.14, 7.0, 0);
      drift('.pl-wash-b', 1.09, 9.0, 1.2);
      drift('.pl-wash-c', 1.12, 8.0, 0.6);
    },
    { scope }
  );

  /* ── Framer: the form side ──────────────────────────────────────────────── */
  const stack = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: reduce ? 0 : 0.15 } },
  };
  const rise = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: reduce ? 0.25 : 0.5, ease: EASE } },
  };

  return (
    <div
      ref={scope}
      className="pbc"
      style={{ minHeight: '100vh', display: 'flex', background: 'var(--white)' }}
    >
      <style>{`
        .pl-field {
          width: 100%;
          padding: 0.8125rem 1rem 0.8125rem 2.75rem;
          border-radius: var(--r);
          /* Never below 16px: iOS Safari zooms the page in on a focused
             control with smaller text, and does not zoom back out. */
          font-size: 1rem;
          font-family: inherit;
          font-weight: 300;
          color: var(--on-paper);
          background: var(--white);
          border: 1px solid var(--on-paper-line);
          outline: none;
          transition: border-color 0.2s var(--ease), box-shadow 0.2s var(--ease), background-color 0.2s var(--ease);
        }
        .pl-field::placeholder { color: var(--on-paper-soft); }
        .pl-field:focus {
          border-color: var(--accent);
          background: var(--white);
          box-shadow: 0 0 0 3px var(--accent-wash);
        }
        .pl-field.error { border-color: var(--signal); }
        .pl-field.error:focus { box-shadow: 0 0 0 3px rgba(210,69,58,0.10); }

        /* A line of text rising out of a band. The band is grown and pulled
           back so it does not shave the descenders off "g" and "y". */
        .pl-line {
          display: block; overflow: hidden;
          padding-bottom: 0.14em; margin-bottom: -0.14em;
        }
        .pl-line > span { display: inline-block; }

        .pl-eye {
          position: absolute; right: 0.4375rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--on-paper-soft);
          display: grid; place-items: center;
          width: 38px; height: 38px; border-radius: var(--r-sm);
          transition: color 0.2s var(--ease), background-color 0.2s var(--ease);
        }
        .pl-eye:hover { color: var(--accent); background: var(--accent-wash); }

        .pl-back { color: var(--on-paper-mute); transition: color 0.2s var(--ease); }
        .pl-back:hover { color: var(--accent); }

        /* The brand panel is the site's tinted band; it collapses below the
           two-column breakpoint, where the form takes the full width. */
        .pl-brand { display: none; }
        @media (min-width: 1024px) {
          .pl-brand { display: flex; }
          .pl-mobile-logo { display: none !important; }
        }
      `}</style>

      {/* ── Brand panel ── */}
      <div
        className="pl-brand"
        style={{
          flex: '0 0 46%', maxWidth: 560, flexDirection: 'column',
          justifyContent: 'space-between', padding: 'var(--s6)',
          background: 'var(--surface)',
          borderRight: '1px solid var(--on-paper-line)',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Soft tinted washes — the same two the marketing hero uses. */}
        <div
          aria-hidden="true"
          className="pl-wash-a"
          style={{
            position: 'absolute', top: '-22%', right: '-18%',
            width: 460, height: 460, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(44,107,245,0.16) 0%, transparent 64%)',
            pointerEvents: 'none',
          }}
        />
        <div
          aria-hidden="true"
          className="pl-wash-b"
          style={{
            position: 'absolute', bottom: '-20%', left: '-16%',
            width: 420, height: 420, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(18,185,129,0.16) 0%, transparent 64%)',
            pointerEvents: 'none',
          }}
        />

        <div className="pl-logo" style={{ position: 'relative', zIndex: 2 }}>
          <Logo variant="lockup" height={36} />
        </div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 className="pbc-display pbc-h2" style={{ margin: '0 0 var(--s2)', color: 'var(--on-paper)' }}>
            <span className="pl-line"><span>Run your business</span></span>
            <span className="pl-line"><span style={{ color: 'var(--accent)' }}>smarter, faster.</span></span>
          </h2>

          <p className="pbc-lede pl-lede" style={{ color: 'var(--on-paper-mute)', margin: '0 0 var(--s4)', maxWidth: 400 }}>
            Complete POS, inventory, sales, purchases, and business analytics — all in one
            professional cloud platform.
          </p>

          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem' }}>
            {FEATURES.map((f) => (
              <li
                key={f}
                className="pl-feat pbc-body"
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--on-paper-mute)' }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: 'var(--accent-wash)', border: '1px solid var(--accent-line)',
                    display: 'grid', placeItems: 'center', flexShrink: 0,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'block' }} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="pl-legal" style={{ position: 'relative', zIndex: 2 }}>
          <p className="pbc-meta" style={{ color: 'var(--on-paper-soft)', margin: 0 }}>
            © {new Date().getFullYear()} ProBusinessCloud. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div
        style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 'var(--s4) var(--s3)', position: 'relative', overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          className="pl-wash-c"
          style={{
            position: 'absolute', top: '-14%', right: '-12%',
            width: 380, height: 380, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(44,107,245,0.10) 0%, transparent 66%)',
            pointerEvents: 'none',
          }}
        />

        <motion.div
          style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}
          variants={stack}
          initial="hidden"
          animate="show"
        >
          {/* Shown only where the brand panel is not. */}
          <motion.div variants={rise} className="pl-mobile-logo" style={{ marginBottom: 'var(--s5)' }}>
            <Logo variant="lockup" height={32} />
          </motion.div>

          <motion.div variants={rise} style={{ marginBottom: 'var(--s4)' }}>
            <h1 className="pbc-display" style={{ fontSize: '1.875rem', margin: '0 0 0.5rem', color: 'var(--on-paper)' }}>
              Welcome back
            </h1>
            <p className="pbc-body" style={{ color: 'var(--on-paper-mute)', margin: 0 }}>
              Sign in to your ProBusinessCloud account
            </p>
          </motion.div>

          {/* Error banner — arrives and leaves rather than popping */}
          <AnimatePresence>
            {suspendedMsg && (
              <motion.div
                key="suspended"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto', marginBottom: 'var(--s2)' }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                transition={{ duration: reduce ? 0.2 : 0.35, ease: EASE }}
                style={{ overflow: 'hidden' }}
              >
                <div
                  role="alert"
                  className="pbc-meta"
                  style={{
                    padding: '0.875rem 1rem', borderRadius: 'var(--r)',
                    background: 'rgba(210,69,58,0.06)', border: '1px solid rgba(210,69,58,0.22)',
                    color: 'var(--signal)',
                  }}
                >
                  {suspendedMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            variants={rise}
            onSubmit={handleSubmit((d) => loginMutation.mutate(d))}
            className="pbc-card"
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s2)', padding: 'var(--s4)', boxShadow: 'var(--shadow-lg)' }}
          >
            <LabeledInput label="Company code" error={errors.company_slug?.message} reduce={reduce}>
              <FieldIcon Icon={BuildingOffice2Icon} />
              <input
                type="text"
                autoComplete="organization"
                placeholder="your-company-code"
                className={`pl-field${errors.company_slug ? ' error' : ''}`}
                {...register('company_slug', { required: 'Company code is required.' })}
              />
            </LabeledInput>

            <LabeledInput label="Email address" error={errors.email?.message} reduce={reduce}>
              <FieldIcon Icon={EnvelopeIcon} />
              <input
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                className={`pl-field${errors.email ? ' error' : ''}`}
                {...register('email', {
                  required: 'Email is required.',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address.' },
                })}
              />
            </LabeledInput>

            <LabeledInput label="Password" error={errors.password?.message} reduce={reduce}>
              <FieldIcon Icon={LockClosedIcon} />
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                className={`pl-field${errors.password ? ' error' : ''}`}
                style={{ paddingRight: '3.25rem' }}
                {...register('password', { required: 'Password is required.' })}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="pl-eye"
                aria-label={showPwd ? 'Hide password' : 'Show password'}
              >
                {/* The two icons cross-fade in place instead of snapping. */}
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={showPwd ? 'hide' : 'show'}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                    transition={{ duration: reduce ? 0.1 : 0.18, ease: EASE }}
                    style={{ display: 'grid', placeItems: 'center' }}
                  >
                    {showPwd
                      ? <EyeSlashIcon style={{ width: 18, height: 18 }} />
                      : <EyeIcon style={{ width: 18, height: 18 }} />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </LabeledInput>

            <motion.button
              type="submit"
              disabled={loginMutation.isPending}
              className="pbc-btn pbc-btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              whileHover={reduce || loginMutation.isPending ? undefined : { y: -2 }}
              whileTap={reduce || loginMutation.isPending ? undefined : { y: 0, scale: 0.99 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={loginMutation.isPending ? 'pending' : 'idle'}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: reduce ? 0.12 : 0.2, ease: EASE }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {loginMutation.isPending ? (
                    <>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.45)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                      Signing in…
                    </>
                  ) : (
                    <>Sign in <ArrowRightIcon style={{ width: 16, height: 16 }} /></>
                  )}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </motion.form>

          <motion.div
            variants={rise}
            style={{ marginTop: 'var(--s4)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
          >
            <Link
              to="/"
              className="pbc-meta pl-back"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center', minHeight: 40 }}
            >
              ← Back to ProBusinessCloud
            </Link>
            <p className="pbc-meta" style={{ color: 'var(--on-paper-soft)', margin: 0 }}>
              Secure business platform · Your data is encrypted
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

function FieldIcon({ Icon }) {
  return (
    <Icon
      aria-hidden="true"
      style={{
        width: 17, height: 17, color: 'var(--accent)',
        position: 'absolute', left: '0.875rem', top: '50%',
        transform: 'translateY(-50%)', pointerEvents: 'none',
      }}
    />
  );
}

function LabeledInput({ label, error, reduce, children }) {
  return (
    <div>
      <label
        className="pbc-eyebrow"
        style={{ display: 'block', color: 'var(--on-paper-soft)', marginBottom: '0.4375rem' }}
      >
        {label}
      </label>
      <div style={{ position: 'relative' }}>{children}</div>

      {/* Validation messages open the space they need rather than shunting the
          rest of the form down in one frame. */}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            role="alert"
            className="pbc-meta"
            initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: '0.375rem' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.25, ease: EASE }}
            style={{ color: 'var(--signal)', overflow: 'hidden', marginBottom: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
