'use strict';

const { query, withTransaction } = require('../config/database');
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

    const params = [cid];
    const where  = ['company_id = $1'];
    if (search) { params.push(`%${search}%`); where.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR phone ILIKE $${params.length})`); }
    if (is_active !== '') { params.push(is_active === '1'); where.push(`is_active = $${params.length}`); }

    const w = where.join(' AND ');
    const { rows: [{ cnt }] } = await query(`SELECT COUNT(*) AS cnt FROM employees WHERE ${w}`, params);

    params.push(limit, offset);
    const { rows } = await query(`
      SELECT * FROM employees WHERE ${w} ORDER BY name ASC LIMIT $${params.length-1} OFFSET $${params.length}
    `, params);

    return res.json({ success: true, data: rows, pagination: buildPaginationMeta(parseInt(cnt,10), page, limit) });
  } catch (err) { next(err); }
};

exports.getOne = async (req, res, next) => {
  try {
    const { rows: [emp] } = await query(
      'SELECT * FROM employees WHERE id=$1 AND company_id=$2', [req.params.id, req.companyId]
    );
    if (!emp) return error(res, 'Employee not found.', 404);
    return success(res, emp);
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { name, email, phone, address, designation, department, base_salary, allowances, deductions, hire_date, notes } = req.body;
    if (!name) return error(res, 'Employee name is required.', 422);

    const { rows: [emp] } = await query(`
      INSERT INTO employees (company_id, name, email, phone, address, designation, department,
                             base_salary, allowances, deductions, hire_date, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [cid, name, email||null, phone||null, address||null, designation||null, department||null,
        parseFloat(base_salary)||0, parseFloat(allowances)||0, parseFloat(deductions)||0,
        hire_date||null, notes||null]);

    await logAudit(cid, req.user.id, AUDIT_ACTIONS.CREATE, 'employees', emp.id, null, { name });
    return created(res, emp, 'Employee created.');
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const cid = req.companyId;
    const { name, email, phone, address, designation, department, base_salary, allowances, deductions, hire_date, is_active, notes } = req.body;

    const { rows: [emp] } = await query(`
      UPDATE employees SET
        name=$2, email=$3, phone=$4, address=$5, designation=$6, department=$7,
        base_salary=$8, allowances=$9, deductions=$10, hire_date=$11,
        is_active=$12, notes=$13, updated_at=NOW()
      WHERE id=$1 AND company_id=$14
      RETURNING *
    `, [req.params.id, name, email||null, phone||null, address||null, designation||null, department||null,
        parseFloat(base_salary)||0, parseFloat(allowances)||0, parseFloat(deductions)||0,
        hire_date||null, is_active !== false && is_active !== 'false', notes||null, cid]);

    if (!emp) return error(res, 'Employee not found.', 404);
    return success(res, emp, 'Employee updated.');
  } catch (err) { next(err); }
};

exports.remove = async (req, res, next) => {
  try {
    await query('UPDATE employees SET is_active=FALSE, updated_at=NOW() WHERE id=$1 AND company_id=$2', [req.params.id, req.companyId]);
    return success(res, null, 'Employee deactivated.');
  } catch (err) { next(err); }
};

// ── Salary ─────────────────────────────────────────────────────────────────────

// GET /employees/salaries?month=&year=
exports.listSalaries = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();

    const { rows } = await query(`
      SELECT s.*, e.name AS employee_name, e.designation, e.department
      FROM salaries s
      JOIN employees e ON e.id = s.employee_id
      WHERE s.company_id=$1 AND s.month=$2 AND s.year=$3
      ORDER BY e.name
    `, [cid, month, year]);

    return success(res, rows);
  } catch (err) { next(err); }
};

