import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  BuildingOfficeIcon, ArchiveBoxIcon, KeyIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon, ShieldCheckIcon,
  ArrowPathIcon, CheckCircleIcon, ExclamationTriangleIcon,
  ClockIcon, FolderOpenIcon, Cog6ToothIcon, DocumentTextIcon,
  CubeIcon, CurrencyDollarIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

import Button from '@components/ui/Button';
import Input from '@components/ui/Input';
import Textarea from '@components/common/Textarea';
import { settingsApi } from '@api/settings.api';
import client from '@api/client';
import { cn } from '@utils/cn';

const TABS = [
  { id: 'company',     label: 'Company',          icon: BuildingOfficeIcon },
  { id: 'preferences', label: 'Preferences',       icon: Cog6ToothIcon },
  { id: 'receipt',     label: 'Receipt',           icon: DocumentTextIcon },
  { id: 'backup',      label: 'Backup & Restore',  icon: ArchiveBoxIcon },
  { id: 'license',     label: 'License & Updates', icon: KeyIcon },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('company');

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-32 w-32 rounded-full bg-slate-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="h-4 w-4 text-primary-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary-400">Configuration</span>
          </div>
          <h1 className="text-2xl font-black text-surface-100 tracking-tight">Settings</h1>
          <p className="text-sm text-surface-400 mt-1">Configure your store, manage backups, and license.</p>
        </div>
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

      {tab === 'company'     && <CompanyTab />}
      {tab === 'preferences' && <PreferencesTab />}
      {tab === 'receipt'     && <ReceiptTab />}
      {tab === 'backup'      && <BackupTab />}
      {tab === 'license'     && <LicenseTab />}
    </div>
  );
}

// ─── Preferences ──────────────────────────────────────────────────────────────

function PreferencesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getAll });
  const company = data?.data?.company     ?? {};
  const prefs   = data?.data?.preferences ?? {};

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm();

  useEffect(() => {
    if (data) {
      reset({
        low_stock_threshold: prefs.low_stock_threshold?.value ?? company.low_stock_threshold?.value ?? '10',
        default_tax_rate:    prefs.default_tax_rate?.value    ?? company.default_tax_rate?.value    ?? '0',
        currency_symbol:     prefs.currency_symbol?.value     ?? company.currency_symbol?.value     ?? '₨',
        receipt_footer:      prefs.receipt_footer?.value      ?? company.receipt_footer?.value      ?? 'Thank you for shopping with us!',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: settingsApi.updateBulk,
    onSuccess:  () => { toast.success('Preferences saved.'); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError:    (err) => toast.error(err.message),
  });

  if (isLoading) return <div className="h-40 rounded-xl bg-surface-700/40 animate-pulse" />;

  return (
    <form onSubmit={handleSubmit(v => saveMutation.mutate(v))} className="flex flex-col gap-5 max-w-2xl">

      {/* Inventory */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-1 border-b border-surface-700">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <CubeIcon className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Inventory</h2>
            <p className="text-xs text-surface-400">Stock alert and product defaults</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input label="Low Stock Alert Threshold" type="number" min="0" step="1"
              {...register('low_stock_threshold')} placeholder="10" />
            <p className="text-[11px] text-surface-500 mt-1.5">Products below this quantity trigger alerts.</p>
          </div>
          <div>
            <Input label="Default Tax Rate (%)" type="number" min="0" max="100" step="0.1"
              {...register('default_tax_rate')} placeholder="0" />
            <p className="text-[11px] text-surface-500 mt-1.5">Pre-filled when creating new products.</p>
          </div>
        </div>
      </div>

      {/* Display */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-1 border-b border-surface-700">
          <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <CurrencyDollarIcon className="h-4 w-4 text-primary-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Display</h2>
            <p className="text-xs text-surface-400">Currency and formatting</p>
          </div>
        </div>
        <div className="max-w-xs">
          <Input label="Currency Symbol" {...register('currency_symbol')} placeholder="₨" />
          <p className="text-[11px] text-surface-500 mt-1.5">Shown before all monetary values in the app.</p>
        </div>
      </div>

      {/* Receipt */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-1 border-b border-surface-700">
          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <DocumentTextIcon className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Receipt</h2>
            <p className="text-xs text-surface-400">Printed receipt customization</p>
          </div>
        </div>
        <div>
          <Textarea label="Receipt Footer Message" rows={2}
            {...register('receipt_footer')}
            placeholder="Thank you for shopping with us!" />
          <p className="text-[11px] text-surface-500 mt-1.5">Printed at the bottom of every receipt.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={saveMutation.isPending} disabled={!isDirty && !saveMutation.isPending}>
          Save Preferences
        </Button>
      </div>
    </form>
  );
}

// ─── Company Info ─────────────────────────────────────────────────────────────

function resizeLogoToBase64(file, maxW = 400, maxH = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width: w, height: h } = img;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/png', 0.92));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function CompanyTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  settingsApi.getAll,
  });

  const company = data?.data?.company ?? {};

  const { register, handleSubmit, reset, formState: { isDirty } } = useForm();

  // Logo state — managed separately from react-hook-form
  const [logoPreview, setLogoPreview] = useState(null); // current img src to display
  const [logoData,    setLogoData]    = useState(null); // null = unchanged, '' = removed, string = new base64
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (data) {
      reset({
        company_name:    company.company_name?.value    ?? '',
        company_tagline: company.company_tagline?.value ?? '',
        company_address: company.company_address?.value ?? '',
        company_city:    company.company_city?.value    ?? '',
        company_phone:   company.company_phone?.value   ?? '',
        company_email:   company.company_email?.value   ?? '',
        company_website: company.company_website?.value ?? '',
      });
      const saved = company.company_logo?.value ?? '';
      setLogoPreview(saved || null);
      setLogoData(null); // reset "pending" flag
    }
  }, [data]);

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB.'); return; }
    try {
      const b64 = await resizeLogoToBase64(file);
      setLogoPreview(b64);
      setLogoData(b64);
    } catch { toast.error('Could not read image file.'); }
  }

  function removeLogo() {
    setLogoPreview(null);
    setLogoData(''); // empty string = clear saved logo
  }

  const saveMutation = useMutation({
    mutationFn: (values) => {
      const payload = { ...values };
      if (logoData !== null) payload.company_logo = logoData; // include only if changed
      return settingsApi.updateBulk(payload);
    },
    onSuccess: () => {
      toast.success('Company settings saved.');
      setLogoData(null);
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const canSave = isDirty || logoData !== null;

  if (isLoading) {
    return <div className="h-40 rounded-xl bg-surface-700/40 animate-pulse" />;
  }

  return (
    <form onSubmit={handleSubmit(v => saveMutation.mutate(v))} className="card p-6 space-y-5 max-w-2xl">
      <h2 className="text-sm font-semibold text-surface-200">Company Information</h2>

      {/* Logo upload */}
      <div>
        <p className="text-xs font-semibold text-surface-400 mb-2 uppercase tracking-wider">Company Logo</p>
        <div className="flex items-center gap-4">
          <div className="w-28 h-16 rounded-xl border border-surface-600 bg-surface-800 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={logoPreview || '/newlogo.png'}
              alt="Company logo"
              className="max-w-full max-h-full object-contain p-1"
            />
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={handleLogoFile}
            />
            <button
              type="button"
              onClick={() => { logoInputRef.current.value = ''; logoInputRef.current.click(); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-600 text-surface-300 hover:bg-surface-700 transition-colors"
            >
              {logoPreview ? 'Change Logo' : 'Upload Logo'}
            </button>
            {logoPreview && (
              <button
                type="button"
                onClick={removeLogo}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Remove (use default)
              </button>
            )}
            <p className="text-xs text-surface-500">PNG · JPG · WebP · max 2 MB</p>
          </div>
        </div>
      </div>

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
        <Button type="submit" loading={saveMutation.isPending} disabled={!canSave && !saveMutation.isPending}>
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Backup & Restore ─────────────────────────────────────────────────────────

const TABLE_LABELS = {
  categories: 'Categories', brands: 'Brands', suppliers: 'Suppliers',
  products: 'Products', product_variants: 'Product Variants', customers: 'Customers',
  sales: 'Sales', sale_items: 'Sale Items', purchases: 'Purchases',
  purchase_items: 'Purchase Items', purchase_payments: 'Purchase Payments',
  returns: 'Returns', return_items: 'Return Items', exchange_items: 'Exchange Items',
  expense_categories: 'Expense Categories', expenses: 'Expenses',
  stock_adjustments: 'Stock Adjustments', stock_adjustment_items: 'Adjustment Items',
};

function BackupTab() {
  const [exportState, setExportState] = useState('idle');   // idle | running | done | error
  const [restoreState, setRestoreState] = useState('idle');
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [lastExport, setLastExport]   = useState(null);
  const [exportError, setExportError] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [autoInfo, setAutoInfo]       = useState(null);
  const [preview, setPreview]         = useState(null);   // parsed backup pending confirmation
  const [restoreInput, setRestoreInput]   = useState('');  // user must type RESTORE
  const [restoreReport, setRestoreReport] = useState(null);
  const [snapPreview, setSnapPreview] = useState(null);   // snapshot pending confirmation
  const fileInputRef = useRef(null);
  const progressRef  = useRef(null);
  const fileRef      = useRef(null);   // holds raw File for FormData upload

  // Server-side snapshot history
  const { data: snapshotsData, isLoading: snapshotsLoading, refetch: refetchSnapshots } = useQuery({
    queryKey: ['backup-history'],
    queryFn:  () => client.get('/backup/history'),
    staleTime: 30_000,
  });
  const snapshots = snapshotsData?.data?.data ?? snapshotsData?.data ?? [];

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
      // Download raw bytes from server — no parse/re-stringify so file is always valid JSON
      const blob = await client.get('/backup/export', { responseType: 'blob' });
      const today = new Date().toISOString().slice(0, 10);
      const filename = `backup-${today}.json`;
      const url = URL.createObjectURL(blob);
      const a  = document.createElement('a');
      a.href   = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setLastExport(filename);
      setExportState('done');
      toast.success('Backup downloaded successfully.');
    } catch (err) {
      setExportError(err.message || 'Export failed.');
      setExportState('error');
    }
  }

  function handleRestoreClick() {
    fileInputRef.current.value = '';
    fileInputRef.current.click();
    setRestoreReport(null);
  }

  async function handleRestoreFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    fileRef.current = file;

    // Read first 16 bytes to check for SQLite magic "SQLite format 3\0"
    const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const isSqlite = (
      header[0] === 0x53 && header[1] === 0x51 &&
      header[2] === 0x4C && header[3] === 0x69
    );

    if (isSqlite) {
      setRestoreInput('');
      setPreview({ _isSqlite: true, _fileName: file.name, _fileSize: file.size });
      return;
    }

    // Try to parse as JSON so we can show record counts in the preview
    let text;
    try {
      const buffer = await file.arrayBuffer();
      const bytes  = new Uint8Array(buffer);
      let decoder = new TextDecoder('utf-8');
      if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
        decoder = new TextDecoder('utf-16le');
        text = decoder.decode(bytes.slice(2));
      } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
        decoder = new TextDecoder('utf-16be');
        text = decoder.decode(bytes.slice(2));
      } else if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        text = decoder.decode(bytes.slice(3));
      } else {
        text = decoder.decode(bytes);
      }
    } catch (err) {
      toast.error(`Could not read file: ${err.message}`);
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      toast.error('This file is not a SQLite database or a valid JSON backup.');
      return;
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      toast.error('Invalid backup structure.');
      return;
    }

    if (parsed.success === true && parsed.data?.version && parsed.data?.data) {
      parsed = parsed.data;
    }

    const hasContent = parsed.data || parsed.categories || parsed.products ||
                       parsed.sales || parsed.customers || parsed.settings;
    if (!hasContent) {
      toast.error('This file does not appear to be a ProBusinessCloud backup. No recognisable data found.');
      return;
    }

    setRestoreInput('');
    setPreview(parsed);
  }

  async function doRestore() {
    if (!preview || !fileRef.current) return;
    setPreview(null);
    setRestoreState('running');
    setRestoreProgress(0);
    setRestoreError('');
    setRestoreReport(null);

    let pct = 0;
    progressRef.current = setInterval(() => {
      pct = Math.min(pct + (pct < 50 ? 3 : pct < 80 ? 1 : 0.3), 90);
      setRestoreProgress(Math.round(pct));
    }, 500);

    try {
      const formData = new FormData();
      formData.append('file', fileRef.current);
      // client.js sets Content-Type: application/json globally — delete it so the
      // browser can set multipart/form-data with the correct boundary automatically
      const res = await client.post('/backup/restore-file', formData, {
        timeout: 300_000,
        transformRequest: [(data, headers) => { delete headers['Content-Type']; return data; }],
      });
      clearInterval(progressRef.current);
      setRestoreProgress(100);
      const report = res?.data?.report ?? res?.report ?? null;
      setRestoreReport(report);
      setTimeout(() => { setRestoreState('done'); setRestoreProgress(0); }, 400);
      toast.success('Backup restored successfully. Please refresh the page.');
    } catch (err) {
      clearInterval(progressRef.current);
      setRestoreProgress(0);
      setRestoreError(err.message || 'Restore failed.');
      setRestoreState('error');
    }
  }

  async function doRestoreSnapshot() {
    if (!snapPreview) return;
    const snap = snapPreview;
    setSnapPreview(null);
    setRestoreState('running');
    setRestoreProgress(0);
    setRestoreError('');
    setRestoreReport(null);

    let pct = 0;
    progressRef.current = setInterval(() => {
      pct = Math.min(pct + (pct < 50 ? 3 : pct < 80 ? 1 : 0.3), 90);
      setRestoreProgress(Math.round(pct));
    }, 500);

    try {
      const res = await client.post(`/backup/restore-snapshot/${snap.id}`, {}, { timeout: 300_000 });
      clearInterval(progressRef.current);
      setRestoreProgress(100);
      const report = res?.data?.report ?? res?.report ?? null;
      setRestoreReport(report);
      setTimeout(() => { setRestoreState('done'); setRestoreProgress(0); }, 400);
      refetchSnapshots();
      toast.success('Snapshot restored successfully. Please refresh the page.');
    } catch (err) {
      clearInterval(progressRef.current);
      setRestoreProgress(0);
      setRestoreError(err.response?.data?.message || err.message || 'Restore failed.');
      setRestoreState('error');
    }
  }

  // Derive counts from backup for preview
  function getPreviewCounts(bk) {
    const src = bk.counts ?? {};
    const d   = bk.data ?? bk;
    return Object.keys(TABLE_LABELS).map(key => ({
      key,
      label: TABLE_LABELS[key],
      count: src[key] ?? d[key]?.length ?? 0,
    })).filter(r => r.count > 0);
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">

      {/* Preview / Confirm modal — always dark regardless of app theme */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl"
            style={{ background: '#111827' }}>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Confirm Restore</h3>
                  <p className="text-xs text-red-400 mt-0.5 font-medium">
                    ⚠ All current products, sales and data will be permanently replaced.
                  </p>
                </div>
              </div>

              {preview._isSqlite ? (
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-3 space-y-1">
                  <p className="text-xs font-semibold text-blue-300">SQLite database detected</p>
                  <p className="text-xs text-blue-400/80 font-mono truncate">{preview._fileName}</p>
                  <p className="text-xs text-blue-400/60">
                    {formatBytes(preview._fileSize)} — the server will convert and import all records automatically.
                  </p>
                </div>
              ) : (
                <>
                  {preview.exported_at && (
                    <div className="flex justify-between text-xs text-slate-400 px-1">
                      <span>Backup date</span>
                      <span className="font-mono">{formatDate(preview.exported_at)}</span>
                    </div>
                  )}
                  <div className="rounded-lg border border-slate-700 overflow-hidden max-h-40 overflow-y-auto">
                    <div className="bg-slate-800/60 px-3 py-1.5 border-b border-slate-700">
                      <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Records to restore</p>
                    </div>
                    {getPreviewCounts(preview).map(row => (
                      <div key={row.key} className="flex justify-between px-3 py-1.5 text-xs border-b border-slate-700/40 last:border-0">
                        <span className="text-slate-400">{row.label}</span>
                        <span className="font-mono text-slate-200">{row.count.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="rounded-lg border border-red-900/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
                Type <span className="font-mono font-bold text-white">RESTORE</span> below to confirm
              </div>
              <input
                type="text"
                value={restoreInput}
                onChange={e => setRestoreInput(e.target.value)}
                placeholder="Type RESTORE to confirm"
                autoFocus
                className="w-full px-3 py-2 rounded-lg text-sm bg-white/5 border border-slate-700 text-slate-100 placeholder-slate-600 outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/20 font-mono"
              />

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setPreview(null); setRestoreInput(''); }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm text-slate-300 border border-slate-600 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={doRestore}
                  disabled={restoreInput.trim().toUpperCase() !== 'RESTORE'}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  Restore Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Snapshot restore confirm modal */}
      {snapPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl" style={{ background: '#111827' }}>
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Restore Snapshot</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    This will upsert all records from this snapshot — existing data is preserved, missing records are re-added.
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Snapshot date</span>
                  <span className="text-slate-200 font-mono">{formatDate(snapPreview.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Products</span>
                  <span className="text-slate-200 font-mono">{snapPreview.row_counts?.products ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sales</span>
                  <span className="text-slate-200 font-mono">{snapPreview.row_counts?.sales ?? '—'}</span>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setSnapPreview(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm text-slate-300 border border-slate-600 hover:bg-slate-800 transition-colors">
                  Cancel
                </button>
                <button onClick={doRestoreSnapshot}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-500 text-white transition-colors">
                  Restore This Snapshot
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Backup History (server snapshots) */}
      <div className="card p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
            <ClockIcon className="h-5 w-5 text-surface-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-surface-100">Backup History</h2>
            <p className="text-xs text-surface-500 mt-0.5">
              Server-side snapshots saved automatically on each export. Restore any one to recover lost data.
            </p>
          </div>
        </div>

        {snapshotsLoading ? (
          <div className="h-16 rounded-lg bg-surface-700/40 animate-pulse" />
        ) : snapshots.length === 0 ? (
          <p className="text-xs text-surface-500 italic">No snapshots yet — export a backup to create the first one.</p>
        ) : (
          <div className="rounded-lg border border-surface-700 overflow-hidden">
            <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-2xs font-semibold uppercase tracking-wider text-surface-500 bg-surface-800/60 px-3 py-1.5 border-b border-surface-700">
              <span>Date</span>
              <span className="text-right pr-4">Products</span>
              <span className="text-right">Sales</span>
            </div>
            {snapshots.map((snap, i) => (
              <div key={snap.id} className={cn(
                'flex items-center gap-2 px-3 py-2.5 text-xs border-b border-surface-700/40 last:border-0',
                i % 2 === 0 ? 'bg-surface-800/20' : ''
              )}>
                <div className="flex-1 min-w-0">
                  <span className="text-surface-300 font-mono">{formatDate(snap.created_at)}</span>
                  {i === 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded text-2xs bg-primary-500/15 text-primary-400">latest</span>
                  )}
                </div>
                <span className="text-surface-400 font-mono pr-4">{snap.row_counts?.products ?? '—'}</span>
                <span className="text-surface-400 font-mono pr-4">{snap.row_counts?.sales ?? '—'}</span>
                <button
                  onClick={() => setSnapPreview(snap)}
                  className="shrink-0 px-2.5 py-1 text-xs rounded-lg bg-surface-700 hover:bg-surface-600 text-surface-300 hover:text-surface-100 transition-colors border border-surface-600"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
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

        {restoreState === 'running' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-surface-400">
              <span>Restoring data…</span>
              <span>{restoreProgress}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-500"
                style={{ width: `${restoreProgress}%` }}
              />
            </div>
          </div>
        )}

        {restoreState === 'done' && restoreReport && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-green-500/20">
              <CheckCircleIcon className="h-4 w-4 text-green-400 shrink-0" />
              <p className="text-xs font-medium text-green-400">Restore complete — per-table results</p>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {Object.entries(restoreReport)
                .filter(([, v]) => v.provided > 0)
                .map(([key, v]) => (
                  <div key={key} className="flex justify-between px-3 py-1.5 text-xs border-b border-surface-700/30 last:border-0">
                    <span className="text-surface-400">{TABLE_LABELS[key] ?? key}</span>
                    <span className="text-surface-300 font-mono">{v.inserted}/{v.provided} restored</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleRestoreFile}
        />
        <Button
          variant="danger"
          icon={<ArrowUpTrayIcon className="h-4 w-4" />}
          loading={restoreState === 'running'}
          disabled={restoreState === 'running'}
          onClick={handleRestoreClick}>
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

// ─── Receipt Customization ────────────────────────────────────────────────────

function ToggleRow({ label, hint, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <div className="flex-1">
        <p className="text-sm font-medium text-surface-200">{label}</p>
        {hint && <p className="text-xs text-surface-500 mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 focus:ring-offset-surface-900',
          checked ? 'bg-primary-600' : 'bg-surface-600',
        )}>
        <span className={cn(
          'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )} />
      </button>
    </div>
  );
}

function ReceiptTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.getAll });

  const [paperSize,    setPaperSize]    = useState('80mm');
  const [showLogo,     setShowLogo]     = useState(true);
  const [showAddress,  setShowAddress]  = useState(true);
  const [showPhone,    setShowPhone]    = useState(true);
  const [showEmail,    setShowEmail]    = useState(false);
  const [showTax,      setShowTax]      = useState(true);
  const [showLoyalty,  setShowLoyalty]  = useState(true);
  const [showBarcode,  setShowBarcode]  = useState(false);
  const [footer,       setFooter]       = useState('Thank you for shopping with us!');
  const [returnPolicy, setReturnPolicy] = useState('');
  const [dirty,        setDirty]        = useState(false);

  const mark = (setter) => (val) => { setter(val); setDirty(true); };

  useEffect(() => {
    if (!data) return;
    const rcpt  = data.data?.receipt     ?? {};
    const prefs = data.data?.preferences ?? {};
    const b = (key, def) => (rcpt[key]?.value ?? def) !== 'false';
    setPaperSize(rcpt.receipt_paper_size?.value ?? '80mm');
    setShowLogo(    b('receipt_show_logo',    'true'));
    setShowAddress( b('receipt_show_address', 'true'));
    setShowPhone(   b('receipt_show_phone',   'true'));
    setShowEmail(   b('receipt_show_email',   'false'));
    setShowTax(     b('receipt_show_tax',     'true'));
    setShowLoyalty( b('receipt_show_loyalty', 'true'));
    setShowBarcode( b('receipt_show_barcode', 'false'));
    setFooter(prefs.receipt_footer?.value ?? rcpt.receipt_footer?.value ?? 'Thank you for shopping with us!');
    setReturnPolicy(rcpt.receipt_return_policy?.value ?? '');
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: settingsApi.updateBulk,
    onSuccess:  () => { toast.success('Receipt settings saved.'); setDirty(false); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError:    (err) => toast.error(err.message),
  });

  function handleSave() {
    saveMutation.mutate({
      receipt_paper_size:    paperSize,
      receipt_show_logo:     String(showLogo),
      receipt_show_address:  String(showAddress),
      receipt_show_phone:    String(showPhone),
      receipt_show_email:    String(showEmail),
      receipt_show_tax:      String(showTax),
      receipt_show_loyalty:  String(showLoyalty),
      receipt_show_barcode:  String(showBarcode),
      receipt_footer:        footer,
      receipt_return_policy: returnPolicy,
    });
  }

  if (isLoading) return <div className="h-40 rounded-xl bg-surface-700/40 animate-pulse" />;

  return (
    <div className="flex flex-col gap-5 max-w-2xl">

      {/* Paper size */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-1 border-b border-surface-700">
          <div className="h-8 w-8 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0">
            <DocumentTextIcon className="h-4 w-4 text-primary-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Paper Size</h2>
            <p className="text-xs text-surface-400">Receipt printer paper width</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: '80mm', label: '80mm Thermal', hint: 'Standard POS receipt' },
            { value: '58mm', label: '58mm Thermal', hint: 'Narrow mini receipt' },
            { value: 'A4',   label: 'A4 Laser',     hint: 'Full-page invoice' },
          ].map(opt => (
            <button key={opt.value} type="button"
              onClick={() => { setPaperSize(opt.value); setDirty(true); }}
              className={cn(
                'flex flex-col items-start p-3.5 rounded-xl border text-left transition-colors',
                paperSize === opt.value
                  ? 'border-primary-500 bg-primary-500/10'
                  : 'border-surface-600 bg-surface-800/50 hover:border-surface-500',
              )}>
              <span className={cn('text-sm font-semibold', paperSize === opt.value ? 'text-primary-300' : 'text-surface-200')}>{opt.label}</span>
              <span className="text-xs text-surface-500 mt-0.5">{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Header elements */}
      <div className="card p-6 space-y-1">
        <div className="flex items-center gap-3 pb-2 mb-1 border-b border-surface-700">
          <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <BuildingOfficeIcon className="h-4 w-4 text-green-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Header Elements</h2>
            <p className="text-xs text-surface-400">What to show at the top of each receipt</p>
          </div>
        </div>
        <ToggleRow label="Company Logo"  hint="Print the company logo at the top"  checked={showLogo}    onChange={mark(setShowLogo)} />
        <ToggleRow label="Address"       hint="Show the store address"              checked={showAddress} onChange={mark(setShowAddress)} />
        <ToggleRow label="Phone Number"  hint="Show contact phone number"           checked={showPhone}   onChange={mark(setShowPhone)} />
        <ToggleRow label="Email Address" hint="Show contact email"                  checked={showEmail}   onChange={mark(setShowEmail)} />
      </div>

      {/* Body elements */}
      <div className="card p-6 space-y-1">
        <div className="flex items-center gap-3 pb-2 mb-1 border-b border-surface-700">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <CurrencyDollarIcon className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Receipt Body</h2>
            <p className="text-xs text-surface-400">Line items and totals section options</p>
          </div>
        </div>
        <ToggleRow label="Tax Breakdown"  hint="Show tax amount separately in totals"          checked={showTax}     onChange={mark(setShowTax)} />
        <ToggleRow label="Loyalty Points" hint="Print earned points and balance at the bottom" checked={showLoyalty} onChange={mark(setShowLoyalty)} />
        <ToggleRow label="Sale Barcode"   hint="Print a scannable barcode of the invoice number" checked={showBarcode} onChange={mark(setShowBarcode)} />
      </div>

      {/* Footer text */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 pb-1 border-b border-surface-700">
          <div className="h-8 w-8 rounded-lg bg-surface-700 flex items-center justify-center shrink-0">
            <SparklesIcon className="h-4 w-4 text-surface-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-surface-200">Footer Content</h2>
            <p className="text-xs text-surface-400">Text printed at the bottom of every receipt</p>
          </div>
        </div>
        <div>
          <Textarea label="Thank-You Message" rows={2}
            value={footer}
            onChange={e => { setFooter(e.target.value); setDirty(true); }}
            placeholder="Thank you for shopping with us!" />
          <p className="text-[11px] text-surface-500 mt-1.5">Printed below the totals on every receipt.</p>
        </div>
        <div>
          <Textarea label="Return Policy" rows={2}
            value={returnPolicy}
            onChange={e => { setReturnPolicy(e.target.value); setDirty(true); }}
            placeholder="Returns accepted within 7 days with receipt." />
          <p className="text-[11px] text-surface-500 mt-1.5">Leave blank to omit the return policy section.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saveMutation.isPending} disabled={!dirty && !saveMutation.isPending}>
          Save Receipt Settings
        </Button>
      </div>
    </div>
  );
}
