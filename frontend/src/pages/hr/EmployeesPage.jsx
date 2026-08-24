import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilSquareIcon, TrashIcon, CalendarDaysIcon, BanknotesIcon, SparklesIcon, UsersIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { employeesApi } from '@api/employees.api';
import { cn } from '@utils/cn';
import Button from '@components/ui/Button';
import Input from '@components/ui/Input';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now    = new Date();

export default function EmployeesPage() {
  const [tab, setTab] = useState('employees'); // employees | salary | attendance
  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface-800 via-surface-800 to-surface-900 border border-surface-700/60 p-6">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-8 right-20 h-32 w-32 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-1"><SparklesIcon className="h-4 w-4 text-primary-400" /><span className="text-xs font-bold uppercase tracking-widest text-primary-400">Human Resources</span></div>
          <h1 className="text-2xl font-black text-surface-100 tracking-tight">HR & Payroll</h1>
          <p className="text-sm text-surface-400 mt-1">Manage employees, process monthly salary, and track attendance</p>
        </div>
      </div>
      <div className="flex gap-1 p-1 rounded-xl bg-surface-800 w-fit">
        {[['employees','Employees'],['salary','Salary'],['attendance','Attendance']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === k ? 'bg-primary-600 text-white' : 'text-surface-400 hover:text-surface-200')}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'employees'  && <EmployeesTab />}
      {tab === 'salary'     && <SalaryTab />}
      {tab === 'attendance' && <AttendanceTab />}
    </div>
  );
}

// ── Employees tab ──────────────────────────────────────────────────────────────

