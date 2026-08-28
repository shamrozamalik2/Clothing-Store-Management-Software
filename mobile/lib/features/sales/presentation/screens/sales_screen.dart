import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../data/models/sale_model.dart';
import '../providers/sales_provider.dart';
import '../../../printer/presentation/providers/printer_provider.dart';
import '../../../shell/main_shell.dart';

final _shopNameProvider = Provider<String>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.companyName.isNotEmpty == true ? user!.companyName : 'SAS Garments';
});

// ── Date filter enum ─────────────────────────────────────────────────────────

enum _DateFilter { today, week, month, custom }

class SalesScreen extends ConsumerStatefulWidget {
  const SalesScreen({super.key});

  @override
  ConsumerState<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends ConsumerState<SalesScreen> {
  _DateFilter _activeFilter = _DateFilter.today;

  static final _apiDate = DateFormat('yyyy-MM-dd');

  void _applyFilter(_DateFilter filter) {
    setState(() => _activeFilter = filter);
    final now = DateTime.now();
    switch (filter) {
      case _DateFilter.today:
        final today = _apiDate.format(now);
        ref.read(salesDateFromProvider.notifier).state = today;
        ref.read(salesToDateProvider.notifier).state   = today;
      case _DateFilter.week:
        final start = now.subtract(Duration(days: now.weekday - 1));
        ref.read(salesDateFromProvider.notifier).state = _apiDate.format(start);
        ref.read(salesToDateProvider.notifier).state   = _apiDate.format(now);
      case _DateFilter.month:
        ref.read(salesDateFromProvider.notifier).state =
            _apiDate.format(DateTime(now.year, now.month, 1));
        ref.read(salesToDateProvider.notifier).state = _apiDate.format(now);
      case _DateFilter.custom:
        _pickCustomRange();
    }
  }

  Future<void> _pickCustomRange() async {
    final now    = DateTime.now();
    final range  = await showDateRangePicker(
      context:      context,
      firstDate:    DateTime(now.year - 2),
      lastDate:     now,
      initialDateRange: DateTimeRange(
        start: now.subtract(const Duration(days: 6)),
        end:   now,
      ),
    );
    if (range != null && mounted) {
      ref.read(salesDateFromProvider.notifier).state = _apiDate.format(range.start);
      ref.read(salesToDateProvider.notifier).state   = _apiDate.format(range.end);
    }
  }

  @override
  void initState() {
    super.initState();
    // Default to today
    WidgetsBinding.instance.addPostFrameCallback((_) => _applyFilter(_DateFilter.today));
  }

  @override
  Widget build(BuildContext context) {
    final salesAsync = ref.watch(salesProvider);

    final filters = [
      (_DateFilter.today,  'Today'),
      (_DateFilter.week,   'This Week'),
      (_DateFilter.month,  'This Month'),
      (_DateFilter.custom, 'Custom'),
    ];

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(salesProvider),
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
              title:     const Text('Sales'),
              actions:   [
                IconButton(
                  icon:    const Icon(Icons.refresh_rounded),
                  onPressed: () => ref.invalidate(salesProvider),
                  tooltip: 'Refresh',
                ),
                const SizedBox(width: 4),
              ],
            ),

            // ── Date filter chips ─────────────────────────────────────────
            SliverToBoxAdapter(
              child: SizedBox(
                height: 48,
                child: ListView.separated(
                  scrollDirection:  Axis.horizontal,
                  padding:          const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                  itemCount:        filters.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) {
                    final f      = filters[i];
                    final active = _activeFilter == f.$1;
                    return FilterChip(
                      label:    Text(f.$2),
                      selected: active,
                      onSelected: (_) => _applyFilter(f.$1),
                    );
                  },
                ),
              ),
            ),

