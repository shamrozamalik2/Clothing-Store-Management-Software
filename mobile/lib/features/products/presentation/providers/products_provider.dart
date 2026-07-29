import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/models/api_response.dart';
import '../../data/models/product_model.dart';
import '../../data/sources/products_remote_source.dart';

final productsSourceProvider = Provider<ProductsRemoteSource>((ref) {
  return ProductsRemoteSource(ref.watch(apiClientProvider));
});

final productSearchProvider = StateProvider<String>((ref) => '');

final productCategoryProvider = StateProvider<int?>((ref) => null);

final productsProvider = FutureProvider.autoDispose<PaginatedResponse<ProductModel>>((ref) {
  final search     = ref.watch(productSearchProvider);
  final categoryId = ref.watch(productCategoryProvider);
  return ref.watch(productsSourceProvider).getProducts(
    search:     search.isEmpty ? null : search,
    categoryId: categoryId,
  );
});
