import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/sale_notification_model.dart';
import '../../data/sources/notifications_local_source.dart';

final notificationsSourceProvider = Provider<NotificationsLocalSource>(
  (_) => NotificationsLocalSource(),
);

final notificationsProvider =
    NotifierProvider<NotificationsNotifier, List<SaleNotification>>(
  NotificationsNotifier.new,
);

class NotificationsNotifier extends Notifier<List<SaleNotification>> {
  NotificationsLocalSource get _src => ref.read(notificationsSourceProvider);

  @override
  List<SaleNotification> build() => _src.getAll();

  Future<void> add(SaleNotification n) async {
    await _src.add(n);
    state = _src.getAll();
  }

  Future<void> markRead(String id) async {
    await _src.markRead(id);
    state = _src.getAll();
  }

  Future<void> markAllRead() async {
    await _src.markAllRead();
    state = _src.getAll();
  }

  Future<void> clear() async {
    await _src.clear();
    state = [];
  }
}

final unreadCountProvider = Provider<int>((ref) {
  final all = ref.watch(notificationsProvider);
  return all.where((n) => !n.isRead).length;
});
