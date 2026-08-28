import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../data/models/stock_model.dart';
import '../../data/sources/stock_remote_source.dart';

final stockSourceProvider = Provider<StockRemoteSource>(
  (ref) => StockRemoteSource(ref.watch(apiClientProvider)),
);

final stockProvider = FutureProvider.autoDispose<StockReport>((ref) {
  return ref.watch(stockSourceProvider).getReport();
});
