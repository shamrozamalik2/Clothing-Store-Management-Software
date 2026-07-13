import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  BuildingOfficeIcon, ArchiveBoxIcon, KeyIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon, ShieldCheckIcon,
  ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ClockIcon, FolderOpenIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import { settingsApi } from '@api/settings.api';
import { cn } from '@utils/cn';

const TABS = [
  { id: 'company',  label: 'Company',         icon: BuildingOfficeIcon },
  { id: 'backup',   label: 'Backup & Restore', icon: ArchiveBoxIcon },
  { id: 'license',  label: 'License & Updates',icon: KeyIcon },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('company');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-surface-100">Settings</h1>
        <p className="text-sm text-surface-400 mt-0.5">Configure your store, manage backups, and license.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-surface-700">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id
                  ? 'border-primary-500 text-primary-400'
                  : 'border-transparent text-surface-400 hover:text-surface-200'
              )}>
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'company'  && <CompanyTab />}
      {tab === 'backup'   && <BackupTab />}
      {tab === 'license'  && <LicenseTab />}
    </div>
  );
}

// ─── Company Info ─────────────────────────────────────────────────────────────

function CompanyTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  settingsApi.getAll,
  });

  const company = data?.data?.company ?? {};

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm();

  useEffect(() => {
    if (company.company_name) {
      reset({
        company_name:    company.company_name?.value    ?? '',
        company_tagline: company.company_tagline?.value ?? '',
        company_address: company.company_address?.value ?? '',
        company_city:    company.company_city?.value    ?? '',
        company_phone:   company.company_phone?.value   ?? '',
        company_email:   company.company_email?.value   ?? '',
        company_website: company.company_website?.value ?? '',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (values) => settingsApi.updateBulk(values),
    onSuccess: () => {
      toast.success('Company settings saved.');
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-surface-700/40 animate-pulse" />;
  }

  return (
    <form onSubmit={handleSubmit(v => saveMutation.mutate(v))} className="card p-6 space-y-5 max-w-2xl">
      <h2 className="text-sm font-semibold text-surface-200">Company Information</h2>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Company Name" {...register('company_name')} placeholder="e.g. SAS Garments" />
        <Input label="Tagline" {...register('company_tagline')} placeholder="Optional" />
      </div>
      <Textarea label="Address" rows={2} {...register('company_address')} placeholder="Street address…" />
      <div className="grid grid-cols-2 gap-4">
        <Input label="City" {...register('company_city')} placeholder="e.g. Lahore" />
        <Input label="Phone" {...register('company_phone')} placeholder="+92 300 0000000" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Email" type="email" {...register('company_email')} placeholder="info@example.com" />
        <Input label="Website" {...register('company_website')} placeholder="https://example.com" />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" loading={saveMutation.isPending} disabled={!isDirty && !saveMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Backup & Restore ─────────────────────────────────────────────────────────

function BackupTab() {
  const [exportState, setExportState] = useState('idle');   // idle | running | done | error
  const [restoreState, setRestoreState] = useState('idle');
  const [lastExport, setLastExport]   = useState(null);
  const [exportError, setExportError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [autoInfo, setAutoInfo]       = useState(null);

  useEffect(() => {
    window.electronAPI?.backup?.getAutoInfo?.().then(setAutoInfo);
  }, []);

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-PK', {
      dateStyle: 'medium', timeStyle: 'short',
    });
  }

  async function handleExport() {
    setExportState('running');
    setExportError('');
    try {
      const result = await window.electronAPI.backup.export();
      if (result.canceled) { setExportState('idle'); return; }
      if (!result.success) { setExportError(result.error); setExportState('error'); return; }
      setLastExport(result.filePath);
      setExportState('done');
      toast.success('Backup exported successfully.');
    } catch (err) {
      setExportError(err.message);
      setExportState('error');
    }
  }

  async function handleRestore() {
    setRestoreState('running');
    setRestoreError('');
    try {
      const result = await window.electronAPI.backup.restore();
      if (result.canceled) { setRestoreState('idle'); return; }
      if (!result.success) { setRestoreError(result.error); setRestoreState('error'); return; }
      // App relaunches — this code won't execute
    } catch (err) {
      setRestoreError(err.message);
      setRestoreState('error');
    } finally {
      setRestoreState('idle');
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">

      {/* Auto-backup status */}
      <div className="card p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <ClockIcon className="h-5 w-5 text-green-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-surface-100">Automatic Daily Backup</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              The app automatically backs up your database every day when it starts. Last 7 backups are kept.
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-md bg-green-500/10 text-green-400 border border-green-500/20 shrink-0">
            Active
          </span>
        </div>

        {autoInfo && (
          <>
            {autoInfo.backups.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs text-surface-500 font-medium uppercase tracking-wider">Recent auto-backups</p>
                <div className="rounded-lg border border-surface-700 overflow-hidden">
                  {autoInfo.backups.slice(0, 5).map((b, i) => (
                    <div key={b.name} className={cn(
                      'flex items-center justify-between px-3 py-2 text-xs',
                      i % 2 === 0 ? 'bg-surface-800/30' : 'bg-surface-800/10'
                    )}>
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="px-1.5 py-0.5 rounded text-2xs bg-green-500/15 text-green-400">latest</span>}
                        <span className="font-mono text-surface-400">{b.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-surface-500">
                        <span>{formatBytes(b.sizeBytes)}</span>
                        <span>{formatDate(b.modifiedAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-surface-500 italic">No auto-backups yet — will be created on next app start.</p>
            )}

            {autoInfo.dir && (
              <div className="flex items-center gap-2 text-xs text-surface-500">
                <FolderOpenIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono truncate">{autoInfo.dir}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Export */}
      <div className="card p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <ArrowDownTrayIcon className="h-5 w-5 text-primary-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-surface-100">Export Backup</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Save a complete copy of the database to your computer. Do this regularly.
            </p>
          </div>
        </div>

        {exportState === 'done' && lastExport && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
            <CheckCircleIcon className="h-4 w-4 shrink-0" />
            Saved to: <span className="font-mono truncate">{lastExport}</span>
          </div>
        )}
        {exportState === 'error' && (
          <p className="text-xs text-red-400">{exportError}</p>
        )}

        <Button
          icon={<ArrowDownTrayIcon className="h-4 w-4" />}
          loading={exportState === 'running'}
          onClick={handleExport}>
          Export Backup
        </Button>
      </div>

      {/* Restore */}
      <div className="card p-6 space-y-3 border-red-500/20">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <ArrowUpTrayIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-surface-100">Restore from Backup</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Replace the current database with a backup file. <strong className="text-red-400">All current data will be overwritten</strong> and the app will restart.
            </p>
          </div>
        </div>

        {restoreState === 'error' && (
          <p className="text-xs text-red-400">{restoreError}</p>
        )}

        <Button
          variant="danger"
          icon={<ArrowUpTrayIcon className="h-4 w-4" />}
          loading={restoreState === 'running'}
          onClick={handleRestore}>
          Restore Backup…
        </Button>
      </div>
    </div>
  );
}

// ─── License & Updates ────────────────────────────────────────────────────────

function LicenseTab() {
  const [licStatus, setLicStatus]   = useState(null);
  const [updating, setUpdating]     = useState(false);
  const [keyInput, setKeyInput]     = useState('');
  const [activating, setActivating] = useState(false);
  const [activateErr, setActivateErr] = useState('');
  const [updateInfo, setUpdateInfo] = useState(null);    // { state, info?, progress? }

  // Load license status
  useEffect(() => {
    window.electronAPI?.license?.getStatus().then(setLicStatus);
  }, []);

  // Subscribe to updater events
  useEffect(() => {
    if (!window.electronAPI?.updater?.onStatus) return;
    const unsub = window.electronAPI.updater.onStatus((payload) => {
      setUpdateInfo(payload);
      if (payload.state === 'error') {
        toast.error(`Update error: ${payload.message}`);
      }
    });
    return unsub;
  }, []);

  async function handleActivate(e) {
    e.preventDefault();
    setActivateErr('');
    setActivating(true);
    try {
      const result = await window.electronAPI.license.activate(keyInput.trim().toUpperCase());
      if (result.success) {
        toast.success('License activated!');
        const fresh = await window.electronAPI.license.getStatus();
        setLicStatus(fresh);
        setKeyInput('');
      } else {
        setActivateErr(result.error || 'Invalid key.');
      }
    } catch {
      setActivateErr('Activation failed. Please try again.');
    } finally {
      setActivating(false);
    }
  }

  async function handleDeactivate() {
    await window.electronAPI.license.deactivate();
    const fresh = await window.electronAPI.license.getStatus();
    setLicStatus(fresh);
    toast.success('License removed.');
  }

  async function checkForUpdates() {
    setUpdating(true);
    setUpdateInfo({ state: 'checking' });
    await window.electronAPI.updater.check();
    setUpdating(false);
  }

  async function downloadUpdate() {
    setUpdateInfo(i => ({ ...i, state: 'downloading' }));
    await window.electronAPI.updater.download();
  }

  function formatKey(value) {
    const clean = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 24);
    return clean.match(/.{1,6}/g)?.join('-') ?? clean;
  }

  const lic     = licStatus?.license;
  const trial   = licStatus?.trial;
  const mode    = licStatus?.mode; // 'licensed' | 'trial' | 'expired'

  return (
    <div className="flex flex-col gap-4 max-w-2xl">

      {/* Current license status */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <ShieldCheckIcon className="h-4 w-4 text-surface-400" /> License Status
        </h2>

        {!licStatus ? (
          <div className="h-16 rounded-lg bg-surface-700/40 animate-pulse" />
        ) : (
          <div className="space-y-3">
            {/* Mode badge */}
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium',
              mode === 'licensed' ? 'bg-green-500/10 text-green-400 border border-green-500/20'
              : mode === 'trial'  ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
            )}>
              {mode === 'licensed' ? <ShieldCheckIcon className="h-4 w-4" />
               : <ExclamationTriangleIcon className="h-4 w-4" />}
              {mode === 'licensed' ? `Licensed — ${lic?.tier ?? 'standard'}`
               : mode === 'trial'  ? `Trial — ${trial?.daysLeft} day${trial?.daysLeft !== 1 ? 's' : ''} left`
               : 'Expired'}
            </div>

            {/* License details */}
            {lic?.valid && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <MetaRow label="Tier"   value={<span className="capitalize">{lic.tier}</span>} />
                <MetaRow label="Expiry" value={lic.isLifetime ? 'Lifetime' : lic.expiryDate} />
                {!lic.isLifetime && (
                  <MetaRow label="Days left" value={`${lic.daysLeft} days`} />
                )}
                <MetaRow label="Key"    value={<span className="font-mono text-surface-500 text-2xs truncate">{lic.key}</span>} />
              </div>
            )}

            {/* Trial details */}
            {mode === 'trial' && trial && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <MetaRow label="Trial started" value={trial.startDate} />
                <MetaRow label="Trial ends"    value={trial.expiryDate} />
                <MetaRow label="Days left"     value={`${trial.daysLeft} days`} />
              </div>
            )}

            {/* Deactivate */}
            {lic?.valid && (
              <button onClick={handleDeactivate}
                className="text-xs text-red-400 hover:text-red-300 transition-colors">
                Remove license from this device
              </button>
            )}
          </div>
        )}
      </div>

      {/* Activate new key */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
          <KeyIcon className="h-4 w-4 text-surface-400" />
          {mode === 'licensed' ? 'Change License Key' : 'Activate License'}
        </h2>
        <form onSubmit={handleActivate} className="space-y-3">
          <div>
            <input
              type="text"
              value={keyInput}
              onChange={e => setKeyInput(formatKey(e.target.value))}
              placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
              maxLength={27}
              className={cn(
                'w-full h-10 px-3 rounded-xl font-mono text-sm tracking-widest text-center',
                'bg-surface-800 border focus:outline-none focus:ring-2 focus:ring-primary-500',
                activateErr ? 'border-red-500' : 'border-surface-600 text-surface-100'
              )}
              spellCheck={false}
            />
            {activateErr && <p className="text-xs text-red-400 mt-1">{activateErr}</p>}
          </div>
          <Button
            type="submit"
            size="sm"
            loading={activating}
            disabled={keyInput.replace(/-/g,'').length < 24}>
            Activate Key
          </Button>
        </form>
      </div>

      {/* Auto-updates */}
      {window.electronAPI?.updater && (
        <div className="card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4 text-surface-400" /> Software Updates
          </h2>

          {/* Update state display */}
          {updateInfo && (
            <div className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-xs border',
              updateInfo.state === 'available' || updateInfo.state === 'downloaded'
                ? 'bg-primary-500/10 border-primary-500/20 text-primary-400'
                : updateInfo.state === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-400'
                : 'bg-surface-700 border-surface-600 text-surface-400'
            )}>
              {updateInfo.state === 'checking'      && <><ArrowPathIcon className="h-3.5 w-3.5 animate-spin" /> Checking for updates…</>}
              {updateInfo.state === 'not-available' && <><CheckCircleIcon className="h-3.5 w-3.5" /> You're on the latest version.</>}
              {updateInfo.state === 'available'     && <><ArrowDownTrayIcon className="h-3.5 w-3.5" /> Update available — v{updateInfo.info?.version}</>}
              {updateInfo.state === 'downloading'   && <>
                <ArrowPathIcon className="h-3.5 w-3.5 animate-spin" />
                Downloading… {updateInfo.progress ? `${Math.round(updateInfo.progress.percent)}%` : ''}
              </>}
              {updateInfo.state === 'downloaded'    && <><CheckCircleIcon className="h-3.5 w-3.5" /> Update ready — will install on next restart.</>}
              {updateInfo.state === 'error'         && <><ExclamationTriangleIcon className="h-3.5 w-3.5" /> {updateInfo.message}</>}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" variant="ghost"
              icon={<ArrowPathIcon className="h-4 w-4" />}
              loading={updating || updateInfo?.state === 'checking'}
              onClick={checkForUpdates}>
              Check for Updates
            </Button>
            {updateInfo?.state === 'available' && (
              <Button size="sm"
                icon={<ArrowDownTrayIcon className="h-4 w-4" />}
                onClick={downloadUpdate}>
                Download Update
              </Button>
            )}
            {updateInfo?.state === 'downloaded' && (
              <Button size="sm"
                onClick={() => window.electronAPI.updater.install()}>
                Restart & Install
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-surface-500">{label}</span>
      <span className="text-surface-200">{value}</span>
    </div>
  );
}
