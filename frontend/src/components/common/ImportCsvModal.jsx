import { useState, useRef } from 'react';
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Button from '@components/ui/Button';

/**
 * Reusable CSV import modal.
 *
 * Props:
 *  open            – boolean
 *  onClose         – fn()
 *  onImport        – async fn(File) → { imported, failed, errors[] }
 *  entityName      – string, e.g. "Products"
 *  columns         – string[], expected CSV header columns
 *  templateFilename – string, e.g. "products_template.csv"
 *  loading         – boolean
 */
export default function ImportCsvModal({
  open,
  onClose,
  onImport,
  entityName = 'Records',
  columns = [],
  templateFilename = 'template.csv',
  loading = false,
}) {
  const [file, setFile]     = useState(null);
  const [result, setResult] = useState(null);
  const fileRef             = useRef();

  if (!open) return null;

  function downloadTemplate() {
    const csv  = columns.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = templateFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport() {
    if (!file) return;
    const res = await onImport(file);
    if (res) setResult(res);
  }

  function handleClose() {
    setFile(null);
    setResult(null);
    onClose();
  }

  const allGood = result && result.failed === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-surface-700 shadow-2xl"
        style={{ backgroundColor: 'rgb(var(--card))' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center btn-gradient">
              <ArrowUpTrayIcon className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-surface-100">Import {entityName}</h2>
          </div>
          <button onClick={handleClose}
            className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-700/50 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Download template */}
          <div className="flex items-start justify-between gap-4 p-3 rounded-xl bg-surface-800/50 border border-surface-700/50">
            <div>
              <p className="text-sm font-medium text-surface-200">Download Template</p>
              <p className="text-xs text-surface-500 mt-0.5">Fill in your data using this format</p>
            </div>
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ color: '#818cf8', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              {templateFilename}
            </button>
          </div>

          {/* Expected columns */}
          <div>
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">CSV Columns</p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map(col => (
                <span key={col}
                  className="px-2 py-0.5 rounded text-xs font-mono bg-surface-700/70 text-surface-300 border border-surface-600/50">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* File drop zone */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { setFile(e.target.files[0] || null); setResult(null); }}
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200"
              style={{
                borderColor: file ? 'rgba(99,102,241,0.5)' : 'rgb(var(--s-600))',
                background:  file ? 'rgba(99,102,241,0.05)' : 'transparent',
              }}
            >
              {file ? (
                <>
                  <DocumentTextIcon className="h-8 w-8 mx-auto mb-2" style={{ color: '#818cf8' }} />
                  <p className="text-sm font-medium text-surface-200">{file.name}</p>
                  <p className="text-xs text-surface-500 mt-1">
                    {(file.size / 1024).toFixed(1)} KB · click to change
                  </p>
                </>
              ) : (
                <>
                  <ArrowUpTrayIcon className="h-8 w-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-sm text-surface-400">Click to select a <span className="text-surface-300 font-medium">.csv</span> file</p>
                </>
              )}
            </div>
          </div>

          {/* Result banner */}
          {result && (
            <div className={`rounded-xl p-4 text-sm border ${
              allGood
                ? 'bg-green-500/8 border-green-500/20'
                : 'bg-amber-500/8 border-amber-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                {allGood
                  ? <CheckCircleIcon className="h-4 w-4 text-green-400 shrink-0" />
                  : <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 shrink-0" />
                }
                <span className={`font-semibold ${allGood ? 'text-green-300' : 'text-amber-300'}`}>
                  {result.imported} imported
                  {result.failed > 0 && `, ${result.failed} failed`}
                </span>
              </div>
              {result.errors?.length > 0 && (
                <ul className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i} className="text-xs text-surface-400">
                      <span className="text-surface-500">Row {e.row}:</span> {e.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex items-center justify-end gap-3">
          <Button variant="ghost" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleImport}
            loading={loading}
            disabled={!file || loading}
            icon={<ArrowUpTrayIcon className="h-4 w-4" />}
          >
            Import
          </Button>
        </div>
      </div>
    </div>
  );
}
