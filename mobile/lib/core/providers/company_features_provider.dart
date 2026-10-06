import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';
import '../api/api_endpoints.dart';

/// Effective feature map for the signed-in company, from GET /features.
/// The backend enforces every feature; this only decides what the app offers.
final companyFeaturesProvider = FutureProvider<Map<String, bool>>((ref) async {
  final res      = await ref.watch(apiClientProvider).get(ApiEndpoints.features);
  final body     = res.data as Map<String, dynamic>;
  final data     = (body['data'] as Map<String, dynamic>?) ?? {};
  final features = (data['features'] as Map<String, dynamic>?) ?? {};
  return features.map((key, value) => MapEntry(key, value == true));
});

/// True unless the feature is known to be off. Until the map loads, features are treated as on.
bool featureOn(AsyncValue<Map<String, bool>> features, String key) =>
    features.valueOrNull?[key] ?? true;
