import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/dashboard_stats_model.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/stat_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardProvider);
    final user       = ref.watch(currentUserProvider);
    final hour       = DateTime.now().hour;
    final greeting   = hour < 12
        ? 'Good Morning'
        : hour < 17
            ? 'Good Afternoon'
            : 'Good Evening';

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: CustomScrollView(
          slivers: [
            // ── App Bar ─────────────────────────────────────────────────────
            SliverAppBar(
              floating:       true,
              snap:           true,
              title:          Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    greeting,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  Text(
                    user?.name ?? 'User',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.notifications_outlined),
                  onPressed: () {},
                  tooltip: 'Notifications',
                ),
                const SizedBox(width: 4),
              ],
            ),

            // ── Content ─────────────────────────────────────────────────────
            statsAsync.when(
              loading: () => const SliverToBoxAdapter(child: _Shimmer()),
              error:   (e, _) => SliverToBoxAdapter(child: _ErrorWidget(error: e.toString())),
              data:    (stats) => SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 12),
                  _StatsRow(stats: stats),
                  const SizedBox(height: 20),
                  _WeeklyChart(stats: stats),
                  const SizedBox(height: 20),
                  const _QuickActions(),
                  const SizedBox(height: 20),
                  _RecentSales(stats: stats),
                  const SizedBox(height: 20),
                  _TopProducts(stats: stats),
                  const SizedBox(height: 32),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Stats Row ────────────────────────────────────────────────────────────────

class _StatsRow extends StatelessWidget {
  const _StatsRow({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.count(
        crossAxisCount:     2,
        shrinkWrap:         true,
        physics:            const NeverScrollableScrollPhysics(),
        crossAxisSpacing:   12,
        mainAxisSpacing:    12,
        childAspectRatio:   1.55,
        children: [
          StatCard(
            title:    'Today Sales',
            value:    formatCompact(stats.todaySales),
            icon:     Icons.attach_money_rounded,
            color:    const Color(0xFF6366F1),
            subtitle: '${stats.todayOrders} orders',
          ),
          StatCard(
            title:    'Orders',
            value:    stats.todayOrders.toString(),
            icon:     Icons.shopping_bag_outlined,
            color:    const Color(0xFF0EA5E9),
            subtitle: 'Today',
          ),
          StatCard(
            title:    'Profit',
            value:    formatCompact(stats.todayProfit),
            icon:     Icons.trending_up_rounded,
            color:    const Color(0xFF10B981),
            subtitle: 'Today',
          ),
          StatCard(
            title:    'Low Stock',
            value:    stats.lowStockCount.toString(),
            icon:     Icons.inventory_2_outlined,
            color:    stats.lowStockCount > 0
                ? const Color(0xFFF59E0B)
                : const Color(0xFF10B981),
            subtitle: stats.lowStockCount > 0 ? 'Needs restock' : 'All good',
          ),
        ],
      ),
    );
  }
}

// ── Weekly Chart ─────────────────────────────────────────────────────────────

