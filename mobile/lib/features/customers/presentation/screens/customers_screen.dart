import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/utils/date_formatter.dart';
import '../../../sales/data/models/sale_model.dart';
import '../../../sales/data/sources/sales_remote_source.dart';
import '../../data/models/customer_model.dart';
import '../providers/customers_provider.dart';
import '../../../shell/main_shell.dart';

class CustomersScreen extends ConsumerStatefulWidget {
  const CustomersScreen({super.key});

  @override
  ConsumerState<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends ConsumerState<CustomersScreen> {
  bool _searchVisible = false;
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _toggleSearch() {
    setState(() {
      _searchVisible = !_searchVisible;
      if (!_searchVisible) {
        _searchController.clear();
        ref.read(customerSearchProvider.notifier).state = '';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final customersAsync = ref.watch(customersProvider);

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(customersProvider),
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
              title:     const Text('Customers'),
              actions:   [
                IconButton(
                  icon:    Icon(_searchVisible ? Icons.close : Icons.search),
                  onPressed: _toggleSearch,
                  tooltip: _searchVisible ? 'Close search' : 'Search',
                ),
                const SizedBox(width: 4),
              ],
              bottom: _searchVisible
                  ? PreferredSize(
                      preferredSize: const Size.fromHeight(64),
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
                        child: TextField(
                          controller: _searchController,
                          autofocus:  true,
                          decoration: InputDecoration(
                            hintText:   'Search by name, phone, email…',
                            prefixIcon: const Icon(Icons.search, size: 20),
                            isDense:    true,
                            suffixIcon: _searchController.text.isNotEmpty
                                ? IconButton(
                                    icon: const Icon(Icons.clear, size: 18),
                                    onPressed: () {
                                      _searchController.clear();
                                      ref.read(customerSearchProvider.notifier).state = '';
                                    },
                                  )
                                : null,
                          ),
                          onChanged: (v) =>
                              ref.read(customerSearchProvider.notifier).state = v,
                        ),
                      ),
                    )
                  : null,
            ),

            // ── Customer list ────────────────────────────────────────────
            customersAsync.when(
              loading: () => const SliverToBoxAdapter(child: _CustomerShimmer()),
              error: (e, _) => SliverToBoxAdapter(
                child: _ErrorState(
                  message: e.toString(),
                  onRetry: () => ref.invalidate(customersProvider),
                ),
              ),
              data: (response) => response.items.isEmpty
                  ? const SliverToBoxAdapter(child: _EmptyState())
                  : SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                      sliver: SliverList(
                        delegate: SliverChildBuilderDelegate(
                          (ctx, i) => _CustomerCard(
                            customer: response.items[i],
                            onTap: () => _showCustomerDetail(ctx, response.items[i]),
                          ),
                          childCount: response.items.length,
                        ),
                      ),
                    ),
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showCreateCustomerSheet(context),
        icon:  const Icon(Icons.person_add_rounded),
        label: const Text('New Customer'),
      ),
    );
  }

  void _showCustomerDetail(BuildContext context, CustomerModel customer) {
    showModalBottomSheet(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _CustomerDetailSheet(customer: customer),
    );
  }

  void _showCreateCustomerSheet(BuildContext context) {
    showModalBottomSheet(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _CreateCustomerSheet(
        onCreated: () => ref.invalidate(customersProvider),
      ),
    );
  }
}

// ── Customer Card ─────────────────────────────────────────────────────────────

class _CustomerCard extends StatelessWidget {
  const _CustomerCard({required this.customer, required this.onTap});
  final CustomerModel customer;
  final VoidCallback  onTap;