function EmployeesTab() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | { mode:'new'|'edit', emp? }
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list({ limit: 100 }) });
  const employees = data?.data ?? [];

  const saveMut = useMutation({
    mutationFn: (d) => d.id ? employeesApi.update(d.id, d) : employeesApi.create(d),
    onSuccess: (res) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ['employees'] }); setModal(null); },
    onError:   (e)   => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id) => employeesApi.remove(id),
    onSuccess: () => { toast.success('Employee deactivated.'); qc.invalidateQueries({ queryKey: ['employees'] }); },
  });

  async function handleBulkDelete() {
    if (!window.confirm(`Deactivate ${selectedIds.size} employee(s)?`)) return;
    setBulkDeleting(true);
    const ids = [...selectedIds];
    await Promise.allSettled(ids.map(id => employeesApi.remove(id)));
    toast.success(`${ids.length} employee(s) deactivated.`);
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ['employees'] });
    setBulkDeleting(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-surface-400">{employees.length} employee(s)</p>
        <Button onClick={() => setModal({ mode: 'new' })}><PlusIcon className="h-4 w-4" /> Add Employee</Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary-900/30 border border-primary-700/40 rounded-xl">
          <span className="text-sm text-primary-300 font-medium">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={bulkDeleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50">
            <TrashIcon className="h-3.5 w-3.5" /> Deactivate selected
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-surface-400 hover:text-surface-200 transition-colors">Clear</button>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                    checked={employees.length > 0 && selectedIds.size === employees.length}
                    onChange={ex => setSelectedIds(ex.target.checked ? new Set(employees.map(e => e.id)) : new Set())} />
                </th>
              {['Name','Designation','Department','Base Salary','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-surface-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {isLoading && <tr><td colSpan={6} className="py-8 text-center text-surface-600">Loading…</td></tr>}
              {!isLoading && employees.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-surface-600 text-sm">No employees added yet.</td></tr>}
              {employees.map(e => (
                <tr key={e.id} className="hover:bg-surface-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="h-4 w-4 rounded border-surface-600 bg-surface-700 text-primary-600 focus:ring-primary-500 cursor-pointer"
                      checked={selectedIds.has(e.id)}
                      onChange={ev => { const n = new Set(selectedIds); ev.target.checked ? n.add(e.id) : n.delete(e.id); setSelectedIds(n); }} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-surface-200">{e.name}</p>
                    <p className="text-xs text-surface-500">{e.email}</p>
                  </td>
                  <td className="px-4 py-3 text-surface-300">{e.designation || '—'}</td>
                  <td className="px-4 py-3 text-surface-300">{e.department || '—'}</td>
                  <td className="px-4 py-3 text-surface-200">₨{Number(e.base_salary).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', e.is_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>
                      {e.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setModal({ mode: 'edit', emp: e })}
                      className="p-1.5 rounded text-surface-500 hover:text-primary-400 hover:bg-primary-400/10 transition-colors mr-1">
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => window.confirm('Deactivate this employee?') && delMut.mutate(e.id)}
                      className="p-1.5 rounded text-surface-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <EmployeeModal emp={modal.emp} onSave={saveMut.mutate} onClose={() => setModal(null)} saving={saveMut.isPending} />}
    </div>
  );
}

function EmployeeModal({ emp, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    id: emp?.id,
    name: emp?.name || '', email: emp?.email || '', phone: emp?.phone || '',
    designation: emp?.designation || '', department: emp?.department || '',
    base_salary: emp?.base_salary || 0, allowances: emp?.allowances || 0,
    deductions: emp?.deductions || 0, hire_date: emp?.hire_date || '',
    is_active: emp?.is_active !== false, notes: emp?.notes || '',
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-800 rounded-2xl w-full max-w-xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-surface-100">{emp ? 'Edit Employee' : 'New Employee'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Full Name" required value={form.name} onChange={set('name')} className="col-span-2" />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone" value={form.phone} onChange={set('phone')} />
          <Input label="Designation" value={form.designation} onChange={set('designation')} />
          <Input label="Department" value={form.department} onChange={set('department')} />
          <Input label="Base Salary (₨)" type="number" min="0" value={form.base_salary} onChange={set('base_salary')} />
          <Input label="Allowances (₨)" type="number" min="0" value={form.allowances} onChange={set('allowances')} />
          <Input label="Deductions (₨)" type="number" min="0" value={form.deductions} onChange={set('deductions')} />
          <Input label="Hire Date" type="date" value={form.hire_date} onChange={set('hire_date')} />
        </div>
        <div className="flex gap-2 pt-2">
          <Button loading={saving} onClick={() => onSave(form)}>Save</Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  );
}

// ── Salary tab ─────────────────────────────────────────────────────────────────

function SalaryTab() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['salaries', month, year],
    queryFn:  () => employeesApi.listSalaries({ month, year }),
  });
  const salaries = data?.data ?? [];

  const processMut = useMutation({
    mutationFn: () => employeesApi.processSalaries({ month, year }),
    onSuccess: (res) => { toast.success(res.message); qc.invalidateQueries({ queryKey: ['salaries'] }); },
    onError:   (e)   => toast.error(e.message),
  });
  const payMut = useMutation({
    mutationFn: (id) => employeesApi.paySalary(id, { payment_method: 'cash' }),
    onSuccess: ()    => { toast.success('Marked as paid.'); qc.invalidateQueries({ queryKey: ['salaries'] }); },
  });

  const totalNet = salaries.reduce((s, r) => s + parseFloat(r.net_salary || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
            {[now.getFullYear(), now.getFullYear()-1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Button loading={processMut.isPending} onClick={() => processMut.mutate()} variant="secondary">
          Generate Salaries
        </Button>
        {salaries.length > 0 && (
          <div className="ml-auto text-right">
            <p className="text-xs text-surface-500">Total Net Payable</p>
            <p className="text-lg font-bold text-surface-100">₨{totalNet.toLocaleString()}</p>
          </div>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                {['Employee','Designation','Base','Allowances','Deductions','Net Salary','Status',''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-surface-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {isLoading && <tr><td colSpan={8} className="py-8 text-center text-surface-600">Loading…</td></tr>}
              {!isLoading && salaries.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-surface-600 text-sm">
                  No salary records for {MONTHS[month-1]} {year}. Click "Generate Salaries" to create them.
                </td></tr>
              )}
              {salaries.map(s => (
                <tr key={s.id} className="hover:bg-surface-800/40">
                  <td className="px-4 py-3 font-medium text-surface-200">{s.employee_name}</td>
                  <td className="px-4 py-3 text-surface-500">{s.designation || '—'}</td>
                  <td className="px-4 py-3 text-surface-300">₨{Number(s.base_salary).toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-400">+₨{Number(s.allowances).toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-400">-₨{Number(s.deductions).toLocaleString()}</td>
                  <td className="px-4 py-3 font-semibold text-surface-100">₨{Number(s.net_salary).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium',
                      s.status === 'paid' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400')}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status !== 'paid' && (
                      <Button size="xs" onClick={() => payMut.mutate(s.id)} loading={payMut.isPending}>
                        Mark Paid
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Attendance tab ─────────────────────────────────────────────────────────────

function AttendanceTab() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [empId, setEmpId] = useState('');

  const { data: empData } = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list({ limit: 100 }) });
  const { data: summData } = useQuery({
    queryKey: ['attendance-summary', month, year],
    queryFn:  () => employeesApi.attendanceSummary({ month, year }),
  });

  const employees = empData?.data ?? [];
  const summary   = summData?.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
            {MONTHS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
            {[now.getFullYear(), now.getFullYear()-1].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-700 bg-surface-800/50">
                {['Employee','Dept','Present','Absent','Leave','Half Day','Marked'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-surface-400 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700/40">
              {summary.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-surface-600 text-sm">No attendance data.</td></tr>}
              {summary.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-surface-200">{e.name}</td>
                  <td className="px-4 py-3 text-surface-500">{e.department || '—'}</td>
                  <td className="px-4 py-3 text-green-400">{e.present_days}</td>
                  <td className="px-4 py-3 text-red-400">{e.absent_days}</td>
                  <td className="px-4 py-3 text-amber-400">{e.leave_days}</td>
                  <td className="px-4 py-3 text-surface-400">{e.half_days}</td>
                  <td className="px-4 py-3 text-surface-500">{e.total_marked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark attendance section */}
      <AttendanceMarker employees={employees} month={month} year={year} />
    </div>
  );
}

function AttendanceMarker({ employees, month, year }) {
  const qc = useQueryClient();
  const [empId, setEmpId] = useState('');
  const [form,  setForm]  = useState({ date: new Date().toISOString().slice(0, 10), status: 'present', notes: '' });

  const markMut = useMutation({
    mutationFn: (d) => employeesApi.markAttendance(empId, d),
    onSuccess: () => { toast.success('Attendance marked.'); qc.invalidateQueries({ queryKey: ['attendance-summary'] }); },
    onError:   (e) => toast.error(e.message),
  });

  return (
    <div className="card space-y-4">
      <h3 className="text-sm font-semibold text-surface-200 border-b border-surface-700 pb-2">Mark Attendance</h3>
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Employee</label>
          <select value={empId} onChange={e => setEmpId(e.target.value)}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
            <option value="">Select…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <Input label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        <div>
          <label className="block text-xs font-medium text-surface-400 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full bg-surface-700 border border-surface-600 rounded-lg px-3 py-2 text-sm text-surface-200">
            {['present','absent','leave','half_day'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button loading={markMut.isPending} disabled={!empId} onClick={() => markMut.mutate(form)} className="w-full">
            Mark
          </Button>
        </div>
      </div>
    </div>
  );
}
