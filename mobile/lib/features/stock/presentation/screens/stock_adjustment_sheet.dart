import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../data/models/stock_model.dart';

class StockAdjustmentSheet extends ConsumerStatefulWidget {
  const StockAdjustmentSheet({super.key, required this.item, this.onDone});
  final LowStockItem  item;
  final VoidCallback? onDone;

  @override
  ConsumerState<StockAdjustmentSheet> createState() => _StockAdjustmentSheetState();
}

class _StockAdjustmentSheetState extends ConsumerState<StockAdjustmentSheet> {
  final _qtyCtrl  = TextEditingController();
  final _noteCtrl = TextEditingController();
  String _type    = 'in';
  bool   _saving  = false;

  @override
  void dispose() {
    _qtyCtrl.dispose();
    _noteCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final qty = int.tryParse(_qtyCtrl.text.trim());
    if (qty == null || qty <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Enter a valid quantity.')));
      return;
    }
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).post(ApiEndpoints.stockAdjustments, data: {
        'product_id':        widget.item.id,
        'type':              _type,
        'quantity':          qty,
        if (_noteCtrl.text.isNotEmpty) 'notes': _noteCtrl.text.trim(),
      });
      widget.onDone?.call();
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Stock adjusted: ${_type == 'in' ? '+' : '-'}$qty units.'),
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

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;
    final mq = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          mainAxisSize:     MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Stock Adjustment',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('${widget.item.name}  •  Current: ${widget.item.stockQuantity} units',
                style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
            const SizedBox(height: 20),

            // Type toggle
            Row(
              children: [
                Expanded(
                  child: _TypeBtn(
                    label:    'Stock In',
                    icon:     Icons.add_circle_outline,
                    selected: _type == 'in',
                    color:    const Color(0xFF10B981),
                    onTap:    () => setState(() => _type = 'in'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _TypeBtn(
                    label:    'Stock Out',
                    icon:     Icons.remove_circle_outline,
                    selected: _type == 'out',
                    color:    const Color(0xFFEF4444),
                    onTap:    () => setState(() => _type = 'out'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            TextField(
              controller:   _qtyCtrl,
              keyboardType: TextInputType.number,
              autofocus:    true,
              decoration: InputDecoration(
                labelText:  'Quantity',
                prefixIcon: Icon(
                  _type == 'in' ? Icons.add : Icons.remove,
                  color: _type == 'in' ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                ),
              ),
            ),
            const SizedBox(height: 14),

            TextField(
              controller: _noteCtrl,
              decoration: const InputDecoration(
                labelText:  'Reason / Note (optional)',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
            ),
            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(height: 22, width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Apply Adjustment'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TypeBtn extends StatelessWidget {
  const _TypeBtn({
    required this.label,
    required this.icon,
    required this.selected,
    required this.color,
    required this.onTap,
  });
  final String       label;
  final IconData     icon;
  final bool         selected;
  final Color        color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap:        onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration:   const Duration(milliseconds: 150),
        padding:    const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color:        selected ? color.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border:       Border.all(
              color: selected ? color : Theme.of(context).colorScheme.outlineVariant),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: selected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
                size: 18),
            const SizedBox(width: 6),
            Text(label, style: TextStyle(
              color:      selected ? color : Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
              fontSize:   13,
            )),
          ],
        ),
      ),
    );
  }
}
