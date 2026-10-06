import 'package:dio/dio.dart';

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
    String? categoryId,
    bool?   lowStock,
  }) async {
    // The list endpoint has no barcode filter, so an exact barcode goes to the barcode endpoint.
    if (barcode != null) {
      final product = await findByBarcode(barcode);
      final items   = product == null ? <ProductModel>[] : [product];
      return PaginatedResponse(items: items, total: items.length, page: 1, limit: 1);
    }
    final res = await _api.get(ApiEndpoints.products, queryParameters: {
      'page':  page,
      'limit': limit,
      if (search     != null) 'search':      search,
      if (categoryId != null) 'category_id': categoryId,
      if (lowStock   == true) 'low_stock':   'true',
    });
    return PaginatedResponse.fromJson(
      res.data as Map<String, dynamic>,
      ProductModel.fromJson,
    );
  }

  /// Exact barcode lookup. Returns null when no product or variant uses the code.
  Future<ProductModel?> findByBarcode(String barcode) async {
    try {
      final res  = await _api.get('${ApiEndpoints.products}/barcode/${Uri.encodeComponent(barcode)}');
      final body = res.data as Map<String, dynamic>;
      return ProductModel.fromJson(body['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Creates a product. [data] uses the same field names as the web product form.
  Future<ProductModel> createProduct(Map<String, dynamic> data) async {
    final res  = await _api.post(ApiEndpoints.products, data: data);
    final body = res.data as Map<String, dynamic>;
    return ProductModel.fromJson(body['data'] as Map<String, dynamic>);
  }

  Future<List<Map<String, dynamic>>> getCategories() async {
    final res  = await _api.get(ApiEndpoints.categories);
    final data = res.data as Map<String, dynamic>;
    return ((data['data'] as List?) ?? []).cast<Map<String, dynamic>>();
  }
}
