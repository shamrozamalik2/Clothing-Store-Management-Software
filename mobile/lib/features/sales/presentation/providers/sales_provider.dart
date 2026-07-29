import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/models/api_response.dart';
import '../../data/models/sale_model.dart';
import '../../data/sources/sales_remote_source.dart';

final salesSourceProvider = Provider<SalesRemoteSource>((ref) {
  return SalesRemoteSource(ref.watch(apiClientProvider));
});

// Date filter state — null means "all"
final salesDateFromProvider = StateProvider<String?>((ref) => null);
final salesToDateProvider   = StateProvider<String?>((ref) => null);

final salesProvider = FutureProvider.autoDispose<PaginatedResponse<SaleModel>>((ref) {
  final dateFrom = ref.watch(salesDateFromProvider);
  final dateTo   = ref.watch(salesToDateProvider);
  return ref.watch(salesSourceProvider).getSales(
    dateFrom: dateFrom,
    dateTo:   dateTo,
  );
});
