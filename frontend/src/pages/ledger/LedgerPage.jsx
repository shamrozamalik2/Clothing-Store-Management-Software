import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpIcon, ArrowDownIcon, ScaleIcon } from '@heroicons/react/24/outline';
import { ledgerApi } from '@api/ledger.api';
import { cn } from '@utils/cn';

const TABS = ['Customers', 'Suppliers', 'AR / AP Summary'];

export default function LedgerPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-surface-100">Ledger & Accounting</h1>
        <p className="text-sm text-surface-400 mt-0.5">Track customer balances, supplier dues, and accounts payable / receivable.</p>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-surface-800 w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === i ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200')}>
            {t}
          </button>
        ))}
      </div>
      {tab === 0 && <CustomerLedgerTab />}
      {tab === 1 && <SupplierLedgerTab />}
      {tab === 2 && <ARAPTab />}
    </div>
  );
}

// ── Customer Ledger ────────────────────────────────────────────────────────────

function CustomerLedgerTab() {
  const [selectedId, setSelectedId] = useState(null);
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]     = useState('');

  const { data: listData } = useQuery({ queryKey: ['ledger-customers'], queryFn: () => ledgerApi.customersSummary() });
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['customer-ledger', selectedId, dateFrom, dateTo],
    queryFn:  () => ledgerApi.customerLedger(selectedId, { from: dateFrom, to: dateTo }),
    enabled:  !!selectedId,
  });

  const customers = listData?.data ?? [];
  const ledger    = ledgerData?.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Customer list */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-700 text-sm font-semibold text-surface-200">Customers</div>
        <div className="overflow-y-auto max-h-[60vh]">
          {customers.map(c => (
            <button key={c.id} onClick={() => setSelectedId(c.id)}
              className={cn('w-full flex items-center justify-between px-4 py-3 text-sm border-b border-surface-700/40 transition-colors',
                selectedId === c.id ? 'bg-primary-500/10 text-primary-300' : 'hover:bg-surface-700/40 text-surface-300')}>
              <div className="text-left">
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-surface-500">{c.phone}</p>
              </div>
              <div className="text-right">
                <p className={cn('font-semibold text-xs', parseFloat(c.current_balance) > 0 ? 'text-red-400' : 'text-green-400')}>
                  ₨{Math.abs(c.current_balance).toLocaleString()}
                </p>
                <p className="text-xs text-surface-600">{parseFloat(c.current_balance) > 0 ? 'Owes' : 'Clear'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ledger detail */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {selectedId && (
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200" />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-400 mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200" />
            </div>
          </div>
        )}

        {!selectedId ? (
          <div className="card flex items-center justify-center py-16 text-surface-600 text-sm">Select a customer to view their ledger.</div>
        ) : isLoading ? (
          <div className="card flex items-center justify-center py-16 text-surface-600 text-sm">Loading…</div>
        ) : ledger ? (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Sales',   value: ledger.summary.total_sales,   color: 'text-surface-200' },
                { label: 'Total Paid',    value: ledger.summary.total_paid,    color: 'text-green-400' },
                { label: 'Balance Due',   value: ledger.summary.current_balance, color: parseFloat(ledger.summary.current_balance) > 0 ? 'text-red-400' : 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="card text-center py-3">
                  <p className="text-xs text-surface-500">{s.label}</p>
                  <p className={cn('text-lg font-bold', s.color)}>₨{Math.abs(s.value).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {/* Credit limit */}
            {parseFloat(ledger.customer.credit_limit) > 0 && (
              <div className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                Credit Limit: ₨{Number(ledger.customer.credit_limit).toLocaleString()} |
                Used: ₨{Number(ledger.summary.current_balance).toLocaleString()}
              </div>
            )}

            {/* Ledger table */}
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/50">
                      <th className="text-left px-4 py-2 text-surface-400 font-medium">Date</th>
                      <th className="text-left px-4 py-2 text-surface-400 font-medium">Ref</th>
                      <th className="text-left px-4 py-2 text-surface-400 font-medium">Type</th>
                      <th className="text-right px-4 py-2 text-surface-400 font-medium">Debit</th>
                      <th className="text-right px-4 py-2 text-surface-400 font-medium">Credit</th>
                      <th className="text-right px-4 py-2 text-surface-400 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {ledger.ledger.length === 0 && (
                      <tr><td colSpan={6} className="py-6 text-center text-surface-600">No transactions found.</td></tr>
                    )}
                    {ledger.ledger.map((e, i) => (
                      <tr key={i} className="hover:bg-surface-800/30">
                        <td className="px-4 py-2 text-surface-400">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-mono text-xs text-surface-300">{e.reference}</td>
                        <td className="px-4 py-2">
                          <span className={cn('px-1.5 py-0.5 rounded text-xs', e.type === 'sale' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400')}>
                            {e.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-surface-200">{parseFloat(e.debit) > 0 ? `₨${Number(e.debit).toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-2 text-right text-green-400">{parseFloat(e.credit) > 0 ? `₨${Number(e.credit).toLocaleString()}` : '—'}</td>
                        <td className={cn('px-4 py-2 text-right font-medium', parseFloat(e.running_balance) > 0 ? 'text-red-400' : 'text-green-400')}>
                          ₨{Math.abs(e.running_balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Supplier Ledger ────────────────────────────────────────────────────────────

function SupplierLedgerTab() {
  const [selectedId, setSelectedId] = useState(null);
  const { data: listData } = useQuery({ queryKey: ['ledger-suppliers'], queryFn: () => ledgerApi.suppliersSummary() });
  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['supplier-ledger', selectedId],
    queryFn:  () => ledgerApi.supplierLedger(selectedId),
    enabled:  !!selectedId,
  });

  const suppliers = listData?.data ?? [];
  const ledger    = ledgerData?.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-700 text-sm font-semibold text-surface-200">Suppliers</div>
        <div className="overflow-y-auto max-h-[60vh]">
          {suppliers.map(s => (
            <button key={s.id} onClick={() => setSelectedId(s.id)}
              className={cn('w-full flex items-center justify-between px-4 py-3 text-sm border-b border-surface-700/40 transition-colors',
                selectedId === s.id ? 'bg-primary-500/10 text-primary-300' : 'hover:bg-surface-700/40 text-surface-300')}>
              <div className="text-left">
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-surface-500">{s.phone}</p>
              </div>
              <p className={cn('font-semibold text-xs', parseFloat(s.current_balance) > 0 ? 'text-red-400' : 'text-green-400')}>
                ₨{Math.abs(s.current_balance).toLocaleString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!selectedId ? (
          <div className="card flex items-center justify-center py-16 text-surface-600 text-sm">Select a supplier to view their ledger.</div>
        ) : isLoading ? (
          <div className="card flex items-center justify-center py-16 text-surface-600 text-sm">Loading…</div>
        ) : ledger ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Purchases', value: ledger.summary.total_purchases, color: 'text-surface-200' },
                { label: 'Total Paid',      value: ledger.summary.total_paid,      color: 'text-green-400' },
                { label: 'Balance Due',     value: ledger.summary.current_balance, color: parseFloat(ledger.summary.current_balance) > 0 ? 'text-red-400' : 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="card text-center py-3">
                  <p className="text-xs text-surface-500">{s.label}</p>
                  <p className={cn('text-lg font-bold', s.color)}>₨{Math.abs(s.value).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div className="card overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-700 bg-surface-800/50">
                      <th className="text-left px-4 py-2 text-surface-400 font-medium">Date</th>
                      <th className="text-left px-4 py-2 text-surface-400 font-medium">Ref</th>
                      <th className="text-left px-4 py-2 text-surface-400 font-medium">Type</th>
                      <th className="text-right px-4 py-2 text-surface-400 font-medium">Debit</th>
                      <th className="text-right px-4 py-2 text-surface-400 font-medium">Credit</th>
                      <th className="text-right px-4 py-2 text-surface-400 font-medium">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-700/40">
                    {ledger.ledger.map((e, i) => (
                      <tr key={i} className="hover:bg-surface-800/30">
                        <td className="px-4 py-2 text-surface-400">{new Date(e.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-mono text-xs text-surface-300">{e.reference}</td>
                        <td className="px-4 py-2"><span className={cn('px-1.5 py-0.5 rounded text-xs', e.type === 'purchase' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400')}>{e.type}</span></td>
                        <td className="px-4 py-2 text-right text-surface-200">{parseFloat(e.debit) > 0 ? `₨${Number(e.debit).toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-2 text-right text-surface-200">{parseFloat(e.credit) > 0 ? `₨${Number(e.credit).toLocaleString()}` : '—'}</td>
                        <td className={cn('px-4 py-2 text-right font-medium', parseFloat(e.running_balance) > 0 ? 'text-red-400' : 'text-green-400')}>
                          ₨{Math.abs(e.running_balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── AR/AP Summary ──────────────────────────────────────────────────────────────

function ARAPTab() {
  const { data } = useQuery({ queryKey: ['ar-ap'], queryFn: () => ledgerApi.arApSummary() });
  const d = data?.data;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="card text-center space-y-2 py-8">
        <ArrowUpIcon className="h-8 w-8 text-red-400 mx-auto" />
        <p className="text-sm text-surface-400">Accounts Receivable</p>
        <p className="text-2xl font-bold text-red-400">₨{d ? Number(d.accounts_receivable).toLocaleString() : '—'}</p>
        <p className="text-xs text-surface-600">Customers owe you this amount</p>
      </div>
      <div className="card text-center space-y-2 py-8">
        <ArrowDownIcon className="h-8 w-8 text-green-400 mx-auto" />
        <p className="text-sm text-surface-400">Accounts Payable</p>
        <p className="text-2xl font-bold text-green-400">₨{d ? Number(d.accounts_payable).toLocaleString() : '—'}</p>
        <p className="text-xs text-surface-600">You owe suppliers this amount</p>
      </div>
      <div className="card text-center space-y-2 py-8">
        <ScaleIcon className="h-8 w-8 text-primary-400 mx-auto" />
        <p className="text-sm text-surface-400">Net Position</p>
        <p className={cn('text-2xl font-bold', d && d.accounts_receivable - d.accounts_payable >= 0 ? 'text-primary-400' : 'text-red-400')}>
          ₨{d ? Math.abs(d.accounts_receivable - d.accounts_payable).toLocaleString() : '—'}
        </p>
        <p className="text-xs text-surface-600">{d && d.accounts_receivable - d.accounts_payable >= 0 ? 'Net positive (receivable)' : 'Net negative (payable)'}</p>
      </div>
    </div>
  );
}
