import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/stock_model.dart';

class StockRemoteSource {
  const StockRemoteSource(this._api);
  final ApiClient _api;

  Future<StockReport> getReport() async {
    final res  = await _api.get(ApiEndpoints.reportStock);
    final data = res.data['data'] as Map<String, dynamic>? ?? {};

    final summary = StockSummary.fromJson(
      data['summary'] as Map<String, dynamic>? ?? {},
    );
    final rawItems = (data['lowStockItems'] ?? data['low_stock_items'] ?? []) as List;
    final items    = rawItems
        .map((e) => LowStockItem.fromJson(e as Map<String, dynamic>))
        .toList();

    return StockReport(summary: summary, lowStockItems: items);
  }
}
