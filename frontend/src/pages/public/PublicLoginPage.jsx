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

function PBCLogo({ height = 36 }) {
  return (
    <img
      src="/newlogo.png"
      alt="ProBusinessCloud"
      style={{ height, width: 'auto', objectFit: 'contain', display: 'block', filter: 'brightness(0) invert(1)' }}
    />
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
    <div style={{ minHeight: '100vh', display: 'flex', background: 'linear-gradient(351deg, #8380b4 0%, #14122d 55%, #332c3f 100%)' }}>
      <style>{`
        .pub-login-input {
          width: 100%; padding: 0.8rem 1rem 0.8rem 2.75rem;
          border-radius: 12px; font-size: 0.9rem;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.11);
          color: #e0eaff; outline: none;
          transition: all 0.2s;
          font-family: inherit;
        }
        .pub-login-input:focus {
          border-color: rgba(129,140,248,0.65);
          background: rgba(99,102,241,0.07);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .pub-login-input::placeholder { color: rgba(255,255,255,0.2); }
        .pub-login-input.error { border-color: rgba(239,68,68,0.55); }
        .pub-login-btn {
          width: 100%; padding: 0.875rem; border-radius: 14px;
          font-size: 1rem; font-weight: 700; cursor: pointer;
          border: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
          background: linear-gradient(135deg, #bdb4fe, #7c3aed);
          color: white; transition: all 0.25s;
          box-shadow: 0 8px 28px rgba(79,70,229,0.45);
          font-family: inherit;
        }
        .pub-login-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); box-shadow: 0 12px 36px rgba(139,92,246,0.55); }
        .pub-login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        @keyframes loginFadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        .login-form-anim { animation: loginFadeUp 0.55s ease both; }
        @keyframes plGlow { 0%,100% { opacity:0.5; transform:scale(1) } 50% { opacity:0.85; transform:scale(1.12) } }
      `}</style>

      {/* Left panel — brand (hidden on mobile, flex on lg+) */}
      <div className="hidden lg:flex" style={{
        flex: '0 0 46%', maxWidth: 560, flexDirection: 'column',
        justifyContent: 'space-between', padding: '3rem',
        borderRight: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(131,128,180,0.20) 0%, transparent 65%)', pointerEvents: 'none', animation: 'plGlow 12s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: -100, left: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 65%)', pointerEvents: 'none', animation: 'plGlow 16s ease-in-out infinite 4s' }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <PBCLogo height={40} />
        </div>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#f0f5ff', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
            Run your business<br />
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              smarter, faster.
            </span>
          </h2>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.75, color: 'rgba(160,185,220,0.7)', marginBottom: '2rem', maxWidth: 380 }}>
            Complete POS, inventory, sales, purchases, and business analytics — all in one professional cloud platform.
          </p>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {FEATURES.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem', color: 'rgba(187,210,255,0.80)' }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(129,140,248,0.15)', border: '1px solid rgba(129,140,248,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', display: 'block' }} />
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

      {/* Right panel — form, inherits gradient from wrapper */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
        {/* Right-side glow blobs */}
        <div style={{ position: 'absolute', top: -50, left: -40, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(131,128,180,0.14) 0%, transparent 65%)', pointerEvents: 'none', animation: 'plGlow 10s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', bottom: -60, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)', pointerEvents: 'none', animation: 'plGlow 14s ease-in-out infinite reverse' }} />

        <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }} className="login-form-anim">

          {/* Mobile logo (hidden on lg+) */}
          <div className="flex lg:hidden" style={{ marginBottom: '2.5rem' }}>
            <PBCLogo height={34} />
          </div>

          {/* Heading */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f0f5ff', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
              Welcome back
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'rgba(187,210,255,0.60)' }}>
              Sign in to your ProBusinessCloud account
            </p>
          </div>

          {/* Error banner */}
          {suspendedMsg && (
            <div style={{ marginBottom: '1.25rem', padding: '0.875rem 1rem', borderRadius: 12, fontSize: '0.875rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', lineHeight: 1.5 }}>
              {suspendedMsg}
            </div>
          )}

          {/* Frosted glass form card */}
          <form onSubmit={handleSubmit(d => loginMutation.mutate(d))}
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 20, padding: '1.75rem', backdropFilter: 'blur(20px)' }}>

            <LabeledInput label="Company Code" error={errors.company_slug?.message}>
              <BuildingOffice2Icon style={{ width: 16, height: 16, color: '#818cf8', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                type="text"
                autoComplete="organization"
                placeholder="your-company-code"
                className={`pub-login-input${errors.company_slug ? ' error' : ''}`}
                {...register('company_slug', { required: 'Company code is required.' })}
              />
            </LabeledInput>

            <LabeledInput label="Email Address" error={errors.email?.message}>
              <EnvelopeIcon style={{ width: 16, height: 16, color: '#818cf8', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
              <LockClosedIcon style={{ width: 16, height: 16, color: '#818cf8', position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
            <Link to="/" style={{ fontSize: '0.875rem', color: 'rgba(187,210,255,0.55)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.375rem', justifyContent: 'center', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#93c5fd'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(187,210,255,0.55)'}>
              ← Back to ProBusinessCloud
            </Link>
            <p style={{ fontSize: '0.78rem', color: 'rgba(147,196,255,0.28)' }}>
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
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'rgba(187,210,255,0.60)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {children}
      </div>
      {error && <p style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.35rem' }}>{error}</p>}
    </div>
  );
}
