class StockSummary {
  const StockSummary({
    required this.totalProducts,
    required this.stockValue,
    required this.retailValue,
    required this.outOfStock,
    required this.lowStock,
  });

  final int    totalProducts;
  final double stockValue;
  final double retailValue;
  final int    outOfStock;
  final int    lowStock;

  factory StockSummary.fromJson(Map<String, dynamic> j) => StockSummary(
    totalProducts: _i(j['total_products']),
    stockValue:    _d(j['stock_value']),
    retailValue:   _d(j['retail_value']),
    outOfStock:    _i(j['out_of_stock']),
    lowStock:      _i(j['low_stock']),
  );

  static double _d(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  static int _i(dynamic v) =>
      v is num ? v.toInt() : int.tryParse('$v') ?? 0;
}

class LowStockItem {
  const LowStockItem({
    required this.id,
    required this.name,
    required this.sku,
    required this.stockQuantity,
    required this.lowStockAlert,
    required this.costPrice,
    required this.salePrice,
    this.categoryName,
  });

  final int    id;
  final String name;
  final String sku;
  final int    stockQuantity;
  final int    lowStockAlert;
  final double costPrice;
  final double salePrice;
  final String? categoryName;

  bool get isOutOfStock => stockQuantity <= 0;

  factory LowStockItem.fromJson(Map<String, dynamic> j) => LowStockItem(
    id:            StockSummary._i(j['id']),
    name:          j['name']?.toString()          ?? '',
    sku:           j['sku']?.toString()           ?? '',
    stockQuantity: StockSummary._i(j['stock_quantity']),
    lowStockAlert: StockSummary._i(j['low_stock_alert']),
    costPrice:     StockSummary._d(j['cost_price']),
    salePrice:     StockSummary._d(j['sale_price']),
    categoryName:  j['category_name']?.toString(),
  );
}

class StockReport {
  const StockReport({
    required this.summary,
    required this.lowStockItems,
  });
  final StockSummary      summary;
  final List<LowStockItem> lowStockItems;
}
