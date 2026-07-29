import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/models/api_response.dart';
import '../models/customer_model.dart';

class CustomersRemoteSource {
  const CustomersRemoteSource(this._api);
  final ApiClient _api;

  Future<PaginatedResponse<CustomerModel>> getCustomers({
    int     page  = 1,
    int     limit = 20,
    String? search,
  }) async {
    final res = await _api.get(ApiEndpoints.customers, queryParameters: {
      'page':  page,
      'limit': limit,
      if (search != null && search.isNotEmpty) 'search': search,
    });
    return PaginatedResponse.fromJson(
      res.data as Map<String, dynamic>,
      CustomerModel.fromJson,
    );
  }

  Future<CustomerModel> getCustomer(int id) async {
    final res  = await _api.get(ApiEndpoints.customer(id));
    final data = (res.data as Map<String, dynamic>)['data'] as Map<String, dynamic>;
    return CustomerModel.fromJson(data);
  }

  Future<CustomerModel> createCustomer(Map<String, dynamic> body) async {
    final res  = await _api.post(ApiEndpoints.customers, data: body);
    final data = (res.data as Map<String, dynamic>)['data'] as Map<String, dynamic>;
    return CustomerModel.fromJson(data);
  }

  Future<CustomerModel> updateCustomer(int id, Map<String, dynamic> body) async {
    final res  = await _api.put(ApiEndpoints.customer(id), data: body);
    final data = (res.data as Map<String, dynamic>)['data'] as Map<String, dynamic>;
    return CustomerModel.fromJson(data);
  }
}
