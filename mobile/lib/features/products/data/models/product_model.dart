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

  factory ProductModel.fromJson(Map<String, dynamic> j) => ProductModel(
    id:            j['id']             as int,
    name:          j['name']           as String,
    sku:           j['sku']            as String? ?? '',
    sellingPrice:  (j['selling_price'] as num?)?.toDouble() ?? 0,
    costPrice:     (j['cost_price']    as num?)?.toDouble() ?? 0,
    stockQuantity: (j['stock_quantity'] as num?)?.toInt() ?? 0,
    unit:          j['unit']           as String? ?? 'pcs',
    barcode:       j['barcode']        as String?,
    categoryId:    j['category_id']    as int?,
    categoryName:  j['category_name']  as String?,
    brandId:       j['brand_id']       as int?,
    brandName:     j['brand_name']     as String?,
    imageUrl:      j['image_url']      as String?,
    minStockLevel: (j['min_stock_level'] as num?)?.toInt() ?? 0,
    isActive:      j['is_active']      as bool? ?? true,
  );
}
