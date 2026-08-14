import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../providers/cart_provider.dart';
import '../../data/models/cart_item_model.dart';
import '../../data/sources/pos_remote_source.dart';
import '../widgets/product_grid.dart';
import '../../../products/data/models/product_model.dart';
import '../../../products/presentation/providers/products_provider.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../shell/main_shell.dart';

// ---------------------------------------------------------------------------
// PosScreen
// ---------------------------------------------------------------------------

class PosScreen extends ConsumerStatefulWidget {
  const PosScreen({super.key});

  @override
  ConsumerState<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends ConsumerState<PosScreen> {
  // Product state
  List<ProductModel> _products = [];
  List<String> _categories = [];
  bool _loadingProducts = false;
  String _searchQuery = '';
  String? _selectedCategory;

  // Discount controller (cart panel)
  final TextEditingController _discountCtrl = TextEditingController(text: '0');
  final TextEditingController _taxCtrl = TextEditingController(text: '0');
  final TextEditingController _searchCtrl = TextEditingController();

  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchProducts());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _discountCtrl.dispose();
    _taxCtrl.dispose();
    _searchCtrl.dispose();
    super.dispose();
  }

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  Future<void> _fetchProducts() async {
    if (!mounted) return;
    setState(() => _loadingProducts = true);
    try {
      final apiClient = ref.read(apiClientProvider);
      final response = await apiClient.get(
        '/products',
        queryParameters: {
          if (_searchQuery.isNotEmpty) 'search': _searchQuery,
          'limit': '200',
        },
      );
      final raw = (response.data as Map<String, dynamic>?)?['data'];
      final products = (raw is List ? raw : [])
          .map((e) => ProductModel.fromJson(e as Map<String, dynamic>))
          .toList()
          .cast<ProductModel>();

      // Build category list once from first full load.
      if (_categories.isEmpty) {
        final cats = products
            .map((p) => p.categoryName)
            .whereType<String>()
            .toSet()
            .toList()
          ..sort();
        _categories = cats;
      }

      if (mounted) setState(() => _products = products);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load products: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _loadingProducts = false);
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      setState(() => _searchQuery = value);
      _fetchProducts();
    });
  }

  List<ProductModel> get _filteredProducts {
    final cat = _selectedCategory;
    if (cat == null) return _products;
    return _products.where((p) => p.categoryName == cat).toList();
  }

  // -------------------------------------------------------------------------
  // Barcode scanner
  // -------------------------------------------------------------------------

  Future<void> _openBarcodeScanner() async {
    await showDialog<void>(
      context: context,
      builder: (ctx) => _BarcodeScanDialog(
        onDetected: (barcode) {
          Navigator.pop(ctx);
          _applyBarcode(barcode);
        },
      ),
    );
  }

  void _applyBarcode(String barcode) {
    // Try matching against already loaded products first (fast path).
    final match = _products.where((p) => p.barcode == barcode).toList();
    if (match.isNotEmpty) {
      ref.read(cartProvider.notifier).addItem(match.first);
      _showAddedSnack(match.first.name);
      return;
    }
    // Slow path: fetch from server.
    ref
        .read(cartProvider.notifier)
        .applyBarcodeResult(barcode, ref.read(productsSourceProvider))
        .then((_) {
      final cart = ref.read(cartProvider);
      if (cart.items.isNotEmpty) {
        _showAddedSnack(cart.items.last.name);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('No product found for barcode: $barcode')),
        );
      }
    });
  }

  void _showAddedSnack(String name) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(
        content: Text('Added: $name'),
        duration: const Duration(seconds: 1),
        behavior: SnackBarBehavior.floating,
      ));
  }

  // -------------------------------------------------------------------------
  // Held carts
  // -------------------------------------------------------------------------

  Future<void> _openHeldCarts() async {
    final source = ref.read(posRemoteSourceProvider);
    final heldCarts = await source.getHeldCarts();
    if (!mounted) return;

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _HeldCartsSheet(
        heldCarts: heldCarts,
        onRestore: (cartJson) async {
          Navigator.pop(ctx);
          final restored = CartState.fromJson(cartJson);
          ref.read(cartProvider.notifier).restoreCart(restored);
          await source.removeHeldCart(cartJson['_id'] as String);
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Cart restored')),
            );
          }
        },
        onDelete: (id) async {
          await source.removeHeldCart(id);
          Navigator.pop(ctx);
          _openHeldCarts(); // re-open refreshed
        },
      ),
    );
  }

  Future<void> _holdCurrentCart() async {
    final cart = ref.read(cartProvider);
    if (cart.items.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cart is empty')),
      );
      return;
    }
    await ref.read(posRemoteSourceProvider).holdCart(cart.toJson());
    ref.read(cartProvider.notifier).clearCart();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cart held — tap to restore anytime')),
      );
    }
  }

  // -------------------------------------------------------------------------
  // Customer picker
  // -------------------------------------------------------------------------

  Future<void> _pickCustomer() async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (ctx) => _CustomerPickerDialog(
        posRemoteSource: ref.read(posRemoteSourceProvider),
      ),
    );
    if (result != null) {
      ref.read(cartProvider.notifier).setCustomer(
            result['id'] as int,
            result['name'] as String,
          );
    }
  }

  // -------------------------------------------------------------------------
  // Build helpers
  // -------------------------------------------------------------------------

  Widget _buildProductPanel() {
    return Column(
      children: [
        // Search bar
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 12, 12, 6),
          child: TextField(
            controller: _searchCtrl,
            onChanged: _onSearchChanged,
            decoration: InputDecoration(
              hintText: 'Search products…',
              prefixIcon: const Icon(Icons.search),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear),
                      onPressed: () {
                        _searchCtrl.clear();
                        _onSearchChanged('');
                      },
                    )
                  : null,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              filled: true,
              contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 12),
            ),
          ),
        ),
        // Category chips
        if (_categories.isNotEmpty)
          SizedBox(
            height: 42,
            child: ListView(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              scrollDirection: Axis.horizontal,
              children: [
                _CategoryChip(
                  label: 'All',
                  selected: _selectedCategory == null,
                  onTap: () => setState(() => _selectedCategory = null),
                ),
                const SizedBox(width: 6),
                ..._categories.map((cat) => Padding(
                      padding: const EdgeInsets.only(right: 6),
                      child: _CategoryChip(
                        label: cat,
                        selected: _selectedCategory == cat,
                        onTap: () => setState(() =>
                            _selectedCategory =
                                _selectedCategory == cat ? null : cat),
                      ),
                    )),
              ],
            ),
          ),
        // Product grid
        Expanded(
          child: ProductGrid(
            products: _filteredProducts,
            loading: _loadingProducts,
            onTap: (product) {
              ref.read(cartProvider.notifier).addItem(product);
              _showAddedSnack(product.name);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCartPanel(CartState cart, {ScrollController? scrollCtrl}) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      color: colorScheme.surfaceContainerLow,
      child: Column(
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 8, 0),
            child: Row(
              children: [
                const Icon(Icons.shopping_cart_outlined),
                const SizedBox(width: 8),
                Text('Cart',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        )),
                const Spacer(),
                if (cart.items.isNotEmpty)
                  TextButton.icon(
                    onPressed: _holdCurrentCart,
                    icon: const Icon(Icons.pause_circle_outline, size: 18),
                    label: const Text('Hold'),
                  ),
                if (cart.items.isNotEmpty)
                  TextButton.icon(
                    onPressed: () {
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Clear cart?'),
                          content: const Text(
                              'All items will be removed from the cart.'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('Cancel')),
                            FilledButton(
                              style: FilledButton.styleFrom(
                                  backgroundColor: colorScheme.error),
                              onPressed: () {
                                Navigator.pop(ctx);
                                ref
                                    .read(cartProvider.notifier)
                                    .clearCart();
                              },
                              child: const Text('Clear'),
                            ),
                          ],
                        ),
                      );
                    },
                    icon: Icon(Icons.delete_sweep_outlined,
                        size: 18, color: colorScheme.error),
                    label: Text('Clear',
                        style: TextStyle(color: colorScheme.error)),
                  ),
              ],
            ),
          ),
          const Divider(height: 14),
          // Customer chip
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: cart.customerName != null
                ? InputChip(
                    avatar: const Icon(Icons.person, size: 16),
                    label: Text(cart.customerName!),
                    onDeleted: () =>
                        ref.read(cartProvider.notifier).clearCustomer(),
                    deleteIcon: const Icon(Icons.close, size: 14),
                  )
                : OutlinedButton.icon(
                    onPressed: _pickCustomer,
                    icon: const Icon(Icons.person_add_alt, size: 18),
                    label: const Text('Add Customer'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 38),
                    ),
                  ),
          ),
          const SizedBox(height: 8),
          // Cart items list
          Expanded(
            child: cart.items.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.shopping_cart_outlined,
                            size: 56,
                            color: colorScheme.outlineVariant),
                        const SizedBox(height: 8),
                        Text('Cart is empty',
                            style: Theme.of(context)
                                .textTheme
                                .bodyMedium
                                ?.copyWith(
                                    color: colorScheme.outline)),
                      ],
                    ),
                  )
                : ListView.separated(
                    controller: scrollCtrl,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, __) =>
                        const SizedBox(height: 6),
                    itemBuilder: (context, index) =>
                        _CartItemRow(
                      item: cart.items[index],
                      onIncrement: () => ref
                          .read(cartProvider.notifier)
                          .updateQty(cart.items[index].productId,
                              cart.items[index].quantity + 1),
                      onDecrement: () => ref
                          .read(cartProvider.notifier)
                          .updateQty(cart.items[index].productId,
                              cart.items[index].quantity - 1),
                      onRemove: () => ref
                          .read(cartProvider.notifier)
                          .removeItem(cart.items[index].productId),
                    ),
                  ),
          ),
          // Totals section
          if (cart.items.isNotEmpty) ...[
            const Divider(height: 1),
            _CartTotalsPanel(
              cart: cart,
              discountCtrl: _discountCtrl,
              taxCtrl: _taxCtrl,
              onDiscountChanged: (v) {
                final val = double.tryParse(v);
                if (val != null) {
                  ref.read(cartProvider.notifier).setDiscount(val);
                }
              },
              onTaxChanged: (v) {
                final val = double.tryParse(v);
                if (val != null) {
                  ref.read(cartProvider.notifier).setTax(val);
                }
              },
              onCheckout: () {
                context.push('/pos/checkout', extra: ref.read(cartProvider));
              },
            ),
          ],
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // build
  // -------------------------------------------------------------------------

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);
    final isWide = MediaQuery.of(context).size.width >= 800;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Point of Sale'),
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
        ),
        actions: [
          IconButton(
            tooltip: 'Scan barcode',
            icon: const Icon(Icons.qr_code_scanner),
            onPressed: _openBarcodeScanner,
          ),
          IconButton(
            tooltip: 'Held carts',
            icon: const Icon(Icons.pause_circle_outlined),
            onPressed: _openHeldCarts,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: isWide
          ? Row(
              children: [
                Expanded(flex: 3, child: _buildProductPanel()),
                const VerticalDivider(width: 1),
                SizedBox(
                  width: 340,
                  child: _buildCartPanel(cart),
                ),
              ],
            )
          : _buildProductPanel(),
      floatingActionButton: !isWide && cart.items.isNotEmpty
          ? FloatingActionButton.extended(
              onPressed: () => _showCartSheet(context, cart),
              icon: Badge(
                label: Text('${cart.itemCount}'),
                child: const Icon(Icons.shopping_cart),
              ),
              label: Text(formatCurrency(cart.total)),
            )
          : null,
    );
  }

  void _showCartSheet(BuildContext context, CartState cart) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize: 0.35,
        maxChildSize: 0.95,
        expand: false,
        builder: (ctx, scrollCtrl) => Consumer(
          builder: (context, ref, _) {
            final liveCart = ref.watch(cartProvider);
            return _buildCartPanel(liveCart, scrollCtrl: scrollCtrl);
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _CartItemRow
// ---------------------------------------------------------------------------

class _CartItemRow extends StatelessWidget {
  final CartItemModel item;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;
  final VoidCallback onRemove;

  const _CartItemRow({
    required this.item,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        child: Row(
          children: [
            // Name + price
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600)),
                  Text(
                    '${formatCurrency(item.price)} / ${item.unit}',
                    style: TextStyle(
                        fontSize: 11, color: colorScheme.outline),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            // Qty stepper
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _SmallIconButton(
                    icon: Icons.remove_circle_outline,
                    onTap: onDecrement),
                SizedBox(
                  width: 28,
                  child: Text(
                    '${item.quantity}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                ),
                _SmallIconButton(
                    icon: Icons.add_circle_outline, onTap: onIncrement),
              ],
            ),
            const SizedBox(width: 8),
            // Line total
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatCurrency(item.lineTotal),
                  style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                      fontSize: 13),
                ),
                if (item.discount > 0)
                  Text(
                    '-${formatCurrency(item.discount)}',
                    style: TextStyle(
                        fontSize: 10,
                        color: Colors.orange[700]),
                  ),
              ],
            ),
            const SizedBox(width: 4),
            // Remove
            IconButton(
              icon: Icon(Icons.close,
                  size: 16, color: colorScheme.outlineVariant),
              onPressed: onRemove,
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _CartTotalsPanel
// ---------------------------------------------------------------------------

class _CartTotalsPanel extends StatelessWidget {
  final CartState cart;
  final TextEditingController discountCtrl;
  final TextEditingController taxCtrl;
  final ValueChanged<String> onDiscountChanged;
  final ValueChanged<String> onTaxChanged;
  final VoidCallback onCheckout;

  const _CartTotalsPanel({
    required this.cart,
    required this.discountCtrl,
    required this.taxCtrl,
    required this.onDiscountChanged,
    required this.onTaxChanged,
    required this.onCheckout,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 10, 12, 14),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Discount + Tax inputs
          Row(
            children: [
              Expanded(
                child: _PercentField(
                  label: 'Discount %',
                  controller: discountCtrl,
                  onChanged: onDiscountChanged,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _PercentField(
                  label: 'Tax %',
                  controller: taxCtrl,
                  onChanged: onTaxChanged,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          // Subtotal, discount, tax rows
          _TotalRow(
              label: 'Subtotal',
              value: formatCurrency(cart.subtotal)),
          if (cart.discountAmount > 0)
            _TotalRow(
              label: 'Discount (${cart.discountPercent.toStringAsFixed(1)}%)',
              value: '− ${formatCurrency(cart.discountAmount)}',
              valueColor: Colors.orange[700],
            ),
          if (cart.taxAmount > 0)
            _TotalRow(
              label: 'Tax (${cart.taxPercent.toStringAsFixed(1)}%)',
              value: formatCurrency(cart.taxAmount),
            ),
          const Divider(height: 12),
          _TotalRow(
            label: 'TOTAL',
            value: formatCurrency(cart.total),
            bold: true,
            valueColor: colorScheme.primary,
          ),
          const SizedBox(height: 12),
          // Checkout button
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: cart.items.isNotEmpty ? onCheckout : null,
              icon: const Icon(Icons.point_of_sale),
              label: Text(
                  'Checkout  ${formatCurrency(cart.total)}'),
              style: FilledButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                textStyle: const TextStyle(
                    fontSize: 15, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class _SmallIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _SmallIconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Padding(
          padding: const EdgeInsets.all(4),
          child: Icon(icon, size: 20,
              color: Theme.of(context).colorScheme.primary),
        ),
      );
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final Color? valueColor;

  const _TotalRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodyMedium?.copyWith(
          fontWeight: bold ? FontWeight.bold : null,
          fontSize: bold ? 15 : null,
        );
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(value,
              style: style?.copyWith(color: valueColor)),
        ],
      ),
    );
  }
}

class _PercentField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final ValueChanged<String> onChanged;

  const _PercentField({
    required this.label,
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      onChanged: onChanged,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))
      ],
      style: const TextStyle(fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        isDense: true,
        suffixText: '%',
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _CategoryChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return FilterChip(
      label: Text(label, style: const TextStyle(fontSize: 12)),
      selected: selected,
      onSelected: (_) => onTap(),
      showCheckmark: false,
      padding: const EdgeInsets.symmetric(horizontal: 4),
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      visualDensity: VisualDensity.compact,
    );
  }
}

// ---------------------------------------------------------------------------
// _BarcodeScanDialog
// ---------------------------------------------------------------------------

class _BarcodeScanDialog extends StatefulWidget {
  final void Function(String barcode) onDetected;

  const _BarcodeScanDialog({required this.onDetected});

  @override
  State<_BarcodeScanDialog> createState() => _BarcodeScanDialogState();
}

class _BarcodeScanDialogState extends State<_BarcodeScanDialog> {
  bool _detected = false;

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SizedBox(
        width: 320,
        height: 380,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                  horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  const Text('Scan Barcode',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(16)),
                child: MobileScanner(
                  onDetect: (capture) {
                    if (_detected) return;
                    final raw =
                        capture.barcodes.firstOrNull?.rawValue;
                    if (raw != null && raw.isNotEmpty) {
                      _detected = true;
                      widget.onDetected(raw);
                    }
                  },
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _HeldCartsSheet
// ---------------------------------------------------------------------------

class _HeldCartsSheet extends StatelessWidget {
  final List<Map<String, dynamic>> heldCarts;
  final void Function(Map<String, dynamic>) onRestore;
  final void Function(String) onDelete;

  const _HeldCartsSheet({
    required this.heldCarts,
    required this.onRestore,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              const Text('Held Carts',
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.bold)),
              const Spacer(),
              IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 8),
          if (heldCarts.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: Text('No held carts'),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              itemCount: heldCarts.length,
              itemBuilder: (context, index) {
                final c = heldCarts[index];
                final items =
                    (c['items'] as List? ?? []);
                final total =
                    (c['total'] as num?)?.toDouble() ?? 0.0;
                final heldAt = c['_heldAt'] as String? ?? '';
                final id = c['_id'] as String? ?? '';

                return ListTile(
                  leading: const CircleAvatar(
                    child: Icon(Icons.pause),
                  ),
                  title: Text(
                      '${items.length} item(s) — ${formatCurrency(total)}'),
                  subtitle: Text(heldAt.isNotEmpty
                      ? _formatDateTime(heldAt)
                      : 'Unknown time'),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(Icons.restore),
                        tooltip: 'Restore',
                        onPressed: () => onRestore(c),
                      ),
                      IconButton(
                        icon: const Icon(Icons.delete_outline,
                            color: Colors.red),
                        tooltip: 'Delete',
                        onPressed: () => onDelete(id),
                      ),
                    ],
                  ),
                );
              },
            ),
        ],
      ),
    );
  }

  String _formatDateTime(String iso) {
    try {
      final dt = DateTime.parse(iso).toLocal();
      return '${dt.day}/${dt.month}/${dt.year} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    } catch (_) {
      return iso;
    }
  }
}

