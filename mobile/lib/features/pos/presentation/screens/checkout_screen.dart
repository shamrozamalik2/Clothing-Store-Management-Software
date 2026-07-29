import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/cart_provider.dart';
import '../../data/models/cart_item_model.dart';
import '../../data/sources/pos_remote_source.dart';
import '../../../../core/utils/currency_formatter.dart';

// ---------------------------------------------------------------------------
// CheckoutScreen
// ---------------------------------------------------------------------------

class CheckoutScreen extends ConsumerStatefulWidget {
  /// Passed via GoRouter's `extra`. Should be a [CartState] or null.
  final Object? cartExtra;

  const CheckoutScreen({super.key, this.cartExtra});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  // Payment
  String _paymentMethod = 'cash';
  final TextEditingController _cashCtrl = TextEditingController();
  double _cashReceived = 0.0;

  // Customer search
  List<Map<String, dynamic>> _customerResults = [];
  bool _searchingCustomers = false;
  final TextEditingController _customerSearchCtrl = TextEditingController();
  Timer? _customerDebounce;

  // State
  bool _submitting = false;

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  CartState _resolveCart() {
    final extra = widget.cartExtra;
    if (extra is CartState) return extra;
    return ref.read(cartProvider);
  }

  double get _change {
    final cart = _resolveCart();
    return (_cashReceived - cart.total).clamp(0.0, double.infinity);
  }

