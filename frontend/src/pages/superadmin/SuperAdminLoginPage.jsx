import { useState } from 'react';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClockIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

import { saLogin } from '@api/superAdminClient';

/* ─── Security note ───────────────────────────────────────────────────────── */
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
export default function SuperAdminLoginPage() {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [busy,    setBusy]    = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await saLogin(form.email, form.password);
      sessionStorage.setItem('sa_token', data.data.token);
      sessionStorage.setItem('sa_admin', JSON.stringify(data.data.admin));
      window.location.hash = '/admin/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const field =
    'w-full bg-slate-950/60 border border-slate-700 text-white rounded-xl pl-11 pr-4 py-3 ' +
    'placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 ' +
    'focus:border-purple-500 transition-colors';

  return (
    <div className="min-h-screen login-gradient-bg flex items-center justify-center p-4 relative overflow-hidden">

      {/* Decorative glow blobs */}
      <div
        className="absolute rounded-full pointer-events-none animate-glow-pulse"
        style={{
          top: '-120px', right: '-100px', width: 460, height: 460,
          background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 65%)',
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none animate-glow-pulse-slow"
        style={{
          bottom: '-140px', left: '-110px', width: 420, height: 420,
          background: 'radial-gradient(circle, rgba(99,102,241,0.17) 0%, transparent 65%)',
          animationDelay: '3s',
        }}
      />

      <div className="w-full max-w-[420px] relative z-10 animate-slide-up">

        {/* ── Brand header ── */}
        <div className="flex flex-col items-center text-center mb-7">
          <img
            src="/newlogo.png"
            alt="ProBusinessCloud"
            className="select-none mb-6"
            style={{
              height: 48,
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              filter: 'brightness(0) invert(1)',
            }}
          />

          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-4"
            style={{ background: 'rgba(139,92,246,0.14)', border: '1px solid rgba(139,92,246,0.30)' }}
          >
            <ShieldCheckIcon className="h-3.5 w-3.5 text-purple-300" />
            <span className="text-[11px] font-semibold tracking-wide text-purple-200 uppercase">
              Restricted Access
            </span>
          </div>

          <h1 className="text-3xl font-black text-white tracking-tight">Super Admin</h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Platform administration for ProBusinessCloud
          </p>
        </div>

        {/* ── Form card ── */}
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
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
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
                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
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

          {/* Divider */}
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

        {/* ── Footer ── */}
        <div className="mt-7 text-center space-y-3">
          <a
            href="#/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to company sign-in
          </a>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Authorized personnel only. Unauthorized access attempts may be
            recorded and investigated.
          </p>
          <p className="text-[11px] text-slate-700">
            © 2025 ProBusinessCloud. All rights reserved.
          </p>
        </div>

      </div>
    </div>
  );
}
