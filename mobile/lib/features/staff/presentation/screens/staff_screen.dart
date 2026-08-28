import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/grad_widgets.dart';
import '../../../shell/main_shell.dart';
import '../../data/models/staff_model.dart';
import '../providers/staff_provider.dart';

enum _StaffFilter { today, week, month }

class StaffScreen extends ConsumerStatefulWidget {
  const StaffScreen({super.key});

  @override
  ConsumerState<StaffScreen> createState() => _StaffScreenState();
}

class _StaffScreenState extends ConsumerState<StaffScreen> {
  _StaffFilter _filter = _StaffFilter.today;
  static final _fmt = DateFormat('yyyy-MM-dd');

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _applyFilter(_StaffFilter.today));
  }

  void _applyFilter(_StaffFilter f) {
    setState(() => _filter = f);
    final now = DateTime.now();
    switch (f) {
      case _StaffFilter.today:
        final d = _fmt.format(now);
        ref.read(staffDateFromProvider.notifier).state = d;
        ref.read(staffDateToProvider.notifier).state   = d;
      case _StaffFilter.week:
        final start = now.subtract(Duration(days: now.weekday - 1));
        ref.read(staffDateFromProvider.notifier).state = _fmt.format(start);
        ref.read(staffDateToProvider.notifier).state   = _fmt.format(now);
      case _StaffFilter.month:
        ref.read(staffDateFromProvider.notifier).state =
            _fmt.format(DateTime(now.year, now.month, 1));
        ref.read(staffDateToProvider.notifier).state = _fmt.format(now);
    }
  }

  @override
  Widget build(BuildContext context) {
    final staffAsync = ref.watch(staffProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(staffProvider),
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              floating:  true,
              snap:      true,
              leading:   IconButton(
                icon:      const Icon(Icons.menu_rounded),
                onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
              ),
              title:   const Text('Staff Performance'),
              actions: [
                IconButton(
                  icon:      const Icon(Icons.refresh_rounded),
                  onPressed: () => ref.invalidate(staffProvider),
                ),
                const SizedBox(width: 4),
              ],
            ),

            // Filter chips
            SliverToBoxAdapter(
              child: SizedBox(
                height: 48,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  children: [
                    for (final f in _StaffFilter.values) ...[
                      FilterChip(
                        label:    Text(_label(f)),
                        selected: _filter == f,
                        onSelected: (_) => _applyFilter(f),
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
            ),

            staffAsync.when(
              loading: () => const SliverToBoxAdapter(child: _StaffShimmer()),
              error: (e, _) => SliverToBoxAdapter(
                child: _ErrorState(onRetry: () => ref.invalidate(staffProvider)),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return const SliverToBoxAdapter(child: _EmptyState());
                }
                // Sort: highest revenue first (already sorted by backend)
                final total = list.fold<double>(0, (s, m) => s + m.revenue);
                final bills = list.fold<int>(0, (s, m) => s + m.saleCount);

                return SliverList(
                  delegate: SliverChildListDelegate([
                    // Summary banner
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                      child: _SummaryBanner(total: total, bills: bills, staff: list.length),
                    ),
                    ...list.asMap().entries.map((entry) => Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                      child: _StaffCard(member: entry.value, rank: entry.key + 1, totalRevenue: total),
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

  String _label(_StaffFilter f) => switch (f) {
    _StaffFilter.today => 'Today',
    _StaffFilter.week  => 'This Week',
    _StaffFilter.month => 'This Month',
  };
}

// ── Summary Banner ────────────────────────────────────────────────────────────

class _SummaryBanner extends StatelessWidget {
  const _SummaryBanner({
    required this.total,
    required this.bills,
    required this.staff,
  });
  final double total;
  final int    bills;
  final int    staff;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:    const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient:     const LinearGradient(
          begin: Alignment.topLeft,
          end:   Alignment.bottomRight,
          colors: kGradPrimary,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color:      const Color(0xFF4F46E5).withValues(alpha: 0.25),
            blurRadius: 16,
            offset:     const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          _Stat('Total Revenue', formatCompact(total), Colors.white),
          Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2),
              margin: const EdgeInsets.symmetric(horizontal: 16)),
          _Stat('Bills', '$bills', Colors.white),
          Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2),
              margin: const EdgeInsets.symmetric(horizontal: 16)),
          _Stat('Staff', '$staff', Colors.white),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat(this.label, this.value, this.color);
  final String label;
  final String value;
  final Color  color;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value,
            style: tt.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color:      color,
            )),
        Text(label,
            style: tt.labelSmall?.copyWith(color: color.withValues(alpha: 0.8))),
      ],
    );
  }
}

