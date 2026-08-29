import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/grad_widgets.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../expenses/presentation/screens/quick_expense_sheet.dart';
import '../../../notifications/presentation/providers/notifications_provider.dart';
import '../../data/models/dashboard_stats_model.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/stat_card.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dashboardProvider);
    final user       = ref.watch(currentUserProvider);
    final unread     = ref.watch(unreadCountProvider);
    final hour       = DateTime.now().hour;
    final greeting   = hour < 12
        ? 'Good Morning'
        : hour < 17
            ? 'Good Afternoon'
            : 'Good Evening';
    final firstName  = user?.name.split(' ').first ?? 'there';

    return Scaffold(
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => showModalBottomSheet(
          context:            context,
          isScrollControlled: true,
          showDragHandle:     true,
          shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
          builder: (_) => QuickExpenseSheet(
            onSaved: () => ref.invalidate(dashboardProvider),
          ),
        ),
        icon:  const Icon(Icons.receipt_long_outlined),
        label: const Text('Expense'),
        backgroundColor: const Color(0xFFF59E0B),
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        color: const Color(0xFF6366F1),
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: CustomScrollView(
          slivers: [
            // ── App Bar ──────────────────────────────────────────────────────
            _GradientAppBar(greeting: greeting, firstName: firstName, unread: unread),

            // ── Content ─────────────────────────────────────────────────────
            statsAsync.when(
              loading: () => const SliverToBoxAdapter(child: _Shimmer()),
              error:   (e, _) => SliverToBoxAdapter(child: _ErrorCard(error: e.toString())),
              data:    (stats) => SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 12),
                  _CompanyBanner(userName: user?.name ?? 'Owner'),
                  const SizedBox(height: 16),
                  _StatsRow(stats: stats),
                  const SizedBox(height: 12),
                  _PaymentBreakdown(stats: stats),
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

// ── Gradient App Bar ──────────────────────────────────────────────────────────

class _GradientAppBar extends StatelessWidget {
  const _GradientAppBar({
    required this.greeting,
    required this.firstName,
    required this.unread,
  });
  final String greeting;
  final String firstName;
  final int    unread;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return SliverAppBar(
      floating:             true,
      snap:                 true,
      expandedHeight:       0,
      backgroundColor:      cs.surfaceContainer,
      surfaceTintColor:     Colors.transparent,
      automaticallyImplyLeading: false,
      title: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                greeting,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: cs.onSurfaceVariant,
                ),
              ),
              // Gradient name text via ShaderMask
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: kGradElectric,
                ).createShader(bounds),
                child: Text(
                  firstName,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        // Barcode scanner shortcut
        IconButton(
          icon:    const Icon(Icons.qr_code_scanner_rounded),
          onPressed: () => context.push('/scanner'),
          tooltip:  'Scan Product',
        ),
        // Notification bell with unread badge
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon:      const Icon(Icons.notifications_outlined),
                onPressed: () => context.go('/notifications'),
                tooltip:   'Notifications',
              ),
              if (unread > 0)
                Positioned(
                  right: 6,
                  top:   6,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    padding:     const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color:        const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      unread > 9 ? '9+' : '$unread',
                      style: const TextStyle(
                        color:      Colors.white,
                        fontSize:   9,
                        fontWeight: FontWeight.w700,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
        ),
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
    );
  }
}

// ── Company Banner ────────────────────────────────────────────────────────────