// POST /employees/salaries/process  — generate salary records for a month
exports.processSalaries = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const month = parseInt(req.body.month, 10);
    const year  = parseInt(req.body.year,  10);

    if (!month || !year) return error(res, 'month and year are required.', 422);

    const { rows: employees } = await query(
      'SELECT * FROM employees WHERE company_id=$1 AND is_active=TRUE', [cid]
    );
    if (!employees.length) return error(res, 'No active employees found.', 422);

    const results = [];
    for (const emp of employees) {
      const gross = parseFloat(emp.base_salary) + parseFloat(emp.allowances);
      const net   = gross - parseFloat(emp.deductions);

      const { rows: [sal] } = await query(`
        INSERT INTO salaries
          (company_id, employee_id, month, year, base_salary, allowances, deductions,
           gross_salary, net_salary, status, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10)
        ON CONFLICT (company_id, employee_id, month, year) DO NOTHING
        RETURNING *
      `, [cid, emp.id, month, year, emp.base_salary, emp.allowances, emp.deductions, gross, net, req.user.id]);

      if (sal) results.push(sal);
    }

    return success(res, results, `${results.length} salary record(s) generated.`);
  } catch (err) { next(err); }
};

// PUT /employees/salaries/:id/pay  — mark as paid
exports.paySalary = async (req, res, next) => {
  try {
    const { payment_method = 'cash', notes } = req.body;
    const { rows: [sal] } = await query(`
      UPDATE salaries SET status='paid', paid_at=NOW(), payment_method=$3, notes=$4, updated_at=NOW()
      WHERE id=$1 AND company_id=$2
      RETURNING *
    `, [req.params.id, req.companyId, payment_method, notes||null]);
    if (!sal) return error(res, 'Salary record not found.', 404);
    return success(res, sal, 'Salary marked as paid.');
  } catch (err) { next(err); }
};

// ── Attendance ──────────────────────────────────────────────────────────────────

// GET /employees/:id/attendance?month=&year=
exports.getAttendance = async (req, res, next) => {
  try {
    const cid    = req.companyId;
    const empId  = req.params.id;
    const month  = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year   = parseInt(req.query.year,  10) || new Date().getFullYear();

    const { rows } = await query(`
      SELECT * FROM attendance
      WHERE company_id=$1 AND employee_id=$2
        AND EXTRACT(MONTH FROM date)=$3 AND EXTRACT(YEAR FROM date)=$4
      ORDER BY date
    `, [cid, empId, month, year]);

    return success(res, rows);
  } catch (err) { next(err); }
};

// POST /employees/:id/attendance  — mark attendance
exports.markAttendance = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const empId = req.params.id;
    const { date, status = 'present', check_in, check_out, notes } = req.body;
    const d     = date || new Date().toISOString().slice(0, 10);

    const { rows: [row] } = await query(`
      INSERT INTO attendance (company_id, employee_id, date, status, check_in, check_out, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (company_id, employee_id, date) DO UPDATE
        SET status=$4, check_in=$5, check_out=$6, notes=$7
      RETURNING *
    `, [cid, empId, d, status, check_in||null, check_out||null, notes||null]);

    return success(res, row, 'Attendance marked.');
  } catch (err) { next(err); }
};

// GET /employees/attendance/summary?month=&year=  — all employees for a month
exports.attendanceSummary = async (req, res, next) => {
  try {
    const cid   = req.companyId;
    const month = parseInt(req.query.month, 10) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year,  10) || new Date().getFullYear();

    const { rows } = await query(`
      SELECT e.id, e.name, e.designation, e.department,
             COUNT(*) FILTER (WHERE a.status='present')  AS present_days,
             COUNT(*) FILTER (WHERE a.status='absent')   AS absent_days,
             COUNT(*) FILTER (WHERE a.status='leave')    AS leave_days,
             COUNT(*) FILTER (WHERE a.status='half_day') AS half_days,
             COUNT(a.id) AS total_marked
      FROM employees e
      LEFT JOIN attendance a ON a.employee_id = e.id AND a.company_id = e.company_id
        AND EXTRACT(MONTH FROM a.date) = $2 AND EXTRACT(YEAR FROM a.date) = $3
      WHERE e.company_id = $1 AND e.is_active = TRUE
      GROUP BY e.id, e.name, e.designation, e.department
      ORDER BY e.name
    `, [cid, month, year]);

    return success(res, rows);
  } catch (err) { next(err); }
};