  @override
  Widget build(BuildContext context) {
    final cs     = Theme.of(context).colorScheme;
    final tt     = Theme.of(context).textTheme;
    final initials = customer.name.isNotEmpty
        ? customer.name.trim().split(' ').map((w) => w[0]).take(2).join().toUpperCase()
        : 'C';
    final hasBalance = (customer.outstandingBalance ?? 0) > 0;

    return Card(
      elevation: 0,
      margin:    const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.5)),
      ),
      child: InkWell(
        onTap:        onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius:          26,
                backgroundColor: cs.primaryContainer,
                child: Text(
                  initials,
                  style: TextStyle(
                    color:      cs.onPrimaryContainer,
                    fontWeight: FontWeight.w700,
                    fontSize:   16,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      customer.name,
                      style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (customer.phone != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        customer.phone!,
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      ),
                    ],
                    if (customer.email != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        customer.email!,
                        style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              // Loyalty + balance
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  if (customer.loyaltyPoints != null) ...[
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star_rounded,
                            size: 14, color: Color(0xFFFFD700)),
                        const SizedBox(width: 3),
                        Text(
                          '${customer.loyaltyPoints} pts',
                          style: tt.labelSmall?.copyWith(
                            color:      const Color(0xFFCA8A04),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                  ],
                  if (hasBalance)
                    Container(
                      padding:    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color:        const Color(0xFFEF4444).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        formatCurrency(customer.outstandingBalance!),
                        style: tt.labelSmall?.copyWith(
                          color:      const Color(0xFFEF4444),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  if (!hasBalance && (customer.totalPurchases ?? 0) > 0)
                    Text(
                      formatCompact(customer.totalPurchases!),
                      style: tt.labelSmall?.copyWith(
                        color:      cs.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Customer Detail Sheet ─────────────────────────────────────────────────────

class _CustomerDetailSheet extends ConsumerStatefulWidget {
  const _CustomerDetailSheet({required this.customer});
  final CustomerModel customer;

  @override
  ConsumerState<_CustomerDetailSheet> createState() => _CustomerDetailSheetState();
}

class _CustomerDetailSheetState extends ConsumerState<_CustomerDetailSheet> {
  List<SaleModel>? _sales;
  bool             _loadingSales = true;
  CustomerModel    get c => widget.customer;

  @override
  void initState() {
    super.initState();
    _loadSales();
  }

  Future<void> _loadSales() async {
    try {
      final src  = SalesRemoteSource(ref.read(apiClientProvider));
      final resp = await src.getSales(limit: 10, customerId: c.id);
      if (mounted) setState(() { _sales = resp.items; _loadingSales = false; });
    } catch (_) {
      if (mounted) setState(() { _loadingSales = false; });
    }
  }

  void _call() {
    if (c.phone == null) return;
    launchUrl(Uri.parse('tel:${c.phone}'), mode: LaunchMode.externalApplication);
  }

  void _whatsapp() {
    if (c.phone == null) return;
    final num = c.phone!.replaceAll(RegExp(r'[^0-9+]'), '');
    launchUrl(Uri.parse('https://wa.me/$num'), mode: LaunchMode.externalApplication);
  }

  Future<void> _collectPayment() async {
    if ((c.outstandingBalance ?? 0) <= 0) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => _CustomerCollectSheet(customer: c),
    );
  }

  @override
  Widget build(BuildContext context) {
    final cs       = Theme.of(context).colorScheme;
    final tt       = Theme.of(context).textTheme;
    final initials = c.name.trim().split(' ').map((w) => w[0]).take(2).join().toUpperCase();
    final hasDebt  = (c.outstandingBalance ?? 0) > 0;

    return DraggableScrollableSheet(
      expand:           false,
      initialChildSize: 0.75,
      maxChildSize:     0.95,
      minChildSize:     0.4,
      builder: (_, sc) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: ListView(
          controller: sc,
          children: [
            // Header
            Row(
              children: [
                CircleAvatar(
                  radius:          32,
                  backgroundColor: cs.primaryContainer,
                  child: Text(initials,
                      style: TextStyle(color: cs.onPrimaryContainer,
                          fontSize: 22, fontWeight: FontWeight.w700)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(c.name,
                          style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      if (c.phone != null)
                        Text(c.phone!,
                            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                      if (c.email != null)
                        Text(c.email!,
                            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Quick action buttons
            if (c.phone != null) ...[
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon:     const Icon(Icons.phone_outlined, size: 16),
                      label:    const Text('Call'),
                      onPressed: _call,
                      style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 8)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      icon:  const Icon(Icons.chat_rounded, size: 16,
                          color: Color(0xFF25D366)),
                      label: const Text('WhatsApp',
                          style: TextStyle(color: Color(0xFF25D366))),
                      onPressed: _whatsapp,
                      style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          side: const BorderSide(color: Color(0xFF25D366))),
                    ),
                  ),
                  if (hasDebt) ...[
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton.icon(
                        icon:  const Icon(Icons.payments_outlined, size: 16),
                        label: const Text('Collect'),
                        onPressed: _collectPayment,
                        style: FilledButton.styleFrom(
                            backgroundColor: const Color(0xFFF59E0B),
                            padding: const EdgeInsets.symmetric(vertical: 8)),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),
            ],

            const Divider(),
            const SizedBox(height: 8),

            // Stats
            Row(
              children: [
                _StatTile(
                  label: 'Points',
                  value: '${c.loyaltyPoints ?? 0}',
                  icon:  Icons.star_rounded,
                  color: const Color(0xFFCA8A04),
                ),
                const SizedBox(width: 12),
                _StatTile(
                  label: 'Outstanding',
                  value: formatCurrency(c.outstandingBalance ?? 0),
                  icon:  Icons.account_balance_wallet_outlined,
                  color: hasDebt ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                ),
                const SizedBox(width: 12),
                _StatTile(
                  label: 'Lifetime',
                  value: formatCompact(c.totalPurchases ?? 0),
                  icon:  Icons.shopping_bag_outlined,
                  color: cs.primary,
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (c.address != null) ...[
              _DetailRow('Address', c.address!),
              const Divider(height: 24),
            ],

            // Purchase history (real data)
            Row(
              children: [
                Text('Recent Purchases',
                    style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
                const Spacer(),
                if (_loadingSales)
                  const SizedBox(width: 14, height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2)),
              ],
            ),
            const SizedBox(height: 10),
            if (_loadingSales)
              const SizedBox()
            else if (_sales == null || _sales!.isEmpty)
              Container(
                padding:    const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color:        cs.surfaceContainerHighest.withValues(alpha: 0.4),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text('No purchases found.',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    textAlign: TextAlign.center),
              )
            else
              ..._sales!.map((sale) => _SaleHistoryRow(sale: sale)),
          ],
        ),
      ),
    );
  }
}

class _SaleHistoryRow extends StatelessWidget {
  const _SaleHistoryRow({required this.sale});
  final SaleModel sale;

  @override
  Widget build(BuildContext context) {
    final cs  = Theme.of(context).colorScheme;
    final tt  = Theme.of(context).textTheme;
    final pmC = sale.paymentMethod == 'credit'
        ? const Color(0xFFF59E0B)
        : const Color(0xFF10B981);

    return Container(
      margin:     const EdgeInsets.only(bottom: 8),
      padding:    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color:        cs.surfaceContainerHighest.withValues(alpha: 0.4),
        borderRadius: BorderRadius.circular(10),
        border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(sale.invoiceNo,
                    style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w600)),
                Text(formatDateTime(sale.createdAt),
                    style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant)),
              ],
            ),
          ),
          Container(
            padding:    const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
            decoration: BoxDecoration(
              color:        pmC.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(5),
            ),
            child: Text(sale.paymentMethod.toUpperCase(),
                style: TextStyle(color: pmC, fontSize: 9, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 8),
          Text(formatCurrency(sale.totalAmount),
              style: tt.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

// ── Customer collect payment sheet ────────────────────────────────────────────

class _CustomerCollectSheet extends ConsumerStatefulWidget {
  const _CustomerCollectSheet({required this.customer});
  final CustomerModel customer;

  @override
  ConsumerState<_CustomerCollectSheet> createState() => _CustomerCollectSheetState();
}

class _CustomerCollectSheetState extends ConsumerState<_CustomerCollectSheet> {
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
      // Find the oldest unpaid credit sale for this customer and apply payment
      final src  = SalesRemoteSource(ref.read(apiClientProvider));
      final resp = await src.getSales(limit: 20, customerId: widget.customer.id);
      final creditSales = resp.items
          .where((s) => s.paymentMethod == 'credit' && s.status != 'cancelled')
          .toList();

      double remaining = amount;
      for (final sale in creditSales) {
        if (remaining <= 0) break;
        await ref.read(apiClientProvider).patch(
          ApiEndpoints.saleCollectPayment(sale.id),
          data: {'amount': remaining, 'payment_method': _method},
        );
        remaining = 0; // simplified: apply to first unpaid sale
      }

      if (mounted) {
        Navigator.of(context).pop();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('${formatCurrency(amount)} recorded for ${widget.customer.name}'),
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
            Text('Customer: ${widget.customer.name} • Outstanding: ${formatCurrency(widget.customer.outstandingBalance ?? 0)}',
                style: tt.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 20),
            TextField(
              controller:   _ctrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              autofocus:    true,
              decoration: const InputDecoration(
                labelText:  'Amount',
                prefixIcon: Icon(Icons.payments_outlined),
                prefixText: 'PKR ',
              ),
            ),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
              value:      _method,
              decoration: const InputDecoration(
                labelText:  'Method',
                prefixIcon: Icon(Icons.credit_card_outlined),
              ),
              items: const [
                DropdownMenuItem(value: 'cash', child: Text('Cash')),
                DropdownMenuItem(value: 'card', child: Text('Card')),
                DropdownMenuItem(value: 'bank', child: Text('Bank Transfer')),
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

class _StatTile extends StatelessWidget {
  const _StatTile(
      {required this.label, required this.value, required this.icon, required this.color});
  final String   label;
  final String   value;
  final IconData icon;
  final Color    color;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Expanded(
      child: Container(
        padding:    const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color:        color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border:       Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 18),
            const SizedBox(height: 6),
            Text(
              value,
              style: tt.labelMedium?.copyWith(fontWeight: FontWeight.w700, color: color),
              maxLines: 1, overflow: TextOverflow.ellipsis,
            ),
            Text(
              label,
              style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant, fontSize: 9),
              textAlign: TextAlign.center,
              maxLines: 1,
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        children: [
          Text(label, style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
          const Spacer(),
          Flexible(
            child: Text(value,
                style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                textAlign: TextAlign.end),
          ),
        ],
      ),
    );
  }
}

// ── Create Customer Sheet ─────────────────────────────────────────────────────

class _CreateCustomerSheet extends ConsumerStatefulWidget {
  const _CreateCustomerSheet({required this.onCreated});
  final VoidCallback onCreated;

  @override
  ConsumerState<_CreateCustomerSheet> createState() => _CreateCustomerSheetState();
}

class _CreateCustomerSheetState extends ConsumerState<_CreateCustomerSheet> {
  final _formKey    = GlobalKey<FormState>();
  final _nameCtrl   = TextEditingController();
  final _emailCtrl  = TextEditingController();
  final _phoneCtrl  = TextEditingController();
  final _addrCtrl   = TextEditingController();
  bool  _saving     = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _addrCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final source = ref.read(customersSourceProvider);
      await source.createCustomer({
        'name':    _nameCtrl.text.trim(),
        if (_emailCtrl.text.isNotEmpty) 'email':   _emailCtrl.text.trim(),
        if (_phoneCtrl.text.isNotEmpty) 'phone':   _phoneCtrl.text.trim(),
        if (_addrCtrl.text.isNotEmpty)  'address': _addrCtrl.text.trim(),
      });
      widget.onCreated();
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create customer: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tt  = Theme.of(context).textTheme;
    final mq  = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: mq.viewInsets.bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'New Customer',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 20),
              TextFormField(
                controller: _nameCtrl,
                textCapitalization: TextCapitalization.words,
                decoration: const InputDecoration(
                  labelText:  'Full Name',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Name is required' : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller:  _phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText:  'Phone',
                  prefixIcon: Icon(Icons.phone_outlined),
                ),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller:  _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText:  'Email (optional)',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return null;
                  final emailRe = RegExp(r'^[^@]+@[^@]+\.[^@]+$');
                  return emailRe.hasMatch(v.trim()) ? null : 'Enter a valid email';
                },
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller:  _addrCtrl,
                maxLines:    2,
                decoration: const InputDecoration(
                  labelText:  'Address (optional)',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          height: 22,
                          width:  22,
                          child:  CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      : const Text('Create Customer'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Shimmer ───────────────────────────────────────────────────────────────────

class _CustomerShimmer extends StatelessWidget {
  const _CustomerShimmer();

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
            8,
            (_) => Container(
              height:     76,
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
          Icon(Icons.people_outlined, size: 56, color: cs.onSurfaceVariant),
          const SizedBox(height: 16),
          Text('No customers found',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text(
            'Add your first customer using the button below.',
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
          Text('Failed to load customers',
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
