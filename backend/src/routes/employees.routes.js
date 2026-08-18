'use strict';

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const ctrl = require('../controllers/employees.controller');

const router = Router();
router.use(authenticate);

router.get('/',                          ctrl.list);
router.get('/salaries',                  ctrl.listSalaries);
router.post('/salaries/process',         ctrl.processSalaries);
router.put('/salaries/:id/pay',          ctrl.paySalary);
router.get('/attendance/summary',        ctrl.attendanceSummary);
router.get('/:id',                       ctrl.getOne);
router.post('/',                         ctrl.create);
router.put('/:id',                       ctrl.update);
router.delete('/:id',                    ctrl.remove);
router.get('/:id/attendance',            ctrl.getAttendance);
router.post('/:id/attendance',           ctrl.markAttendance);

module.exports = router;
