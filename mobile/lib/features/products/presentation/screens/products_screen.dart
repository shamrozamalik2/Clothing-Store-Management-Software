import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/utils/currency_formatter.dart';
import '../../data/models/product_model.dart';
import '../providers/products_provider.dart';
import '../../../shell/main_shell.dart';

class ProductsScreen extends ConsumerStatefulWidget {
  const ProductsScreen({super.key});

  @override
  ConsumerState<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends ConsumerState<ProductsScreen> {
  bool _searchVisible = false;
  final _searchController = TextEditingController();
  List<Map<String, dynamic>> _categories = [];
  bool _categoriesLoaded = false;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCategories() async {
    if (_categoriesLoaded) return;
    try {
      final source = ref.read(productsSourceProvider);
      final cats   = await source.getCategories();
      if (mounted) {
        setState(() {
          _categories        = cats;
          _categoriesLoaded  = true;
        });
      }
    } catch (_) {}
  }

  void _toggleSearch() {
    setState(() {
      _searchVisible = !_searchVisible;
      if (!_searchVisible) {
        _searchController.clear();
        ref.read(productSearchProvider.notifier).state = '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final productsAsync  = ref.watch(productsProvider);
    final selectedCatId  = ref.watch(productCategoryProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(productsProvider),
        child: CustomScrollView(
          slivers: [
            // ── App Bar ──────────────────────────────────────────────────
            SliverAppBar(
              floating:  true,
              snap:      true,
              leading:   IconButton(
                icon: const Icon(Icons.menu_rounded),
                onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
              ),
              title:     const Text('Products'),
              actions:   [
                IconButton(
                  icon:    Icon(_searchVisible ? Icons.close : Icons.search),
                  onPressed: _toggleSearch,
                  tooltip: _searchVisible ? 'Close search' : 'Search',
                ),
                const SizedBox(width: 4),
              ],
              bottom: _searchVisible
                  ? PreferredSize(
                      preferredSize: const Size.fromHeight(64),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: TextField(
                          controller: _searchController,
                          autofocus:  true,
                          decoration: InputDecoration(
                            hintText:    'Search products, SKU…',
                            prefixIcon:  const Icon(Icons.search, size: 20),
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      ref.read(productSearchProvider.notifier).state = '';
                                    },
                                  )
                                : null,
                            isDense:     true,
                          ),
                          onChanged: (v) =>
                              ref.read(productSearchProvider.notifier).state = v,
                        ),
                      ),
                    )
                  : null,
            ),

            // ── Category filter chips ────────────────────────────────────
            if (_categories.isNotEmpty)
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 48,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding:         const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    itemCount:       _categories.length + 1,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (context, i) {
                      if (i == 0) {
                        return FilterChip(
                          label:    const Text('All'),
                          selected: selectedCatId == null,
                          onSelected: (_) =>
                              ref.read(productCategoryProvider.notifier).state = null,
                        );
                      }
                      final cat = _categories[i - 1];
                      final id  = cat['id'] as int?;
                      return FilterChip(
                        label:    Text(cat['name']?.toString() ?? ''),
                        selected: selectedCatId == id,
                        onSelected: (_) =>
                            ref.read(productCategoryProvider.notifier).state = id,
                      );
                    },
                  ),
                ),
              ),

            // ── Product list ─────────────────────────────────────────────
            productsAsync.when(
              loading: () => const SliverToBoxAdapter(child: _ProductShimmer()),
              error: (e, _) => SliverToBoxAdapter(
                child: _ErrorState(
                  message: e.toString(),
                  onRetry: () => ref.invalidate(productsProvider),
                ),
              ),
              data: (response) => response.items.isEmpty
                  ? const SliverToBoxAdapter(
                      child: _EmptyState(),
                    )
                  : SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (ctx, i) => _ProductCard(
                            product:  response.items[i],
                            onTap:    () => _showProductDetail(ctx, response.items[i]),
                          ),
                          childCount: response.items.length,
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  void _showProductDetail(BuildContext context, ProductModel product) {
    showModalBottomSheet(
      context:           context,
      isScrollControlled: true,
      showDragHandle:    true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _ProductDetailSheet(product: product),
    );
  }
}

// ── Product Card ─────────────────────────────────────────────────────────────

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product, required this.onTap});
  final ProductModel product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final stockColor = product.isLowStock
        ? const Color(0xFFEF4444)
        : const Color(0xFF10B981);

