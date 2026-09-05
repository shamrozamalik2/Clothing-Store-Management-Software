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
import '../../../../core/widgets/grad_widgets.dart';
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
  List<ProductModel> _products   = [];
  List<String>       _categories = [];
  bool               _loadingProducts = false;
  String             _searchQuery = '';
  String?            _selectedCategory;

  final TextEditingController _discountCtrl = TextEditingController(text: '0');
  final TextEditingController _taxCtrl      = TextEditingController(text: '0');
  final TextEditingController _searchCtrl   = TextEditingController();

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
  // Data
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
  // Barcode
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
    final match = _products.where((p) => p.barcode == barcode).toList();
    if (match.isNotEmpty) {
      ref.read(cartProvider.notifier).addItem(match.first);
      _showAddedSnack(match.first.name);
      return;
    }
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
    final source    = ref.read(posRemoteSourceProvider);
    final heldCarts = await source.getHeldCarts();
    if (!mounted) return;

    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
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
          _openHeldCarts();
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
  // Dialogs
  // -------------------------------------------------------------------------

  void _showClearCartDialog(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Clear cart?'),
        content: const Text('All items will be removed from the cart.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: cs.error,
              foregroundColor: cs.onError,
            ),
            onPressed: () {
              Navigator.pop(ctx);
              ref.read(cartProvider.notifier).clearCart();
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // Build helpers
  // -------------------------------------------------------------------------

  Widget _buildProductPanel() {
    final cs = Theme.of(context).colorScheme;
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
              prefixIcon: const Icon(Icons.search_rounded, size: 20),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear_rounded, size: 18),
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
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide(
                  color: cs.outlineVariant.withValues(alpha: 0.5),
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 1.5),
              ),
              filled: true,
              contentPadding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            ),
          ),
        ),
        // Category chips
        if (_categories.isNotEmpty)
          SizedBox(
            height: 44,
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
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
    final cs = Theme.of(context).colorScheme;

    return Container(
      color: cs.surfaceContainerLow,
      child: Column(
        children: [
          // ── Cart header ────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(12, 12, 8, 10),
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: cs.outlineVariant.withValues(alpha: 0.3),
                ),
              ),
            ),
            child: Row(
              children: [
                const GradIconBox(
                  icon: Icons.shopping_cart_rounded,
                  colors: kGradPrimary,
                  size: 32,
                  iconSize: 16,
                  borderRadius: 8,
                ),
                const SizedBox(width: 8),
                Text(
                  'Cart',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                ),
                if (cart.items.isNotEmpty) ...[
                  const SizedBox(width: 7),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: kGradPrimary),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${cart.itemCount}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
                const Spacer(),
                if (cart.items.isNotEmpty) ...[
                  // Hold button
                  GestureDetector(
                    onTap: _holdCurrentCart,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0EA5E9).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                            color: const Color(0xFF0EA5E9)
                                .withValues(alpha: 0.3)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.pause_circle_rounded,
                              size: 13, color: Color(0xFF0EA5E9)),
                          SizedBox(width: 4),
                          Text('Hold',
                              style: TextStyle(
                                  fontSize: 11,
                                  color: Color(0xFF0EA5E9),
                                  fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Clear button
                  GestureDetector(
                    onTap: () => _showClearCartDialog(context),
                    child: Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: cs.errorContainer.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Icon(Icons.delete_sweep_rounded,
                          size: 16, color: cs.error),
                    ),
                  ),
                  const SizedBox(width: 4),
                ],
              ],
            ),
          ),

          // ── Customer chip ──────────────────────────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
            child: cart.customerName != null
                ? Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0x1A4F46E5), Color(0x1A7C3AED)],
                      ),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                          color: const Color(0xFF4F46E5)
                              .withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      children: [
                        const GradIconBox(
                          icon: Icons.person_rounded,
                          colors: kGradPrimary,
                          size: 24,
                          iconSize: 12,
                          borderRadius: 6,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            cart.customerName!,
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                              color: Color(0xFF6366F1),
                            ),
                          ),
                        ),
                        GestureDetector(
                          onTap: () =>
                              ref.read(cartProvider.notifier).clearCustomer(),
                          child: const Icon(Icons.close_rounded,
                              size: 14, color: Color(0xFF6366F1)),
                        ),
                      ],
                    ),
                  )
                : OutlinedButton.icon(
                    onPressed: _pickCustomer,
                    icon: const Icon(Icons.person_add_alt_rounded, size: 16),
                    label: const Text('Add Customer'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 38),
                      side: BorderSide(
                          color: cs.primary.withValues(alpha: 0.4)),
                    ),
                  ),
          ),
          const SizedBox(height: 8),

          // ── Cart items ─────────────────────────────────────────────────────
          Expanded(
            child: cart.items.isEmpty
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const GradIconBox(
                          icon: Icons.shopping_cart_outlined,
                          colors: kGradPrimary,
                          size: 56,
                          iconSize: 26,
                          borderRadius: 16,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Cart is empty',
                          style: Theme.of(context)
                              .textTheme
                              .titleSmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Tap a product to add it',
                          style: Theme.of(context)
                              .textTheme
                              .bodySmall
                              ?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      ],
                    ),
                  )
                : ListView.separated(
                    controller: scrollCtrl,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    itemCount: cart.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 6),
                    itemBuilder: (context, index) => _CartItemRow(
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

          // ── Totals ─────────────────────────────────────────────────────────
          if (cart.items.isNotEmpty) ...[
            Divider(
                height: 1,
                color: cs.outlineVariant.withValues(alpha: 0.4)),
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
    final cart  = ref.watch(cartProvider);
    final isWide = MediaQuery.of(context).size.width >= 800;
    final cs    = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(
        toolbarHeight: 60,
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.menu_rounded),
          onPressed: () =>
              MainShell.scaffoldKey.currentState?.openDrawer(),
        ),
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: kGradPrimary,
                ),
                borderRadius: BorderRadius.circular(9),
                boxShadow: [
                  BoxShadow(
                    color: kGradPrimary[0].withValues(alpha: 0.35),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.point_of_sale_rounded,
                  color: Colors.white, size: 17),
            ),
            const SizedBox(width: 10),
            ShaderMask(
              shaderCallback: (bounds) => const LinearGradient(
                colors: kGradPrimary,
              ).createShader(bounds),
              child: const Text(
                'Point of Sale',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 17,
                ),
              ),
            ),
          ],
        ),
        actions: [
          _AppBarAction(
            icon: Icons.qr_code_scanner_rounded,
            tooltip: 'Scan barcode',
            onPressed: _openBarcodeScanner,
          ),
          _AppBarAction(
            icon: Icons.pause_circle_rounded,
            tooltip: 'Held carts',
            onPressed: _openHeldCarts,
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(
            height: 1,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Colors.transparent,
                  Color(0x334F46E5),
                  Color(0x338B5CF6),
                  Colors.transparent,
                ],
              ),
            ),
          ),
        ),
      ),
      body: isWide
          ? Row(
              children: [
                Expanded(flex: 3, child: _buildProductPanel()),
                VerticalDivider(
                    width: 1,
                    color: cs.outlineVariant.withValues(alpha: 0.4)),
                SizedBox(
                  width: 340,
                  child: _buildCartPanel(cart),
                ),
              ],
            )
          : _buildProductPanel(),
      floatingActionButton: !isWide && cart.items.isNotEmpty
          ? _GradCartFab(
              itemCount: cart.itemCount,
              total: cart.total,
              onPressed: () => _showCartSheet(context, cart),
            )
          : null,
    );
  }

  void _showCartSheet(BuildContext context, CartState cart) {
    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        minChildSize:     0.35,
        maxChildSize:     0.95,
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
// _AppBarAction
// ---------------------------------------------------------------------------

class _AppBarAction extends StatelessWidget {
  const _AppBarAction({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
  });
  final IconData     icon;
  final String       tooltip;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 4),
      child: Tooltip(
        message: tooltip,
        child: GestureDetector(
          onTap: onPressed,
          child: Container(
            width:  36,
            height: 36,
            decoration: BoxDecoration(
              color: const Color(0xFF4F46E5).withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                  color: const Color(0xFF4F46E5).withValues(alpha: 0.2)),
            ),
            child: Icon(icon, size: 18, color: const Color(0xFF6366F1)),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _GradCartFab
// ---------------------------------------------------------------------------

class _GradCartFab extends StatelessWidget {
  const _GradCartFab({
    required this.itemCount,
    required this.total,
    required this.onPressed,
  });
  final int          itemCount;
  final double       total;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onPressed,
      child: Container(
        height:  52,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: kGradPrimary,
          ),
          borderRadius: BorderRadius.circular(26),
          boxShadow: [
            BoxShadow(
              color:      kGradPrimary[0].withValues(alpha: 0.42),
              blurRadius: 18,
              offset:     const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.shopping_cart_rounded,
                    color: Colors.white, size: 22),
                Positioned(
                  top:   -6,
                  right: -8,
                  child: Container(
                    constraints:
                        const BoxConstraints(minWidth: 16, minHeight: 16),
                    padding:     const EdgeInsets.all(2),
                    decoration:  BoxDecoration(
                      color:        Colors.white,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '$itemCount',
                      style: const TextStyle(
                        color:      Color(0xFF4F46E5),
                        fontSize:   9,
                        fontWeight: FontWeight.w800,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Text(
              formatCurrency(total),
              style: const TextStyle(
                color:      Colors.white,
                fontWeight: FontWeight.w700,
                fontSize:   14,
              ),
            ),
          ],
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
  final VoidCallback  onIncrement;
  final VoidCallback  onDecrement;
  final VoidCallback  onRemove;

  const _CartItemRow({
    required this.item,
    required this.onIncrement,
    required this.onDecrement,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        color:  cs.surfaceContainer,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            // Left gradient accent bar
            Container(
              width: 3,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topCenter,
                  end:   Alignment.bottomCenter,
                  colors: kGradPrimary,
                ),
                borderRadius: const BorderRadius.horizontal(
                    left: Radius.circular(12)),
              ),
            ),
            // Content
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: 10, vertical: 10),
                child: Row(
                  children: [
                    // Name + unit price
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Text(
                            item.name,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: tt.bodySmall?.copyWith(
                              fontWeight: FontWeight.w600,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '${formatCurrency(item.price)} / ${item.unit}',
                            style: tt.labelSmall
                                ?.copyWith(color: cs.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Qty stepper
                    Container(
                      decoration: BoxDecoration(
                        color: cs.surfaceContainerHighest
                            .withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          _StepBtn(
                              icon: Icons.remove_rounded,
                              onTap: onDecrement),
                          SizedBox(
                            width: 26,
                            child: Text(
                              '${item.quantity}',
                              textAlign: TextAlign.center,
                              style: tt.bodySmall?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          _StepBtn(
                              icon: Icons.add_rounded,
                              onTap: onIncrement),
                        ],
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Line total
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        ShaderMask(
                          shaderCallback: (bounds) =>
                              const LinearGradient(colors: kGradPrimary)
                                  .createShader(bounds),
                          child: Text(
                            formatCurrency(item.lineTotal),
                            style: tt.bodySmall?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        if (item.discount > 0)
                          Text(
                            '-${formatCurrency(item.discount)}',
                            style: tt.labelSmall?.copyWith(
                              color: Colors.orange[600],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(width: 4),
                    // Remove
                    GestureDetector(
                      onTap: onRemove,
                      child: Container(
                        width:  24,
                        height: 24,
                        decoration: BoxDecoration(
                          color: cs.errorContainer.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Icon(Icons.close_rounded,
                            size: 14, color: cs.error),
                      ),
                    ),
                  ],
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
// _CartTotalsPanel
// ---------------------------------------------------------------------------

class _CartTotalsPanel extends StatelessWidget {
  final CartState                cart;
  final TextEditingController    discountCtrl;
  final TextEditingController    taxCtrl;
  final ValueChanged<String>     onDiscountChanged;
  final ValueChanged<String>     onTaxChanged;
  final VoidCallback             onCheckout;

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
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

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
          // Subtotal row
          _TotalRow(
              label: 'Subtotal',
              value: formatCurrency(cart.subtotal)),
          if (cart.discountAmount > 0)
            _TotalRow(
              label:
                  'Discount (${cart.discountPercent.toStringAsFixed(1)}%)',
              value: '− ${formatCurrency(cart.discountAmount)}',
              valueColor: Colors.orange[700],
            ),
          if (cart.taxAmount > 0)
            _TotalRow(
              label: 'Tax (${cart.taxPercent.toStringAsFixed(1)}%)',
              value: formatCurrency(cart.taxAmount),
            ),
          Divider(height: 14, color: cs.outlineVariant.withValues(alpha: 0.5)),
          // Total row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'TOTAL',
                style: tt.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.5,
                ),
              ),
              ShaderMask(
                shaderCallback: (bounds) =>
                    const LinearGradient(colors: kGradPrimary)
                        .createShader(bounds),
                child: Text(
                  formatCurrency(cart.total),
                  style: const TextStyle(
                    color:      Colors.white,
                    fontWeight: FontWeight.w800,
                    fontSize:   17,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Checkout button
          GradButton(
            label:     'Checkout  ${formatCurrency(cart.total)}',
            icon:      Icons.point_of_sale_rounded,
            onPressed: onCheckout,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class _StepBtn extends StatelessWidget {
  final IconData     icon;
  final VoidCallback onTap;
  const _StepBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
        onTap: onTap,
        child: SizedBox(
          width:  28,
          height: 28,
          child: Icon(icon, size: 15, color: const Color(0xFF6366F1)),
        ),
      );
}

class _TotalRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _TotalRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    final style = Theme.of(context).textTheme.bodySmall;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          Text(value, style: style?.copyWith(color: valueColor)),
        ],
      ),
    );
  }
}

class _PercentField extends StatelessWidget {
  final String                label;
  final TextEditingController controller;
  final ValueChanged<String>  onChanged;

  const _PercentField({
    required this.label,
    required this.controller,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller:  controller,
      onChanged:   onChanged,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d*'))
      ],
      style: const TextStyle(fontSize: 13),
      decoration: InputDecoration(
        labelText:      label,
        isDense:        true,
        suffixText:     '%',
        border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(8)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String     label;
  final bool       selected;
  final VoidCallback onTap;

  const _CategoryChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(
                  begin: Alignment.topLeft,
                  end:   Alignment.bottomRight,
                  colors: kGradPrimary,
                )
              : null,
          color: selected
              ? null
              : cs.surfaceContainerHighest.withValues(alpha: 0.7),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? Colors.transparent
                : cs.outlineVariant.withValues(alpha: 0.5),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize:   12,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            color: selected ? Colors.white : cs.onSurface,
          ),
        ),
      ),
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
    final cs = Theme.of(context).colorScheme;
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SizedBox(
        width:  320,
        height: 400,
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 12),
              child: Row(
                children: [
                  const GradIconBox(
                    icon:         Icons.qr_code_scanner_rounded,
                    colors:       kGradPrimary,
                    size:         36,
                    iconSize:     18,
                    borderRadius: 10,
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'Scan Barcode',
                    style: TextStyle(
                        fontSize: 16, fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(Icons.close_rounded,
                        color: cs.onSurfaceVariant),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            // Gradient divider
            Container(
              height: 1,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    Color(0x334F46E5),
                    Color(0x338B5CF6),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            // Scanner
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(
                    bottom: Radius.circular(20)),
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
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            children: [
              const GradIconBox(
                icon:         Icons.pause_circle_rounded,
                colors:       kGradSky,
                size:         36,
                iconSize:     18,
                borderRadius: 10,
              ),
              const SizedBox(width: 10),
              Text('Held Carts',
                  style: tt.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.close_rounded),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (heldCarts.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const GradIconBox(
                    icon:         Icons.inbox_rounded,
                    colors:       kGradSky,
                    size:         48,
                    iconSize:     24,
                    borderRadius: 14,
                  ),
                  const SizedBox(height: 12),
                  Text('No held carts',
                      style: tt.bodyMedium
                          ?.copyWith(color: cs.onSurfaceVariant)),
                ],
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              itemCount: heldCarts.length,
              itemBuilder: (context, index) {
                final c      = heldCarts[index];
                final items  = (c['items'] as List? ?? []);
                final total  =
                    (c['total'] as num?)?.toDouble() ?? 0.0;
                final heldAt = c['_heldAt'] as String? ?? '';
                final id     = c['_id'] as String? ?? '';

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color:        cs.surfaceContainer,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: cs.outlineVariant.withValues(alpha: 0.4)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        GradIconBox(
                          icon:         Icons.shopping_cart_outlined,
                          colors:       kGradSky,
                          size:         40,
                          iconSize:     20,
                          borderRadius: 10,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${items.length} item${items.length == 1 ? '' : 's'} — ${formatCurrency(total)}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                    fontSize: 13),
                              ),
                              Text(
                                heldAt.isNotEmpty
                                    ? _formatDateTime(heldAt)
                                    : 'Unknown time',
                                style: tt.labelSmall?.copyWith(
                                    color: cs.onSurfaceVariant),
                              ),
                            ],
                          ),
                        ),
                        GradSmallButton(
                          label:     'Restore',
                          icon:      Icons.restore_rounded,
                          onPressed: () => onRestore(c),
                          colors:    kGradGreen,
                        ),
                        const SizedBox(width: 6),
                        IconButton(
                          icon: Icon(Icons.delete_outline_rounded,
                              color: cs.error, size: 20),
                          onPressed: () => onDelete(id),
                          padding:     EdgeInsets.zero,
                          constraints: const BoxConstraints(
                              minWidth: 32, minHeight: 32),
                        ),
                      ],
                    ),
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
  bool   _loading = false;
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
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: SizedBox(
        width:  360,
        height: 460,
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 8, 12),
              child: Row(
                children: [
                  const GradIconBox(
                    icon:         Icons.person_search_rounded,
                    colors:       kGradPrimary,
                    size:         36,
                    iconSize:     18,
                    borderRadius: 10,
                  ),
                  const SizedBox(width: 10),
                  Text(
                    'Select Customer',
                    style: tt.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: Icon(Icons.close_rounded,
                        color: cs.onSurfaceVariant),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            // Gradient divider
            Container(
              height: 1,
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.transparent,
                    Color(0x334F46E5),
                    Color(0x338B5CF6),
                    Colors.transparent,
                  ],
                ),
              ),
            ),
            // Search field
            Padding(
              padding:
                  const EdgeInsets.fromLTRB(12, 12, 12, 0),
              child: TextField(
                autofocus: true,
                onChanged: _search,
                decoration: InputDecoration(
                  hintText:   'Search by name or phone…',
                  prefixIcon: const Icon(Icons.search_rounded, size: 18),
                  isDense:    true,
                  border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10)),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(
                        color: Color(0xFF4F46E5), width: 1.5),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            // List
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _customers.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const GradIconBox(
                                icon:         Icons.person_off_rounded,
                                colors:       kGradPrimary,
                                size:         48,
                                iconSize:     24,
                                borderRadius: 14,
                              ),
                              const SizedBox(height: 10),
                              Text('No customers found',
                                  style: tt.bodyMedium?.copyWith(
                                      color: cs.onSurfaceVariant)),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 4),
                          itemCount: _customers.length,
                          itemBuilder: (context, index) {
                            final c = _customers[index];
                            return Container(
                              margin:
                                  const EdgeInsets.only(bottom: 6),
                              decoration: BoxDecoration(
                                color:        cs.surfaceContainer,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                    color: cs.outlineVariant
                                        .withValues(alpha: 0.4)),
                              ),
                              child: ListTile(
                                contentPadding:
                                    const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 4),
                                leading: GradAvatar(
                                  name:   c['name'] as String? ?? '?',
                                  radius: 18,
                                  colors: kGradPrimary,
                                ),
                                title: Text(
                                  c['name'] as String? ?? '',
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 14),
                                ),
                                subtitle: Text(
                                  c['phone'] as String? ?? '',
                                  style: const TextStyle(fontSize: 12),
                                ),
                                onTap: () => Navigator.pop(
                                  context,
                                  {
                                    'id':   c['id'],
                                    'name': c['name'],
                                  },
                                ),
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
