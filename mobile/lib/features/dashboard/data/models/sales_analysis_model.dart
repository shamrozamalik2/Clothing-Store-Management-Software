class SalesAnalysis {
  const SalesAnalysis({
    required this.period,
    required this.from,
    required this.to,
    required this.totalSales,
    required this.orderCount,
    required this.chart,
  });

  final String           period;
  final String           from;
  final String           to;
  final double           totalSales;
  final int              orderCount;
  final List<AnalysisPoint> chart;

  factory SalesAnalysis.fromJson(Map<String, dynamic> json) => SalesAnalysis(
        period:     json['period'] as String? ?? '',
        from:       json['from']   as String? ?? '',
        to:         json['to']     as String? ?? '',
        totalSales: (json['total_sales'] as num?)?.toDouble() ?? 0,
        orderCount: (json['order_count'] as num?)?.toInt()    ?? 0,
        chart: (json['chart'] as List<dynamic>? ?? [])
            .map((e) => AnalysisPoint.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

class AnalysisPoint {
  const AnalysisPoint({
    required this.date,
    required this.amount,
    required this.orders,
  });

  final String date;
  final double amount;
  final int    orders;

  factory AnalysisPoint.fromJson(Map<String, dynamic> json) => AnalysisPoint(
        date:   json['date']   as String? ?? '',
        amount: (json['amount'] as num?)?.toDouble() ?? 0,
        orders: (json['orders'] as num?)?.toInt()    ?? 0,
      );
}
