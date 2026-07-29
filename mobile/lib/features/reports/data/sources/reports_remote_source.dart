import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/report_model.dart';

class ReportsRemoteSource {
  const ReportsRemoteSource(this._api);
  final ApiClient _api;

  // ── Sales summary ─────────────────────────────────────────────────────────

  Future<SalesSummary> getSalesSummary(ReportFilter filter) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportSales,
      queryParameters: filter.toQueryParams(),
    );
    final data = _dataMap(res.data);
    return SalesSummary.fromJson(data);
  }

  // ── Daily sales series ────────────────────────────────────────────────────

  Future<List<DailySalePoint>> getDailySales(ReportFilter filter) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportSales,
      queryParameters: {
        ...filter.toQueryParams(),
        'group_by': 'day',
      },
    );
    final list = _dataList(res.data);
    return list
        .map((e) => DailySalePoint.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── Top products ──────────────────────────────────────────────────────────

  Future<List<ProductReport>> getTopProducts(
    ReportFilter filter, {
    int limit = 10,
  }) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportProducts,
      queryParameters: {
        ...filter.toQueryParams(),
        'limit': '$limit',
      },
    );
    final list = _dataList(res.data);
    return list
        .map((e) => ProductReport.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  // ── Payment method breakdown ──────────────────────────────────────────────

  /// Returns a map of payment method → total amount for the [filter] period.
  Future<Map<String, double>> getPaymentReport(ReportFilter filter) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportProfit,
      queryParameters: {
        ...filter.toQueryParams(),
        'breakdown': 'payment_method',
      },
    );
    final data = _dataMap(res.data);
    return data.map((k, v) => MapEntry(k, (v as num).toDouble()));
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  Map<String, dynamic> _dataMap(dynamic body) {
    if (body is Map<String, dynamic>) {
      final d = body['data'];
      if (d is Map<String, dynamic>) return d;
    }
    return {};
  }

  List<dynamic> _dataList(dynamic body) {
    if (body is Map<String, dynamic>) {
      final d = body['data'];
      if (d is List) return d;
    }
    return [];
  }
}