    return Card(
      elevation:   0,
      margin:      const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.5)),
      ),
      child: InkWell(
        onTap:        onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Product image/avatar
              ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: product.imageUrl != null
                    ? CachedNetworkImage(
                        imageUrl:   product.imageUrl!,
                        width:      56,
                        height:     56,
                        fit:        BoxFit.cover,
                        placeholder: (_, __) => _PlaceholderAvatar(product: product),
                        errorWidget: (_, __, ___) => _PlaceholderAvatar(product: product),
                      )
                    : _PlaceholderAvatar(product: product),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'SKU: ${product.sku}',
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                    if (product.categoryName != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        product.categoryName!,
                        style: tt.labelSmall?.copyWith(color: cs.primary),
                      ),
                    ],
                  ],
                ),
              ),
              // Price + stock
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatCurrency(product.sellingPrice),
                    style: tt.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                      color:      cs.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding:    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color:        stockColor.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${product.stockQuantity} ${product.unit}',
                      style: tt.labelSmall?.copyWith(
                        color:      stockColor,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  if (product.isLowStock)
                    Padding(
                      padding: const EdgeInsets.only(top: 3),
                      child: Text(
                        'Low stock',
                        style: tt.labelSmall?.copyWith(
                          color:      const Color(0xFFEF4444),
                          fontWeight: FontWeight.w500,
                          fontSize:   9,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PlaceholderAvatar extends StatelessWidget {
  const _PlaceholderAvatar({required this.product});
  final ProductModel product;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width:      56,
      height:     56,
      color:      cs.primaryContainer,
      child: Center(
        child: Text(
          product.name.isNotEmpty ? product.name[0].toUpperCase() : 'P',
          style: TextStyle(
            color:      cs.onPrimaryContainer,
            fontSize:   22,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

// ── Product Detail Sheet ──────────────────────────────────────────────────────

class _ProductDetailSheet extends StatelessWidget {
  const _ProductDetailSheet({required this.product});
  final ProductModel product;

  @override
  Widget build(BuildContext context) {
    final cs  = Theme.of(context).colorScheme;
    final tt  = Theme.of(context).textTheme;
    final sColor = product.isLowStock
        ? const Color(0xFFEF4444)
        : const Color(0xFF10B981);

    return DraggableScrollableSheet(
      expand:          false,
      initialChildSize: 0.65,
      maxChildSize:    0.92,
      minChildSize:    0.4,
      builder: (_, sc) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: ListView(
          controller: sc,
          children: [
            // Header
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: product.imageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: product.imageUrl!,
                          width: 80, height: 80, fit: BoxFit.cover,
                          errorWidget: (_, __, ___) => _BigAvatar(product: product),
                        )
                      : _BigAvatar(product: product),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        product.name,
                        style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Text('SKU: ${product.sku}',
                          style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                      if (product.categoryName != null) ...[
                        const SizedBox(height: 4),
                        Chip(
                          label:   Text(product.categoryName!),
                          padding: EdgeInsets.zero,
                          visualDensity: VisualDensity.compact,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),
            // Details grid
            _DetailRow('Selling Price', formatCurrency(product.sellingPrice)),
            _DetailRow('Cost Price',    formatCurrency(product.costPrice)),
            _DetailRow('Gross Margin',  () {
              final margin = product.sellingPrice > 0
                  ? ((product.sellingPrice - product.costPrice) / product.sellingPrice * 100)
                  : 0.0;
              return '${margin.toStringAsFixed(1)}%';
            }()),
            const Divider(height: 24),
            _DetailRow(
              'Stock Quantity',
              '${product.stockQuantity} ${product.unit}',
              valueColor: sColor,
            ),
            _DetailRow('Min. Stock Level', '${product.minStockLevel} ${product.unit}'),
            if (product.barcode != null)
              _DetailRow('Barcode', product.barcode!),
            if (product.brandName != null)
              _DetailRow('Brand', product.brandName!),
            const SizedBox(height: 8),
            if (product.isLowStock)
              Container(
                padding:    const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color:        const Color(0xFFEF4444).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border:       Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_amber_rounded,
                        color: Color(0xFFEF4444), size: 18),
                    const SizedBox(width: 8),
                    Text(
                      'Stock is below minimum level',
                      style: tt.bodySmall?.copyWith(
                        color:      const Color(0xFFEF4444),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _BigAvatar extends StatelessWidget {
  const _BigAvatar({required this.product});
  final ProductModel product;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Container(
      width: 80, height: 80,
      color: cs.primaryContainer,
      child: Center(
        child: Text(
          product.name.isNotEmpty ? product.name[0].toUpperCase() : 'P',
          style: TextStyle(
            color: cs.onPrimaryContainer, fontSize: 32, fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value, {this.valueColor});
  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text(label,
              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          const Spacer(),
          Text(
            value,
            style: tt.bodyMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color:      valueColor,
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shimmer ──────────────────────────────────────────────────────────────────

class _ProductShimmer extends StatelessWidget {
  const _ProductShimmer();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Shimmer.fromColors(
      baseColor:      cs.surfaceContainerHighest,
      highlightColor: cs.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
        child: Column(
          children: List.generate(
            8,
            (_) => Container(
              height:      76,
              margin:      const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── Empty / Error states ──────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 64, horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.inventory_2_outlined, size: 56, color: cs.onSurfaceVariant),
          const SizedBox(height: 16),
          Text('No products found',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(
            'Try adjusting your search or filters.',
            style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String      message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 48, color: cs.error),
          const SizedBox(height: 12),
          Text('Failed to load products',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(
            message,
            style:     tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            textAlign: TextAlign.center,
            maxLines:  3,
            overflow:  TextOverflow.ellipsis,
          ),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon:  const Icon(Icons.refresh),
            label: const Text('Retry'),
            style: ElevatedButton.styleFrom(minimumSize: const Size(160, 44)),
          ),
        ],
      ),
    );
  }
}
