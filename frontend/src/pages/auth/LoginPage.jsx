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
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { authApi } from '@api/auth.api';
import { setCredentials, selectIsAuth } from '@store/slices/authSlice';
import { setPageTitle } from '@store/slices/uiSlice';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';

/* ─── PBC Brand mark ──────────────────────────────────────────────────────── */
function PBCLogoFull() {
  return (
    <div className="flex items-center gap-3 select-none">
      <svg width="44" height="44" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M36 20C36 28.837 28.837 36 20 36C11.163 36 4 28.837 4 20C4 11.163 11.163 4 20 4C24.418 4 28.418 5.791 31.314 8.686"
          stroke="#60a5fa" strokeWidth="2.8" strokeLinecap="round" fill="none"
        />
        <path
          d="M29 20C29 25.523 24.523 30 19 30C13.477 30 9 25.523 9 20C9 14.477 13.477 10 19 10C21.761 10 24.261 11.119 26.071 12.929"
          stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" fill="none"
        />
        <rect x="12" y="14" width="1.8" height="12" rx="0.9" fill="#1e3a8a"/>
        <path d="M13.8 14H17.2C18.746 14 20 15.254 20 16.8V16.8C20 18.346 18.746 19.6 17.2 19.6H13.8V14Z" fill="#1e3a8a"/>
        <rect x="21.5" y="14" width="1.8" height="12" rx="0.9" fill="#1e3a8a"/>
        <path d="M23.3 14H26.2C27.526 14 28.6 15.074 28.6 16.4V16.4C28.6 17.726 27.526 18.8 26.2 18.8H23.3V14Z" fill="#1e3a8a"/>
        <path d="M23.3 18.8H26.5C27.936 18.8 29.1 19.964 29.1 21.4V21.4C29.1 22.836 27.936 24 26.5 24H23.3V18.8Z" fill="#1e3a8a"/>
      </svg>
      <div>
        <p className="text-xl font-black text-slate-900 tracking-tight leading-tight">ProBusiness<span className="text-primary-600">Cloud</span></p>
        <p className="text-xs text-slate-500 leading-tight">Business Management Platform</p>
      </div>
    </div>
  );
}

/* ─── Feature bullet ──────────────────────────────────────────────────────── */
function Feature({ icon, text }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-white/80 text-sm">
        {icon}
      </div>
      <span className="text-sm text-blue-100/90">{text}</span>
    </div>
  );
}

/* ─── Login Page ─────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const isAuth         = useSelector(selectIsAuth);
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

      {/* ── Left panel — brand / marketing ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[52%] flex-col justify-between p-12 bg-gradient-to-br from-[#0c1427] via-[#0f2147] to-[#1a3a6e] relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-600/10 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 select-none">
            <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
              <path d="M36 20C36 28.837 28.837 36 20 36C11.163 36 4 28.837 4 20C4 11.163 11.163 4 20 4C24.418 4 28.418 5.791 31.314 8.686"
                stroke="#60a5fa" strokeWidth="2.8" strokeLinecap="round" fill="none"/>
              <path d="M29 20C29 25.523 24.523 30 19 30C13.477 30 9 25.523 9 20C9 14.477 13.477 10 19 10C21.761 10 24.261 11.119 26.071 12.929"
                stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
              <rect x="12" y="14" width="1.8" height="12" rx="0.9" fill="white"/>
              <path d="M13.8 14H17.2C18.746 14 20 15.254 20 16.8V16.8C20 18.346 18.746 19.6 17.2 19.6H13.8V14Z" fill="white"/>
              <rect x="21.5" y="14" width="1.8" height="12" rx="0.9" fill="white"/>
              <path d="M23.3 14H26.2C27.526 14 28.6 15.074 28.6 16.4V16.4C28.6 17.726 27.526 18.8 26.2 18.8H23.3V14Z" fill="white"/>
              <path d="M23.3 18.8H26.5C27.936 18.8 29.1 19.964 29.1 21.4V21.4C29.1 22.836 27.936 24 26.5 24H23.3V18.8Z" fill="white"/>
            </svg>
            <div>
              <p className="text-lg font-black text-white tracking-tight">ProBusinessCloud</p>
              <p className="text-xs text-blue-300/70">Business Management Platform</p>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight text-balance">
              Run your business<br />
              <span className="text-blue-300">smarter, faster.</span>
            </h2>
            <p className="text-blue-200/70 mt-4 text-sm leading-relaxed max-w-sm">
              Complete POS, inventory, sales, purchases, and reports — all in one professional cloud platform.
            </p>
          </div>

          <div className="space-y-3">
            <Feature icon="⚡" text="Fast POS with one-tap checkout" />
            <Feature icon="📦" text="Real-time inventory tracking" />
            <Feature icon="📊" text="Insightful business reports" />
            <Feature icon="👥" text="Multi-user roles & permissions" />
            <Feature icon="☁️" text="Secure cloud sync & backup" />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-blue-300/40">© 2025 ProBusinessCloud. All rights reserved.</p>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <PBCLogoFull />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 mt-1.5">Sign in to your ProBusinessCloud account</p>
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
                  className="pointer-events-auto text-slate-400 hover:text-slate-600 transition-colors"
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
              className="mt-2 shadow-glow-sm"
            >
              Sign In to ProBusinessCloud
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            ProBusinessCloud · Secure Business Platform
          </p>
        </div>
      </div>

    </div>
  );
}