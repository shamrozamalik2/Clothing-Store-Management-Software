// ignore_for_file: invalid_annotation_target

/// Models for the Reports feature.

// ─────────────────────────────────────────────────────────────────────────────
// SalesSummary
// ─────────────────────────────────────────────────────────────────────────────

class SalesSummary {
  const SalesSummary({
    required this.totalSales,
    required this.totalOrders,
    required this.totalProfit,
    required this.avgOrderValue,
  });

  final double totalSales;
  final int    totalOrders;
  final double totalProfit;
  final double avgOrderValue;

  factory SalesSummary.fromJson(Map<String, dynamic> json) => SalesSummary(
        totalSales:     (json['total_sales']     as num?)?.toDouble() ?? 0.0,
        totalOrders:     json['total_orders']    as int?              ?? 0,
        totalProfit:    (json['total_profit']    as num?)?.toDouble() ?? 0.0,
        avgOrderValue:  (json['avg_order_value'] as num?)?.toDouble() ?? 0.0,
      );

  /// Empty / zero-value sentinel used while loading.
  static const empty = SalesSummary(
    totalSales:    0,
    totalOrders:   0,
    totalProfit:   0,
    avgOrderValue: 0,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProductReport
// ─────────────────────────────────────────────────────────────────────────────

class ProductReport {
  const ProductReport({
    required this.productId,
    required this.name,
    required this.qtySold,
    required this.revenue,
    required this.profit,
  });

  final int    productId;
  final String name;
  final int    qtySold;
  final double revenue;
  final double profit;

  factory ProductReport.fromJson(Map<String, dynamic> json) => ProductReport(
        productId: json['product_id'] as int?    ?? 0,
        name:      json['name']       as String? ?? '',
        qtySold:   json['qty_sold']   as int?    ?? 0,
        revenue:  (json['revenue']    as num?)?.toDouble() ?? 0.0,
        profit:   (json['profit']     as num?)?.toDouble() ?? 0.0,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// DailySalePoint
// ─────────────────────────────────────────────────────────────────────────────

class DailySalePoint {
  const DailySalePoint({
    required this.date,
    required this.amount,
    required this.orders,
  });

  /// ISO date string, e.g. "2024-07-15".
  final String date;
  final double amount;
  final int    orders;

  factory DailySalePoint.fromJson(Map<String, dynamic> json) => DailySalePoint(
        date:   json['date']   as String? ?? '',
        amount:(json['amount'] as num?)?.toDouble() ?? 0.0,
        orders: json['orders'] as int?    ?? 0,
      );
}

// ─────────────────────────────────────────────────────────────────────────────
// ReportFilter
// ─────────────────────────────────────────────────────────────────────────────

class ReportFilter {
  const ReportFilter({
    required this.dateFrom,
    required this.dateTo,
  });

  final DateTime dateFrom;
  final DateTime dateTo;

  // ── Named presets ─────────────────────────────────────────────────────────

  factory ReportFilter.today() {
    final now   = DateTime.now();
    final start = DateTime(now.year, now.month, now.day);
    return ReportFilter(dateFrom: start, dateTo: now);
  }

  factory ReportFilter.thisWeek() {
    final now       = DateTime.now();
    final weekStart = now.subtract(Duration(days: now.weekday - 1));
    return ReportFilter(
      dateFrom: DateTime(weekStart.year, weekStart.month, weekStart.day),
      dateTo:   now,
    );
  }

  factory ReportFilter.thisMonth() {
    final now = DateTime.now();
    return ReportFilter(
      dateFrom: DateTime(now.year, now.month, 1),
      dateTo:   now,
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /// Formats dateFrom as "yyyy-MM-dd".
  String get fromParam => _isoDate(dateFrom);

  /// Formats dateTo as "yyyy-MM-dd".
  String get toParam => _isoDate(dateTo);

  Map<String, String> toQueryParams() => {
        'date_from': fromParam,
        'date_to':   toParam,
      };

  static String _isoDate(DateTime dt) =>
      '${dt.year.toString().padLeft(4, '0')}-'
      '${dt.month.toString().padLeft(2, '0')}-'
      '${dt.day.toString().padLeft(2, '0')}';

  @override
  bool operator ==(Object other) =>
      other is ReportFilter &&
      dateFrom == other.dateFrom &&
      dateTo   == other.dateTo;

  @override
  int get hashCode => Object.hash(dateFrom, dateTo);
}
