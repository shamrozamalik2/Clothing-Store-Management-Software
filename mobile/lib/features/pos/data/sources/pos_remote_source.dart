import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';

const _kHeldCartsKey = 'pos_held_carts';

class PosRemoteSource {
  final ApiClient _apiClient;

  const PosRemoteSource(this._apiClient);

  // --- Sales ------------------------------------------------------------

  /// Posts the sale payload to /sales.
  ///
  /// Expects the server to return `{ "data": { "id": ..., "invoiceNumber": ... } }`.
  Future<Map<String, dynamic>> createSale(
    Map<String, dynamic> payload,
  ) async {
    final res  = await _apiClient.post(ApiEndpoints.sales, data: payload);
    final body = res.data as Map<String, dynamic>? ?? {};
    final data = body['data'];
    if (data is Map<String, dynamic>) return data;
    return body;
  }

  // --- Customers --------------------------------------------------------

  /// Fetches customers, optionally filtered by [search].
  Future<List<Map<String, dynamic>>> getCustomers({String? search}) async {
    final res  = await _apiClient.get(ApiEndpoints.customers, queryParameters: {
      if (search != null && search.isNotEmpty) 'search': search,
    });
    final body = res.data as Map<String, dynamic>? ?? {};
    final raw  = body['data'];
    if (raw is List) return raw.cast<Map<String, dynamic>>();
    return const [];
  }

  // --- Held carts (local SharedPreferences) -----------------------------

  /// Serialises [cartMap] and appends it to the held-carts list.
  ///
  /// [cartMap] should be the result of `CartState.toJson()`.
  Future<void> holdCart(Map<String, dynamic> cartMap) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getStringList(_kHeldCartsKey) ?? [];

    final entry = Map<String, dynamic>.from(cartMap)
      ..['_id'] = DateTime.now().millisecondsSinceEpoch.toString()
      ..['_heldAt'] = DateTime.now().toIso8601String();

    existing.add(jsonEncode(entry));
    await prefs.setStringList(_kHeldCartsKey, existing);
  }

  /// Returns all currently held carts, newest first.
  Future<List<Map<String, dynamic>>> getHeldCarts() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_kHeldCartsKey) ?? [];
    return stored.reversed
        .map((s) => Map<String, dynamic>.from(
              jsonDecode(s) as Map,
            ))
        .toList();
  }

  /// Removes the held cart with the given [id].
  Future<void> removeHeldCart(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getStringList(_kHeldCartsKey) ?? [];
    final filtered = stored.where((s) {
      final decoded = jsonDecode(s) as Map;
      return decoded['_id'] != id;
    }).toList();
    await prefs.setStringList(_kHeldCartsKey, filtered);
  }

  /// Removes all held carts.
  Future<void> clearHeldCarts() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kHeldCartsKey);
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

final posRemoteSourceProvider = Provider<PosRemoteSource>((ref) {
  return PosRemoteSource(ref.read(apiClientProvider));
});
