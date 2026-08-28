import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/widgets/grad_widgets.dart';
import '../../../shell/main_shell.dart';
import '../../data/models/stock_model.dart';
import '../providers/stock_provider.dart';
import 'stock_adjustment_sheet.dart';

enum _StockFilter { all, lowStock, outOfStock }

class StockScreen extends ConsumerStatefulWidget {
  const StockScreen({super.key});

  @override
  ConsumerState<StockScreen> createState() => _StockScreenState();
}

class _StockScreenState extends ConsumerState<StockScreen> {
  _StockFilter _filter = _StockFilter.all;
  String       _search = '';

  List<LowStockItem> _applyFilter(List<LowStockItem> items) {
    var list = items;
    if (_filter == _StockFilter.outOfStock) {
      list = list.where((i) => i.isOutOfStock).toList();
    } else if (_filter == _StockFilter.lowStock) {
      list = list.where((i) => !i.isOutOfStock).toList();
    }
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      list = list.where((i) =>
        i.name.toLowerCase().contains(q) ||
        i.sku.toLowerCase().contains(q)
      ).toList();
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    final stockAsync = ref.watch(stockProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(stockProvider),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating:  true,
              snap:      true,
              leading:   IconButton(
                icon:      const Icon(Icons.menu_rounded),
                onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
              ),
              title:   const Text('Stock Monitor'),
              actions: [
                IconButton(
                  icon:      const Icon(Icons.refresh_rounded),
                  onPressed: () => ref.invalidate(stockProvider),
                ),
                const SizedBox(width: 4),
              ],
            ),

            stockAsync.when(
              loading: () => const SliverToBoxAdapter(child: _StockShimmer()),
              error: (e, _) => SliverToBoxAdapter(
                child: _ErrorState(onRetry: () => ref.invalidate(stockProvider)),
              ),
              data: (report) {
                final filtered = _applyFilter(report.lowStockItems);

                return SliverList(
                  delegate: SliverChildListDelegate([
                    // Summary cards
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: _SummaryRow(summary: report.summary),
                    ),

                    // Search bar
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                      child: TextField(
                        decoration: InputDecoration(
                          hintText:      'Search by name or SKU…',
                          prefixIcon:    const Icon(Icons.search_rounded, size: 20),
                          filled:        true,
                          border:        OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide:   BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(vertical: 0),
                        ),
                        onChanged: (v) => setState(() => _search = v),
                      ),
                    ),

                    // Filter chips
                    SizedBox(
                      height: 48,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        children: [
                          _FilterChip(
                            label:    'All Alerts (${report.lowStockItems.length})',
                            active:   _filter == _StockFilter.all,
                            onTap:    () => setState(() => _filter = _StockFilter.all),
                          ),
                          const SizedBox(width: 8),
                          _FilterChip(
                            label:    'Low Stock (${report.summary.lowStock})',
                            active:   _filter == _StockFilter.lowStock,
                            color:    const Color(0xFFF59E0B),
                            onTap:    () => setState(() => _filter = _StockFilter.lowStock),
                          ),
                          const SizedBox(width: 8),
                          _FilterChip(
                            label:    'Out of Stock (${report.summary.outOfStock})',
                            active:   _filter == _StockFilter.outOfStock,
                            color:    const Color(0xFFEF4444),
                            onTap:    () => setState(() => _filter = _StockFilter.outOfStock),
                          ),
                        ],
                      ),
                    ),

                    if (filtered.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 48),
                        child:   _EmptyFilterState(),
                      )
                    else
                      ...filtered.map((item) => Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                        child:   _StockItemCard(
                          item:       item,
                          onAdjusted: () => ref.invalidate(stockProvider),
                        ),
                      )),

                    const SizedBox(height: 32),
                  ]),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

// ── Summary Row ───────────────────────────────────────────────────────────────

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({required this.summary});
  final StockSummary summary;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _SumCard(
            label: 'Products',
            value: '${summary.totalProducts}',
            icon:  Icons.inventory_2_outlined,
            grad:  kGradPrimary,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SumCard(
            label: 'Low Stock',
            value: '${summary.lowStock}',
            icon:  Icons.warning_amber_rounded,
            grad:  kGradAmber,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _SumCard(
            label: 'Out of Stock',
            value: '${summary.outOfStock}',
            icon:  Icons.remove_shopping_cart_outlined,
            grad:  [const Color(0xFFEF4444), const Color(0xFFF87171)],
          ),
        ),
      ],
    );
  }
}

