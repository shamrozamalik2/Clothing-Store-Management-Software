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
    WidgetsBinding.instance
        .addPostFrameCallback((_) => _applyFilter(_StaffFilter.today));
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
    final cs         = Theme.of(context).colorScheme;
    final staffAsync = ref.watch(staffProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(staffProvider),
        child: CustomScrollView(
          slivers: [
            // ── App Bar ───────────────────────────────────────────────────
            SliverAppBar(
              floating:         true,
              snap:             true,
              backgroundColor:  cs.surface,
              surfaceTintColor: Colors.transparent,
              elevation:        0,
              leading: IconButton(
                icon:      const Icon(Icons.menu_rounded),
                onPressed: () =>
                    MainShell.scaffoldKey.currentState?.openDrawer(),
              ),
              title: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const GradIconBox(
                    icon:         Icons.people_rounded,
                    colors:       kGradElectric,
                    size:         32,
                    iconSize:     16,
                    borderRadius: 9,
                  ),
                  const SizedBox(width: 10),
                  ShaderMask(
                    blendMode:      BlendMode.srcIn,
                    shaderCallback: (b) =>
                        const LinearGradient(colors: kGradElectric)
                            .createShader(b),
                    child: const Text(
                      'Staff Performance',
                      style: TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 18),
                    ),
                  ),
                ],
              ),
              actions: [
                GestureDetector(
                  onTap: () => ref.invalidate(staffProvider),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    width:  36,
                    height: 36,
                    decoration: BoxDecoration(
                      color:        kGradElectric[0].withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                      border:       Border.all(
                          color: kGradElectric[0].withValues(alpha: 0.2)),
                    ),
                    child: Icon(
                      Icons.refresh_rounded,
                      color: kGradElectric[0],
                      size:  20,
                    ),
                  ),
                ),
              ],
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(1),
                child: Container(
                  height: 1,
                  decoration: const BoxDecoration(
                      gradient: LinearGradient(colors: kGradElectric)),
                ),
              ),
            ),

            // ── Filter pills ──────────────────────────────────────────────
            SliverToBoxAdapter(
              child: SizedBox(
                height: 52,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  children: [
                    for (final f in _StaffFilter.values) ...[
                      _FilterPill(
                        label:    _label(f),
                        selected: _filter == f,
                        onTap:    () => _applyFilter(f),
                      ),
                      const SizedBox(width: 8),
                    ],
                  ],
                ),
              ),
            ),

            staffAsync.when(
              loading: () =>
                  const SliverToBoxAdapter(child: _StaffShimmer()),
              error: (e, _) => SliverToBoxAdapter(
                child: _ErrorState(
                    onRetry: () => ref.invalidate(staffProvider)),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return const SliverToBoxAdapter(child: _EmptyState());
                }
                final total =
                    list.fold<double>(0, (s, m) => s + m.revenue);
                final bills = list.fold<int>(0, (s, m) => s + m.saleCount);

                return SliverList(
                  delegate: SliverChildListDelegate([
                    Padding(
                      padding:
                          const EdgeInsets.fromLTRB(16, 4, 16, 4),
                      child: _SummaryBanner(
                          total: total,
                          bills: bills,
                          staff: list.length),
                    ),
                    ...list.asMap().entries.map(
                      (entry) => Padding(
                        padding:
                            const EdgeInsets.fromLTRB(16, 0, 16, 10),
                        child: _StaffCard(
                          member:       entry.value,
                          rank:         entry.key + 1,
                          totalRevenue: total,
                        ),
                      ),
                    ),
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

// ── Filter pill ───────────────────────────────────────────────────────────────

class _FilterPill extends StatelessWidget {
  const _FilterPill({
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final String       label;
  final bool         selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          gradient: selected
              ? const LinearGradient(colors: kGradElectric)
              : null,
          color:        selected ? null : cs.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? Colors.transparent
                : cs.outlineVariant.withValues(alpha: 0.5),
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color:      kGradElectric[0].withValues(alpha: 0.25),
                    blurRadius: 8,
                    offset:     const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color:      selected ? Colors.white : cs.onSurface,
            fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
            fontSize:   13,
          ),
        ),
      ),
    );
  }
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient:     const LinearGradient(
          begin:  Alignment.topLeft,
          end:    Alignment.bottomRight,
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
          _BannerStat('Total Revenue', formatCompact(total)),
          Container(
              width:  1,
              height: 40,
              color:  Colors.white.withValues(alpha: 0.2),
              margin: const EdgeInsets.symmetric(horizontal: 16)),
          _BannerStat('Bills', '$bills'),
          Container(
              width:  1,
              height: 40,
              color:  Colors.white.withValues(alpha: 0.2),
              margin: const EdgeInsets.symmetric(horizontal: 16)),
          _BannerStat('Staff', '$staff'),
        ],
      ),
    );
  }
}

class _BannerStat extends StatelessWidget {
  const _BannerStat(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value,
            style: tt.titleSmall?.copyWith(
              fontWeight: FontWeight.w800,
              color:      Colors.white,
            )),
        Text(label,
            style: tt.labelSmall
                ?.copyWith(color: Colors.white.withValues(alpha: 0.8))),
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
      decoration: BoxDecoration(
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
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Material(
          color: cs.surfaceContainer,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Rank-colored gradient bar
              Container(
                height: 3,
                decoration: BoxDecoration(
                    gradient: LinearGradient(colors: grad)),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
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
                              begin:  Alignment.topLeft,
                              end:    Alignment.bottomRight,
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
                              Text(
                                member.name,
                                style: tt.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(member.role,
                                  style: tt.bodySmall?.copyWith(
                                      color: cs.onSurfaceVariant)),
                            ],
                          ),
                        ),
                        // Share chip
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 3),
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

                    if (totalRevenue > 0) ...[
                      SizedBox(
                        height: 6,
                        child: Stack(
                          children: [
                            Container(
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(3),
                                color: cs.outlineVariant
                                    .withValues(alpha: 0.25),
                              ),
                            ),
                            FractionallySizedBox(
                              widthFactor:
                                  member.revenue / totalRevenue,
                              alignment: Alignment.centerLeft,
                              child: Container(
                                decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(3),
                                  gradient:
                                      LinearGradient(colors: grad),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],

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
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip(
      {required this.icon, required this.label, required this.color});
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
              height: 110,
              margin: const EdgeInsets.only(bottom: 10),
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
          const GradIconBox(
            icon:         Icons.people_outline_rounded,
            colors:       kGradElectric,
            size:         72,
            iconSize:     36,
            borderRadius: 20,
          ),
          const SizedBox(height: 16),
          Text('No staff data',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('No sales recorded in this period.',
              style:     tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
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
          GradButton(
            label:        'Retry',
            icon:         Icons.refresh_rounded,
            onPressed:    onRetry,
            colors:       kGradElectric,
            height:       44,
            borderRadius: 12,
          ),
        ],
      ),
    );
  }
}
