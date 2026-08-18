import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  UsersIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { saLogin } from '../api/client';

/* ─── Capability row (left panel) ─────────────────────────────────────────── */
function Capability({ icon: Icon, title, detail }) {
  return (
    <div className="flex items-start gap-3.5">
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <Icon className="h-4 w-4" style={{ color: 'rgba(196,181,253,0.95)' }} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{title}</p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(187,210,255,0.62)' }}>
          {detail}
        </p>
      </div>
    </div>
  );
}

/* ─── Security note (form card) ───────────────────────────────────────────── */
function SecurityNote({ icon: Icon, title, detail }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        <Icon className="h-3.5 w-3.5 text-slate-300" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-300 leading-tight">{title}</p>
        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{detail}</p>
      </div>
    </div>
  );
}

/* ─── Super Admin Login ───────────────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      const { data } = await saLogin(form.email, form.password);
      sessionStorage.setItem('sa_token', data.data.token);
      sessionStorage.setItem('sa_admin', JSON.stringify(data.data.admin));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally { setBusy(false); }
  };

  const field =
    'w-full bg-slate-950/60 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3 ' +
    'placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 ' +
    'focus:border-purple-500 transition-colors';

  return (
    <div className="min-h-screen flex">

      {/* ══ Left panel — brand / platform overview ══ */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] flex-col justify-between p-12 relative overflow-hidden login-gradient-bg">

        {/* Decorative glow blobs */}
        <div
          className="absolute rounded-full pointer-events-none animate-glow-pulse"
          style={{
            top: '-90px', right: '-90px', width: 440, height: 440,
            background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute rounded-full pointer-events-none animate-glow-pulse-slow"
          style={{
            bottom: '-110px', left: '-90px', width: 400, height: 400,
            background: 'radial-gradient(circle, rgba(99,102,241,0.17) 0%, transparent 65%)',
            animationDelay: '3s',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <img src="/newlogo.png" alt="ProBusinessCloud" className="brand-logo" style={{ height: 60 }} />
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-9">
          <div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-5"
              style={{ background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.30)' }}
            >
              <ShieldCheckIcon className="h-3.5 w-3.5 text-purple-300" />
              <span className="text-[11px] font-semibold tracking-wide text-purple-200 uppercase">
                Platform Control
              </span>
            </div>

            <h2 className="text-3xl xl:text-4xl font-black text-white leading-tight">
              Manage every<br />
              <span
                style={{
                  background: 'linear-gradient(135deg, #a78bfa, #60a5fa)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                business you host.
              </span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(187,210,255,0.70)' }}>
              The administration portal for ProBusinessCloud — provision companies,
              control access, and monitor platform activity from one place.
            </p>
          </div>

          <div className="space-y-5">
            <Capability
              icon={BuildingOffice2Icon}
              title="Company provisioning"
              detail="Create tenants, set plans, suspend or restore accounts."
            />
            <Capability
              icon={UsersIcon}
              title="User & seat management"
              detail="Track active users against each company's limit."
            />
            <Capability
              icon={ChartBarIcon}
              title="Platform overview"
              detail="Sales volume and account activity across all tenants."
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(147,196,255,0.30)' }}>
            © 2025 ProBusinessCloud. All rights reserved.
          </p>
        </div>
      </div>

      {/* ══ Right panel — sign-in form ══ */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-slate-950">
        <div className="w-full max-w-[400px] animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <img src="/newlogo.png" alt="ProBusinessCloud" className="brand-logo" style={{ height: 44 }} />
          </div>

          {/* Heading */}
          <div className="mb-7">
            <div
              className="lg:hidden inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4"
              style={{ background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.30)' }}
            >
              <ShieldCheckIcon className="h-3.5 w-3.5 text-purple-300" />
              <span className="text-[11px] font-semibold tracking-wide text-purple-200 uppercase">
                Restricted Access
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Super Admin</h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Sign in to the ProBusinessCloud control panel
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={submit}
            className="rounded-2xl p-7 shadow-2xl space-y-5"
            style={{
              background: 'rgba(15,23,42,0.72)',
              border: '1px solid rgba(148,163,184,0.16)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {error && (
              <div
                className="flex items-start gap-2.5 rounded-xl px-4 py-3"
                style={{ background: 'rgba(127,29,29,0.30)', border: '1px solid rgba(185,28,28,0.55)' }}
                role="alert"
              >
                <ExclamationTriangleIcon className="h-4 w-4 text-red-300 shrink-0 mt-0.5" />
                <span className="text-sm text-red-200 leading-snug">{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="sa-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="h-4 w-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="sa-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={field}
                  placeholder="admin@probusinesscloud.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="sa-password" className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="h-4 w-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="sa-password"
                  type={showPwd ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className={`${field} pr-11`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPwd ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700
                         disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold
                         py-3 rounded-xl transition-colors"
            >
              {busy && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              {busy ? 'Signing in…' : 'Sign In'}
            </button>

            <div className="pt-1" style={{ borderTop: '1px solid rgba(148,163,184,0.12)' }} />

            {/* Security notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
              <SecurityNote
                icon={ClockIcon}
                title="Session-only sign-in"
                detail="Access ends when you close the browser."
              />
              <SecurityNote
                icon={ShieldCheckIcon}
                title="Rate limited"
                detail="Repeated attempts are throttled."
              />
              <SecurityNote
                icon={DocumentTextIcon}
                title="Requests logged"
                detail="Server records administrative activity."
              />
              <SecurityNote
                icon={LockClosedIcon}
                title="Elevated privileges"
                detail="This portal manages every company."
              />
            </div>
          </form>

          {/* Footer */}
          <div className="mt-7 text-center space-y-2.5">
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Authorized personnel only. Unauthorized access attempts may be
              recorded and investigated.
            </p>
            <p className="text-[11px] text-slate-700 lg:hidden">
              © 2025 ProBusinessCloud. All rights reserved.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
