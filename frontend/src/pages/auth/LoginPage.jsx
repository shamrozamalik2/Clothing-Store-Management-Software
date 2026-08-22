import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  EyeIcon, EyeSlashIcon,
  EnvelopeIcon, LockClosedIcon, BuildingOffice2Icon,
  BoltIcon, CubeIcon, ChartBarIcon, UsersIcon, CloudIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Logo from '@components/ui/Logo';
import { authApi } from '@api/auth.api';
import { setCredentials, selectIsAuth } from '@store/slices/authSlice';
import { setPageTitle } from '@store/slices/uiSlice';

/* ─── Feature bullet (left panel) ────────────────────────────────────────── */
function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}>
        <Icon className="h-4 w-4" style={{ color: 'rgba(187,210,255,0.90)' }} />
      </div>
      <span className="text-sm" style={{ color: 'rgba(187,210,255,0.85)' }}>{text}</span>
    </div>
  );
}

/* ─── Dark-themed form field ─────────────────────────────────────────────── */
function Field({ label, icon: Icon, error, rightEl, inputProps }) {
  const [focused, setFocused] = useState(false);
  const borderColor = error
    ? 'rgba(239,68,68,0.70)'
    : focused
      ? 'rgba(129,140,248,0.65)'
      : 'rgba(255,255,255,0.11)';

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.1em] mb-2"
        style={{ color: 'rgba(187,210,255,0.60)' }}>
        {label}
      </label>
      <div className="relative">
        <Icon className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: focused ? 'rgba(165,180,252,0.7)' : 'rgba(255,255,255,0.32)' }} />
        <input
          className="w-full rounded-xl text-sm text-white outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${borderColor}`,
            padding: '0.75rem 1rem 0.75rem 2.5rem',
            boxShadow: focused && !error ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
          }}
          placeholder=""
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />
        {rightEl && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs" style={{ color: '#fca5a5' }}>{error}</p>}
    </div>
  );
}

