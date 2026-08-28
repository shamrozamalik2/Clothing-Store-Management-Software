import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/grad_widgets.dart';
import '../../../shell/main_shell.dart';
import '../../data/models/sale_notification_model.dart';
import '../providers/notifications_provider.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifications = ref.watch(notificationsProvider);
    final unread        = ref.watch(unreadCountProvider);
    final cs            = Theme.of(context).colorScheme;
    final tt            = Theme.of(context).textTheme;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating:  true,
            snap:      true,
            leading:   IconButton(
              icon:      const Icon(Icons.menu_rounded),
              onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
            ),
            title: Row(
              children: [
                const Text('Notifications'),
                if (unread > 0) ...[
                  const SizedBox(width: 8),
                  Container(
                    padding:    const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      gradient:     const LinearGradient(colors: kGradPrimary),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '$unread',
                      style: const TextStyle(
                        color:      Colors.white,
                        fontSize:   11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ],
            ),
            actions: [
              if (notifications.isNotEmpty) ...[
                if (unread > 0)
                  TextButton(
                    onPressed: () => ref.read(notificationsProvider.notifier).markAllRead(),
                    child: const Text('Mark all read'),
                  ),
                IconButton(
                  icon:      const Icon(Icons.delete_sweep_outlined),
                  tooltip:   'Clear all',
                  onPressed: () => _confirmClear(context, ref),
                ),
              ],
              const SizedBox(width: 4),
            ],
          ),

          if (notifications.isEmpty)
            SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(),
            )
          else
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, i) {
                  if (i == 0) {
                    return Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: Text(
                        '${notifications.length} notification${notifications.length == 1 ? '' : 's'}',
                        style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                      ),
                    );
                  }
                  final n = notifications[i - 1];
                  return _NotificationTile(
                    notification: n,
                    onTap: () => ref
                        .read(notificationsProvider.notifier)
                        .markRead(n.id),
                  );
                },
                childCount: notifications.length + 1,
              ),
            ),

          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }

  void _confirmClear(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title:   const Text('Clear notifications?'),
        content: const Text('All notification history will be deleted.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child:     const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(notificationsProvider.notifier).clear();
              Navigator.pop(context);
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }
}

// ── Notification tile ─────────────────────────────────────────────────────────

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.notification,
    required this.onTap,
  });
  final SaleNotification notification;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    final n  = notification;

    final pmColors = {
      'cash':   const Color(0xFF10B981),
      'card':   const Color(0xFF6366F1),
      'credit': const Color(0xFFF59E0B),
      'bank':   const Color(0xFF0EA5E9),
    };
    final pmColor = pmColors[n.paymentMethod.toLowerCase()] ?? cs.secondary;

    return InkWell(
      onTap: onTap,
      child: Container(
        margin:  const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: n.isRead
              ? cs.surfaceContainer
              : cs.primaryContainer.withValues(alpha: 0.35),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: n.isRead
                ? cs.outlineVariant.withValues(alpha: 0.4)
                : cs.primary.withValues(alpha: 0.3),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Icon
            Container(
              width:  40,
              height: 40,
              decoration: BoxDecoration(
                gradient:     const LinearGradient(
                  begin: Alignment.topLeft,
                  end:   Alignment.bottomRight,
                  colors: kGradGreen,
                ),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.shopping_bag_rounded, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          n.invoiceNo,
                          style: tt.bodyMedium?.copyWith(
                            fontWeight: n.isRead ? FontWeight.w500 : FontWeight.w700,
                          ),
                        ),
                      ),
                      if (!n.isRead)
                        Container(
                          width:  8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Color(0xFF6366F1),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${n.customerName}  •  ${n.itemCount} item${n.itemCount == 1 ? '' : 's'}',
                    style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
                  ),
                  if (n.cashierName.isNotEmpty) ...[
                    const SizedBox(height: 1),
                    Text(
                      'Cashier: ${n.cashierName}',
                      style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      // Payment chip
                      Container(
                        padding:    const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color:        pmColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                          border:       Border.all(color: pmColor.withValues(alpha: 0.3)),
                        ),
                        child: Text(
                          n.paymentMethod.toUpperCase(),
                          style: TextStyle(
                            color: pmColor, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ),
                      const Spacer(),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            formatCurrency(n.total),
                            style: tt.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w800,
                              color:      const Color(0xFF10B981),
                            ),
                          ),
                          Text(
                            _formatRelative(n.receivedAt),
                            style: tt.labelSmall?.copyWith(color: cs.onSurfaceVariant),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatRelative(DateTime dt) {
    final diff = DateTime.now().difference(dt);
    if (diff.inMinutes < 1)  return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours   < 24) return '${diff.inHours}h ago';
    if (diff.inDays    < 7)  return '${diff.inDays}d ago';
    return DateFormat('MMM d').format(dt);
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.notifications_none_rounded, size: 64, color: cs.onSurfaceVariant.withValues(alpha: 0.4)),
        const SizedBox(height: 16),
        Text('No notifications yet',
            style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
        const SizedBox(height: 8),
        Text(
          'Sale alerts will appear here in real-time.',
          style:     tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
