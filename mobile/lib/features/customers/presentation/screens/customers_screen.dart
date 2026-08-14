import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';

import '../../../../core/utils/currency_formatter.dart';
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

class _CustomerDetailSheet extends StatelessWidget {
  const _CustomerDetailSheet({required this.customer});
  final CustomerModel customer;

  @override
  Widget build(BuildContext context) {
    final cs  = Theme.of(context).colorScheme;
    final tt  = Theme.of(context).textTheme;
    final initials = customer.name.trim().split(' ').map((w) => w[0]).take(2).join().toUpperCase();

    return DraggableScrollableSheet(
      expand:           false,
      initialChildSize: 0.7,
      maxChildSize:     0.92,
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
                  child: Text(
                    initials,
                    style: TextStyle(
                      color: cs.onPrimaryContainer,
                      fontSize: 22,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(customer.name,
                          style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      if (customer.phone != null) ...[
                        const SizedBox(height: 4),
                        Text(customer.phone!,
                            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
                      ],
                      if (customer.email != null) ...[
                        const SizedBox(height: 2),
                        Text(customer.email!,
                            style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            const Divider(),
            const SizedBox(height: 8),

            // Stats row
            Row(
              children: [
                _StatTile(
                  label: 'Loyalty Points',
                  value: '${customer.loyaltyPoints ?? 0}',
                  icon:  Icons.star_rounded,
                  color: const Color(0xFFCA8A04),
                ),
                const SizedBox(width: 12),
                _StatTile(
                  label: 'Outstanding',
                  value: formatCurrency(customer.outstandingBalance ?? 0),
                  icon:  Icons.account_balance_wallet_outlined,
                  color: (customer.outstandingBalance ?? 0) > 0
                      ? const Color(0xFFEF4444)
                      : const Color(0xFF10B981),
                ),
                const SizedBox(width: 12),
                _StatTile(
                  label: 'Total Purchases',
                  value: formatCompact(customer.totalPurchases ?? 0),
                  icon:  Icons.shopping_bag_outlined,
                  color: cs.primary,
                ),
              ],
            ),
            const SizedBox(height: 16),

            if (customer.address != null) ...[
              _DetailRow('Address', customer.address!),
              const Divider(height: 24),
            ],

            // Purchase history placeholder
            Text(
              'Purchase History',
              style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Container(
              padding:    const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color:        cs.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  Icon(Icons.receipt_long_outlined,
                      size: 36, color: cs.onSurfaceVariant),
                  const SizedBox(height: 8),
                  Text(
                    'Purchase history will appear here',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                    textAlign: TextAlign.center,
                  ),
                ],
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