class _WeeklyChart extends StatelessWidget {
  const _WeeklyChart({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    final cs      = Theme.of(context).colorScheme;
    final tt      = Theme.of(context).textTheme;
    final points  = stats.weeklySales;
    final maxY    = points.isEmpty
        ? 100.0
        : (points.map((p) => p.amount).reduce((a, b) => a > b ? a : b) * 1.2)
            .clamp(1.0, double.infinity);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.5)),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    'Weekly Sales',
                    style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  Text(
                    '7 days',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 180,
                child: points.isEmpty
                    ? Center(
                        child: Text(
                          'No sales data',
                          style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                        ),
                      )
                    : BarChart(
                        BarChartData(
                          alignment:   BarChartAlignment.spaceAround,
                          maxY:        maxY,
                          barTouchData: BarTouchData(
                            touchTooltipData: BarTouchTooltipData(
                              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                                final label = groupIndex < points.length
                                    ? points[groupIndex].day
                                    : '';
                                return BarTooltipItem(
                                  '$label\n${formatCompact(rod.toY)}',
                                  TextStyle(
                                    color: cs.onPrimary,
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                  ),
                                );
                              },
                            ),
                          ),
                          titlesData: FlTitlesData(
                            show: true,
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 28,
                                getTitlesWidget: (value, meta) {
                                  final idx = value.toInt();
                                  if (idx < 0 || idx >= points.length) {
                                    return const SizedBox.shrink();
                                  }
                                  final day = points[idx].day;
                                  final label = day.length >= 3 ? day.substring(0, 3) : day;
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(
                                      label,
                                      style: tt.labelSmall?.copyWith(
                                        color: cs.onSurfaceVariant,
                                        fontSize: 10,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                            leftTitles:  const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            topTitles:   const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                            rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          ),
                          gridData:   FlGridData(
                            show: true,
                            drawVerticalLine: false,
                            horizontalInterval: maxY / 4,
                            getDrawingHorizontalLine: (value) => FlLine(
                              color: cs.outlineVariant.withValues(alpha: 0.4),
                              strokeWidth: 1,
                            ),
                          ),
                          borderData: FlBorderData(show: false),
                          barGroups: points.asMap().entries.map((entry) {
                            return BarChartGroupData(
                              x: entry.key,
                              barRods: [
                                BarChartRodData(
                                  toY:          entry.value.amount,
                                  color:        cs.primary,
                                  width:        22,
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(6),
                                  ),
                                  backDrawRodData: BackgroundBarChartRodData(
                                    show:  true,
                                    toY:   maxY,
                                    color: cs.primaryContainer.withValues(alpha: 0.3),
                                  ),
                                ),
                              ],
                            );
                          }).toList(),
                        ),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Quick Actions ────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    final actions = [
      const _Action('New Sale',  Icons.point_of_sale_rounded,  Color(0xFF6366F1), '/pos'),
      const _Action('Products',  Icons.inventory_2_rounded,    Color(0xFF0EA5E9), '/products'),
      const _Action('Customers', Icons.people_rounded,         Color(0xFF10B981), '/customers'),
      const _Action('Reports',   Icons.bar_chart_rounded,      Color(0xFFF59E0B), '/reports'),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          Row(
            children: actions
                .map((a) => Expanded(child: _ActionButton(action: a)))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _Action {
  const _Action(this.label, this.icon, this.color, this.route);
  final String   label;
  final IconData icon;
  final Color    color;
  final String   route;
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({required this.action});
  final _Action action;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: InkWell(
        onTap: () => context.go(action.route),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding:    const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color:        action.color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
            border:       Border.all(color: action.color.withValues(alpha: 0.2)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(action.icon, color: action.color, size: 24),
              const SizedBox(height: 6),
              Text(
                action.label,
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color:      action.color,
                  fontWeight: FontWeight.w600,
                  fontSize:   10,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Recent Sales ─────────────────────────────────────────────────────────────

class _RecentSales extends StatelessWidget {
  const _RecentSales({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    final cs   = Theme.of(context).colorScheme;
    final tt   = Theme.of(context).textTheme;
    final list = stats.recentSales.take(5).toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Recent Sales',
                style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.go('/sales'),
                child: const Text('See all'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (list.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'No sales today',
                  style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                ),
              ),
            )
          else
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.5)),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                children: list.asMap().entries.map((entry) {
                  final i    = entry.key;
                  final sale = entry.value;
                  return Column(
                    children: [
                      ListTile(
                        dense:   true,
                        leading: CircleAvatar(
                          radius:          18,
                          backgroundColor: cs.primaryContainer,
                          child: Icon(
                            Icons.receipt_long_rounded,
                            size:  16,
                            color: cs.onPrimaryContainer,
                          ),
                        ),
                        title: Text(
                          sale.invoiceNo,
                          style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        subtitle: Text(
                          sale.customerName ?? 'Walk-in',
                          style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              formatCurrency(sale.total),
                              style: tt.bodyMedium?.copyWith(
                                fontWeight: FontWeight.w700,
                                color:      cs.primary,
                              ),
                            ),
                            Text(
                              formatTime(sale.createdAt),
                              style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      if (i < list.length - 1)
                        Divider(height: 1, color: cs.outlineVariant.withValues(alpha: 0.5)),
                    ],
                  );
                }).toList(),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Top Products ─────────────────────────────────────────────────────────────

class _TopProducts extends StatelessWidget {
  const _TopProducts({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    final cs   = Theme.of(context).colorScheme;
    final tt   = Theme.of(context).textTheme;
    final list = stats.topProducts;

    if (list.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Top Products',
            style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 140,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount:       list.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final p       = list[i];
                final rankColors = [
                  const Color(0xFFFFD700),
                  const Color(0xFFC0C0C0),
                  const Color(0xFFCD7F32),
                ];
                final rankColor = i < 3 ? rankColors[i] : cs.outlineVariant;
                return SizedBox(
                  width: 140,
                  child: Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                      side: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.5)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding:    const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  color:        rankColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '#${i + 1}',
                                  style: tt.labelSmall?.copyWith(
                                    color:      rankColor,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Icon(Icons.star_rounded, size: 14, color: rankColor),
                            ],
                          ),
                          const Spacer(),
                          Text(
                            p.name,
                            style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${p.qty} sold',
                            style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            formatCompact(p.revenue),
                            style: tt.labelSmall?.copyWith(
                              color:      cs.primary,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ── Shimmer loading ──────────────────────────────────────────────────────────

class _Shimmer extends StatelessWidget {
  const _Shimmer();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Shimmer.fromColors(
      baseColor:     cs.surfaceContainerHighest,
      highlightColor: cs.surface,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            GridView.count(
              crossAxisCount:  2,
              shrinkWrap:      true,
              physics:         const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing:  12,
              childAspectRatio: 1.55,
              children: List.generate(
                4,
                (_) => Container(
                  decoration: BoxDecoration(
                    color:        cs.surface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              height:     220,
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              height:     80,
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              height:     200,
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Error widget ─────────────────────────────────────────────────────────────

class _ErrorWidget extends StatelessWidget {
  const _ErrorWidget({required this.error});
  final String error;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 48, color: cs.error),
          const SizedBox(height: 12),
          Text(
            'Could not load dashboard',
            style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Text(
            error,
            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
            textAlign: TextAlign.center,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
