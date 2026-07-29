import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/dashboard_stats_model.dart';

class DashboardRemoteSource {
  const DashboardRemoteSource(this._api);
  final ApiClient _api;

  Future<DashboardStats> getStats() async {
    final res  = await _api.get(ApiEndpoints.dashboardStats);
    final data = res.data['data'] as Map<String, dynamic>? ?? {};
    return DashboardStats.fromJson(data);
  }
}
