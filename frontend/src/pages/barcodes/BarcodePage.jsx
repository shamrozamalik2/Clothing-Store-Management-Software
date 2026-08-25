import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import JsBarcode from 'jsbarcode';
import {
  QrCodeIcon,
  PrinterIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  WifiIcon,
  SignalIcon,
  CpuChipIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  SquaresPlusIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { usePermission }      from '@hooks/usePermission';
import { productsApi }        from '@api/products.api';
import { formatCurrency }     from '@utils/format';
import { printerService, BT_SUPPORTED, PLATFORM } from '@utils/printerService';
import Button  from '@components/ui/Button';
import Input   from '@components/ui/Input';
import Badge   from '@components/common/Badge';
import SearchInput from '@components/common/SearchInput';

// ── Barcode generation ───────────────────────────────────────────────────────

function generateNumeric12() {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

function renderBarcode(svgEl, value, opts = {}) {
  if (!svgEl || !value) return false;
  try {
    JsBarcode(svgEl, value, {
      format:       'CODE128',
      lineColor:    '#0f172a',
      background:   '#ffffff',
      width:        2.2,
      height:       65,
      displayValue: true,
      fontSize:     13,
      textAlign:    'center',
      margin:       10,
      ...opts,
    });
    return true;
  } catch {
    if (svgEl) svgEl.innerHTML = '';
    return false;
  }
}

// Render barcode to an off-screen SVG and return the outerHTML string
function getSvgString(value) {
  if (!value) return '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const ok = renderBarcode(svg, value);
  return ok ? svg.outerHTML : '';
}

// ── Connection type config ───────────────────────────────────────────────────

const CONN_TYPES = [
  { id: 'system',    label: 'System Printer', Icon: ComputerDesktopIcon, available: true },
  { id: 'bluetooth', label: 'Bluetooth',       Icon: WifiIcon,            available: BT_SUPPORTED },
  { id: 'network',   label: 'Network',         Icon: SignalIcon,          available: true },
  { id: 'usb',       label: 'USB',             Icon: CpuChipIcon,         available: PLATFORM === 'electron' },
];

// ── Main page ────────────────────────────────────────────────────────────────

export default function BarcodePage() {
  const { can, isAdmin } = usePermission();
  const qc               = useQueryClient();

  const canView   = can('products', 'view');
  const canUpdate = can('products', 'update');

  // ── Product search & selection ──
  const [search, setSearch]           = useState('');
  const [selectedProduct, setProduct] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // ── Barcode state ──
  const [barcodeValue, setBarcodeValue] = useState('');
  const [labelQty, setLabelQty]         = useState(1);
  const [checking, setChecking]         = useState(false);
  const barcodeRef = useRef(null);

  // ── Bulk print ──
  const [bulkSearch, setBulkSearch]   = useState('');
  const [bulkSelected, setBulkSelected] = useState(new Set());
  const [bulkQty, setBulkQty]         = useState(1);
  const [bulkPrinting, setBulkPrinting] = useState(false);

  // ── Printer state ──
  const [printer, setPrinter] = useState({
    status:       'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
    name:         null,
    connType:     'system',
    lastTest:     null,           // null | 'success' | 'failed'
    lastTestMsg:  null,
    error:        null,
  });

  // ── On mount: system printer is always "connected" ──
  useEffect(() => {
    printerService.setConnectionType('system');
    setPrinter(p => ({ ...p, status: 'connected', name: 'System Printer', connType: 'system' }));
  }, []);

  // ── Product search query ──
  const { data: searchData, isLoading: searching } = useQuery({
    queryKey: ['products-barcode-search', search],
    queryFn:  () => productsApi.list({ search, limit: 10, page: 1 }),
    enabled:  search.length >= 1,
    staleTime: 10_000,
  });

  // ── Bulk products query ──
  const { data: bulkData } = useQuery({
    queryKey: ['products-bulk-list', bulkSearch],
    queryFn:  () => productsApi.list({ search: bulkSearch, limit: 50, page: 1 }),
    placeholderData: keepPreviousData,
  });

  const searchResults  = searchData?.data ?? [];
  const bulkProducts   = bulkData?.data ?? [];

  // ── Save barcode mutation ──
  const saveMutation = useMutation({
    mutationFn: ({ id, barcode }) => productsApi.updateBarcode(id, barcode),
    onSuccess: (res) => {
      toast.success('Barcode saved to product.');
      const updated = res.data;
      setProduct(p => ({ ...p, barcode: updated.barcode }));
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Render barcode SVG on value change ──
  useEffect(() => {
    if (!barcodeRef.current) return;
    if (!barcodeValue || barcodeValue.length < 4) {
      barcodeRef.current.innerHTML = '';
      return;
    }
    renderBarcode(barcodeRef.current, barcodeValue);
  }, [barcodeValue]);

  // ── Select product ──
  const selectProduct = useCallback((p) => {
    setProduct(p);
    setShowResults(false);
    setSearch(p.name);
    setBarcodeValue(p.barcode || '');
  }, []);

  // ── Generate barcode ──
  const handleGenerate = async () => {
    setChecking(true);
    let code = '';
    let attempts = 0;
    while (attempts < 10) {
      code = generateNumeric12();
      try {
        await productsApi.getByBarcode(code);
        // If we reach here, barcode is taken — try again
        attempts++;
      } catch {
        // 404 = not found = code is available
        break;
      }
    }
    setChecking(false);
    if (attempts >= 10) {
      toast.error('Could not generate a unique barcode. Please try again.');
      return;
    }
    setBarcodeValue(code);
    toast.success('New barcode generated.');
  };

  // ── Save barcode ──
  const handleSave = () => {
    if (!selectedProduct) return toast.error('Select a product first.');
    if (!barcodeValue.trim()) return toast.error('Barcode cannot be empty.');
    if (barcodeValue.length < 4) return toast.error('Barcode must be at least 4 characters.');
    saveMutation.mutate({ id: selectedProduct.id, barcode: barcodeValue.trim() });
  };

  // ── Print single label ──
  const handlePrint = async () => {
    if (!selectedProduct) return toast.error('Select a product first.');
    if (!barcodeValue) return toast.error('Generate or enter a barcode first.');
    if (!printer.status === 'connected' && printer.connType !== 'system') {
      return toast.error('Connect the printer first.');
    }
    try {
      const svgStr = getSvgString(barcodeValue);
      await printerService.printLabel(selectedProduct, labelQty, svgStr);
      toast.success('Label sent to printer.');
    } catch (err) {
      toast.error(err.message || 'Print failed.');
    }
  };

  // ── Bulk print ──
  const handleBulkPrint = async () => {
    if (bulkSelected.size === 0) return toast.error('Select products to print.');
    setBulkPrinting(true);
    try {
      const items = bulkProducts
        .filter(p => bulkSelected.has(p.id))
        .map(p => ({
          product:   p,
          qty:       bulkQty,
          svgString: getSvgString(p.barcode || p.sku || ''),
        }));
      await printerService.printBulk(items);
      toast.success(`${items.length} label(s) sent to printer.`);
    } catch (err) {
      toast.error(err.message || 'Bulk print failed.');
    } finally {
      setBulkPrinting(false);
    }
  };

  // ── Printer: change connection type ──
  const changeConnType = (type) => {
    printerService.setConnectionType(type);
    if (type === 'system') {
      setPrinter(p => ({ ...p, status: 'connected', name: 'System Printer', connType: type, error: null }));
    } else {
      setPrinter(p => ({ ...p, status: 'disconnected', name: null, connType: type, error: null }));
    }
  };

  // ── Printer: connect ──
  const handleConnect = async () => {
    if (printer.connType === 'system') return;
    if (printer.connType === 'network') {
      toast('Network printer: use system print dialog to select a network printer.', { icon: 'ℹ️' });
      return;
    }
    if (printer.connType === 'usb') {
      if (PLATFORM !== 'electron') {
        toast('USB printers require the desktop (Electron) app.', { icon: 'ℹ️' });
        return;
      }
    }
    if (printer.connType === 'bluetooth' && !BT_SUPPORTED) {
      toast.error('Web Bluetooth is not supported. Use Google Chrome or Microsoft Edge.');
      return;
    }

    setPrinter(p => ({ ...p, status: 'connecting', error: null }));
    try {
      const name = await printerService.connectBluetooth();
      setPrinter(p => ({ ...p, status: 'connected', name, error: null }));
      toast.success(`Connected to "${name}"`);
    } catch (err) {
      setPrinter(p => ({ ...p, status: 'error', error: err.message }));
      toast.error(err.message);
    }
  };

  // ── Printer: disconnect ──
  const handleDisconnect = async () => {
    if (printer.connType === 'system') return;
    await printerService.disconnect();
    setPrinter(p => ({ ...p, status: 'disconnected', name: null, error: null }));
    toast('Printer disconnected.');
  };

  // ── Printer: test ──
  const handleTestPrint = async () => {
    if (!printerService.isConnected) return toast.error('Printer is not connected.');
    try {
      await printerService.testPrint();
      setPrinter(p => ({ ...p, lastTest: 'success', lastTestMsg: 'Test print successful' }));
      toast.success('Test print sent.');
    } catch (err) {
      setPrinter(p => ({ ...p, lastTest: 'failed', lastTestMsg: err.message }));
      toast.error(err.message || 'Test print failed.');
    }
  };

  // ── Printer: test barcode ──
  const handleTestBarcode = async () => {
    if (!printerService.isConnected) return toast.error('Printer is not connected.');
    try {
      const svgStr = getSvgString('123456789012');
      await printerService.testBarcodePrint(svgStr);
      setPrinter(p => ({ ...p, lastTest: 'success', lastTestMsg: 'Test barcode printed' }));
      toast.success('Test barcode sent.');
    } catch (err) {
      setPrinter(p => ({ ...p, lastTest: 'failed', lastTestMsg: err.message }));
      toast.error(err.message || 'Test barcode failed.');
    }
  };

  const printerConnected = printerService.isConnected || printer.connType === 'system';

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-surface-400">
        <ExclamationTriangleIcon className="h-10 w-10" />
        <p className="text-sm">You don't have permission to access Product Barcodes.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-16 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="h-4 w-4 text-primary-400" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary-400">Barcodes</span>
          </div>
          <h1 className="text-2xl font-black text-surface-100 tracking-tight">Product Barcodes</h1>
          <p className="text-sm text-surface-400 mt-1">Generate, manage, and print product barcodes.</p>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT: Barcode management ── */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Product search card */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700/60 pb-3 flex items-center gap-2">
              <MagnifyingGlassIcon className="h-4 w-4" />
              Select Product
            </h2>

            <div className="relative">
              <SearchInput
                value={search}
                onChange={(v) => { setSearch(v); setShowResults(true); }}
                placeholder="Search by name, SKU, or barcode…"
                onFocus={() => setShowResults(true)}
              />
              {/* Dropdown results */}
              {showResults && search.length >= 1 && (
                <div className="absolute z-20 top-10 left-0 right-0 rounded-lg border border-surface-600 shadow-xl max-h-56 overflow-y-auto"
                  style={{ backgroundColor: 'rgb(var(--card))' }}>
                  {searching && (
                    <div className="px-4 py-3 text-sm text-surface-400 flex items-center gap-2">
                      <ArrowPathIcon className="h-4 w-4 animate-spin" /> Searching…
                    </div>
                  )}
                  {!searching && searchResults.length === 0 && (
                    <div className="px-4 py-3 text-sm text-surface-400">No products found.</div>
                  )}
                  {searchResults.map(p => (
                    <button key={p.id}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-700 transition-colors border-b border-surface-700 last:border-0"
                      onMouseDown={() => selectProduct(p)}>
                      <p className="text-sm font-medium text-surface-100 truncate">{p.name}</p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        SKU: {p.sku}
                        {p.barcode ? ` · Barcode: ${p.barcode}` : ' · No barcode'}
                        {' · '}₨ {Number(p.sale_price || 0).toLocaleString()}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected product info */}
            {selectedProduct && (
              <div className="rounded-xl border border-primary-500/30 bg-primary-500/5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-100 truncate">{selectedProduct.name}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <InfoCell label="SKU"      value={selectedProduct.sku} />
                      <InfoCell label="Price"    value={formatCurrency(selectedProduct.sale_price)} />
                      <InfoCell label="Stock"    value={selectedProduct.stock_quantity ?? 0} />
                      <InfoCell label="Barcode"  value={selectedProduct.barcode || '—'} />
                    </div>
                  </div>
                  <button
                    onClick={() => { setProduct(null); setSearch(''); setBarcodeValue(''); }}
                    className="text-surface-500 hover:text-surface-300 shrink-0 mt-0.5">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Barcode generator card */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700/60 pb-3 flex items-center gap-2">
              <QrCodeIcon className="h-4 w-4" />
              Barcode
            </h2>

            <div className="flex gap-2">
              <Input
                value={barcodeValue}
                onChange={e => setBarcodeValue(e.target.value)}
                placeholder="Enter or generate a barcode…"
                containerClassName="flex-1"
              />
              <Button
                variant="outline"
                size="md"
                onClick={handleGenerate}
                loading={checking}
                leftIcon={<SparklesIcon className="h-4 w-4" />}
                title="Generate unique 12-digit barcode"
              >
                Generate
              </Button>
            </div>

            {/* Barcode preview */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-surface-700 bg-white py-4 px-6 min-h-[120px]">
              {barcodeValue && barcodeValue.length >= 4 ? (
                <svg ref={barcodeRef} />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <QrCodeIcon className="h-10 w-10" />
                  <p className="text-xs">Barcode preview will appear here</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {canUpdate && (
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSave}
                  loading={saveMutation.isPending}
                  disabled={!selectedProduct || !barcodeValue}
                  leftIcon={<CheckIcon className="h-4 w-4" />}
                >
                  Save to Product
                </Button>

                <div className="flex items-center gap-1.5 ml-auto">
                  <label className="text-xs text-surface-400">Labels:</label>
                  <input
                    type="number" min={1} max={50} value={labelQty}
                    onChange={e => setLabelQty(Math.max(1, Math.min(50, +e.target.value || 1)))}
                    className="pbc-input w-16 h-8 text-sm text-center rounded-lg border border-surface-600 bg-surface-800 text-surface-100"
                  />
                  <Button
                    size="sm"
                    onClick={handlePrint}
                    disabled={!selectedProduct || !barcodeValue}
                    leftIcon={<PrinterIcon className="h-4 w-4" />}
                  >
                    Print
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk print card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-700/60 pb-3">
              <h2 className="text-sm font-semibold text-surface-200 flex items-center gap-2">
                <SquaresPlusIcon className="h-4 w-4" />
                Bulk Print
                {bulkSelected.size > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold"
                    style={{ background: 'var(--btn-gradient-from, #6366f1)', color: '#fff' }}>
                    {bulkSelected.size}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <label className="text-xs text-surface-400">Qty each:</label>
                <input
                  type="number" min={1} max={20} value={bulkQty}
                  onChange={e => setBulkQty(Math.max(1, Math.min(20, +e.target.value || 1)))}
                  className="pbc-input w-14 h-7 text-sm text-center rounded-lg border border-surface-600 bg-surface-800 text-surface-100"
                />
                <Button
                  size="sm"
                  onClick={handleBulkPrint}
                  loading={bulkPrinting}
                  disabled={bulkSelected.size === 0}
                  leftIcon={<PrinterIcon className="h-4 w-4" />}
                >
                  Bulk Print
                </Button>
              </div>
            </div>

            <SearchInput
              value={bulkSearch}
              onChange={setBulkSearch}
              placeholder="Filter products…"
            />

            <div className="rounded-lg border border-surface-700 overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {bulkProducts.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-surface-400 text-center">No products.</div>
                ) : (
                  bulkProducts.map(p => (
                    <label key={p.id}
                      className="flex items-center gap-3 px-4 py-2.5 border-b border-surface-700 last:border-0 hover:bg-surface-700/50 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-surface-500 text-primary-500 focus:ring-primary-500 h-4 w-4"
                        checked={bulkSelected.has(p.id)}
                        onChange={e => {
                          const s = new Set(bulkSelected);
                          e.target.checked ? s.add(p.id) : s.delete(p.id);
                          setBulkSelected(s);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-100 truncate">{p.name}</p>
                        <p className="text-xs text-surface-400">
                          {p.barcode || p.sku || '—'}
                          {' · '}₨ {Number(p.sale_price || 0).toLocaleString()}
                        </p>
                      </div>
                      {p.barcode ? (
                        <Badge variant="success" dot>Has barcode</Badge>
                      ) : (
                        <Badge variant="neutral" dot>No barcode</Badge>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>

            {bulkSelected.size > 0 && (
              <button
                onClick={() => setBulkSelected(new Set())}
                className="text-xs text-surface-400 hover:text-surface-200 transition-colors">
                Clear selection
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: Printer panel ── */}
        <div className="flex flex-col gap-4">
          <div className="card p-5 space-y-4 sticky top-6">
            <h2 className="text-sm font-semibold text-surface-200 border-b border-surface-700/60 pb-3 flex items-center gap-2">
              <PrinterIcon className="h-4 w-4" />
              Printer
            </h2>

            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-400 uppercase tracking-wide font-semibold">Status</span>
              <PrinterStatusBadge status={printer.status} connType={printer.connType} />
            </div>

            {/* Printer name */}
            {printer.name && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-400">Printer</span>
                <span className="text-sm text-surface-100 font-medium truncate max-w-[140px]">{printer.name}</span>
              </div>
            )}

            {/* Connection type selector */}
            <div>
              <label className="text-xs text-surface-400 uppercase tracking-wide font-semibold block mb-2">Connection</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CONN_TYPES.map(({ id, label, Icon, available }) => (
                  <button key={id}
                    onClick={() => available && changeConnType(id)}
                    disabled={!available}
                    title={!available ? `${label} not available on this platform` : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs font-medium transition-all
                      ${printer.connType === id
                        ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                        : available
                          ? 'border-surface-600 text-surface-400 hover:border-surface-500 hover:text-surface-300'
                          : 'border-surface-700 text-surface-600 cursor-not-allowed opacity-50'}`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Platform info */}
            {printer.connType === 'bluetooth' && !BT_SUPPORTED && (
              <div className="rounded-lg border border-amber-800/40 bg-amber-900/20 px-3 py-2.5 flex gap-2">
                <ExclamationTriangleIcon className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300">
                  Web Bluetooth requires Google Chrome or Microsoft Edge on desktop or Android.
                </p>
              </div>
            )}

            {printer.connType === 'system' && (
              <div className="rounded-lg border border-blue-800/40 bg-blue-900/20 px-3 py-2.5 flex gap-2">
                <InformationCircleIcon className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">
                  System Printer uses your OS print dialog. Works with all connected printers (USB, network, PDF).
                </p>
              </div>
            )}

            {/* Error display */}
            {printer.error && (
              <div className="rounded-lg border border-red-800/40 bg-red-900/20 px-3 py-2.5 flex gap-2">
                <XCircleIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{printer.error}</p>
              </div>
            )}

            {/* Connect / Disconnect buttons */}
            {printer.connType !== 'system' && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  fullWidth
                  variant={printer.status === 'connected' ? 'secondary' : 'primary'}
                  loading={printer.status === 'connecting'}
                  onClick={printer.status === 'connected' ? handleDisconnect : handleConnect}
                  leftIcon={printer.status === 'connected'
                    ? <XCircleIcon className="h-4 w-4" />
                    : <WifiIcon className="h-4 w-4" />}
                >
                  {printer.status === 'connecting' ? 'Connecting…'
                    : printer.status === 'connected' ? 'Disconnect'
                    : 'Connect Printer'}
                </Button>
              </div>
            )}

            {/* Reconnect hint */}
            {printer.status === 'error' && printer.connType !== 'system' && (
              <Button size="sm" variant="outline" fullWidth onClick={handleConnect}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}>
                Retry Connection
              </Button>
            )}

            <div className="border-t border-surface-700 pt-3 space-y-2">
              <Button
                size="sm"
                fullWidth
                variant="secondary"
                onClick={handleTestPrint}
                disabled={!printerConnected}
                leftIcon={<PrinterIcon className="h-4 w-4" />}
              >
                Test Printer
              </Button>

              <Button
                size="sm"
                fullWidth
                variant="outline"
                onClick={handleTestBarcode}
                disabled={!printerConnected}
                leftIcon={<QrCodeIcon className="h-4 w-4" />}
              >
                Print Test Barcode
              </Button>
            </div>

            {/* Last test result */}
            {printer.lastTest && (
              <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-xs
                ${printer.lastTest === 'success'
                  ? 'bg-emerald-900/30 border border-emerald-800/40 text-emerald-400'
                  : 'bg-red-900/30 border border-red-800/40 text-red-400'}`}>
                {printer.lastTest === 'success'
                  ? <CheckCircleIcon className="h-4 w-4 shrink-0" />
                  : <XCircleIcon    className="h-4 w-4 shrink-0" />}
                {printer.lastTestMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function InfoCell({ label, value }) {
  return (
    <div>
      <p className="text-xs text-surface-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-surface-100 truncate">{value ?? '—'}</p>
    </div>
  );
}

function PrinterStatusBadge({ status, connType }) {
  if (connType === 'system' || status === 'connected') {
    return <Badge variant="success" dot>Connected</Badge>;
  }
  if (status === 'connecting') {
    return <Badge variant="info" dot>Connecting…</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="danger" dot>Error</Badge>;
  }
  return <Badge variant="neutral" dot>Not Connected</Badge>;
}
