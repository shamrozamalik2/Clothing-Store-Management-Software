import 'package:flutter/material.dart';
import '../../../products/data/models/product_model.dart';
import '../../../../core/utils/currency_formatter.dart';

// ---------------------------------------------------------------------------
// ProductGrid
// ---------------------------------------------------------------------------

class ProductGrid extends StatelessWidget {
  final List<ProductModel> products;
  final void Function(ProductModel) onTap;
  final bool loading;

  const ProductGrid({
    super.key,
    required this.products,
    required this.onTap,
    this.loading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) return _ShimmerGrid();

    if (products.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.inventory_2_outlined,
                size: 64, color: Theme.of(context).colorScheme.outlineVariant),
            const SizedBox(height: 12),
            Text(
              'No products found',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: Theme.of(context).colorScheme.outline,
                  ),
            ),
          ],
        ),
      );
    }

    return LayoutBuilder(builder: (context, constraints) {
      final crossAxisCount = constraints.maxWidth > 600 ? 3 : 2;
      return GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 0.78,
        ),
        itemCount: products.length,
        itemBuilder: (context, index) =>
            _ProductCard(product: products[index], onTap: onTap),
      );
    });
  }
}

// ---------------------------------------------------------------------------
// _ProductCard
// ---------------------------------------------------------------------------

class _ProductCard extends StatelessWidget {
  final ProductModel product;
  final void Function(ProductModel) onTap;

  const _ProductCard({required this.product, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final inStock = product.stockQuantity > 0;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: colorScheme.outlineVariant.withOpacity(0.4)),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => onTap(product),
        borderRadius: BorderRadius.circular(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ---- Image / placeholder -----------------------------------
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _ProductImage(imageUrl: product.imageUrl),
                  // Stock badge (top-right)
                  Positioned(
                    top: 6,
                    right: 6,
                    child: _StockBadge(qty: product.stockQuantity),
                  ),
                ],
              ),
            ),
            // ---- Info --------------------------------------------------
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    product.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatCurrency(product.sellingPrice),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: colorScheme.primary,
                          fontWeight: FontWeight.bold,
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

// ---------------------------------------------------------------------------
// _ProductImage
// ---------------------------------------------------------------------------

class _ProductImage extends StatelessWidget {
  final String? imageUrl;
  const _ProductImage({this.imageUrl});

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    if (url != null && url.isNotEmpty) {
      return Image.network(
        url,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => _Placeholder(),
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return const _Placeholder();
        },
      );
    }
    return _Placeholder();
  }
}

class _Placeholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(context).colorScheme.surfaceContainerHighest,
      child: Icon(
        Icons.inventory_2_outlined,
        size: 40,
        color: Theme.of(context).colorScheme.outlineVariant,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _StockBadge
// ---------------------------------------------------------------------------

class _StockBadge extends StatelessWidget {
  final int qty;
  const _StockBadge({required this.qty});

  @override
  Widget build(BuildContext context) {
    final bool low = qty > 0 && qty <= 5;
    final Color bg = qty == 0
        ? Colors.red.withOpacity(0.85)
        : low
            ? Colors.orange.withOpacity(0.9)
            : Colors.green.withOpacity(0.85);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        qty == 0
            ? 'Out'
            : low
                ? '$qty left'
                : 'In stock',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// _ShimmerGrid — skeleton loading state
// ---------------------------------------------------------------------------

class _ShimmerGrid extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(builder: (context, constraints) {
      final crossAxisCount = constraints.maxWidth > 600 ? 3 : 2;
      return GridView.builder(
        padding: const EdgeInsets.all(12),
        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: crossAxisCount,
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 0.78,
        ),
        itemCount: crossAxisCount * 3,
        itemBuilder: (_, __) => const _ShimmerCard(),
      );
    });
  }
}

class _ShimmerCard extends StatefulWidget {
  const _ShimmerCard();

  @override
  State<_ShimmerCard> createState() => _ShimmerCardState();
}

class _ShimmerCardState extends State<_ShimmerCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat();
    _anim = Tween<double>(begin: -1.5, end: 1.5).animate(
      CurvedAnimation(parent: _ctrl, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).colorScheme.surfaceContainerHighest;
    final highlight = Theme.of(context).colorScheme.surface;

    return AnimatedBuilder(
      animation: _anim,
      builder: (context, _) {
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          child: Container(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(14),
              gradient: LinearGradient(
                begin: Alignment(_anim.value, 0),
                end: Alignment(_anim.value + 1, 0),
                colors: [base, highlight, base],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: base,
                      borderRadius: const BorderRadius.vertical(
                        top: Radius.circular(14),
                      ),
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        height: 12,
                        decoration: BoxDecoration(
                          color: base,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        height: 12,
                        width: 60,
                        decoration: BoxDecoration(
                          color: base,
                          borderRadius: BorderRadius.circular(6),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
