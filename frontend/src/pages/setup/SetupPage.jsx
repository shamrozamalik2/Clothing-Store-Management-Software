import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { setCredentials } from '@store/slices/authSlice';

const BACKEND = window.electronAPI?.backendUrl ?? 'http://localhost:3001';

export default function SetupPage() {
  const dispatch = useDispatch();
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [serverErr, setServerErr]   = useState('');
  const [loading, setLoading]       = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password', '');

  async function onSubmit(values) {
    setServerErr('');
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     values.name.trim(),
          email:    values.email.trim(),
          password: values.password,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setServerErr(data.message || 'Setup failed. Please try again.');
        return;
      }
      dispatch(setCredentials({ token: data.data.token, user: data.data.user }));
      // App.jsx will re-render with setupRequired=false and show the router
    } catch {
      setServerErr('Could not connect to the server. Please restart the app.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary-600 mb-4">
            <span className="text-white text-2xl font-bold">SG</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-100">Welcome to SAS Garments</h1>
          <p className="text-sm text-surface-400 mt-1.5">
            Create your admin account to get started.
          </p>
        </div>

        {/* Form card */}
        <form onSubmit={handleSubmit(onSubmit)}
          className="bg-surface-900 border border-surface-700 rounded-2xl p-7 space-y-5 shadow-xl">

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Ahmad Raza"
              autoFocus
              {...register('name', { required: 'Full name is required.' })}
              className="w-full h-10 px-3 rounded-xl bg-surface-800 border border-surface-600 text-surface-100 text-sm placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@myshop.com"
              {...register('email', {
                required: 'Email is required.',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email.' },
              })}
              className="w-full h-10 px-3 rounded-xl bg-surface-800 border border-surface-600 text-surface-100 text-sm placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="At least 6 characters"
                {...register('password', {
                  required: 'Password is required.',
                  minLength: { value: 6, message: 'Password must be at least 6 characters.' },
                })}
                className="w-full h-10 px-3 pr-10 rounded-xl bg-surface-800 border border-surface-600 text-surface-100 text-sm placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                {showPass ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-surface-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type={showConf ? 'text' : 'password'}
                placeholder="Re-enter your password"
                {...register('confirmPassword', {
                  required: 'Please confirm your password.',
                  validate: v => v === password || 'Passwords do not match.',
                })}
                className="w-full h-10 px-3 pr-10 rounded-xl bg-surface-800 border border-surface-600 text-surface-100 text-sm placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button type="button" onClick={() => setShowConf(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-500 hover:text-surface-300">
                {showConf ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          {/* Server error */}
          {serverErr && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {serverErr}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
            {loading ? 'Creating account…' : 'Create Admin Account'}
          </button>

          <p className="text-xs text-surface-500 text-center">
            This is the owner/admin account. You can add more users from Settings after setup.
          </p>
        </form>
      </div>
    </div>
  );
}
