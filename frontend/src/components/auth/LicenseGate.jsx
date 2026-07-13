import { useState } from 'react';
import { KeyIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { cn } from '@utils/cn';

export default function LicenseGate({ status, onActivated }) {
  const [key, setKey]         = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isExpiredLicense = status?.mode === 'expired' && status?.license?.key;
  const trialExpired     = status?.mode === 'expired' && !status?.license?.valid;

  async function handleActivate(e) {
    e.preventDefault();
    if (!key.trim()) return;
    setError('');
    setLoading(true);
    try {
      const result = await window.electronAPI.license.activate(key.trim().toUpperCase());
      if (result.success) {
        setSuccess(true);
        setTimeout(() => onActivated(result), 1000);
      } else {
        setError(result.error || 'Invalid license key. Please check and try again.');
      }
    } catch {
      setError('Could not activate license. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function formatKey(value) {
    const clean = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 24);
    return clean.match(/.{1,6}/g)?.join('-') ?? clean;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-surface-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-600/30">
            <span className="text-white font-bold text-2xl">SG</span>
          </div>
          <h1 className="text-2xl font-bold text-surface-100">SAS Garments</h1>
          <p className="text-sm text-surface-500 mt-1">Professional Store Management System</p>
        </div>

        {/* Status banner */}
        <div className={cn(
          'flex items-start gap-3 rounded-xl p-4 mb-6 border',
          isExpiredLicense
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-yellow-500/10 border-yellow-500/30'
        )}>
          <ExclamationTriangleIcon className={cn('h-5 w-5 shrink-0 mt-0.5', isExpiredLicense ? 'text-red-400' : 'text-yellow-400')} />
          <div>
            <p className={cn('text-sm font-semibold', isExpiredLicense ? 'text-red-300' : 'text-yellow-300')}>
              {isExpiredLicense ? 'License Expired' : 'Trial Period Ended'}
            </p>
            <p className="text-xs text-surface-400 mt-0.5">
              {isExpiredLicense
                ? `Your license expired on ${status.license.expiryDate}. Enter a new key to continue.`
                : 'Your 30-day trial has ended. Enter a license key to continue using SAS Garments.'}
            </p>
          </div>
        </div>

        {/* Activation form */}
        <div className="card p-6">
          <h2 className="text-base font-semibold text-surface-100 mb-1 flex items-center gap-2">
            <KeyIcon className="h-4 w-4 text-primary-400" /> Activate License
          </h2>
          <p className="text-xs text-surface-500 mb-4">
            Enter the 24-character license key provided with your purchase.
          </p>

          {success ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-sm text-green-400 font-medium">License activated!</p>
            </div>
          ) : (
            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={key}
                  onChange={e => setKey(formatKey(e.target.value))}
                  placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                  maxLength={27}
                  className={cn(
                    'w-full h-11 px-4 rounded-xl font-mono text-sm tracking-widest text-center',
                    'bg-surface-800 border focus:outline-none focus:ring-2 focus:ring-primary-500',
                    error
                      ? 'border-red-500 text-red-300'
                      : 'border-surface-600 text-surface-100'
                  )}
                  autoFocus
                  spellCheck={false}
                />
                {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || key.replace(/-/g,'').length < 24}
                className={cn(
                  'w-full h-11 rounded-xl font-semibold text-white text-sm transition-all',
                  loading || key.replace(/-/g,'').length < 24
                    ? 'bg-surface-700 text-surface-500 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-500 active:scale-[0.98]'
                )}>
                {loading ? 'Activating…' : 'Activate'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-surface-600 mt-4">
          Need a license? Contact your supplier or reseller.
        </p>
      </div>
    </div>
  );
}