  bool get _canConfirm {
    if (_submitting) return false;
    final cart = _resolveCart();
    if (cart.items.isEmpty) return false;
    if (_paymentMethod == 'cash' && _cashReceived < cart.total) return false;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Customer search
  // ---------------------------------------------------------------------------

  void _searchCustomers(String query) {
    _customerDebounce?.cancel();
    _customerDebounce =
        Timer(const Duration(milliseconds: 350), () async {
      if (!mounted) return;
      setState(() => _searchingCustomers = true);
      try {
        final results = await ref
            .read(posRemoteSourceProvider)
            .getCustomers(search: query);
        if (mounted) setState(() => _customerResults = results);
      } finally {
        if (mounted) setState(() => _searchingCustomers = false);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Confirm sale
  // ---------------------------------------------------------------------------

  Future<void> _confirmSale() async {
    if (!_canConfirm) return;
    setState(() => _submitting = true);

    final cart = _resolveCart();

    final payload = <String, dynamic>{
      'customerId': cart.customerId,
      'customerName': cart.customerName,
      'items': cart.items
          .map((item) => {
                'productId': item.productId,
                'name': item.name,
                'qty': item.quantity,
                'price': item.price,
                'costPrice': item.costPrice,
                'discount': item.discount,
                'barcode': item.barcode,
                'unit': item.unit,
                'lineTotal': item.lineTotal,
              })
          .toList(),
      'subtotal': cart.subtotal,
      'discountPercent': cart.discountPercent,
      'discountAmount': cart.discountAmount,
      'taxPercent': cart.taxPercent,
      'taxAmount': cart.taxAmount,
      'total': cart.total,
      'paymentMethod': _paymentMethod,
      if (_paymentMethod == 'cash') 'cashReceived': _cashReceived,
      if (_paymentMethod == 'cash') 'change': _change,
      'note': cart.note,
    };

    try {
      final result =
          await ref.read(posRemoteSourceProvider).createSale(payload);
      if (!mounted) return;

      final invoiceNumber =
          result['invoiceNumber'] ?? result['invoice_number'] ?? result['id'];

      await _showSuccessDialog(cart, invoiceNumber?.toString() ?? '—');

      // Clear cart and navigate back to POS.
      ref.read(cartProvider.notifier).clearCart();
      if (mounted) context.go('/pos');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save sale: $e'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _showSuccessDialog(
      CartState cart, String invoiceNumber) {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Icon(Icons.check_circle_rounded,
                color: Colors.green[600], size: 28),
            const SizedBox(width: 8),
            const Text('Sale Complete'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _InfoRow(
                label: 'Invoice #', value: invoiceNumber),
            if (cart.customerName != null)
              _InfoRow(
                  label: 'Customer', value: cart.customerName!),
            _InfoRow(
                label: 'Total',
                value: formatCurrency(cart.total),
                bold: true),
            _InfoRow(
                label: 'Payment', value: _paymentMethod.toUpperCase()),
            if (_paymentMethod == 'cash') ...[
              _InfoRow(
                  label: 'Cash received',
                  value: formatCurrency(_cashReceived)),
              _InfoRow(
                  label: 'Change',
                  value: formatCurrency(_change),
                  valueColor: Colors.green[700]),
            ],
          ],
        ),
        actions: [
          OutlinedButton.icon(
            // Placeholder — hook up to a real print service when ready.
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                    content: Text('Print feature coming soon')),
              );
            },
            icon: const Icon(Icons.print_outlined),
            label: const Text('Print Receipt'),
          ),
          FilledButton.icon(
            onPressed: () => Navigator.pop(ctx),
            icon: const Icon(Icons.shopping_cart_outlined),
            label: const Text('New Sale'),
          ),
        ],
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  @override
  void dispose() {
    _cashCtrl.dispose();
    _customerSearchCtrl.dispose();
    _customerDebounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cart = _resolveCart();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 640),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // ---- Order Summary ---------------------------------
                _SectionCard(
                  title: 'Order Summary',
                  icon: Icons.receipt_long_outlined,
                  child: Column(
                    children: [
                      ...cart.items.map((item) => _OrderItemRow(item: item)),
                      const Divider(height: 20),
                      _TotalLine(
                          label: 'Subtotal',
                          amount: cart.subtotal),
                      if (cart.discountAmount > 0)
                        _TotalLine(
                          label:
                              'Discount (${cart.discountPercent.toStringAsFixed(1)}%)',
                          amount: -cart.discountAmount,
                          color: Colors.orange[700],
                        ),
                      if (cart.taxAmount > 0)
                        _TotalLine(
                            label:
                                'Tax (${cart.taxPercent.toStringAsFixed(1)}%)',
                            amount: cart.taxAmount),
                      const Divider(height: 14),
                      _TotalLine(
                        label: 'TOTAL',
                        amount: cart.total,
                        bold: true,
                        color: Theme.of(context).colorScheme.primary,
                        fontSize: 18,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // ---- Customer ----------------------------------
                _SectionCard(
                  title: 'Customer (optional)',
                  icon: Icons.person_outline,
                  child: cart.customerName != null
                      ? Row(
                          children: [
                            const Icon(Icons.check_circle_outline,
                                color: Colors.green),
                            const SizedBox(width: 8),
                            Expanded(
                                child: Text(cart.customerName!,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600))),
                            TextButton(
                              onPressed: () => ref
                                  .read(cartProvider.notifier)
                                  .clearCustomer(),
                              child: const Text('Change'),
                            ),
                          ],
                        )
                      : Column(
                          children: [
                            TextField(
                              controller: _customerSearchCtrl,
                              onChanged: _searchCustomers,
                              decoration: InputDecoration(
                                hintText: 'Search customer…',
                                prefixIcon:
                                    const Icon(Icons.search),
                                isDense: true,
                                border: OutlineInputBorder(
                                    borderRadius:
                                        BorderRadius.circular(10)),
                                suffixIcon: _searchingCustomers
                                    ? const Padding(
                                        padding: EdgeInsets.all(12),
                                        child: SizedBox(
                                          width: 16,
                                          height: 16,
                                          child:
                                              CircularProgressIndicator(
                                                  strokeWidth: 2),
                                        ),
                                      )
                                    : null,
                              ),
                            ),
                            if (_customerResults.isNotEmpty)
                              Container(
                                margin: const EdgeInsets.only(top: 6),
                                decoration: BoxDecoration(
                                  border: Border.all(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .outlineVariant),
                                  borderRadius:
                                      BorderRadius.circular(10),
                                ),
                                child: ListView.builder(
                                  shrinkWrap: true,
                                  physics:
                                      const NeverScrollableScrollPhysics(),
                                  itemCount: _customerResults.length
                                      .clamp(0, 5),
                                  itemBuilder: (context, i) {
                                    final c = _customerResults[i];
                                    return ListTile(
                                      dense: true,
                                      leading: const Icon(
                                          Icons.person_outline),
                                      title: Text(
                                          c['name'] as String? ?? ''),
                                      subtitle: Text(
                                          c['phone'] as String? ?? ''),
                                      onTap: () {
                                        ref
                                            .read(cartProvider
                                                .notifier)
                                            .setCustomer(
                                              c['id'] as int,
                                              c['name'] as String,
                                            );
                                        _customerSearchCtrl.clear();
                                        setState(
                                            () => _customerResults =
                                                []);
                                      },
                                    );
                                  },
                                ),
                              ),
                          ],
                        ),
                ),
                const SizedBox(height: 16),

                // ---- Payment Method ----------------------------
                _SectionCard(
                  title: 'Payment Method',
                  icon: Icons.payments_outlined,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _PaymentChip(
                            label: 'Cash',
                            icon: Icons.money,
                            value: 'cash',
                            selected: _paymentMethod == 'cash',
                            onTap: () => setState(
                                () => _paymentMethod = 'cash'),
                          ),
                          _PaymentChip(
                            label: 'Card',
                            icon: Icons.credit_card,
                            value: 'card',
                            selected: _paymentMethod == 'card',
                            onTap: () => setState(
                                () => _paymentMethod = 'card'),
                          ),
                          _PaymentChip(
                            label: 'Bank Transfer',
                            icon: Icons.account_balance,
                            value: 'bank',
                            selected: _paymentMethod == 'bank',
                            onTap: () => setState(
                                () => _paymentMethod = 'bank'),
                          ),
                          _PaymentChip(
                            label: 'Split',
                            icon: Icons.call_split,
                            value: 'split',
                            selected: _paymentMethod == 'split',
                            onTap: () => setState(
                                () => _paymentMethod = 'split'),
                          ),
                        ],
                      ),
                      // Cash received + change
                      if (_paymentMethod == 'cash') ...[
                        const SizedBox(height: 16),
                        TextField(
                          controller: _cashCtrl,
                          keyboardType:
                              const TextInputType.numberWithOptions(
                                  decimal: true),
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(
                                RegExp(r'^\d*\.?\d*'))
                          ],
                          decoration: InputDecoration(
                            labelText: 'Cash Received',
                            prefixIcon:
                                const Icon(Icons.money),
                            border: OutlineInputBorder(
                                borderRadius:
                                    BorderRadius.circular(10)),
                          ),
                          onChanged: (v) {
                            setState(() {
                              _cashReceived =
                                  double.tryParse(v) ?? 0.0;
                            });
                          },
                        ),
                        if (_cashReceived > 0) ...[
                          const SizedBox(height: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: _change >= 0
                                  ? Colors.green[50]
                                  : Colors.red[50],
                              borderRadius:
                                  BorderRadius.circular(10),
                              border: Border.all(
                                color: _change >= 0
                                    ? Colors.green[200]!
                                    : Colors.red[200]!,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment:
                                  MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  _cashReceived < cart.total
                                      ? 'Remaining'
                                      : 'Change',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: _change >= 0
                                        ? Colors.green[800]
                                        : Colors.red[800],
                                  ),
                                ),
                                Text(
                                  _cashReceived < cart.total
                                      ? formatCurrency(
                                          cart.total -
                                              _cashReceived)
                                      : formatCurrency(_change),
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 16,
                                    color: _change >= 0
                                        ? Colors.green[800]
                                        : Colors.red[800],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // ---- Confirm button --------------------------------
                FilledButton.icon(
                  onPressed: _canConfirm ? _confirmSale : null,
                  icon: _submitting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: Text(
                    _submitting
                        ? 'Processing…'
                        : 'Confirm Sale  ${formatCurrency(cart.total)}',
                  ),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    textStyle: const TextStyle(
                        fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helper widgets
// ---------------------------------------------------------------------------

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Widget child;

  const _SectionCard({
    required this.title,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
            color: Theme.of(context)
                .colorScheme
                .outlineVariant
                .withOpacity(0.5)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(icon,
                    size: 18,
                    color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                Text(
                  title,
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    );
  }
}

class _OrderItemRow extends StatelessWidget {
  final CartItemModel item;
  const _OrderItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name,
                    style: const TextStyle(fontWeight: FontWeight.w500)),
                Text(
                  '${item.quantity} × ${formatCurrency(item.price)}',
                  style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.outline),
                ),
              ],
            ),
          ),
          Text(
            formatCurrency(item.lineTotal),
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

class _TotalLine extends StatelessWidget {
  final String label;
  final double amount;
  final bool bold;
  final Color? color;
  final double? fontSize;

  const _TotalLine({
    required this.label,
    required this.amount,
    this.bold = false,
    this.color,
    this.fontSize,
  });

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontWeight: bold ? FontWeight.bold : null,
          fontSize: fontSize,
          color: color,
        );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(
            amount < 0
                ? '− ${formatCurrency(-amount)}'
                : formatCurrency(amount),
            style: style,
          ),
        ],
      ),
    );
  }
}

class _PaymentChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final String value;
  final bool selected;
  final VoidCallback onTap;

  const _PaymentChip({
    required this.label,
    required this.icon,
    required this.value,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        padding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          color: selected
              ? colorScheme.primaryContainer
              : colorScheme.surfaceContainerHighest,
          border: Border.all(
            color: selected
                ? colorScheme.primary
                : colorScheme.outlineVariant,
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: selected
                  ? colorScheme.primary
                  : colorScheme.outline,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontWeight:
                    selected ? FontWeight.bold : FontWeight.normal,
                color: selected
                    ? colorScheme.primary
                    : colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  const _InfoRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.outline,
                  fontSize: 13)),
          Text(
            value,
            style: TextStyle(
              fontWeight: bold ? FontWeight.bold : FontWeight.w500,
              color: valueColor,
              fontSize: bold ? 15 : 13,
            ),
          ),
        ],
      ),
    );
  }
}
