'use strict';

const { Router } = require('express');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const ctrl = require('../controllers/employees.controller');

const router = Router();
router.use(authenticate);

router.get('/',                          requirePermission('hr', 'view'),   ctrl.list);
router.get('/salaries',                  requirePermission('hr', 'view'),   ctrl.listSalaries);
router.post('/salaries/process',         requirePermission('hr', 'edit'),   ctrl.processSalaries);
router.put('/salaries/:id/pay',          requirePermission('hr', 'edit'),   ctrl.paySalary);
router.get('/attendance/summary',        requirePermission('hr', 'view'),   ctrl.attendanceSummary);
router.get('/:id',                       requirePermission('hr', 'view'),   ctrl.getOne);
router.post('/',                         requirePermission('hr', 'create'), ctrl.create);
router.put('/:id',                       requirePermission('hr', 'edit'),   ctrl.update);
router.delete('/:id',                    requirePermission('hr', 'delete'), ctrl.remove);
router.get('/:id/attendance',            requirePermission('hr', 'view'),   ctrl.getAttendance);
router.post('/:id/attendance',           requirePermission('hr', 'edit'),   ctrl.markAttendance);

module.exports = router;
