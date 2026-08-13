import 'dart:math' show max;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../data/models/report_model.dart';
import '../providers/reports_provider.dart';
import '../../../../core/utils/currency_formatter.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Root screen
// ─────────────────────────────────────────────────────────────────────────────

class ReportsScreen extends ConsumerStatefulWidget {
  const ReportsScreen({super.key});

  @override
  ConsumerState<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends ConsumerState<ReportsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reports'),
        bottom: TabBar(
          controller: _tabs,
          tabs: const [
            Tab(text: 'Sales'),
            Tab(text: 'Products'),
            Tab(text: 'Profit'),
          ],
        ),
      ),
      body: Column(
        children: [
          const _FilterRow(),
          Expanded(
            child: TabBarView(
              controller: _tabs,
              children: const [
                _SalesTab(),
                _ProductsTab(),
                _ProfitTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Filter row
// ─────────────────────────────────────────────────────────────────────────────

class _FilterRow extends ConsumerWidget {
  const _FilterRow();

  static const _presets = ['Today', 'This Week', 'This Month', 'Custom'];

  String _activeLabel(ReportFilter f) {
    final now        = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final wkStart    = todayStart.subtract(Duration(days: now.weekday - 1));
    final moStart    = DateTime(now.year, now.month, 1);

    if (f.dateFrom == todayStart) return 'Today';
    if (f.dateFrom == DateTime(wkStart.year, wkStart.month, wkStart.day)) {
      return 'This Week';
    }
    if (f.dateFrom == moStart) return 'This Month';
    return 'Custom';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filter = ref.watch(reportFilterProvider);
    final active  = _activeLabel(filter);

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      child: Row(
        children: _presets.map((label) {
          final selected = label == active;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: _FilterChip(
              label:    label,
              selected: selected,
              onTap: () => _onPresetTap(context, ref, label, filter),
            ),
          );
        }).toList(),
      ),
    );
  }

  Future<void> _onPresetTap(
    BuildContext context,
    WidgetRef ref,
    String label,
    ReportFilter current,
  ) async {
    ReportFilter? next;
    switch (label) {
      case 'Today':
        next = ReportFilter.today();
      case 'This Week':
        next = ReportFilter.thisWeek();
      case 'This Month':
        next = ReportFilter.thisMonth();
      case 'Custom':
        final picked = await showDateRangePicker(
          context:            context,
          firstDate:          DateTime(2020),
          lastDate:           DateTime.now(),
          initialDateRange:   DateTimeRange(
            start: current.dateFrom,
            end:   current.dateTo,
          ),
          builder: (ctx, child) => Theme(data: Theme.of(ctx), child: child!),
        );
        if (picked != null) {
          next = ReportFilter(dateFrom: picked.start, dateTo: picked.end);
        }
    }
    if (next != null) {
      ref.read(reportFilterProvider.notifier).state = next;
    }
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String   label;
  final bool     selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color:        selected ? cs.primary : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            color:      selected ? cs.onPrimary : cs.onSurface,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            fontSize:   13,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales tab
// ─────────────────────────────────────────────────────────────────────────────

class _SalesTab extends ConsumerWidget {
  const _SalesTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(salesSummaryProvider);
    final dailyAsync   = ref.watch(dailySalesProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(salesSummaryProvider);
        ref.invalidate(dailySalesProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Summary cards
          summaryAsync.when(
            loading: () => const _LoadingCard(height: 120),
            error:   (e, _) => _ErrorCard(message: e.toString()),
            data:    (s) => _SummaryCards(summary: s),
          ),
          const SizedBox(height: 20),
          // Line chart
          _SectionHeader(
            title: 'Daily Sales',
            subtitle: dailyAsync.whenOrNull(
              data: (pts) => '${pts.length} days',
            ),
          ),
          const SizedBox(height: 8),
          dailyAsync.when(
            loading: () => const _LoadingCard(height: 200),
            error:   (e, _) => _ErrorCard(message: e.toString()),
            data:    (pts) => _SalesLineChart(points: pts),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary cards
// ─────────────────────────────────────────────────────────────────────────────

class _SummaryCards extends StatelessWidget {
  const _SummaryCards({required this.summary});
  final SalesSummary summary;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Total sales — full-width primary card
        _SummaryCard(
          label:  'Total Sales',
          value:  formatCompact(summary.totalSales),
          icon:   Icons.attach_money_rounded,
          accent: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _SummaryCard(
                label:  'Orders',
                value:  summary.totalOrders.toString(),
                icon:   Icons.receipt_long_rounded,
                accent: Theme.of(context).colorScheme.secondary,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _SummaryCard(
                label:  'Avg Order',
                value:  formatCompact(summary.avgOrderValue),
                icon:   Icons.trending_up_rounded,
                accent: Theme.of(context).colorScheme.tertiary,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.accent,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color:        accent.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: accent, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: TextStyle(
                        fontSize: 12,
                        color: cs.onSurfaceVariant,
                      )),
                  const SizedBox(height: 2),
                  Text(value,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                      )),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sales line chart
// ─────────────────────────────────────────────────────────────────────────────

class _SalesLineChart extends StatelessWidget {
  const _SalesLineChart({required this.points});
  final List<DailySalePoint> points;

  @override
  Widget build(BuildContext context) {
    if (points.isEmpty) {
      return const _EmptyState(message: 'No sales data for this period');
    }

    final cs     = Theme.of(context).colorScheme;
    final spots  = points.asMap().entries
        .map((e) => FlSpot(e.key.toDouble(), e.value.amount))
        .toList();
    final maxY   = points.map((p) => p.amount).reduce(max);
    final step   = max(1, (points.length / 5).floor());

    // Label formatter: "MM/dd"
    final fmt = DateFormat('MM/dd');

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 20, 20, 12),
        child: SizedBox(
          height: 200,
          child: LineChart(
            LineChartData(
              minY: 0,
              maxY: maxY == 0 ? 100 : maxY * 1.25,
              gridData: FlGridData(
                show:             true,
                drawVerticalLine: false,
                getDrawingHorizontalLine: (v) => FlLine(
                  color:       cs.outlineVariant.withValues(alpha: 0.4),
                  strokeWidth: 1,
                ),
              ),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles:   true,
                    reservedSize: 60,
                    getTitlesWidget: (value, _) => Text(
                      formatCompact(value),
                      style: TextStyle(fontSize: 9, color: cs.onSurfaceVariant),
                    ),
                  ),
                ),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles:   true,
                    reservedSize: 28,
                    interval:     step.toDouble(),
                    getTitlesWidget: (value, _) {
                      final idx = value.toInt();
                      if (idx < 0 || idx >= points.length) {
                        return const SizedBox.shrink();
                      }
                      final raw = points[idx].date;
                      String label;
                      try {
                        label = fmt.format(DateTime.parse(raw));
                      } catch (_) {
                        label = raw.length >= 5 ? raw.substring(5) : raw;
                      }
                      return Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(label,
                            style: TextStyle(
                              fontSize: 9,
                              color: cs.onSurfaceVariant,
                            )),
                      );
                    },
                  ),
                ),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots:    spots,
                  isCurved: true,
                  color:    cs.primary,
                  barWidth: 2.5,
                  dotData:  const FlDotData(show: false),
                  belowBarData: BarAreaData(
                    show:  true,
                    color: cs.primary.withValues(alpha: 0.12),
                  ),
                ),
              ],
              lineTouchData: LineTouchData(
                touchTooltipData: LineTouchTooltipData(
                  getTooltipColor: (_) => cs.inverseSurface,
                  getTooltipItems: (spots) => spots.map((s) {
                    final idx = s.x.toInt();
                    final pt  = idx >= 0 && idx < points.length
                        ? points[idx]
                        : null;
                    return LineTooltipItem(
                      pt != null
                          ? '${pt.date}\n${formatCurrency(pt.amount)}'
                          : formatCurrency(s.y),
                      TextStyle(
                        color:    cs.onInverseSurface,
                        fontSize: 11,
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Products tab
// ─────────────────────────────────────────────────────────────────────────────

class _ProductsTab extends ConsumerWidget {
  const _ProductsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final productsAsync = ref.watch(topProductsProvider);

    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(topProductsProvider),
      child: productsAsync.when(
        loading: () => const _LoadingList(),
        error:   (e, _) => _ErrorCard(message: e.toString()),
        data:    (products) {
          if (products.isEmpty) {
            return const _EmptyState(message: 'No product data for this period');
          }
          final maxRevenue = products
              .map((p) => p.revenue)
              .reduce(max);

          return ListView.separated(
            padding:    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            itemCount:  products.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, i) => _ProductListTile(
              rank:       i + 1,
              product:    products[i],
              maxRevenue: maxRevenue,
            ),
          );
        },
      ),
    );
  }
}

class _ProductListTile extends StatelessWidget {
  const _ProductListTile({
    required this.rank,
    required this.product,
    required this.maxRevenue,
  });

  final int           rank;
  final ProductReport product;
  final double        maxRevenue;

  @override
  Widget build(BuildContext context) {
    final cs       = Theme.of(context).colorScheme;
    final fraction = maxRevenue == 0 ? 0.0 : product.revenue / maxRevenue;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                // Rank badge
                Container(
                  width:  28,
                  height: 28,
                  decoration: BoxDecoration(
                    color:  rank <= 3
                        ? cs.primary.withValues(alpha: 0.15)
                        : cs.surfaceContainerHighest,
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      '#$rank',
                      style: TextStyle(
                        fontSize:   11,
                        fontWeight: FontWeight.w700,
                        color: rank <= 3 ? cs.primary : cs.onSurfaceVariant,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    product.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize:   14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Text(
                  formatCompact(product.revenue),
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color:      cs.primary,
                    fontSize:   14,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            // Bar indicator
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value:           fraction,
                minHeight:       6,
                backgroundColor: cs.surfaceContainerHighest,
                valueColor:      AlwaysStoppedAnimation(cs.primary),
              ),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                _Stat(
                  label: 'Qty sold',
                  value: product.qtySold.toString(),
                ),
                const SizedBox(width: 20),
                _Stat(
                  label: 'Profit',
                  value: formatCompact(product.profit),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(label,
            style: TextStyle(fontSize: 11, color: cs.onSurfaceVariant)),
        const SizedBox(width: 4),
        Text(value,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Profit tab
// ─────────────────────────────────────────────────────────────────────────────

class _ProfitTab extends ConsumerWidget {
  const _ProfitTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryAsync = ref.watch(salesSummaryProvider);
    final paymentAsync = ref.watch(paymentReportProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(salesSummaryProvider);
        ref.invalidate(paymentReportProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Profit card
          summaryAsync.when(
            loading: () => const _LoadingCard(height: 80),
            error:   (e, _) => _ErrorCard(message: e.toString()),
            data:    (s) => _SummaryCard(
              label:  'Total Profit',
              value:  formatCompact(s.totalProfit),
              icon:   Icons.savings_rounded,
              accent: Theme.of(context).colorScheme.primary,
            ),
          ),
          const SizedBox(height: 20),
          const _SectionHeader(title: 'Payment Methods'),
          const SizedBox(height: 8),
          paymentAsync.when(
            loading: () => const _LoadingCard(height: 240),
            error:   (e, _) => _ErrorCard(message: e.toString()),
            data:    (map) => _PaymentPieChart(data: map),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Payment pie chart
// ─────────────────────────────────────────────────────────────────────────────

const _kChartColors = [
  Color(0xFF6366F1), // indigo
  Color(0xFF0EA5E9), // sky
  Color(0xFF10B981), // emerald
  Color(0xFFF59E0B), // amber
  Color(0xFFEF4444), // red
  Color(0xFF8B5CF6), // violet
];

class _PaymentPieChart extends StatefulWidget {
  const _PaymentPieChart({required this.data});
  final Map<String, double> data;

  @override
  State<_PaymentPieChart> createState() => _PaymentPieChartState();
}

class _PaymentPieChartState extends State<_PaymentPieChart> {
  int _touchedIndex = -1;

  @override
  Widget build(BuildContext context) {
    final entries = widget.data.entries.toList();

    if (entries.isEmpty) {
      return const _EmptyState(message: 'No payment data for this period');
    }

    final total = entries.fold<double>(0, (s, e) => s + e.value);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            SizedBox(
              height: 200,
              child: PieChart(
                PieChartData(
                  sectionsSpace:    3,
                  centerSpaceRadius: 44,
                  pieTouchData: PieTouchData(
                    touchCallback: (event, resp) {
                      if (event is FlTapUpEvent) {
                        final idx = resp?.touchedSection?.touchedSectionIndex ?? -1;
                        setState(() => _touchedIndex = idx);
                      }
                    },
                  ),
                  sections: entries.asMap().entries.map((e) {
                    final isTouched = e.key == _touchedIndex;
                    final pct = total == 0 ? 0.0 : e.value.value / total * 100;
                    return PieChartSectionData(
                      value:      e.value.value,
                      color:      _kChartColors[e.key % _kChartColors.length],
                      radius:     isTouched ? 90 : 80,
                      title:      '${pct.toStringAsFixed(1)}%',
                      titleStyle: TextStyle(
                        fontSize:   isTouched ? 13 : 11,
                        fontWeight: FontWeight.w600,
                        color:      Colors.white,
                      ),
                    );
                  }).toList(),
                ),
              ),
            ),
            const SizedBox(height: 16),
            // Legend
            Wrap(
              spacing:   16,
              runSpacing: 8,
              children: entries.asMap().entries.map((e) {
                return Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width:  12,
                      height: 12,
                      decoration: BoxDecoration(
                        color:  _kChartColors[e.key % _kChartColors.length],
                        shape:  BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      '${_capitalize(e.value.key)} – ${formatCompact(e.value.value)}',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                );
              }).toList(),
            ),
          ],
        ),
      ),
    );
  }

  String _capitalize(String s) =>
      s.isEmpty ? s : s[0].toUpperCase() + s.substring(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared small widgets
// ─────────────────────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.subtitle});
  final String  title;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Row(
      children: [
        Text(title,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize:   16,
            )),
        if (subtitle != null) ...[
          const SizedBox(width: 8),
          Text(subtitle!,
              style: TextStyle(
                fontSize: 12,
                color:    cs.onSurfaceVariant,
              )),
        ],
      ],
    );
  }
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard({required this.height});
  final double height;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: SizedBox(
        height: height,
        child: Center(
          child: CircularProgressIndicator(color: cs.primary, strokeWidth: 2),
        ),
      ),
    );
  }
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(40),
        child: CircularProgressIndicator(strokeWidth: 2),
      ),
    );
  }
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(Icons.error_outline_rounded, color: cs.error),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: TextStyle(color: cs.error, fontSize: 13),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          children: [
            Icon(Icons.bar_chart_rounded, size: 48,
                color: cs.onSurfaceVariant.withValues(alpha: 0.4)),
            const SizedBox(height: 12),
            Text(message,
                textAlign: TextAlign.center,
                style: TextStyle(color: cs.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}
