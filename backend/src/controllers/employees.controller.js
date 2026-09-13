'use strict';

const Employee  = require('../models/Employee');
const Salary    = require('../models/Salary');
const Attendance = require('../models/Attendance');
const { success, created, error } = require('../utils/response');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const { logAudit } = require('../utils/audit');
const { AUDIT_ACTIONS } = require('../config/constants');

// ── Employees CRUD ─────────────────────────────────────────────────────────────

exports.list = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { search = '', is_active = '' } = req.query;
    const { page, limit, offset } = parsePagination(req.query);

    const filter = { company_id: cid };
    if (search)      filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
    if (is_active !== '') filter.is_active = is_active === '1';

    const [total, employees] = await Promise.all([
      Employee.countDocuments(filter),
      Employee.find(filter).sort({ name: 1 }).skip(offset).limit(limit).lean(),
    ]);

    return res.json({ success: true, data: employees.map(e => ({ ...e, id: e._id.toString() })), pagination: buildPaginationMeta(total, page, limit) });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const emp = await Employee.findOne({ _id: req.params.id, company_id: req.companyId }).lean();
    if (!emp) return error(res, 'Employee not found.', 404);
    return success(res, { ...emp, id: emp._id.toString() });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { name, email, phone, address, designation, department, base_salary, allowances, deductions, hire_date, notes } = req.body;
    if (!name) return error(res, 'Employee name is required.', 422);

    const emp = await Employee.create({
      company_id:  cid,
      name, email: email||null, phone: phone||null, address: address||null,
      designation: designation||null, department: department||null,
      base_salary:  parseFloat(base_salary)||0,
      allowances:   parseFloat(allowances)||0,
      deductions:   parseFloat(deductions)||0,
      hire_date:    hire_date ? new Date(hire_date) : null,
      notes:        notes||null,
    });
    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'employees', emp._id.toString(), null, { name });
    return created(res, { ...emp.toJSON(), id: emp._id.toString() }, 'Employee created.');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { name, email, phone, address, designation, department, base_salary, allowances, deductions, hire_date, is_active, notes } = req.body;

    const upd = {
      name,
      email:       email||null,
      phone:       phone||null,
      address:     address||null,
      designation: designation||null,
      department:  department||null,
      base_salary: parseFloat(base_salary)||0,
      allowances:  parseFloat(allowances)||0,
      deductions:  parseFloat(deductions)||0,
      hire_date:   hire_date ? new Date(hire_date) : null,
      is_active:   is_active !== false && is_active !== 'false',
      notes:       notes||null,
      updated_at:  new Date(),
    };

    const emp = await Employee.findOneAndUpdate({ _id: req.params.id, company_id: cid }, upd, { new: true }).lean();
    if (!emp) return error(res, 'Employee not found.', 404);
    return success(res, { ...emp, id: emp._id.toString() }, 'Employee updated.');
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await Employee.findOneAndUpdate({ _id: req.params.id, company_id: req.companyId }, { is_active: false, updated_at: new Date() });
    return success(res, null, 'Employee deactivated.');
  } catch (err) { next(err); }
};

// ── Salary ─────────────────────────────────────────────────────────────────────

exports.listSalaries = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();

    const salaries = await Salary.find({ company_id: cid, month, year }).sort({ created_at: 1 }).lean();

    const empIds   = [...new Set(salaries.map(s => s.employee_id?.toString()).filter(Boolean))];
    const employees = await Employee.find({ _id: { $in: empIds } }, { name: 1, designation: 1, department: 1 }).lean();
    const empMap   = Object.fromEntries(employees.map(e => [e._id.toString(), e]));

    const rows = salaries.map(s => {
      const e = s.employee_id ? empMap[s.employee_id.toString()] : null;
      return { ...s, id: s._id.toString(), employee_name: e?.name || null, designation: e?.designation || null, department: e?.department || null };
    });
    return success(res, rows);
  } catch (err) { next(err); }
};