class _SumCard extends StatelessWidget {
  const _SumCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.grad,
  });
  final String       label;
  final String       value;
  final IconData     icon;
  final List<Color>  grad;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Container(
      padding:    const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color:        cs.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
      ),
      child: Column(
        children: [
          Container(
            width:  32,
            height: 32,
            decoration: BoxDecoration(
              gradient:     LinearGradient(colors: grad),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, color: Colors.white, size: 16),
          ),
          const SizedBox(height: 6),
          Text(value,
              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
          Text(label,
              style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
              textAlign: TextAlign.center, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    );
  }
}

// ── Filter chip ───────────────────────────────────────────────────────────────

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.active,
    required this.onTap,
    this.color,
  });
  final String       label;
  final bool         active;
  final VoidCallback onTap;
  final Color?       color;

  @override
  Widget build(BuildContext context) {
    final cs     = Theme.of(context).colorScheme;
    final accent = color ?? cs.primary;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 120),
        padding:  const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color:        active ? accent.withValues(alpha: 0.12) : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border:       Border.all(
            color: active ? accent : cs.outlineVariant.withValues(alpha: 0.5),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color:      active ? accent : cs.onSurfaceVariant,
            fontSize:   12,
            fontWeight: active ? FontWeight.w700 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}

// ── Stock Item Card ───────────────────────────────────────────────────────────

class _StockItemCard extends StatelessWidget {
  const _StockItemCard({required this.item, this.onAdjusted});
  final LowStockItem  item;
  final VoidCallback? onAdjusted;

  @override
  Widget build(BuildContext context) {
    final cs       = Theme.of(context).colorScheme;
    final tt       = Theme.of(context).textTheme;
    final oos      = item.isOutOfStock;
    final accent   = oos ? const Color(0xFFEF4444) : const Color(0xFFF59E0B);
    final grad     = oos
        ? [const Color(0xFFEF4444), const Color(0xFFF87171)]
        : kGradAmber;

    return Container(
      padding:    const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color:        cs.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border:       Border.all(color: accent.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          // Status indicator
          Container(
            width:      40,
            height:     40,
            decoration: BoxDecoration(
              gradient:     LinearGradient(colors: grad),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(
              oos ? Icons.remove_shopping_cart_outlined : Icons.warning_amber_rounded,
              color: Colors.white,
              size:  20,
            ),
          ),
          const SizedBox(width: 12),

          // Product info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.name,
                    style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(
                  'SKU: ${item.sku}'
                  '${item.categoryName != null ? '  •  ${item.categoryName}' : ''}',
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),

          // Stock level
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding:    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color:        accent.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border:       Border.all(color: accent.withValues(alpha: 0.3)),
                ),
                child: Text(
                  oos ? 'OUT' : '${item.stockQuantity} left',
                  style: TextStyle(
                    color:      accent,
                    fontSize:   12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                'Min: ${item.lowStockAlert}',
                style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
              ),
              const SizedBox(height: 4),
              GestureDetector(
                onTap: () => showModalBottomSheet(
                  context:            context,
                  isScrollControlled: true,
                  showDragHandle:     true,
                  shape: const RoundedRectangleBorder(
                      borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                  builder: (_) => StockAdjustmentSheet(
                    item:   item,
                    onDone: onAdjusted,
                  ),
                ),
                child: Container(
                  padding:    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color:        cs.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text('Adjust',
                      style: TextStyle(color: cs.primary, fontSize: 10,
                          fontWeight: FontWeight.w600)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Shimmer ───────────────────────────────────────────────────────────────────

class _StockShimmer extends StatelessWidget {
  const _StockShimmer();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Shimmer.fromColors(
      baseColor:      cs.surfaceContainerHighest,
      highlightColor: cs.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
        child: Column(
          children: [
            Row(
              children: List.generate(
                3,
                (_) => Expanded(
                  child: Container(
                    height: 78,
                    margin: const EdgeInsets.symmetric(horizontal: 5),
                    decoration: BoxDecoration(
                      color: cs.surface, borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
            ...List.generate(
              6,
              (_) => Container(
                height: 72,
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color:        cs.surface,
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyFilterState extends StatelessWidget {
  const _EmptyFilterState();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Column(
      children: [
        Icon(Icons.check_circle_outline_rounded, size: 48,
            color: const Color(0xFF10B981)),
        const SizedBox(height: 12),
        Text('All good!', style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Text('No products match this filter.',
            style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.onRetry});
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
          Text('Failed to load stock data',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 20),
          ElevatedButton.icon(
            onPressed: onRetry,
            icon:  const Icon(Icons.refresh),
            label: const Text('Retry'),
          ),
        ],
      ),
    );
  }
}
