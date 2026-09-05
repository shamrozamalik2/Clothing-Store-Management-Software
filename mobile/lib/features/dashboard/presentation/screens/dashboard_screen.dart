import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../../core/widgets/grad_widgets.dart';
import '../../../../core/widgets/pbc_logo.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../expenses/presentation/screens/quick_expense_sheet.dart';
import '../../../notifications/presentation/providers/notifications_provider.dart';
import '../../data/models/dashboard_stats_model.dart';
import '../providers/dashboard_provider.dart';
import '../widgets/stat_card.dart';

// ── Brand constants ───────────────────────────────────────────────────────────

const _kIndigo  = Color(0xFF4F46E5);
const _kViolet  = Color(0xFF7C3AED);
const _kIndigoLight = Color(0xFF6366F1);

// ─────────────────────────────────────────────────────────────────────────────

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
        : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    final firstName  = user?.name.split(' ').first ?? 'there';

    void showExpenseSheet() => showModalBottomSheet(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => QuickExpenseSheet(
        onSaved: () => ref.invalidate(dashboardProvider),
      ),
    );

    return Scaffold(
      body: RefreshIndicator(
        color: _kIndigo,
        onRefresh: () async => ref.invalidate(dashboardProvider),
        child: CustomScrollView(
          slivers: [
            _PremiumAppBar(
              greeting:  greeting,
              firstName: firstName,
              unread:    unread,
            ),
            statsAsync.when(
              loading: () => const SliverToBoxAdapter(child: _Shimmer()),
              error:   (e, _) => SliverToBoxAdapter(child: _ErrorCard(error: e.toString())),
              data:    (stats) => SliverList(
                delegate: SliverChildListDelegate([
                  const SizedBox(height: 16),
                  _CompanyBanner(
                    companyName: user?.companyName ?? 'My Store',
                    userName:    user?.name ?? 'Owner',
                  ),
                  const SizedBox(height: 16),
                  _HeroSalesCard(stats: stats),
                  const SizedBox(height: 12),
                  _MetricTrio(stats: stats),
                  const SizedBox(height: 16),
                  _PaymentBreakdown(stats: stats),
                  const SizedBox(height: 20),
                  _WeeklyChart(stats: stats),
                  const SizedBox(height: 20),
                  _QuickActions(onExpenseTap: showExpenseSheet),
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

// ── Premium App Bar ───────────────────────────────────────────────────────────

class _PremiumAppBar extends StatelessWidget {
  const _PremiumAppBar({
    required this.greeting,
    required this.firstName,
    required this.unread,
  });
  final String greeting;
  final String firstName;
  final int    unread;

  @override
  Widget build(BuildContext context) {
    final cs   = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return SliverAppBar(
      floating:                  true,
      snap:                      true,
      expandedHeight:            0,
      backgroundColor:           cs.surfaceContainer,
      surfaceTintColor:          Colors.transparent,
      automaticallyImplyLeading: false,
      elevation:                 0,
      scrolledUnderElevation:    0,
      title: Row(
        children: [
          // PBC logo mark
          Container(
            width:  36,
            height: 36,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end:   Alignment.bottomRight,
                colors: [Color(0xFF3730A3), _kIndigo],
              ),
              boxShadow: [
                BoxShadow(
                  color:      _kIndigo.withValues(alpha: 0.30),
                  blurRadius: 10,
                  offset:     const Offset(0, 3),
                ),
              ],
            ),
            child: const Center(
              child: PBCLogoMark(size: 20, onDark: true),
            ),
          ),
          const SizedBox(width: 12),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                greeting,
                style: TextStyle(
                  fontFamily: 'Inter',
                  fontSize:   11,
                  fontWeight: FontWeight.w400,
                  color:      cs.onSurfaceVariant,
                  height:     1.0,
                ),
              ),
              ShaderMask(
                shaderCallback: (bounds) => const LinearGradient(
                  colors: kGradElectric,
                ).createShader(bounds),
                child: Text(
                  firstName,
                  style: const TextStyle(
                    fontFamily: 'Inter',
                    fontSize:   16,
                    fontWeight: FontWeight.w800,
                    color:      Colors.white,
                    height:     1.2,
                    letterSpacing: -0.3,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
      actions: [
        IconButton(
          icon:    Icon(Icons.qr_code_scanner_rounded, color: cs.onSurface),
          onPressed: () => context.push('/scanner'),
          tooltip:  'Scan Product',
        ),
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: Stack(
            alignment: Alignment.center,
            children: [
              IconButton(
                icon:      Icon(Icons.notifications_outlined, color: cs.onSurface),
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
                        color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
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
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [
                Colors.transparent,
                _kIndigo.withValues(alpha: dark ? 0.35 : 0.18),
                _kViolet.withValues(alpha: dark ? 0.35 : 0.18),
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
  const _CompanyBanner({required this.companyName, required this.userName});
  final String companyName;
  final String userName;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(18),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end:   Alignment.bottomRight,
            colors: [Color(0xFF1E1B6B), Color(0xFF3730A3), Color(0xFF4F46E5)],
            stops:  [0.0, 0.55, 1.0],
          ),
          boxShadow: [
            BoxShadow(
              color:      _kIndigo.withValues(alpha: 0.32),
              blurRadius: 20,
              offset:     const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          children: [
            // PBC logo mark on dark gradient
            Container(
              width:  42,
              height: 42,
              decoration: BoxDecoration(
                color:        Colors.white.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.20),
                  width: 1,
                ),
              ),
              child: const Center(
                child: PBCLogoMark(size: 24, onDark: true),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color:        const Color(0xFF4ADE80).withValues(alpha: 0.20),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: const Color(0xFF4ADE80).withValues(alpha: 0.35),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              width: 5, height: 5,
                              decoration: const BoxDecoration(
                                shape: BoxShape.circle,
                                color: Color(0xFF4ADE80),
                              ),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'ACTIVE',
                              style: TextStyle(
                                fontFamily:    'Inter',
                                fontSize:      9,
                                fontWeight:    FontWeight.w700,
                                color:         Color(0xFF86EFAC),
                                letterSpacing: 0.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    companyName,
                    style: tt.titleMedium?.copyWith(
                      color:       Colors.white,
                      fontWeight:  FontWeight.w800,
                      letterSpacing: -0.3,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    userName,
                    style: tt.bodySmall?.copyWith(
                      color: Colors.white.withValues(alpha: 0.65),
                    ),
                  ),
                ],
              ),
            ),
            // ProBusinessCloud wordmark chip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
              decoration: BoxDecoration(
                color:        Colors.white.withValues(alpha: 0.10),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
              ),
              child: const Text(
                'PBC',
                style: TextStyle(
                  fontFamily:    'Inter',
                  fontSize:      12,
                  fontWeight:    FontWeight.w800,
                  color:         Colors.white,
                  letterSpacing: 0.5,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Hero Sales Card ───────────────────────────────────────────────────────────

class _HeroSalesCard extends StatelessWidget {
  const _HeroSalesCard({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    final tt  = Theme.of(context).textTheme;
    final avg = stats.todayOrders > 0
        ? formatCompact(stats.todaySales / stats.todayOrders)
        : '—';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 18, 20, 18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end:   Alignment.bottomRight,
            colors: [Color(0xFF312E81), Color(0xFF4338CA), Color(0xFF6366F1)],
            stops:  [0.0, 0.5, 1.0],
          ),
          boxShadow: [
            BoxShadow(
              color:      _kIndigo.withValues(alpha: 0.40),
              blurRadius: 28,
              offset:     const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  "Today's Revenue",
                  style: TextStyle(
                    fontFamily: 'Inter',
                    fontSize:   13,
                    fontWeight: FontWeight.w500,
                    color:      Colors.white.withValues(alpha: 0.72),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color:        Colors.white.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6, height: 6,
                        decoration: const BoxDecoration(
                          shape: BoxShape.circle,
                          color: Color(0xFF4ADE80),
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Text(
                        'Live',
                        style: TextStyle(
                          fontFamily: 'Inter',
                          fontSize:   11,
                          fontWeight: FontWeight.w600,
                          color:      Colors.white,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            // Large amount
            FittedBox(
              fit:       BoxFit.scaleDown,
              alignment: Alignment.centerLeft,
              child: Text(
                formatCompact(stats.todaySales),
                style: const TextStyle(
                  fontFamily:    'Inter',
                  fontSize:      38,
                  fontWeight:    FontWeight.w800,
                  color:         Colors.white,
                  letterSpacing: -1.5,
                  height:        1.1,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${stats.todayOrders} ${stats.todayOrders == 1 ? 'order' : 'orders'} completed today',
              style: TextStyle(
                fontFamily: 'Inter',
                fontSize:   13,
                color:      Colors.white.withValues(alpha: 0.68),
              ),
            ),
            const SizedBox(height: 16),
            // Separator
            Container(
              height: 1,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.white.withValues(alpha: 0.0),
                    Colors.white.withValues(alpha: 0.15),
                    Colors.white.withValues(alpha: 0.0),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            // Mini metrics row
            Row(
              children: [
                _HeroMetric(
                  label: 'Profit',
                  value: formatCompact(stats.todayProfit),
                  icon:  Icons.trending_up_rounded,
                ),
                _HeroMetricDivider(),
                _HeroMetric(
                  label: 'Pending',
                  value: formatCompact(stats.pendingPayments),
                  icon:  Icons.hourglass_top_rounded,
                ),
                _HeroMetricDivider(),
                _HeroMetric(
                  label: 'Avg Sale',
                  value: avg,
                  icon:  Icons.receipt_outlined,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({required this.label, required this.value, required this.icon});
  final String   label;
  final String   value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, color: Colors.white.withValues(alpha: 0.65), size: 14),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              fontFamily: 'Inter',
              fontSize:   13,
              fontWeight: FontWeight.w700,
              color:      Colors.white,
              letterSpacing: -0.3,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center,
          ),
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Inter',
              fontSize:   10,
              color:      Colors.white.withValues(alpha: 0.55),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _HeroMetricDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width:  1,
      height: 36,
      margin: const EdgeInsets.symmetric(horizontal: 4),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin:  Alignment.topCenter,
          end:    Alignment.bottomCenter,
          colors: [
            Colors.white.withValues(alpha: 0.0),
            Colors.white.withValues(alpha: 0.18),
            Colors.white.withValues(alpha: 0.0),
          ],
        ),
      ),
    );
  }
}

// ── Metric Trio (Orders / Profit / Low Stock) ─────────────────────────────────

class _MetricTrio extends StatelessWidget {
  const _MetricTrio({required this.stats});
  final DashboardStats stats;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: StatCard(
              title:     'Orders',
              value:     stats.todayOrders.toString(),
              icon:      Icons.shopping_bag_outlined,
              color:     const Color(0xFF0EA5E9),
              gradColors: kGradSky,
              subtitle:  'Today',
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: StatCard(
              title:     'Profit',
              value:     formatCompact(stats.todayProfit),
              icon:      Icons.trending_up_rounded,
              color:     const Color(0xFF10B981),
              gradColors: kGradGreen,
              subtitle:  'Today',
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: StatCard(
              title:    'Low Stock',
              value:    stats.lowStockCount.toString(),
              icon:     Icons.inventory_2_outlined,
              color:    stats.lowStockCount > 0 ? const Color(0xFFF59E0B) : const Color(0xFF10B981),
              gradColors: stats.lowStockCount > 0 ? kGradAmber : kGradGreen,
              subtitle: stats.lowStockCount > 0 ? 'Restock' : 'All good',
            ),
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
    final total = stats.cashSales + stats.cardSales + stats.creditSales + stats.bankSales;
    if (total == 0) return const SizedBox.shrink();

    final cs = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color:        cs.surfaceContainer,
          borderRadius: BorderRadius.circular(16),
          border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
          boxShadow: [
            BoxShadow(
              color:      Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset:     const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Payment Breakdown',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                fontWeight: FontWeight.w700,
                color:      cs.onSurface,
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _PmTile(label: 'Cash',   amount: stats.cashSales,   icon: Icons.payments_outlined,            color: const Color(0xFF10B981)),
                const SizedBox(width: 8),
                _PmTile(label: 'Card',   amount: stats.cardSales,   icon: Icons.credit_card_rounded,          color: const Color(0xFF6366F1)),
                const SizedBox(width: 8),
                _PmTile(label: 'Credit', amount: stats.creditSales, icon: Icons.account_balance_wallet_outlined, color: const Color(0xFFF59E0B)),
                if (stats.bankSales > 0) ...[
                  const SizedBox(width: 8),
                  _PmTile(label: 'Bank', amount: stats.bankSales, icon: Icons.account_balance_outlined, color: const Color(0xFF0EA5E9)),
                ],
              ],
            ),
          ],
        ),
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
        padding:    const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
        decoration: BoxDecoration(
          color:        color.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(12),
          border:       Border.all(color: color.withValues(alpha: 0.18)),
        ),
        child: Column(
          children: [
            Container(
              width: 28, height: 28,
              decoration: BoxDecoration(
                color:        color.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 14),
            ),
            const SizedBox(height: 5),
            Text(
              formatCompact(amount),
              style: tt.bodySmall?.copyWith(
                color:      color,
                fontWeight: FontWeight.w800,
                fontSize:   11,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            Text(
              label,
              style: tt.labelSmall?.copyWith(
                color:   cs.onSurfaceVariant,
                fontSize: 9,
              ),
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
        : (points.map((p) => p.amount).reduce((a, b) => a > b ? a : b) * 1.25)
            .clamp(1.0, double.infinity);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color:        cs.surfaceContainer,
          borderRadius: BorderRadius.circular(20),
          border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.35)),
          boxShadow: [
            BoxShadow(
              color:       _kIndigo.withValues(alpha: 0.05),
              blurRadius:  16,
              offset:      const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 8, height: 8,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(colors: kGradElectric),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Weekly Sales',
                    style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                    decoration: BoxDecoration(
                      color:        _kIndigo.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _kIndigo.withValues(alpha: 0.15)),
                    ),
                    child: Text(
                      '7 days',
                      style: tt.labelSmall?.copyWith(
                        color:      _kIndigoLight,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              SizedBox(
                height: 160,
                child: points.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.bar_chart_outlined, size: 36, color: cs.onSurfaceVariant.withValues(alpha: 0.4)),
                            const SizedBox(height: 8),
                            Text(
                              'No sales data',
                              style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                            ),
                          ],
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
                                    color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
                                );
                              },
                            ),
                          ),
                          titlesData: FlTitlesData(
                            show: true,
                            bottomTitles: AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 26,
                                getTitlesWidget: (value, meta) {
                                  final idx = value.toInt();
                                  if (idx < 0 || idx >= points.length) return const SizedBox.shrink();
                                  final day   = points[idx].day;
                                  final label = day.length >= 3 ? day.substring(0, 3) : day;
                                  return Padding(
                                    padding: const EdgeInsets.only(top: 5),
                                    child: Text(
                                      label,
                                      style: tt.labelSmall?.copyWith(
                                        color:   cs.onSurfaceVariant,
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
                              color:       cs.outlineVariant.withValues(alpha: 0.30),
                              strokeWidth: 1,
                              dashArray:   [4, 4],
                            ),
                          ),
                          borderData: FlBorderData(show: false),
                          barGroups: points.asMap().entries.map((entry) {
                            return BarChartGroupData(
                              x: entry.key,
                              barRods: [
                                BarChartRodData(
                                  toY: entry.value.amount,
                                  gradient: const LinearGradient(
                                    begin: Alignment.bottomCenter,
                                    end:   Alignment.topCenter,
                                    colors: [Color(0xFF4338CA), Color(0xFF818CF8)],
                                  ),
                                  width: 20,
                                  borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                                  backDrawRodData: BackgroundBarChartRodData(
                                    show:  true,
                                    toY:   maxY,
                                    color: _kIndigo.withValues(alpha: 0.05),
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
  const _QuickActions({required this.onExpenseTap});
  final VoidCallback onExpenseTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GradSectionLabel('Quick Actions'),
          const SizedBox(height: 2),
          // Row 1
          Row(children: [
            _Tile(icon: Icons.inventory_2_rounded,  label: 'Stock',     grad: kGradAmber,   onTap: () => context.go('/stock')),
            const SizedBox(width: 8),
            _Tile(icon: Icons.badge_rounded,         label: 'Staff',     grad: kGradPrimary, onTap: () => context.go('/staff')),
            const SizedBox(width: 8),
            _Tile(icon: Icons.person_pin_rounded,    label: 'Customers', grad: kGradGreen,   onTap: () => context.go('/customers')),
          ]),
          const SizedBox(height: 8),
          // Row 2
          Row(children: [
            _Tile(icon: Icons.bar_chart_rounded,       label: 'Reports',  grad: kGradSky,    onTap: () => context.go('/reports')),
            const SizedBox(width: 8),
            _Tile(icon: Icons.qr_code_scanner_rounded, label: 'Scanner',  grad: kGradViolet, onTap: () => context.push('/scanner')),
            const SizedBox(width: 8),
            _Tile(icon: Icons.receipt_long_outlined,   label: 'Expense',  grad: kGradAmber,  onTap: onExpenseTap),
          ]),
          const SizedBox(height: 10),
          // POS CTA — full width gradient
          GradButton(
            label:  'Open POS',
            icon:   Icons.point_of_sale_rounded,
            onPressed: () => context.go('/pos'),
          ),
        ],
      ),
    );
  }
}

class _Tile extends StatelessWidget {
  const _Tile({
    required this.icon,
    required this.label,
    required this.grad,
    required this.onTap,
  });
  final IconData     icon;
  final String       label;
  final List<Color>  grad;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Expanded(
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(14),
        child: InkWell(
          onTap:        onTap,
          borderRadius: BorderRadius.circular(14),
          splashColor:  grad[0].withValues(alpha: 0.10),
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 14),
            decoration: BoxDecoration(
              color:        cs.surfaceContainer,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: grad[0].withValues(alpha: 0.15)),
              boxShadow: [
                BoxShadow(
                  color:      grad[0].withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset:     const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                GradIconBox(
                  icon:         icon,
                  colors:       grad,
                  size:         36,
                  iconSize:     18,
                  borderRadius: 10,
                ),
                const SizedBox(height: 6),
                Text(
                  label,
                  style: tt.labelSmall?.copyWith(
                    color:      cs.onSurface,
                    fontWeight: FontWeight.w600,
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
              Expanded(child: GradSectionLabel('Recent Sales')),
              TextButton(
                onPressed: () => context.go('/sales'),
                style: TextButton.styleFrom(
                  minimumSize: Size.zero,
                  padding:     const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'See all',
                  style: TextStyle(
                    color:      _kIndigoLight,
                    fontSize:   12,
                    fontWeight: FontWeight.w600,
                    fontFamily: 'Inter',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          if (list.isEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 32),
              decoration: BoxDecoration(
                color:        cs.surfaceContainer,
                borderRadius: BorderRadius.circular(18),
                border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
              ),
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.receipt_long_outlined, size: 32, color: cs.onSurfaceVariant.withValues(alpha: 0.4)),
                    const SizedBox(height: 8),
                    Text('No sales today', style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
                  ],
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
                    color:      _kIndigo.withValues(alpha: 0.04),
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
                  final pm   = sale.paymentMethod?.toLowerCase() ?? 'cash';
                  final pmColor = pm.contains('card')   ? const Color(0xFF6366F1)
                               : pm.contains('credit') ? const Color(0xFFF59E0B)
                               : pm.contains('bank')   ? const Color(0xFF0EA5E9)
                               :                         const Color(0xFF10B981);

                  return Column(
                    children: [
                      ListTile(
                        dense:   false,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        leading: Container(
                          width:  38,
                          height: 38,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: const LinearGradient(
                              begin: Alignment.topLeft,
                              end:   Alignment.bottomRight,
                              colors: kGradElectric,
                            ),
                          ),
                          child: const Icon(Icons.receipt_long_rounded, size: 16, color: Colors.white),
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
                                  color:      Colors.white,
                                ),
                              ),
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Container(
                                  width: 6, height: 6,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: pmColor,
                                  ),
                                ),
                                const SizedBox(width: 3),
                                Text(
                                  formatTime(sale.createdAt),
                                  style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (i < list.length - 1)
                        Divider(
                          height: 1,
                          indent: 70,
                          endIndent: 16,
                          color: cs.outlineVariant.withValues(alpha: 0.4),
                        ),
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
          GradSectionLabel('Top Products'),
          const SizedBox(height: 4),
          SizedBox(
            height: 140,
            child: ListView.separated(
              scrollDirection:  Axis.horizontal,
              itemCount:        list.length,
              separatorBuilder: (_, __) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final p = list[i];
                final rankGrads = [kGradAmber, kGradViolet, kGradSky];
                final rankGrad  = i < 3 ? rankGrads[i] : kGradBlue;
                final rankLabels = ['🥇', '🥈', '🥉'];

                return SizedBox(
                  width: 138,
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
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(colors: [
                                    rankGrad[0].withValues(alpha: 0.18),
                                    rankGrad[1].withValues(alpha: 0.10),
                                  ]),
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
                              if (i < 3)
                                Text(rankLabels[i], style: const TextStyle(fontSize: 13)),
                            ],
                          ),
                          const Spacer(),
                          Text(
                            p.name,
                            style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${p.qty} sold',
                            style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                          ),
                          const SizedBox(height: 2),
                          ShaderMask(
                            shaderCallback: (bounds) => LinearGradient(
                              colors: rankGrad,
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
            // Company banner placeholder
            Container(
              height: 76,
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(18),
              ),
            ),
            const SizedBox(height: 16),
            // Hero card placeholder
            Container(
              height: 170,
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(20),
              ),
            ),
            const SizedBox(height: 12),
            // 3-tile row
            Row(
              children: List.generate(3, (_) => Expanded(
                child: Container(
                  height: 80,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color:        cs.surface,
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              )),
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
                borderRadius: BorderRadius.circular(20),
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
          Container(
            width: 64, height: 64,
            decoration: BoxDecoration(
              color:        cs.error.withValues(alpha: 0.10),
              shape:        BoxShape.circle,
            ),
            child: Icon(Icons.error_outline_rounded, size: 32, color: cs.error),
          ),
          const SizedBox(height: 16),
          Text(
            'Could not load dashboard',
            style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            textAlign: TextAlign.center,
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
