import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/staff_model.dart';

class StaffRemoteSource {
  const StaffRemoteSource(this._api);
  final ApiClient _api;

  Future<List<StaffStat>> getStaff({String? from, String? to}) async {
    final res = await _api.get(
      ApiEndpoints.reportStaff,
      queryParameters: {
        if (from != null) 'from': from,
        if (to   != null) 'to':   to,
      },
    );
    final data = (res.data['data'] as List?) ?? [];
    return data
        .map((e) => StaffStat.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
