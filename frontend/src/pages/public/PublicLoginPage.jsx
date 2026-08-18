import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import {
  EyeIcon, EyeSlashIcon, EnvelopeIcon,
  LockClosedIcon, BuildingOffice2Icon, ArrowRightIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import { authApi } from '@api/auth.api';
import { setCredentials, selectIsAuth } from '@store/slices/authSlice';

function PBCMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path d="M36 20C36 28.837 28.837 36 20 36C11.163 36 4 28.837 4 20C4 11.163 11.163 4 20 4C24.418 4 28.418 5.791 31.314 8.686"
        stroke="#60a5fa" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M29 20C29 25.523 24.523 30 19 30C13.477 30 9 25.523 9 20C9 14.477 13.477 10 19 10C21.761 10 24.261 11.119 26.071 12.929"
        stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="12" y="14" width="1.8" height="12" rx="0.9" fill="white" />
      <path d="M13.8 14H17.2C18.746 14 20 15.254 20 16.8C20 18.346 18.746 19.6 17.2 19.6H13.8V14Z" fill="white" />
      <rect x="21.5" y="14" width="1.8" height="12" rx="0.9" fill="white" />
      <path d="M23.3 14H26.2C27.526 14 28.6 15.074 28.6 16.4C28.6 17.726 27.526 18.8 26.2 18.8H23.3V14Z" fill="white" />
      <path d="M23.3 18.8H26.5C27.936 18.8 29.1 19.964 29.1 21.4C29.1 22.836 27.936 24 26.5 24H23.3V18.8Z" fill="white" />
    </svg>
  );
}

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#06091a' }}>
      <style>{`
        .pub-login-input {
          width: 100%; padding: 0.8rem 1rem 0.8rem 2.75rem;
          border-radius: 12px; font-size: 0.9rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.1);
          color: #e0eaff; outline: none;
          transition: all 0.2s;
          font-family: inherit;
        }
        .pub-login-input:focus {
          border-color: rgba(59,130,246,0.5);
          background: rgba(59,130,246,0.05);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .pub-login-input::placeholder { color: #2a3a55; }
        .pub-login-input.error { border-color: rgba(239,68,68,0.5); }
        .pub-login-btn {
          width: 100%; padding: 0.875rem; border-radius: 14px;
          font-size: 1rem; font-weight: 700; cursor: pointer;
          border: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          background: linear-gradient(135deg, #2563eb, #0891b2);
          color: white; transition: all 0.25s;
          box-shadow: 0 6px 24px rgba(37,99,235,0.35);
          font-family: inherit;
        }
        .pub-login-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 10px 32px rgba(37,99,235,0.45); }
        .pub-login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes loginFadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .login-form-anim { animation: loginFadeUp 0.55s ease both; }
      `}</style>

      {/* Left panel — brand (hidden on mobile, flex on lg+) */}
      <div className="hidden lg:flex" style={{
        flex: '0 0 46%', maxWidth: 560, flexDirection: 'column',
        justifyContent: 'space-between', padding: '3rem',
        background: 'linear-gradient(160deg, #080f22 0%, #061529 50%, #070d1d 100%)',
        borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 65%)', pointerEvents: 'none', animation: 'pub-glow 14s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 65%)', pointerEvents: 'none', animation: 'pub-glow 18s ease-in-out infinite 5s' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', position: 'relative', zIndex: 2 }}>
          <PBCMark size={36} />
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e8f0fe' }}>
            ProBusiness<span style={{ color: '#60a5fa' }}>Cloud</span>
          </span>
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#f0f5ff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Run your business<br />
            <span style={{ background: 'linear-gradient(135deg, #60a5fa, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              smarter, faster.
            </span>
          </h2>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(160,185,220,0.7)', marginBottom: '2rem', maxWidth: 380 }}>
            Complete POS, inventory, sales, purchases, and business analytics — all in one professional cloud platform.
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'rgba(160,185,220,0.8)' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', display: 'block' }} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <p style={{ fontSize: '0.78rem', color: 'rgba(100,130,170,0.3)' }}>© 2025 ProBusinessCloud. All rights reserved.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 420 }} className="login-form-anim">

          {/* Mobile logo (hidden on lg+) */}
          <div className="flex lg:hidden" style={{ alignItems: 'center', gap: '0.625rem', marginBottom: '2.5rem' }}>
            <PBCMark size={30} />
            <span style={{ fontWeight: 800, fontSize: '1rem', color: '#e8f0fe' }}>
              ProBusiness<span style={{ color: '#60a5fa' }}>Cloud</span>
            </span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f0f5ff', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '0.9rem', color: '#3d5070' }}>
              Sign in to your ProBusinessCloud account
            </p>
          </div>

          {/* Error banner */}
          {suspendedMsg && (
            <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem', borderRadius: 12, fontSize: '0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', lineHeight: 1.5 }}>
              {suspendedMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(d => loginMutation.mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            <LabeledInput label="Company Code" error={errors.company_slug?.message}>
              <BuildingOffice2Icon style={{ width: 16, height: 16, color: '#3b82f6', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                autoComplete="organization"
                placeholder="your-company-code"
                className={`pub-login-input${errors.company_slug ? ' error' : ''}`}
                {...register('company_slug', { required: 'Company code is required.' })}
              />
            </LabeledInput>

            <LabeledInput label="Email Address" error={errors.email?.message}>
              <EnvelopeIcon style={{ width: 16, height: 16, color: '#3b82f6', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@company.com"
                className={`pub-login-input${errors.email ? ' error' : ''}`}
                {...register('email', {
                  required: 'Email is required.',
                  pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email address.' },
                })}
              />
            </LabeledInput>

            <LabeledInput label="Password" error={errors.password?.message}>
              <LockClosedIcon style={{ width: 16, height: 16, color: '#3b82f6', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Your password"
                className={`pub-login-input${errors.password ? ' error' : ''}`}
                {...register('password', { required: 'Password is required.' })}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: '0.875rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#3d5070', padding: 0 }}
              >
                {showPwd ? <EyeSlashIcon style={{ width: 16, height: 16 }} /> : <EyeIcon style={{ width: 16, height: 16 }} />}
              </button>
            </LabeledInput>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="pub-login-btn"
              style={{ marginTop: '0.5rem' }}
            >
              {loginMutation.isPending ? (
                <>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : (
                <>Sign In <ArrowRightIcon style={{ width: 16, height: 16 }} /></>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div style={{ marginTop: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link to="/" style={{ fontSize: '0.875rem', color: '#3d5070', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
              onMouseLeave={e => e.currentTarget.style.color = '#3d5070'}>
              ← Back to ProBusinessCloud
            </Link>
            <p style={{ fontSize: '0.78rem', color: '#1e2e45' }}>
              Secure business platform · Your data is encrypted
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LabeledInput({ label, error, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#4a6080', marginBottom: '0.5rem' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {children}
      </div>
      {error && <p style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.35rem' }}>{error}</p>}
    </div>
  );
}
