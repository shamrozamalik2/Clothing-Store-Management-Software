import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:uuid/uuid.dart';

import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../storage/hive_storage.dart';

// ─────────────────────────────────────────────────────────────────────────────
// SyncResult
// ─────────────────────────────────────────────────────────────────────────────

class SyncResult {
  const SyncResult({required this.synced, required this.failed});

  final int synced;
  final int failed;

  bool get allSynced  => failed == 0;
  int  get total      => synced + failed;

  @override
  String toString() => 'SyncResult(synced: $synced, failed: $failed)';
}

// ─────────────────────────────────────────────────────────────────────────────
// OfflineSyncService
// ─────────────────────────────────────────────────────────────────────────────

class OfflineSyncService {
  OfflineSyncService._();

  static const _uuid = Uuid();
  static bool _syncing = false;

  // ── Queue ─────────────────────────────────────────────────────────────────

  /// Stores a sale payload to the local Hive queue.
  ///
  /// Adds `_offline_id` (UUID v4) and `_queued_at` (ISO-8601) fields so the
  /// backend or a later audit can identify and deduplicate offline submissions.
  static Future<void> queueSale(Map<String, dynamic> salePayload) async {
    final enriched = <String, dynamic>{
      ...salePayload,
      '_offline_id': _uuid.v4(),
      '_queued_at':  DateTime.now().toIso8601String(),
    };
    await HiveStorage.addPendingSale(enriched);
  }

  // ── Sync ──────────────────────────────────────────────────────────────────

  /// Uploads every pending sale in the Hive queue.
  ///
  /// Each successful upload removes the entry from Hive. Failures are kept so
  /// they can be retried on the next call. Returns a [SyncResult] with counts.
  /// Guards against concurrent runs with [_syncing].
  static Future<SyncResult> syncAll(ApiClient api) async {
    if (_syncing) {
      // Already running — return zeros rather than double-posting.
      return const SyncResult(synced: 0, failed: 0);
    }
    _syncing = true;

    int synced = 0;
    int failed = 0;

    try {
      final box  = HiveStorage.pendingSales;
      // Snapshot the keys so we can delete safely while iterating.
      final keys = box.keys.toList();

      for (final key in keys) {
        final raw = box.get(key);
        if (raw == null) continue;

        // Cast to Map<String, dynamic> safely.
        final payload = Map<String, dynamic>.from(
          raw.map((k, v) => MapEntry(k.toString(), v)),
        );

        try {
          await api.post<void>(ApiEndpoints.sales, data: payload);
          await box.delete(key);
          synced++;
        } catch (_) {
          // Keep in queue for the next sync attempt.
          failed++;
        }
      }
    } finally {
      _syncing = false;
    }

    return SyncResult(synced: synced, failed: failed);
  }

  // ── Pending count ─────────────────────────────────────────────────────────

  /// Returns how many sales are currently queued offline.
  static int getPendingCount() => HiveStorage.pendingSales.length;

  // ── Connectivity stream ───────────────────────────────────────────────────

  /// Emits `true` when the device has at least one active connection,
  /// `false` when it has none.
  ///
  /// Uses `connectivity_plus` v6 which returns `List<ConnectivityResult>`.
  static Stream<bool> get connectivityStream =>
      Connectivity().onConnectivityChanged.map(
        (results) => results.any((r) => r != ConnectivityResult.none),
      );

  /// One-shot check of current connectivity.
  static Future<bool> get isConnected async {
    final results = await Connectivity().checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }
}
