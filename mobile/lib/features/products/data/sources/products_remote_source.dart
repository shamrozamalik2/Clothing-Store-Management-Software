import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/models/api_response.dart';
import '../models/product_model.dart';

class ProductsRemoteSource {
  const ProductsRemoteSource(this._api);
  final ApiClient _api;

  Future<PaginatedResponse<ProductModel>> getProducts({
    int    page     = 1,
    int    limit    = 20,
    String? search,
    String? barcode,
    int?    categoryId,
    bool?   lowStock,
  }) async {
    final res = await _api.get(ApiEndpoints.products, queryParameters: {
      'page':  page,
      'limit': limit,
      if (search     != null) 'search':      search,
      if (barcode    != null) 'barcode':     barcode,
      if (categoryId != null) 'category_id': categoryId,
      if (lowStock   == true) 'low_stock':   'true',
    });
    return PaginatedResponse.fromJson(
      res.data as Map<String, dynamic>,
      ProductModel.fromJson,
    );
  }

  Future<ProductModel> getByBarcode(String barcode) async {
    final res  = await _api.get(ApiEndpoints.products, queryParameters: {'barcode': barcode, 'limit': 1});
    final data = res.data as Map<String, dynamic>;
    final list = (data['data'] as List?)?.cast<Map<String, dynamic>>() ?? [];
    if (list.isEmpty) throw Exception('Product not found');
    return ProductModel.fromJson(list.first);
  }

  Future<List<Map<String, dynamic>>> getCategories() async {
    final res  = await _api.get(ApiEndpoints.categories);
    final data = res.data as Map<String, dynamic>;
    return ((data['data'] as List?) ?? []).cast<Map<String, dynamic>>();
  }
}