class _CompanyBanner extends StatelessWidget {
  const _CompanyBanner({required this.userName});
  final String userName;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end:   Alignment.bottomRight,
            colors: [Color(0xFF4338CA), Color(0xFF6366F1), Color(0xFF818CF8)],
          ),
          boxShadow: [
            BoxShadow(
              color:      const Color(0xFF4F46E5).withValues(alpha: 0.30),
              blurRadius: 20,
              offset:     const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          'ACTIVE',
                          style: tt.labelSmall?.copyWith(
                            color:      Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize:   9,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'SAS Garments',
                    style: tt.titleLarge?.copyWith(
                      color:       Colors.white,
                      fontWeight:  FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    userName,
                    style: tt.bodyMedium?.copyWith(
                      color:      Colors.white.withValues(alpha: 0.80),
                      fontWeight: FontWeight.w400,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              width:  52,
              height: 52,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.20),
                border: Border.all(
                    color: Colors.white.withValues(alpha: 0.35), width: 1.5),
              ),
              child: const Icon(
                Icons.storefront_rounded,
                color: Colors.white,
                size:  26,
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.count(
        crossAxisCount:    2,
        shrinkWrap:        true,
        physics:           const NeverScrollableScrollPhysics(),
        crossAxisSpacing:  12,
        mainAxisSpacing:   12,
        childAspectRatio:  1.28,
        children: [
          StatCard(
            title:     'Today Sales',
            value:     formatCompact(stats.todaySales),
            icon:      Icons.attach_money_rounded,
            color:     const Color(0xFF4F46E5),
            gradColors: kGradPrimary,
            subtitle:  '${stats.todayOrders} orders',
          ),
          StatCard(
            title:     'Orders',
            value:     stats.todayOrders.toString(),
            icon:      Icons.shopping_bag_outlined,
            color:     const Color(0xFF0EA5E9),
            gradColors: kGradSky,
            subtitle:  'Today',
          ),
          StatCard(
            title:     'Profit',
            value:     formatCompact(stats.todayProfit),
            icon:      Icons.trending_up_rounded,
            color:     const Color(0xFF10B981),
            gradColors: kGradGreen,
            subtitle:  'Today',
          ),
          StatCard(
            title:     'Low Stock',
            value:     stats.lowStockCount.toString(),
            icon:      Icons.inventory_2_outlined,
            color:     stats.lowStockCount > 0
                ? const Color(0xFFF59E0B)
                : const Color(0xFF10B981),
            gradColors: stats.lowStockCount > 0 ? kGradAmber : kGradGreen,
            subtitle:  stats.lowStockCount > 0 ? 'Needs restock' : 'All good',
          ),
        ],
      ),
    );
  }
}

// ── Payment Breakdown ─────────────────────────────────────────────────────────

class _PaymentBreakdown extends StatelessWidget {
  const _PaymentBreakdown({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    // Only show if there is any sales data
    final total = stats.cashSales + stats.cardSales + stats.creditSales + stats.bankSales;
    if (total == 0) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          _PmTile(
            label:  'Cash',
            amount: stats.cashSales,
            icon:   Icons.payments_outlined,
            color:  const Color(0xFF10B981),
          ),
          const SizedBox(width: 8),
          _PmTile(
            label:  'Card',
            amount: stats.cardSales,
            icon:   Icons.credit_card_rounded,
            color:  const Color(0xFF6366F1),
          ),
          const SizedBox(width: 8),
          _PmTile(
            label:  'Credit',
            amount: stats.creditSales,
            icon:   Icons.account_balance_wallet_outlined,
            color:  const Color(0xFFF59E0B),
          ),
          if (stats.bankSales > 0) ...[
            const SizedBox(width: 8),
            _PmTile(
              label:  'Bank',
              amount: stats.bankSales,
              icon:   Icons.account_balance_outlined,
              color:  const Color(0xFF0EA5E9),
            ),
          ],
        ],
      ),
    );
  }
}