            // ── Sales list ────────────────────────────────────────────────
            salesAsync.when(
              loading: () => const SliverToBoxAdapter(child: _SalesShimmer()),
              error: (e, _) => SliverToBoxAdapter(
                child: _ErrorState(
                  message: e.toString(),
                  onRetry: () => ref.invalidate(salesProvider),
                ),
              ),
              data: (response) {
                if (response.items.isEmpty) {
                  return const SliverToBoxAdapter(child: _EmptyState());
                }
                // Summary header
                final totalRevenue = response.items
                    .fold<double>(0, (acc, s) => acc + s.totalAmount);
                return SliverList(
                  delegate: SliverChildListDelegate([
                    // Summary banner
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                      child: _SummaryBanner(
                        count:   response.items.length,
                        revenue: totalRevenue,
                      ),
                    ),
                    ...response.items.map(
                      (s) => Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                        child: _SaleCard(
                          sale:  s,
                          onTap: () => _showSaleDetail(context, s),
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

  void _showSaleDetail(BuildContext context, SaleModel sale) {
    showModalBottomSheet(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _SaleDetailSheet(sale: sale),
    );
  }
}

// ── Summary Banner ────────────────────────────────────────────────────────────

class _SummaryBanner extends StatelessWidget {
  const _SummaryBanner({required this.count, required this.revenue});
  final int    count;
  final double revenue;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Container(
      padding:    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color:        cs.primaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$count Sales',
                  style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              Text('Found in period',
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
            ],
          ),
          const Spacer(),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(formatCurrency(revenue),
                  style: tt.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700, color: cs.primary)),
              Text('Total Revenue',
                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Sale Card ─────────────────────────────────────────────────────────────────

class _SaleCard extends StatelessWidget {
  const _SaleCard({required this.sale, required this.onTap});
  final SaleModel    sale;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    final paymentColors = {
      'cash':   const Color(0xFF10B981),
      'card':   const Color(0xFF6366F1),
      'credit': const Color(0xFFF59E0B),
      'bank':   const Color(0xFF0EA5E9),
    };
    final pmColor = paymentColors[sale.paymentMethod.toLowerCase()] ?? cs.secondary;

    final statusColors = {
      'completed': const Color(0xFF10B981),
      'pending':   const Color(0xFFF59E0B),
      'cancelled': const Color(0xFFEF4444),
      'refunded':  const Color(0xFF8B5CF6),
    };
    final statusColor = statusColors[sale.status.toLowerCase()] ?? cs.secondary;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.5)),
      ),
      child: InkWell(
        onTap:        onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    sale.invoiceNo,
                    style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const Spacer(),
                  Text(
                    formatCurrency(sale.totalAmount),
                    style: tt.bodyLarge?.copyWith(
                      fontWeight: FontWeight.w800,
                      color:      cs.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(Icons.person_outline, size: 14, color: cs.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    sale.customerName ?? 'Walk-in',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  const Spacer(),
                  Text(
                    formatDateTime(sale.createdAt),
                    style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _Chip(
                    label: sale.paymentMethod.toUpperCase(),
                    color: pmColor,
                  ),
                  const SizedBox(width: 8),
                  _Chip(
                    label: sale.status[0].toUpperCase() + sale.status.substring(1),
                    color: statusColor,
                  ),
                  const Spacer(),
                  Icon(Icons.chevron_right, size: 18, color: cs.onSurfaceVariant),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({required this.label, required this.color});
  final String label;
  final Color  color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color:        color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(6),
        border:       Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color:      color,
          fontSize:   11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

// ── Sale Detail Sheet ─────────────────────────────────────────────────────────

class _SaleDetailSheet extends ConsumerStatefulWidget {
  const _SaleDetailSheet({required this.sale});
  final SaleModel sale;

  @override
  ConsumerState<_SaleDetailSheet> createState() => _SaleDetailSheetState();
}

class _SaleDetailSheetState extends ConsumerState<_SaleDetailSheet> {
  SaleDetailModel? _detail;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    try {
      final source = ref.read(salesSourceProvider);
      final detail = await source.getSale(widget.sale.id);
      if (mounted) setState(() { _detail = detail; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _printReceipt(BuildContext ctx) async {
    if (_detail == null) return;
    final printer = ref.read(printerProvider);
    if (!printer.isConnected) {
      ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
        content: Text('No printer connected. Go to Printer tab first.'),
      ));
      return;
    }
    final shop = ref.read(_shopNameProvider);
    await ref.read(printerProvider.notifier).printSaleReceipt(_detail!, shop);
  }

  void _shareWhatsApp() {
    final sale = widget.sale;
    final d    = _detail;
    final lines = StringBuffer();
    lines.writeln('*Receipt — ${sale.invoiceNo}*');
    lines.writeln('Date: ${formatDateTime(sale.createdAt)}');
    if (sale.customerName != null) lines.writeln('Customer: ${sale.customerName}');
    lines.writeln('');
    if (d != null) {
      for (final item in d.items) {
        lines.writeln('• ${item.productName}  ${item.quantity}x${formatCurrency(item.unitPrice)} = ${formatCurrency(item.total)}');
      }
      lines.writeln('');
    }
    if (sale.discountAmount > 0) lines.writeln('Discount: -${formatCurrency(sale.discountAmount)}');
    lines.writeln('*Total: ${formatCurrency(sale.totalAmount)}*');
    lines.writeln('Payment: ${sale.paymentMethod.toUpperCase()}');
    lines.writeln('');
    lines.writeln('Thank you for shopping!');

    final encoded = Uri.encodeComponent(lines.toString());
    launchUrl(Uri.parse('https://wa.me/?text=$encoded'),
        mode: LaunchMode.externalApplication);
  }

  Future<void> _showCollectSheet(BuildContext ctx) async {
    if (_detail == null) return;
    await showModalBottomSheet(
      context:            ctx,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CollectPaymentSheet(
        sale: widget.sale,
        onDone: () {
          _loadDetail();
          ref.invalidate(salesProvider);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs   = Theme.of(context).colorScheme;
    final tt   = Theme.of(context).textTheme;
    final sale = widget.sale;

    return DraggableScrollableSheet(
      expand:           false,
      initialChildSize: 0.75,
      maxChildSize:     0.95,
      minChildSize:     0.4,
      builder: (_, sc) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline_rounded, color: cs.error, size: 40),
                        const SizedBox(height: 12),
                        Text(_error!,
                            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                            textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        TextButton(
                          onPressed: () {
                            setState(() { _loading = true; _error = null; });
                            _loadDetail();
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : ListView(
                    controller: sc,
                    children: [
                      // Invoice header
                      Row(
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(sale.invoiceNo,
                                  style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                              Text(formatDateTime(sale.createdAt),
                                  style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                            ],
                          ),
                          const Spacer(),
                          _Chip(
                            label: sale.status[0].toUpperCase() + sale.status.substring(1),
                            color: sale.status == 'completed'
                                ? const Color(0xFF10B981)
                                : const Color(0xFFF59E0B),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.person_outline, size: 14, color: cs.onSurfaceVariant),
                          const SizedBox(width: 4),
                          Text(
                            sale.customerName ?? 'Walk-in Customer',
                            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                          ),
                          const Spacer(),
                          _Chip(
                            label: sale.paymentMethod.toUpperCase(),
                            color: cs.primary,
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      // Action buttons row
                      Row(
                        children: [
                          Expanded(
                            child: _ActionBtn(
                              icon:    Icons.print_outlined,
                              label:   'Print',
                              color:   cs.primary,
                              onTap:   () => _printReceipt(context),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: _ActionBtn(
                              icon:    Icons.chat_rounded,
                              label:   'WhatsApp',
                              color:   const Color(0xFF25D366),
                              onTap:   () => _shareWhatsApp(),
                            ),
                          ),
                          if (sale.paymentMethod == 'credit' && _detail != null) ...[
                            const SizedBox(width: 10),
                            Expanded(
                              child: _ActionBtn(
                                icon:  Icons.payments_outlined,
                                label: 'Collect',
                                color: const Color(0xFFF59E0B),
                                onTap: () => _showCollectSheet(context),
                              ),
                            ),
                          ],
                        ],
                      ),

                      const SizedBox(height: 16),
                      const Divider(),
                      const SizedBox(height: 8),

                      // Items
                      Text('Items',
                          style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      if (_detail?.items.isNotEmpty == true)
                        ..._detail!.items.map((item) => _ItemRow(item: item))
                      else
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text('No items',
                              style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                        ),
                      const Divider(height: 24),

                      // Totals
                      _TotalRow('Subtotal', formatCurrency(sale.subtotal)),
                      if (sale.discountAmount > 0)
                        _TotalRow('Discount', '- ${formatCurrency(sale.discountAmount)}',
                            valueColor: const Color(0xFF10B981)),
                      if (sale.taxAmount > 0)
                        _TotalRow('Tax', formatCurrency(sale.taxAmount)),
                      const Divider(height: 16),
                      _TotalRow('Total', formatCurrency(sale.totalAmount), bold: true),
                    ],
                  ),
      ),
    );
  }
}

class _ItemRow extends StatelessWidget {
  const _ItemRow({required this.item});
  final SaleItemModel item;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width:      28,
            height:     28,
            decoration: BoxDecoration(
              color:        cs.primaryContainer,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Center(
              child: Text(
                '${item.quantity}x',
                style: TextStyle(
                  fontSize:   10,
                  fontWeight: FontWeight.w700,
                  color:      cs.onPrimaryContainer,
                ),
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.productName,
                    style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                    maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(
                  '${formatCurrency(item.unitPrice)} / unit'
                  '${item.discount > 0 ? '  •  disc. ${formatCurrency(item.discount)}' : ''}',
                  style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            formatCurrency(item.total),
            style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(this.label, this.value, {this.bold = false, this.valueColor});
  final String label;
  final String value;
  final bool   bold;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Text(
            label,
            style: bold
                ? tt.bodyMedium?.copyWith(fontWeight: FontWeight.w700)
                : tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
          ),
          const Spacer(),
          Text(
            value,
            style: bold
                ? tt.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800, color: valueColor ?? cs.primary)
                : tt.bodySmall?.copyWith(
                    fontWeight: FontWeight.w600, color: valueColor),
          ),
        ],
      ),
    );
  }
}

// ── Shimmer ───────────────────────────────────────────────────────────────────

class _SalesShimmer extends StatelessWidget {
  const _SalesShimmer();

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
            7,
            (_) => Container(
              height:     92,
              margin:     const EdgeInsets.only(bottom: 10),
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
          Icon(Icons.receipt_long_outlined, size: 56, color: cs.onSurfaceVariant),
          const SizedBox(height: 16),
          Text('No sales found',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(
            'No sales recorded in the selected period.',
            style:     tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});
  final String       message;
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
          Text('Failed to load sales',
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

// ── Action button used inside sale detail sheet ───────────────────────────────

class _ActionBtn extends StatelessWidget {
  const _ActionBtn({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
  final IconData     icon;
  final String       label;
  final Color        color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap:        onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding:    const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color:        color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(10),
          border:       Border.all(color: color.withValues(alpha: 0.25)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 20),
            const SizedBox(height: 4),
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 11, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }
}

// ── Collect credit payment sheet ──────────────────────────────────────────────

class _CollectPaymentSheet extends ConsumerStatefulWidget {
  const _CollectPaymentSheet({required this.sale, required this.onDone});
  final SaleModel    sale;
  final VoidCallback onDone;

  @override
  ConsumerState<_CollectPaymentSheet> createState() =>
      _CollectPaymentSheetState();
}

class _CollectPaymentSheetState extends ConsumerState<_CollectPaymentSheet> {
  final _ctrl   = TextEditingController();
  String _method = 'cash';
  bool   _saving = false;

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  Future<void> _submit() async {
    final amount = double.tryParse(_ctrl.text.trim());
    if (amount == null || amount <= 0) return;
    setState(() => _saving = true);
    try {
      await ref.read(apiClientProvider).patch(
        ApiEndpoints.saleCollectPayment(widget.sale.id),
        data: {'amount': amount, 'payment_method': _method},
      );
      widget.onDone();
      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Payment of ${formatCurrency(amount)} recorded.'),
          backgroundColor: Colors.green.shade700,
        ));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Failed: $e'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final mq = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Collect Payment', style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text('Invoice: ${widget.sale.invoiceNo}',
                style: tt.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 20),
            TextField(
              controller:  _ctrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus:   true,
              decoration: const InputDecoration(
                labelText:  'Amount to collect',
                prefixIcon: Icon(Icons.payments_outlined),
                prefixText: 'PKR ',
              ),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value:      _method,
              decoration: const InputDecoration(
                labelText:  'Payment Method',
                prefixIcon: Icon(Icons.credit_card_outlined),
              ),
              items: const [
                DropdownMenuItem(value: 'cash',  child: Text('Cash')),
                DropdownMenuItem(value: 'card',  child: Text('Card')),
                DropdownMenuItem(value: 'bank',  child: Text('Bank Transfer')),
              ],
              onChanged: (v) => setState(() => _method = v ?? 'cash'),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const SizedBox(height: 22, width: 22,
                        child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                    : const Text('Record Payment'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
