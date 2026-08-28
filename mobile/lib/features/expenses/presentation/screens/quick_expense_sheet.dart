import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';

// ── Category provider ─────────────────────────────────────────────────────────

final _expenseCategoriesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>((ref) async {
  final res  = await ref.watch(apiClientProvider).get(ApiEndpoints.expenseCategories);
  final data = (res.data as Map<String, dynamic>)['data'] as List? ?? [];
  return data.cast<Map<String, dynamic>>();
});

// ── Sheet ─────────────────────────────────────────────────────────────────────

class QuickExpenseSheet extends ConsumerStatefulWidget {
  const QuickExpenseSheet({super.key, this.onSaved});
  final VoidCallback? onSaved;

  @override
  ConsumerState<QuickExpenseSheet> createState() => _QuickExpenseSheetState();
}

class _QuickExpenseSheetState extends ConsumerState<QuickExpenseSheet> {
  final _amountCtrl = TextEditingController();
  final _noteCtrl   = TextEditingController();
  int?   _categoryId;
  String _method     = 'cash';
  String _date       = DateFormat('yyyy-MM-dd').format(DateTime.now());
  bool   _saving     = false;

  @override
  void dispose() {
    _amountCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text.trim());
    if (amount == null || amount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a valid amount.')));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).post(ApiEndpoints.expenses, data: {
        'amount':         amount,
        'payment_method': _method,
        'expense_date':   _date,
        if (_categoryId != null) 'category_id': _categoryId,
        if (_noteCtrl.text.isNotEmpty) 'description': _noteCtrl.text.trim(),
      });
      widget.onSaved?.call();
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Expense of PKR ${amount.toStringAsFixed(0)} saved.'),
          backgroundColor: Colors.green.shade700,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Failed: $e'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context:    context,
      initialDate: DateTime.now(),
      firstDate:   DateTime(DateTime.now().year - 1),
      lastDate:    DateTime.now(),
    );
    if (picked != null && mounted) {
      setState(() => _date = DateFormat('yyyy-MM-dd').format(picked));
    }
  }

  @override
  Widget build(BuildContext context) {
    final tt    = Theme.of(context).textTheme;
    final cs    = Theme.of(context).colorScheme;
    final mq    = MediaQuery.of(context);
    final cats  = ref.watch(_expenseCategoriesProvider);

    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          mainAxisSize:     MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quick Expense',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 20),

            // Amount
            TextField(
              controller:   _amountCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus:    true,
              decoration: const InputDecoration(
                labelText:  'Amount',
                prefixIcon: Icon(Icons.payments_outlined),
                prefixText: 'PKR ',
              ),
            ),
            const SizedBox(height: 14),

            // Category dropdown
            cats.when(
              loading: () => const LinearProgressIndicator(),
              error:   (_, __) => const SizedBox.shrink(),
              data: (list) => DropdownButtonFormField<int>(
                value:      _categoryId,
                decoration: const InputDecoration(
                  labelText:  'Category (optional)',
                  prefixIcon: Icon(Icons.category_outlined),
                ),
                hint: const Text('Select category'),
                items: [
                  const DropdownMenuItem<int>(value: null, child: Text('— None —')),
                  ...list.map((c) => DropdownMenuItem<int>(
                        value: c['id'] as int?,
                        child: Text(c['name']?.toString() ?? ''),
                      )),
                ],
                onChanged: (v) => setState(() => _categoryId = v),
              ),
            ),
            const SizedBox(height: 14),

            // Method
            DropdownButtonFormField<String>(
              value:      _method,
              decoration: const InputDecoration(
                labelText:  'Payment Method',
                prefixIcon: Icon(Icons.credit_card_outlined),
              ),
              items: const [
                DropdownMenuItem(value: 'cash',          child: Text('Cash')),
                DropdownMenuItem(value: 'card',          child: Text('Card')),
                DropdownMenuItem(value: 'bank_transfer', child: Text('Bank Transfer')),
                DropdownMenuItem(value: 'other',         child: Text('Other')),
              ],
              onChanged: (v) => setState(() => _method = v ?? 'cash'),
            ),
            const SizedBox(height: 14),

            // Date picker
            InkWell(
              onTap:        _pickDate,
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText:  'Date',
                  prefixIcon: Icon(Icons.calendar_today_outlined),
                ),
                child: Text(_date,
                    style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w500)),
              ),
            ),
            const SizedBox(height: 14),

            // Note
            TextField(
              controller: _noteCtrl,
              decoration: const InputDecoration(
                labelText:  'Note (optional)',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(height: 22, width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Save Expense'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