class _PmTile extends StatelessWidget {
  const _PmTile({
    required this.label,
    required this.amount,
    required this.icon,
    required this.color,
  });
  final String   label;
  final double   amount;
  final IconData icon;
  final Color    color;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Expanded(
      child: Container(
        padding:    const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
        decoration: BoxDecoration(
          color:        color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border:       Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 16),
            const SizedBox(height: 4),
            Text(
              formatCompact(amount),
              style: tt.bodySmall?.copyWith(
                color:      color,
                fontWeight: FontWeight.w800,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              label,
              style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant, fontSize: 9),
            ),
          ],
        ),
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
    final cs     = Theme.of(context).colorScheme;
    final tt     = Theme.of(context).textTheme;
    final points = stats.weeklySales;
    final maxY   = points.isEmpty
        ? 100.0
        : (points.map((p) => p.amount).reduce((a, b) => a > b ? a : b) * 1.2)
            .clamp(1.0, double.infinity);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color:        cs.surfaceContainer,
          borderRadius: BorderRadius.circular(18),
          border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
          boxShadow: [
            BoxShadow(
              color:       const Color(0xFF4F46E5).withValues(alpha: 0.06),
              blurRadius:  16,
              offset:      const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  // Gradient dot accent
                  Container(
                    width: 8, height: 8,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const LinearGradient(colors: kGradElectric),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Weekly Sales',
                    style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0x1A4F46E5), Color(0x1A8B5CF6)],
                      ),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '7 days',
                      style: tt.labelSmall?.copyWith(
                        color: const Color(0xFF8B5CF6),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
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
                          alignment: BarChartAlignment.spaceAround,
                          maxY:      maxY,
                          barTouchData: BarTouchData(
                            touchTooltipData: BarTouchTooltipData(
                              getTooltipItem: (group, groupIndex, rod, rodIndex) {
                                final label = groupIndex < points.length
                                    ? points[groupIndex].day
                                    : '';
                                return BarTooltipItem(
                                  '$label\n${formatCompact(rod.toY)}',
                                  const TextStyle(
                                    color:      Colors.white,
                                    fontSize:   11,
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
                                  final day   = points[idx].day;
                                  final label = day.length >= 3 ? day.substring(0, 3) : day;
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 6),
                                    child: Text(
                                      label,
                                      style: tt.labelSmall?.copyWith(
                                        color:    cs.onSurfaceVariant,
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
                          gridData: FlGridData(
                            show: true,
                            drawVerticalLine: false,
                            horizontalInterval: maxY / 4,
                            getDrawingHorizontalLine: (value) => FlLine(
                              color:       cs.outlineVariant.withValues(alpha: 0.35),
                              strokeWidth: 1,
                            ),
                          ),
                          borderData: FlBorderData(show: false),
                          // Gradient bars: blue → violet
                          barGroups: points.asMap().entries.map((entry) {
                            return BarChartGroupData(
                              x: entry.key,
                              barRods: [
                                BarChartRodData(
                                  toY: entry.value.amount,
                                  gradient: const LinearGradient(
                                    begin: Alignment.bottomCenter,
                                    end:   Alignment.topCenter,
                                    colors: [Color(0xFF3B82F6), Color(0xFF8B5CF6)],
                                  ),
                                  width: 22,
                                  borderRadius: const BorderRadius.vertical(
                                    top: Radius.circular(6),
                                  ),
                                  backDrawRodData: BackgroundBarChartRodData(
                                    show:  true,
                                    toY:   maxY,
                                    color: const Color(0xFF4F46E5).withValues(alpha: 0.06),
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

// ── Quick Actions ─────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  const _QuickActions();

  static const _actions = [
    _Action('Stock',     Icons.inventory_2_rounded,    kGradAmber,   '/stock',     false, false),
    _Action('Staff',     Icons.badge_rounded,          kGradPrimary, '/staff',     false, false),
    _Action('Customers', Icons.person_pin_rounded,     kGradGreen,   '/customers', false, false),
    _Action('Reports',   Icons.bar_chart_rounded,      kGradSky,     '/reports',   false, false),
  ];

  static const _row2 = [
    _Action('Scanner', Icons.qr_code_scanner_rounded, kGradViolet, '/scanner', false, true),
    _Action('POS',     Icons.point_of_sale_rounded,   kGradPrimary, '/pos',   true,  false),
  ];

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 3, height: 16,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end:   Alignment.bottomCenter,
                    colors: kGradPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'QUICK ACTIONS',
                style: tt.labelSmall?.copyWith(
                  fontWeight:   FontWeight.w700,
                  letterSpacing: 0.8,
                  color: const Color(0xFF6366F1),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: _actions
                .map((a) => Expanded(child: _ActionTile(action: a)))
                .toList(),
          ),
          const SizedBox(height: 8),
          Row(
            children: _row2
                .map((a) => Expanded(child: _ActionTile(action: a)))
                .toList(),
          ),
        ],
      ),
    );
  }
}

class _Action {
  const _Action(this.label, this.icon, this.colors, this.route, this.isPrimary, this.isPush);
  final String       label;
  final IconData     icon;
  final List<Color>  colors;
  final String       route;
  final bool         isPrimary;
  final bool         isPush;
}

class _ActionTile extends StatelessWidget {
  const _ActionTile({required this.action});
  final _Action action;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: GestureDetector(
        onTap: () => action.isPush ? context.push(action.route) : context.go(action.route),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(14),
            gradient: action.isPrimary
                ? const LinearGradient(
                    begin: Alignment.topLeft,
                    end:   Alignment.bottomRight,
                    colors: kGradPrimary,
                  )
                : LinearGradient(
                    begin: Alignment.topLeft,
                    end:   Alignment.bottomRight,
                    colors: [
                      action.colors[0].withValues(alpha: 0.14),
                      action.colors[1].withValues(alpha: 0.08),
                    ],
                  ),
            border: Border.all(
              color: action.isPrimary
                  ? Colors.transparent
                  : action.colors[0].withValues(alpha: 0.22),
            ),
            boxShadow: action.isPrimary
                ? [
                    BoxShadow(
                      color:      action.colors[0].withValues(alpha: 0.28),
                      blurRadius: 12,
                      offset:     const Offset(0, 4),
                    ),
                  ]
                : [],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                action.icon,
                color: action.isPrimary ? Colors.white : action.colors[0],
                size:  24,
              ),
              const SizedBox(height: 6),
              Text(
                action.label,
                style: tt.labelSmall?.copyWith(
                  color:      action.isPrimary ? Colors.white : action.colors[0],
                  fontWeight: FontWeight.w700,
                  fontSize:   10,
                ),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Recent Sales ──────────────────────────────────────────────────────────────

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
              Container(
                width: 3, height: 16,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end:   Alignment.bottomCenter,
                    colors: kGradElectric,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'RECENT SALES',
                style: tt.labelSmall?.copyWith(
                  fontWeight:   FontWeight.w700,
                  letterSpacing: 0.8,
                  color: const Color(0xFF3B82F6),
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.go('/sales'),
                child: Text(
                  'See all',
                  style: TextStyle(
                    color: const Color(0xFF6366F1),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
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
            Container(
              decoration: BoxDecoration(
                color:        cs.surfaceContainer,
                borderRadius: BorderRadius.circular(18),
                border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
                boxShadow: [
                  BoxShadow(
                    color:      const Color(0xFF3B82F6).withValues(alpha: 0.05),
                    blurRadius: 12,
                    offset:     const Offset(0, 4),
                  ),
                ],
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
                        leading: Container(
                          width:  36,
                          height: 36,
                          decoration: BoxDecoration(
                            shape:    BoxShape.circle,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end:   Alignment.bottomRight,
                              colors: kGradElectric,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color:      const Color(0xFF3B82F6).withValues(alpha: 0.22),
                                blurRadius: 6,
                                offset:     const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.receipt_long_rounded,
                            size:  16,
                            color: Colors.white,
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
                            ShaderMask(
                              shaderCallback: (bounds) => const LinearGradient(
                                colors: kGradGreen,
                              ).createShader(bounds),
                              child: Text(
                                formatCurrency(sale.total),
                                style: tt.bodyMedium?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                ),
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
                        Divider(height: 1, color: cs.outlineVariant.withValues(alpha: 0.4)),
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

// ── Top Products ──────────────────────────────────────────────────────────────

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
          Row(
            children: [
              Container(
                width: 3, height: 16,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(2),
                  gradient: const LinearGradient(
                    begin: Alignment.topCenter,
                    end:   Alignment.bottomCenter,
                    colors: kGradViolet,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'TOP PRODUCTS',
                style: tt.labelSmall?.copyWith(
                  fontWeight:   FontWeight.w700,
                  letterSpacing: 0.8,
                  color: const Color(0xFF8B5CF6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 148,
            child: ListView.separated(
              scrollDirection:  Axis.horizontal,
              itemCount:        list.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final p = list[i];
                final rankGrads = [kGradAmber, kGradViolet, kGradSky];
                final rankGrad  = i < 3 ? rankGrads[i] : kGradBlue;
                return SizedBox(
                  width: 140,
                  child: Container(
                    decoration: BoxDecoration(
                      color:        cs.surfaceContainer,
                      borderRadius: BorderRadius.circular(14),
                      border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      rankGrad[0].withValues(alpha: 0.18),
                                      rankGrad[1].withValues(alpha: 0.12),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(6),
                                ),
                                child: Text(
                                  '#${i + 1}',
                                  style: tt.labelSmall?.copyWith(
                                    color:      rankGrad[0],
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Icon(Icons.star_rounded, size: 14, color: rankGrad[0]),
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
                          ShaderMask(
                            shaderCallback: (bounds) => const LinearGradient(
                              colors: kGradPrimary,
                            ).createShader(bounds),
                            child: Text(
                              formatCompact(p.revenue),
                              style: tt.labelSmall?.copyWith(
                                color:      Colors.white,
                                fontWeight: FontWeight.w700,
                              ),
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

// ── Shimmer loading ───────────────────────────────────────────────────────────

class _Shimmer extends StatelessWidget {
  const _Shimmer();

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Shimmer.fromColors(
      baseColor:      cs.surfaceContainerHighest,
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
              childAspectRatio: 1.28,
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
              height: 232,
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(18),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              height: 90,
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 16),
            Container(
              height: 200,
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

// ── Error card ────────────────────────────────────────────────────────────────

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.error});
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