import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/models/api_response.dart';
import '../models/sale_model.dart';

class SalesRemoteSource {
  const SalesRemoteSource(this._api);
  final ApiClient _api;

  Future<PaginatedResponse<SaleModel>> getSales({
    int     page       = 1,
    int     limit      = 20,
    String? dateFrom,
    String? dateTo,
    int?    customerId,
  }) async {
    final res = await _api.get(ApiEndpoints.sales, queryParameters: {
      'page':  page,
      'limit': limit,
      if (dateFrom    != null) 'date_from':   dateFrom,
      if (dateTo      != null) 'date_to':     dateTo,
      if (customerId  != null) 'customer_id': customerId,
    });
    return PaginatedResponse.fromJson(
      res.data as Map<String, dynamic>,
      SaleModel.fromJson,
    );
  }

  Future<SaleDetailModel> getSale(int id) async {
    final res  = await _api.get(ApiEndpoints.sale(id));
    final data = (res.data as Map<String, dynamic>)['data'] as Map<String, dynamic>;
    return SaleDetailModel.fromJson(data);
  }
}
