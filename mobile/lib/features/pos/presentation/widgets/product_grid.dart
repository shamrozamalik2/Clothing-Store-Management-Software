import 'package:flutter/material.dart';
import '../../../products/data/models/product_model.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/grad_widgets.dart';

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
            const GradIconBox(
              icon: Icons.inventory_2_rounded,
              colors: kGradPrimary,
              size: 64,
              iconSize: 30,
              borderRadius: 18,
            ),
            const SizedBox(height: 14),
            Text(
              'No products found',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Try a different search or category',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
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
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: kGradPrimary[0].withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Material(
          color: cs.surfaceContainer,
          child: InkWell(
            onTap: () => onTap(product),
            splashColor: kGradPrimary[0].withValues(alpha: 0.08),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top gradient accent bar
                Container(
                  height: 2,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: kGradPrimary,
                    ),
                  ),
                ),
                // Image / placeholder
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
                // Info section
                Container(
                  decoration: BoxDecoration(
                    border: Border(
                      top: BorderSide(
                        color: cs.outlineVariant.withValues(alpha: 0.3),
                      ),
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: tt.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                          height: 1.3,
                        ),
                      ),
                      const SizedBox(height: 4),
                      ShaderMask(
                        shaderCallback: (bounds) => const LinearGradient(
                          colors: kGradPrimary,
                        ).createShader(bounds),
                        child: Text(
                          formatCurrency(product.sellingPrice),
                          style: tt.bodyMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
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
          return _Placeholder();
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
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1E1B3A), Color(0xFF312E81)],
        ),
      ),
      child: const Center(
        child: Icon(
          Icons.inventory_2_rounded,
          size: 36,
          color: Color(0x606366F1),
        ),
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

    final List<Color> colors = qty == 0
        ? [const Color(0xFFEF4444), const Color(0xFFDC2626)]
        : low
            ? [const Color(0xFFF59E0B), const Color(0xFFF97316)]
            : [const Color(0xFF10B981), const Color(0xFF059669)];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
      decoration: BoxDecoration(
        gradient: LinearGradient(colors: colors),
        borderRadius: BorderRadius.circular(6),
        boxShadow: [
          BoxShadow(
            color: colors[0].withValues(alpha: 0.4),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
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
        return Container(
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
              Container(height: 2, color: base),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: base,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(2),
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
        );
      },
    );
  }
}