exports.processSalaries = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const month = parseInt(req.body.month, 10);
    const year  = parseInt(req.body.year,  10);
    if (!month || !year) return error(res, 'month and year are required.', 422);

    const employees = await Employee.find({ company_id: cid, is_active: true }).lean();
    if (!employees.length) return error(res, 'No active employees found.', 422);

    const results = [];
    for (const emp of employees) {
      const gross = parseFloat(emp.base_salary) + parseFloat(emp.allowances);
      const net   = gross - parseFloat(emp.deductions);

      const existing = await Salary.findOne({ company_id: cid, employee_id: emp._id, month, year }).lean();
      if (!existing) {
        const sal = await Salary.create({
          company_id: cid, employee_id: emp._id, month, year,
          base_salary: emp.base_salary, allowances: emp.allowances,
          deductions: emp.deductions, gross_salary: gross, net_salary: net,
          status: 'pending', created_by: req.user.id,
        });
        results.push(sal.toJSON());
      }
    }
    return success(res, results, `${results.length} salary record(s) generated.`);
  } catch (err) { next(err); }
};

exports.paySalary = async (req, res, next) => {
  try {
    const { payment_method = 'cash', notes } = req.body;
    const sal = await Salary.findOneAndUpdate(
      { _id: req.params.id, company_id: req.companyId },
      { status: 'paid', paid_at: new Date(), payment_method, notes: notes || null, updated_at: new Date() },
      { new: true }
    ).lean();
    if (!sal) return error(res, 'Salary record not found.', 404);
    return success(res, { ...sal, id: sal._id.toString() }, 'Salary marked as paid.');
  } catch (err) { next(err); }
};

// ── Attendance ──────────────────────────────────────────────────────────────────

exports.getAttendance = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const empId = req.params.id;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const records = await Attendance.find({ company_id: cid, employee_id: empId, date: { $gte: monthStart, $lte: monthEnd } }).sort({ date: 1 }).lean();
    return success(res, records.map(r => ({ ...r, id: r._id.toString() })));
  } catch (err) { next(err); }
};

exports.markAttendance = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const empId = req.params.id;
    const { date, status = 'present', check_in, check_out, notes } = req.body;
    const d = date ? new Date(date) : new Date();

    const record = await Attendance.findOneAndUpdate(
      { company_id: cid, employee_id: empId, date: d },
      { status, check_in: check_in || null, check_out: check_out || null, notes: notes || null, updated_at: new Date() },
      { upsert: true, new: true }
    ).lean();

    return success(res, { ...record, id: record._id.toString() }, 'Attendance marked.');
  } catch (err) { next(err); }
};

exports.attendanceSummary = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();

    const monthStart = new Date(Date.UTC(year, month - 1, 1));
    const monthEnd   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const employees = await Employee.find({ company_id: cid, is_active: true }).lean();

    const attendanceAgg = await Attendance.aggregate([
      { $match: { company_id: cid, date: { $gte: monthStart, $lte: monthEnd } } },
      { $group: {
        _id:          '$employee_id',
        present_days: { $sum: { $cond: [{ $eq: ['$status', 'present'] },  1, 0] } },
        absent_days:  { $sum: { $cond: [{ $eq: ['$status', 'absent'] },   1, 0] } },
        leave_days:   { $sum: { $cond: [{ $eq: ['$status', 'leave'] },    1, 0] } },
        half_days:    { $sum: { $cond: [{ $eq: ['$status', 'half_day'] }, 1, 0] } },
        total_marked: { $sum: 1 },
      }},
    ]);
    const attMap = Object.fromEntries(attendanceAgg.map(a => [a._id.toString(), a]));

    const data = employees.map(e => {
      const att = attMap[e._id.toString()] || { present_days: 0, absent_days: 0, leave_days: 0, half_days: 0, total_marked: 0 };
      return { id: e._id.toString(), name: e.name, designation: e.designation, department: e.department, ...att };
    }).sort((a, b) => a.name.localeCompare(b.name));

    return success(res, data);
  } catch (err) { next(err); }
};
