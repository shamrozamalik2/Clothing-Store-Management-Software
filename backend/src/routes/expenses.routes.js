'use strict';

const router = require('express').Router();
const { list, listCategories, create, update, remove, importExpensesCsv, importExpenseCategoriesCsv } = require('../controllers/expenses.controller');
const { authenticate, requirePermission } = require('../middleware/auth.middleware');
const { body }        = require('express-validator');
const csvUpload       = require('../utils/csv-uploader');

const validateExpense = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('payment_method').optional().isIn(['cash','card','bank_transfer','other']),
  body('expense_date').optional().isISO8601().toDate(),
];

router.use(authenticate);

router.get('/',            requirePermission('expenses', 'view'),   list);
router.get('/categories',  requirePermission('expenses', 'view'),   listCategories);
router.post('/',           requirePermission('expenses', 'create'), validateExpense, create);
router.patch('/:id',       requirePermission('expenses', 'update'), validateExpense, update);
router.delete('/:id',      requirePermission('expenses', 'delete'), remove);
router.post('/import',            requirePermission('expenses', 'create'), csvUpload.single('file'), importExpensesCsv);
router.post('/categories/import', requirePermission('expenses', 'create'), csvUpload.single('file'), importExpenseCategoriesCsv);

module.exports = router;