// ── Staff Card ────────────────────────────────────────────────────────────────

class _StaffCard extends StatelessWidget {
  const _StaffCard({
    required this.member,
    required this.rank,
    required this.totalRevenue,
  });
  final StaffStat member;
  final int       rank;
  final double    totalRevenue;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    final rankGrads = [kGradAmber, kGradPrimary, kGradSky];
    final grad = rank <= 3 ? rankGrads[rank - 1] : kGradBlue;

    final sharePercent = totalRevenue > 0
        ? (member.revenue / totalRevenue * 100).toStringAsFixed(0)
        : '0';

    return Container(
      padding:    const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color:        cs.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
        boxShadow: [
          BoxShadow(
            color:      grad[0].withValues(alpha: 0.06),
            blurRadius: 12,
            offset:     const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Rank badge
              Container(
                width:      36,
                height:     36,
                decoration: BoxDecoration(
                  gradient:     LinearGradient(
                    begin: Alignment.topLeft,
                    end:   Alignment.bottomRight,
                    colors: grad,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    '#$rank',
                    style: const TextStyle(
                      color:      Colors.white,
                      fontSize:   12,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(member.name,
                        style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                        maxLines: 1, overflow: TextOverflow.ellipsis),
                    Text(member.role,
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                  ],
                ),
              ),
              // Share chip
              Container(
                padding:    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color:        grad[0].withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '$sharePercent%',
                  style: TextStyle(
                    color:      grad[0],
                    fontSize:   11,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Progress bar (revenue share)
          if (totalRevenue > 0) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value:           member.revenue / totalRevenue,
                minHeight:       6,
                backgroundColor: cs.outlineVariant.withValues(alpha: 0.25),
                valueColor:      AlwaysStoppedAnimation(grad[0]),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Stats row
          Row(
            children: [
              _StatChip(
                icon:  Icons.receipt_long_rounded,
                label: '${member.saleCount} Bills',
                color: grad[0],
              ),
              const SizedBox(width: 8),
              _StatChip(
                icon:  Icons.attach_money_rounded,
                label: formatCompact(member.revenue),
                color: const Color(0xFF10B981),
              ),
              const SizedBox(width: 8),
              _StatChip(
                icon:  Icons.payments_outlined,
                label: formatCompact(member.collected),
                color: const Color(0xFF0EA5E9),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.icon, required this.label, required this.color});
  final IconData icon;
  final String   label;
  final Color    color;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color:        color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(label,
              style: tt.labelSmall?.copyWith(
                color:      color,
                fontWeight: FontWeight.w600,
              )),
        ],
      ),
    );
  }
}

// ── Shimmer ───────────────────────────────────────────────────────────────────

class _StaffShimmer extends StatelessWidget {
  const _StaffShimmer();

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
            5,
            (_) => Container(
              height:     110,
              margin:     const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color:        cs.surface,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

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
          Icon(Icons.people_outline_rounded, size: 56, color: cs.onSurfaceVariant),
          const SizedBox(height: 16),
          Text('No staff data', style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('No sales recorded in this period.',
              style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
              textAlign: TextAlign.center),
        ],
      ),
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
          Text('Failed to load staff data',
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
