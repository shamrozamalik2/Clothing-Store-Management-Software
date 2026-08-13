class DashboardStats {
  const DashboardStats({
    required this.todaySales,
    required this.todayOrders,
    required this.todayProfit,
    required this.lowStockCount,
    required this.pendingPayments,
    required this.recentSales,
    required this.topProducts,
    required this.weeklySales,
  });

  final double todaySales;
  final int    todayOrders;
  final double todayProfit;
  final int    lowStockCount;
  final double pendingPayments;
  final List<RecentSale>   recentSales;
  final List<TopProduct>   topProducts;
  final List<WeeklySalePoint> weeklySales;

  factory DashboardStats.fromJson(Map<String, dynamic> j) => DashboardStats(
    todaySales:      _d(j['today_sales']      ?? j['todaySales']      ?? 0),
    todayOrders:     _i(j['today_orders']     ?? j['todayOrders']     ?? 0),
    todayProfit:     _d(j['today_profit']     ?? j['todayProfit']     ?? 0),
    lowStockCount:   _i(j['low_stock_count']  ?? j['lowStockCount']   ?? 0),
    pendingPayments: _d(j['pending_payments'] ?? j['pendingPayments'] ?? 0),
    recentSales: ((j['recent_sales'] ?? j['recentSales'] ?? []) as List)
        .map((e) => RecentSale.fromJson(e as Map<String, dynamic>)).toList(),
    topProducts: ((j['top_products'] ?? j['topProducts'] ?? []) as List)
        .map((e) => TopProduct.fromJson(e as Map<String, dynamic>)).toList(),
    weeklySales: ((j['weekly_sales'] ?? j['weeklySales'] ?? []) as List)
        .map((e) => WeeklySalePoint.fromJson(e as Map<String, dynamic>)).toList(),
  );

  static double _d(dynamic v) => (v as num?)?.toDouble() ?? 0;
  static int    _i(dynamic v) => (v as num?)?.toInt()    ?? 0;
}

class RecentSale {
  const RecentSale({
    required this.id,
    required this.invoiceNo,
    required this.total,
    required this.createdAt,
    this.customerName,
  });
  final int    id;
  final String invoiceNo;
  final double total;
  final String createdAt;
  final String? customerName;

  factory RecentSale.fromJson(Map<String, dynamic> j) => RecentSale(
    id:           DashboardStats._i(j['id']),
    invoiceNo:    j['invoice_no']?.toString() ?? '#${j['id']}',
    total:        DashboardStats._d(j['total_amount']),
    createdAt:    j['created_at']?.toString() ?? '',
    customerName: j['customer_name']?.toString(),
  );
}

class TopProduct {
  const TopProduct({required this.name, required this.qty, required this.revenue});
  final String name;
  final int    qty;
  final double revenue;

  factory TopProduct.fromJson(Map<String, dynamic> j) => TopProduct(
    name:    j['name']?.toString() ?? '',
    qty:     DashboardStats._i(j['total_qty'] ?? j['qty']),
    revenue: DashboardStats._d(j['revenue']),
  );
}

class WeeklySalePoint {
  const WeeklySalePoint({required this.day, required this.amount});
  final String day;
  final double amount;

  factory WeeklySalePoint.fromJson(Map<String, dynamic> j) => WeeklySalePoint(
    day:    j['day']?.toString()               ?? '',
    amount: (j['amount'] as num?)?.toDouble() ?? 0,
  );
}
