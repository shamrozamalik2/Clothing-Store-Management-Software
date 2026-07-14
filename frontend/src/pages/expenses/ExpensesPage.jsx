import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { setPageTitle } from '@store/slices/uiSlice';
import Card from '@components/ui/Card';
import { PlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { expensesApi } from '@api/expenses.api';
import { formatCurrency } from '@utils/format';

const PAYMENT_METHODS = ['cash', 'card', 'bank_transfer', 'other'];
const EMPTY = { category_id: '', amount: '', payment_method: 'cash', expense_date: '', description: '', notes: '' };

function today() {
  return new Date().toISOString().slice(0, 10);
}

function ExpenseModal({ initial, categories, onClose, onSaved }) {
  const [form, setForm] = useState({ ...EMPTY, expense_date: today(), ...initial });
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
  const dispatch     = useDispatch();
  const queryClient  = useQueryClient();

  const [modal,  setModal]  = useState(null); // null | {} | expense object
  const [from,   setFrom]   = useState('');
  const [to,     setTo]     = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [page,   setPage]   = useState(1);

  useEffect(() => { dispatch(setPageTitle('Expenses')); }, []);

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

  const handleDelete = (exp) => {
    if (!window.confirm(`Delete expense ${exp.reference}?`)) return;
    deleteMutation.mutate(exp.id);
  };

  const handleSaved = () => {
    setModal(null);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  // Total for current filter
  const total = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-100">Expenses</h2>
          <p className="text-sm text-surface-500 mt-0.5">Track business expenditures</p>
        </div>
        <button
          onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg"
        >
          <PlusIcon className="h-4 w-4" /> Add Expense
        </button>
      </div>

      {/* Filters */}
      <Card>
        <Card.Content className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-surface-400 mb-1">From</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">To</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              className="bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Category</label>
            <select value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}
              className="bg-surface-800 border border-surface-700 text-surface-100 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
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
        </Card.Content>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-800 text-surface-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Payment</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-700 animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-surface-500">
                    No expenses found. Click "Add Expense" to record one.
                  </td>
                </tr>
              ) : expenses.map(exp => (
                <tr key={exp.id} className="hover:bg-surface-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-surface-300">{exp.reference}</td>
                  <td className="px-4 py-3 text-surface-300">
                    {exp.expense_date ? new Date(exp.expense_date).toLocaleDateString('en-PK') : '—'}
                  </td>
                  <td className="px-4 py-3 text-surface-300">{exp.category_name || '—'}</td>
                  <td className="px-4 py-3 text-surface-400 max-w-xs truncate">{exp.title || exp.description || '—'}</td>
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800 text-sm text-surface-400">
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
      </Card>

      {modal !== null && (
        <ExpenseModal
          initial={modal?.id ? modal : {}}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