// ---------------------------------------------------------------------------
// _CustomerPickerDialog
// ---------------------------------------------------------------------------

class _CustomerPickerDialog extends StatefulWidget {
  final PosRemoteSource posRemoteSource;

  const _CustomerPickerDialog({required this.posRemoteSource});

  @override
  State<_CustomerPickerDialog> createState() =>
      _CustomerPickerDialogState();
}

class _CustomerPickerDialogState extends State<_CustomerPickerDialog> {
  List<Map<String, dynamic>> _customers = [];
  bool _loading = false;
  Timer? _debounce;

  void _search(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () async {
      if (!mounted) return;
      setState(() => _loading = true);
      try {
        final results =
            await widget.posRemoteSource.getCustomers(search: query);
        if (mounted) setState(() => _customers = results);
      } finally {
        if (mounted) setState(() => _loading = false);
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _search('');
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape:
          RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SizedBox(
        width: 360,
        height: 420,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 8, 8),
              child: Row(
                children: [
                  const Text('Select Customer',
                      style: TextStyle(
                          fontSize: 16, fontWeight: FontWeight.bold)),
                  const Spacer(),
                  IconButton(
                      icon: const Icon(Icons.close),
                      onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: TextField(
                autofocus: true,
                onChanged: _search,
                decoration: InputDecoration(
                  hintText: 'Search by name or phone…',
                  prefixIcon: const Icon(Icons.search),
                  isDense: true,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
            const SizedBox(height: 8),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _customers.isEmpty
                      ? const Center(child: Text('No customers found'))
                      : ListView.builder(
                          itemCount: _customers.length,
                          itemBuilder: (context, index) {
                            final c = _customers[index];
                            return ListTile(
                              leading: const CircleAvatar(
                                  child: Icon(Icons.person)),
                              title: Text(c['name'] as String? ?? ''),
                              subtitle: Text(
                                  c['phone'] as String? ?? ''),
                              onTap: () => Navigator.pop(
                                context,
                                {
                                  'id': c['id'],
                                  'name': c['name'],
                                },
                              ),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}
