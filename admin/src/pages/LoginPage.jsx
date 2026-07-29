import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';
import { saLogin } from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [form,  setForm]  = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-purple-600 items-center justify-center mb-4 shadow-lg shadow-purple-900/40">
            <ShieldCheckIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-slate-400 text-sm mt-1">Garments POS — Platform Control</p>
        </div>

        <form onSubmit={submit} className="bg-slate-900 rounded-2xl p-8 shadow-xl border border-slate-800 space-y-5">
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
            <input type="email" required value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="admin@platform.com" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
            <input type="password" required value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••••" />
          </div>

          <button type="submit" disabled={busy}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-slate-600 text-xs mt-6">
          Restricted access — authorized personnel only
        </p>
      </div>
    </div>
  );
}
