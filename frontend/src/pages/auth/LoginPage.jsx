import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  BuildingOffice2Icon,
  BoltIcon,
  CubeIcon,
  ChartBarIcon,
  UsersIcon,
  CloudIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { authApi } from '@api/auth.api';
import { setCredentials, selectIsAuth } from '@store/slices/authSlice';
import { setPageTitle } from '@store/slices/uiSlice';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';

/* ─── Feature bullet ──────────────────────────────────────────────────────── */
function Feature({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <Icon className="h-4 w-4" style={{ color: 'rgba(187,210,255,0.90)' }} />
      </div>
      <span className="text-sm" style={{ color: 'rgba(187,210,255,0.85)' }}>{text}</span>
    </div>
  );
}

/* ─── Login Page ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const isAuth          = useSelector(selectIsAuth);
  const [showPwd, setShowPwd]           = useState(false);
  const [suspendedMsg, setSuspendedMsg] = useState('');

  useEffect(() => {
    dispatch(setPageTitle('Sign In'));
    if (isAuth) navigate('/', { replace: true });
    const msg = sessionStorage.getItem('login_error');
    if (msg) { setSuspendedMsg(msg); sessionStorage.removeItem('login_error'); }
  }, [isAuth]);

  const savedSlug = localStorage.getItem('sas_company_slug') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { company_slug: savedSlug, email: '', password: '' } });

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
    onError: (err) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="min-h-screen flex">

      {/* ── Left panel — animated gradient brand area ── */}
      <div
        className="hidden lg:flex lg:w-[45%] xl:w-[52%] flex-col justify-between p-12 relative overflow-hidden login-gradient-bg"
      >
        {/* Decorative glow blobs */}
        <div
          className="absolute rounded-full pointer-events-none animate-glow-pulse"
          style={{
            top: '-80px', right: '-80px',
            width: 420, height: 420,
            background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none animate-glow-pulse-slow"
          style={{
            bottom: '-100px', left: '-80px',
            width: 380, height: 380,
            background: 'radial-gradient(circle, rgba(139,92,246,0.16) 0%, transparent 65%)',
            animationDelay: '3s',
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: '40%', left: '30%',
            width: 220, height: 220,
            background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)',
            animation: 'glowPulseAnim 14s ease-in-out infinite',
            animationDelay: '6s',
          }}
        />

        {/* Logo — transparent PNG, rendered white for the dark panel */}
        <div className="relative z-10">
          <img
            src="/logo.png"
            alt="ProBusinessCloud"
            className="select-none"
            style={{
              height: 64,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              filter: 'brightness(0) invert(1)',
            }}
          />
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight text-balance">
              Run your business<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #60a5fa, #c084fc)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
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

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(147,196,255,0.30)' }}>
            © 2025 ProBusinessCloud. All rights reserved.
          </p>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ backgroundColor: 'rgb(var(--app-bg))' }}>
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Mobile logo — transparent, no plate */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img
              src="/logo.png"
              alt="ProBusinessCloud"
              className="brand-logo"
              style={{ height: 48 }}
            />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: 'rgb(var(--s-50))' }}>
              Welcome back
            </h1>
            <p className="text-sm mt-1.5" style={{ color: 'rgb(var(--s-400))' }}>
              Sign in to your ProBusinessCloud account
            </p>
          </div>

          {/* Alert banner */}
          {suspendedMsg && (
            <div className={`mb-5 rounded-xl px-4 py-3 text-sm border ${
              suspendedMsg.toLowerCase().includes('suspend')
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              {suspendedMsg}
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit((data) => loginMutation.mutate(data))}
            className="space-y-4"
          >
            <Input
              label="Company Code"
              type="text"
              autoComplete="organization"
              placeholder="e.g. my-company"
              leftIcon={<BuildingOffice2Icon className="h-4 w-4" />}
              error={errors.company_slug?.message}
              required
              {...register('company_slug', { required: 'Company code is required.' })}
            />

            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@company.com"
              leftIcon={<EnvelopeIcon className="h-4 w-4" />}
              error={errors.email?.message}
              required
              {...register('email', {
                required: 'Email is required.',
                pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address.' },
              })}
            />

            <Input
              label="Password"
              type={showPwd ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              leftIcon={<LockClosedIcon className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="pointer-events-auto text-surface-400 hover:text-surface-200 transition-colors"
                >
                  {showPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              }
              error={errors.password?.message}
              required
              {...register('password', { required: 'Password is required.' })}
            />

            <Button
              type="submit"
              fullWidth
              size="xl"
              loading={loginMutation.isPending}
              className="mt-2"
            >
              Sign In to ProBusinessCloud
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs" style={{ color: 'rgb(var(--s-500))' }}>
              ProBusinessCloud · Secure Business Platform
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}