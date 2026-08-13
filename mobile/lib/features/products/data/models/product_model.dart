class ProductModel {
  const ProductModel({
    required this.id,
    required this.name,
    required this.sku,
    required this.sellingPrice,
    required this.costPrice,
    required this.stockQuantity,
    required this.unit,
    this.barcode,
    this.categoryId,
    this.categoryName,
    this.brandId,
    this.brandName,
    this.imageUrl,
    this.minStockLevel = 0,
    this.isActive = true,
  });

  final int    id;
  final String name;
  final String sku;
  final double sellingPrice;
  final double costPrice;
  final int    stockQuantity;
  final String unit;
  final String? barcode;
  final int?    categoryId;
  final String? categoryName;
  final int?    brandId;
  final String? brandName;
  final String? imageUrl;
  final int     minStockLevel;
  final bool    isActive;

  bool get isLowStock => stockQuantity <= minStockLevel;

  static double _d(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  static int _i(dynamic v) =>
      v is num ? v.toInt() : int.tryParse('$v') ?? 0;

  factory ProductModel.fromJson(Map<String, dynamic> j) => ProductModel(
    id:            _i(j['id']),
    name:          j['name']?.toString()           ?? '',
    sku:           j['sku']?.toString()            ?? '',
    sellingPrice:  _d(j['sale_price']  ?? j['selling_price']),
    costPrice:     _d(j['cost_price']),
    stockQuantity: _i(j['stock_quantity']),
    unit:          j['unit']?.toString()           ?? 'pcs',
    barcode:       j['barcode']?.toString(),
    categoryId:    j['category_id'] != null ? _i(j['category_id']) : null,
    categoryName:  j['category_name']?.toString(),
    brandId:       j['brand_id'] != null ? _i(j['brand_id']) : null,
    brandName:     j['brand_name']?.toString(),
    imageUrl:      (j['image'] ?? j['image_url'])?.toString(),
    minStockLevel: _i(j['low_stock_alert'] ?? j['min_stock_level'] ?? 0),
    isActive:      j['is_active'] == true || j['is_active'] == 1,
  );
}
