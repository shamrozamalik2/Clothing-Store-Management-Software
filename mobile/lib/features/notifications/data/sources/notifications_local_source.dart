import '../../../../core/constants/app_constants.dart';
import '../../../../core/storage/hive_storage.dart';
import '../models/sale_notification_model.dart';

class NotificationsLocalSource {
  List<SaleNotification> getAll() {
    final box = HiveStorage.notifications;
    return box.values
        .map((s) {
          try { return SaleNotification.fromJsonString(s); }
          catch (_) { return null; }
        })
        .whereType<SaleNotification>()
        .toList()
      ..sort((a, b) => b.receivedAt.compareTo(a.receivedAt));
  }

  Future<void> add(SaleNotification n) async {
    final box = HiveStorage.notifications;
    await box.put(n.id, n.toJsonString());

    // Prune oldest entries beyond the max limit
    if (box.length > kMaxNotifications) {
      final sorted = getAll();
      final toRemove = sorted.skip(kMaxNotifications).toList();
      for (final old in toRemove) {
        await box.delete(old.id);
      }
    }
  }

  Future<void> markRead(String id) async {
    final box = HiveStorage.notifications;
    final raw = box.get(id);
    if (raw == null) return;
    try {
      final n = SaleNotification.fromJsonString(raw).copyWith(isRead: true);
      await box.put(id, n.toJsonString());
    } catch (_) {}
  }

  Future<void> markAllRead() async {
    final box   = HiveStorage.notifications;
    final all   = getAll();
    final updates = <Future<void>>[];
    for (final n in all) {
      if (!n.isRead) {
        updates.add(box.put(n.id, n.copyWith(isRead: true).toJsonString()));
      }
    }
    await Future.wait(updates);
  }

  Future<void> clear() async => HiveStorage.notifications.clear();

  int get unreadCount => getAll().where((n) => !n.isRead).length;
}
