import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../models/report_model.dart';

class ReportsRemoteSource {
  const ReportsRemoteSource(this._api);
  final ApiClient _api;

  static double _d(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  static int _i(dynamic v) =>
      v is num ? v.toInt() : int.tryParse('$v') ?? 0;

  // ── Sales summary (from /reports/overview) ────────────────────────────────

  Future<SalesSummary> getSalesSummary(ReportFilter filter) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportOverview,
      queryParameters: filter.toQueryParams(),
    );
    final body   = (res.data as Map?)?.cast<String, dynamic>() ?? {};
    final data   = (body['data'] as Map<String, dynamic>?) ?? {};
    final sales  = (data['sales'] as Map<String, dynamic>?) ?? {};
    return SalesSummary(
      totalSales:    _d(sales['revenue']),
      totalOrders:   _i(sales['sale_count']),
      totalProfit:   _d(data['gross_profit']),
      avgOrderValue: _d(sales['avg_order_value']),
    );
  }

  // ── Daily sales series (from /reports/daily-sales) ────────────────────────

  Future<List<DailySalePoint>> getDailySales(ReportFilter filter) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportDailySales,
      queryParameters: filter.toQueryParams(),
    );
    final list = _dataList(res.data);
    return list.map((e) {
      final m = e as Map<String, dynamic>;
      return DailySalePoint(
        date:   m['day']?.toString() ?? '',
        amount: _d(m['revenue']),
        orders: _i(m['sale_count']),
      );
    }).toList();
  }

  // ── Top products (from /reports/top-products) ─────────────────────────────

  Future<List<ProductReport>> getTopProducts(
    ReportFilter filter, {
    int limit = 10,
  }) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportTopProducts,
      queryParameters: {
        ...filter.toQueryParams(),
        'limit': '$limit',
      },
    );
    final list = _dataList(res.data);
    return list.map((e) {
      final m = e as Map<String, dynamic>;
      return ProductReport(
        productId: _i(m['id']),
        name:      m['name']?.toString() ?? '',
        qtySold:   _i(m['total_qty']),
        revenue:   _d(m['total_revenue']),
        profit:    _d(m['gross_profit']),
      );
    }).toList();
  }

  // ── Payment method breakdown (from /reports/payment-methods) ─────────────

  Future<Map<String, double>> getPaymentReport(ReportFilter filter) async {
    final res  = await _api.get<Map<String, dynamic>>(
      ApiEndpoints.reportPaymentMethods,
      queryParameters: filter.toQueryParams(),
    );
    final list   = _dataList(res.data);
    final result = <String, double>{};
    for (final e in list) {
      final m   = e as Map<String, dynamic>;
      final key = m['payment_method']?.toString() ?? 'other';
      result[key] = _d(m['revenue']);
    }
    return result;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  List<dynamic> _dataList(dynamic body) {
    if (body is Map<String, dynamic>) {
      final d = body['data'];
      if (d is List) return d;
    }
    return [];
  }
}