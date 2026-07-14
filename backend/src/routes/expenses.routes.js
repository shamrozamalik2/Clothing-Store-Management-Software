'use strict';

const router = require('express').Router();
const { list, listCategories, create, update, remove } = require('../controllers/expenses.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body }        = require('express-validator');

const validateExpense = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('payment_method').optional().isIn(['cash','card','bank_transfer','other']),
  body('expense_date').optional().isISO8601().toDate(),
];

router.use(authenticate);

router.get('/',            list);
router.get('/categories',  listCategories);
router.post('/',           validateExpense, create);
router.patch('/:id',       validateExpense, update);
router.delete('/:id',      remove);

module.exports = router;
