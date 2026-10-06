import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/errors/app_exception.dart';
import '../../../../core/widgets/grad_widgets.dart';
import '../../data/models/product_model.dart';
import '../providers/products_provider.dart';

/// Creates a product from a scanned code. Opened from the scanner's "not found" result.
/// Pops with the created [ProductModel] on success.
class ProductCreateScreen extends ConsumerStatefulWidget {
  const ProductCreateScreen({
    super.key,
    required this.barcode,
    required this.barcodeAllowed,
  });

  /// The scanned code. Saved with the product only when [barcodeAllowed] is true.
  final String barcode;

  /// False when the business has manufacturer barcodes turned off.
  final bool barcodeAllowed;

  @override
  ConsumerState<ProductCreateScreen> createState() => _ProductCreateScreenState();
}

class _ProductCreateScreenState extends ConsumerState<ProductCreateScreen> {
  final _formKey     = GlobalKey<FormState>();
  final _nameCtrl    = TextEditingController();
  final _barcodeCtrl = TextEditingController();
  final _saleCtrl    = TextEditingController();
  final _costCtrl    = TextEditingController();
  final _qtyCtrl     = TextEditingController(text: '0');
  bool _saving       = false;

  @override
  void initState() {
    super.initState();
    if (widget.barcodeAllowed) _barcodeCtrl.text = widget.barcode;
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _barcodeCtrl.dispose();
    _saleCtrl.dispose();
    _costCtrl.dispose();
    _qtyCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final created = await ref.read(productsSourceProvider).createProduct({
        'name':           _nameCtrl.text.trim(),
        if (widget.barcodeAllowed && _barcodeCtrl.text.trim().isNotEmpty)
          'barcode':      _barcodeCtrl.text.trim(),
        'sale_price':     double.parse(_saleCtrl.text.trim()),
        'cost_price':     double.tryParse(_costCtrl.text.trim()) ?? 0,
        'stock_quantity': double.tryParse(_qtyCtrl.text.trim()) ?? 0,
      });
      if (mounted) Navigator.of(context).pop(created);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content:         Text(_errorText(e)),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  String? _requiredNumber(String? v, {required bool allowEmpty}) {
    if (v == null || v.trim().isEmpty) return allowEmpty ? null : 'Required';
    final n = double.tryParse(v.trim());
    if (n == null || n < 0) return 'Enter a number, 0 or more';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('New Product')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Scanned code: ${widget.barcode}',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                const SizedBox(height: 16),
                TextFormField(
                  controller:         _nameCtrl,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                    labelText:  'Product name',
                    prefixIcon: Icon(Icons.inventory_2_outlined),
                  ),
                  validator: (v) =>
                      (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                ),
                const SizedBox(height: 14),
                if (widget.barcodeAllowed)
                  TextFormField(
                    controller: _barcodeCtrl,
                    decoration: const InputDecoration(
                      labelText:  'Barcode',
                      prefixIcon: Icon(Icons.qr_code_rounded),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color:        cs.surfaceContainer,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      'Manufacturer barcodes are not enabled for your business. '
                      'Save the product, then generate an internal barcode on the web.',
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ),
                const SizedBox(height: 14),
                TextFormField(
                  controller:   _saleCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText:  'Selling price',
                    prefixIcon: Icon(Icons.sell_outlined),
                  ),
                  validator: (v) => _requiredNumber(v, allowEmpty: false),
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller:   _costCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText:  'Purchase price (optional)',
                    prefixIcon: Icon(Icons.shopping_bag_outlined),
                  ),
                  validator: (v) => _requiredNumber(v, allowEmpty: true),
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller:   _qtyCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: const InputDecoration(
                    labelText:  'Opening quantity',
                    prefixIcon: Icon(Icons.numbers_rounded),
                  ),
                  validator: (v) => _requiredNumber(v, allowEmpty: true),
                ),
                const SizedBox(height: 24),
                GradButton(
                  label:     'Save Product',
                  icon:      Icons.save_rounded,
                  onPressed: _save,
                  loading:   _saving,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _errorText(Object e) {
  if (e is DioException && e.error is AppException) {
    return (e.error as AppException).message;
  }
  if (e is AppException) return e.message;
  return e.toString();
}