/* ─── Login Page ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const isAuth    = useSelector(selectIsAuth);
  const [showPwd, setShowPwd]           = useState(false);
  const [suspendedMsg, setSuspendedMsg] = useState('');

  useEffect(() => {
    dispatch(setPageTitle('Sign In'));
    if (isAuth) navigate('/', { replace: true });
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
      navigate('/', { replace: true });
    },
    onError: (err) => { toast.error(err.message); },
  });

  const isPending = loginMutation.isPending;

  return (
    <div className="min-h-screen flex">

      {/* ══ Left panel — brand ══════════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[52%] flex-col justify-between p-12 relative overflow-hidden login-gradient-bg">

        {/* Glow blobs */}
        <div className="absolute rounded-full pointer-events-none animate-glow-pulse"
          style={{ top: '-80px', right: '-80px', width: 420, height: 420,
            background: 'radial-gradient(circle, rgba(131,128,180,0.22) 0%, transparent 65%)' }} />
        <div className="absolute rounded-full pointer-events-none animate-glow-pulse-slow"
          style={{ bottom: '-100px', left: '-80px', width: 380, height: 380,
            background: 'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 65%)',
            animationDelay: '3s' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ top: '40%', left: '30%', width: 220, height: 220,
            background: 'radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 65%)',
            animation: 'glowPulseAnim 14s ease-in-out infinite', animationDelay: '6s' }} />

        {/* Logo */}
        <div className="relative z-10">
          <Logo variant="lockup" mono height={38} style={{ color: '#FCFBF8' }} />
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight text-balance">
              Run your business<br />
              <span style={{
                background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                smarter, faster.
              </span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(187,210,255,0.70)' }}>
              Complete POS, inventory, sales, purchases, and reports — all in one professional cloud platform.
            </p>
          </div>
          <div className="space-y-3">
            <Feature icon={BoltIcon}     text="Fast POS with one-tap checkout" />
            <Feature icon={CubeIcon}     text="Real-time inventory tracking" />
            <Feature icon={ChartBarIcon} text="Insightful business reports" />
            <Feature icon={UsersIcon}    text="Multi-user roles & permissions" />
            <Feature icon={CloudIcon}    text="Secure cloud sync & backup" />
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(147,196,255,0.30)' }}>
            © {new Date().getFullYear()} ProBusinessCloud. All rights reserved.
          </p>
        </div>
      </div>

      {/* ══ Right panel — same gradient as website hero ══════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative overflow-hidden login-gradient-bg">

        {/* Glow blobs — right panel */}
        <div className="absolute rounded-full pointer-events-none"
          style={{ top: '-50px', left: '-50px', width: 300, height: 300,
            background: 'radial-gradient(circle, rgba(131,128,180,0.16) 0%, transparent 65%)',
            animation: 'glowPulseAnim 11s ease-in-out infinite' }} />
        <div className="absolute rounded-full pointer-events-none"
          style={{ bottom: '-60px', right: '-40px', width: 260, height: 260,
            background: 'radial-gradient(circle, rgba(99,102,241,0.14) 0%, transparent 65%)',
            animation: 'glowPulseAnim 15s ease-in-out infinite reverse' }} />

        <div className="relative z-10 w-full max-w-[420px] animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo variant="lockup" mono height={30} style={{ color: '#FCFBF8' }} />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-[1.65rem] font-black tracking-tight leading-tight"
              style={{ color: '#f0f5ff' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(187,210,255,0.62)' }}>
              Sign in to your ProBusinessCloud account
            </p>
          </div>

          {/* Alert banner */}
          {suspendedMsg && (
            <div className="mb-5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: suspendedMsg.toLowerCase().includes('suspend')
                  ? 'rgba(127,29,29,0.35)' : 'rgba(120,80,0,0.35)',
                border: `1px solid ${suspendedMsg.toLowerCase().includes('suspend')
                  ? 'rgba(239,68,68,0.45)' : 'rgba(251,191,36,0.40)'}`,
                color: suspendedMsg.toLowerCase().includes('suspend') ? '#fca5a5' : '#fde68a',
              }}>
              {suspendedMsg}
            </div>
          )}

          {/* Frosted glass form card */}
          <form onSubmit={handleSubmit((data) => loginMutation.mutate(data))}>
            <div className="rounded-2xl p-7 space-y-5 mb-4"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(20px)',
              }}>

              <Field
                label="Company Code"
                icon={BuildingOffice2Icon}
                error={errors.company_slug?.message}
                inputProps={{
                  type: 'text', autoComplete: 'organization',
                  placeholder: 'e.g. my-company',
                  ...register('company_slug', { required: 'Company code is required.' }),
                }}
              />

              <Field
                label="Email Address"
                icon={EnvelopeIcon}
                error={errors.email?.message}
                inputProps={{
                  type: 'email', autoComplete: 'email', autoFocus: true,
                  placeholder: 'you@company.com',
                  ...register('email', {
                    required: 'Email is required.',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address.' },
                  }),
                }}
              />

              <Field
                label="Password"
                icon={LockClosedIcon}
                error={errors.password?.message}
                rightEl={
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="transition-colors"
                    style={{ color: 'rgba(255,255,255,0.38)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.80)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.38)'}>
                    {showPwd
                      ? <EyeSlashIcon className="h-4 w-4" />
                      : <EyeIcon      className="h-4 w-4" />}
                  </button>
                }
                inputProps={{
                  type: showPwd ? 'text' : 'password',
                  autoComplete: 'current-password',
                  placeholder: 'Enter your password',
                  ...register('password', { required: 'Password is required.' }),
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                boxShadow: '0 8px 28px rgba(79,70,229,0.45)',
              }}
              onMouseEnter={e => { if (!isPending) e.currentTarget.style.boxShadow = '0 12px 36px rgba(139,92,246,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(79,70,229,0.45)'; }}
            >
              {isPending && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {isPending ? 'Signing in…' : 'Sign In to ProBusinessCloud'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs" style={{ color: 'rgba(147,196,255,0.28)' }}>
              ProBusinessCloud · Secure Business Platform
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
