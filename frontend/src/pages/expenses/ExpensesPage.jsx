import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, PencilIcon, ArrowUpTrayIcon, SparklesIcon, ArrowDownTrayIcon, ReceiptPercentIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { expensesApi } from '@api/expenses.api';
import { formatCurrency } from '@utils/format';
import ImportCsvModal from '@components/common/ImportCsvModal';

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'other'];
const EMPTY = { category_id: '', amount: '', payment_method: 'cash', expense_date: '', description: '', notes: '', is_recurring: false, recurring_day: 1 };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ExpenseModal({ initial, categories, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, expense_date: today(), ...initial });
  const [recurring, setRecurring] = useState(!!initial?.is_recurring);
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);
  const isEdit = !!initial?.id;

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        ...form,
        category_id: form.category_id || undefined,
        amount: parseFloat(form.amount),
        is_recurring: recurring,
        recurring_day: recurring ? parseInt(form.recurring_day, 10) || 1 : undefined,
      };
      if (isEdit) {
        await expensesApi.update(initial.id, payload);
      } else {
        await expensesApi.create(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-900 border border-surface-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-800">
          <h3 className="text-surface-100 font-semibold">{isEdit ? 'Edit Expense' : 'New Expense'}</h3>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-100 text-xl">×</button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Amount (₨) *</label>
              <input
                required type="number" min="0.01" step="0.01"
                value={form.amount} onChange={set('amount')}
                className="w-full bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Date *</label>
              <input
                required type="date"
                value={form.expense_date} onChange={set('expense_date')}
                className="w-full bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-surface-400 mb-1">Category</label>
              <select value={form.category_id} onChange={set('category_id')}
                className="w-full bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">— None —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-400 mb-1">Payment Method</label>
              <select value={form.payment_method} onChange={set('payment_method')}
                className="w-full bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m.replace('_', ' ')}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-surface-400 mb-1">Description</label>
            <input
              value={form.description} onChange={set('description')}
              className="w-full bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="What was this expense for?"
            />
          </div>

          <div>
            <label className="block text-xs text-surface-400 mb-1">Notes</label>
            <textarea
              rows={2} value={form.notes} onChange={set('notes')}
              className="w-full bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Optional notes…"
            />
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between border-t border-surface-700 pt-3">
            <div>
              <p className="text-sm font-medium text-surface-200">Recurring Expense</p>
              <p className="text-xs text-surface-500">Repeat automatically each month</p>
            </div>
            <button type="button" onClick={() => setRecurring(r => !r)}
              className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${recurring ? 'bg-primary-500' : 'bg-surface-600'}`}>
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${recurring ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>
          {recurring && (
            <div>
              <label className="block text-xs text-surface-400 mb-1">Day of Month (1–31)</label>
              <input
                type="number" min={1} max={31}
                value={form.recurring_day} onChange={set('recurring_day')}
                className="w-full bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-surface-400 hover:text-surface-100 text-sm">Cancel</button>
            <button type="submit" disabled={busy}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
              {busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const queryClient  = useQueryClient();

  const [modal,  setModal]  = useState(null); // null | {} | expense object
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [catFilter, setCatFilter] = useState('');
  const [page,   setPage]   = useState(1);
  const [importExpOpen, setImportExpOpen]   = useState(false);
  const [importCatOpen, setImportCatOpen]   = useState(false);
  const [importing, setImporting]           = useState(false);


  const { data: catRes } = useQuery({
    queryKey: ['expense-categories'],
    queryFn:  expensesApi.categories,
  });
  const categories = catRes?.data ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page, from, to, catFilter],
    queryFn:  () => expensesApi.list({ page, limit: 25, from: from || undefined, to: to || undefined, category_id: catFilter || undefined }),
  });

  const expenses   = data?.data?.expenses ?? [];
  const pagination = data?.data?.pagination ?? {};

  const deleteMutation = useMutation({
    mutationFn: (id) => expensesApi.remove(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['expenses'] }),
  });

  async function handleImportExpenses(file) {
    setImporting(true);
    try {
      const res = await expensesApi.importCsv(file);
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      return res.data;
    } catch (err) { return null; } finally { setImporting(false); }
  }

  async function handleImportCategories(file) {
    setImporting(true);
    try {
      const res = await expensesApi.importCategoriesCsv(file);
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      return res.data;
    } catch (err) { return null; } finally { setImporting(false); }
  }

  const handleDelete = (exp) => {
    if (!window.confirm(`Delete expense ${exp.reference}?`)) return;
    deleteMutation.mutate(exp.id);
  };

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.size} expense(s)?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    const results = await Promise.allSettled(ids.map(id => expensesApi.remove(id)));
    const failed = results.filter(r => r.status === 'rejected').length;
    failed ? toast.error(`${failed} could not be deleted.`) : toast.success(`${ids.length} expense(s) deleted.`);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    setBulkDeleting(false);
  }

  const handleSaved = () => {
    setModal(null);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  // Total for current filter
  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-red-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 left-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Finance</span></div>
            <h1 className="text-2xl font-black text-surface-100 tracking-tight">Expenses</h1>
            <p className="text-sm text-surface-400 mt-1">Track and manage business expenditures</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setImportCatOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-primary-500/50 hover:text-primary-300 transition-all"><ArrowUpTrayIcon className="h-4 w-4" /> Import Categories</button>
            <button onClick={() => setImportExpOpen(true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-surface-300 border border-surface-600 hover:border-primary-500/50 hover:text-primary-300 transition-all"><ArrowUpTrayIcon className="h-4 w-4" /> Import Expenses</button>
            <button onClick={() => setModal({})} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-500 shadow-lg shadow-primary-900/40 transition-all"><PlusIcon className="h-4 w-4" /> Add Expense</button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-surface-400 mb-1">From</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-surface-600 bg-surface-700/50 text-surface-200 text-sm px-3 outline-none focus:border-primary-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">To</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              className="h-9 rounded-lg border border-surface-600 bg-surface-700/50 text-surface-200 text-sm px-3 outline-none focus:border-primary-500 transition-colors" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Category</label>
            <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
              className={`h-9 rounded-lg border px-3 text-sm outline-none transition-all ${catFilter ? 'border-primary-500/60 bg-primary-900/30 text-primary-300' : 'border-surface-600 bg-surface-700/50 text-surface-300'}`}>
              <option value="">All categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button onClick={() => { setFrom(''); setTo(''); setCatFilter(''); setPage(1); }}
            className="px-3 py-2 text-surface-400 hover:text-surface-100 text-sm">
            Clear
          </button>
          {expenses.length > 0 && (
            <div className="ml-auto text-right">
              <p className="text-xs text-surface-500">Showing total</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(total)}</p>
            </div>
          )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-900/30 border border-primary-700/40 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50">
            <TrashIcon className="h-3.5 w-3.5" /> Delete selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-surface-700/50 bg-surface-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/80 text-surface-400 text-xs uppercase tracking-widest">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={expenses.length > 0 && selectedIds.size === expenses.length}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(expenses.map(x => x.id)) : new Set())} />
                </th>
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-700 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-surface-500">
                    No expenses found. Click "Add Expense" to record one.
                  </td>
                </tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={selectedIds.has(exp.id)}
                      onChange={e => { const n = new Set(selectedIds); e.target.checked ? n.add(exp.id) : n.delete(exp.id); setSelectedIds(n); }} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-surface-300">{exp.reference}</td>
                  <td className="px-4 py-3 text-surface-300">
                    {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="px-4 py-3 text-surface-300">{exp.category_name || '—'}</td>
                  <td className="px-4 py-3 text-surface-400 max-w-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      {exp.is_recurring && (
                        <span title={`Recurring on day ${exp.recurring_day}`}
                          className="shrink-0 px-1.5 py-0.5 rounded text-2xs bg-primary-500/15 text-primary-400 font-medium">↻</span>
                      )}
                      <span className="truncate">{exp.title || exp.description || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-surface-700 text-surface-300 capitalize">
                      {exp.payment_method?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-red-400">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setModal(exp)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-400 hover:bg-surface-700 transition-colors">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(exp)}
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-400 hover:bg-surface-700 transition-colors">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-700/50 text-sm text-surface-400">
            <span>{pagination.total} expenses</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-lg text-xs">
                ← Prev
              </button>
              <span className="px-3 py-1.5 text-xs">Page {page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 rounded-lg text-xs">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {modal !== null && (
        <ExpenseModal
          initial={modal?.id ? modal : {}}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      <ImportCsvModal
        open={importExpOpen}
        onClose={() => setImportExpOpen(false)}
        onImport={handleImportExpenses}
        entityName="Expenses"
        columns={['title', 'amount', 'payment_method', 'expense_date', 'notes']}
        templateFilename="expenses_template.csv"
        loading={importing}
      />

      <ImportCsvModal
        open={importCatOpen}
        onClose={() => setImportCatOpen(false)}
        onImport={handleImportCategories}
        entityName="Expense Categories"
        columns={['name', 'is_active']}
        templateFilename="expense_categories_template.csv"
        loading={importing}
      />
    </div>
  );
}
