import '../../../../core/utils/image_url.dart';

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
    this.trackInventory = true,
    this.allowNegative = false,
    this.variants = const [],
    this.matchedVariantId,
  });

  final String  id;
  final String  name;
  final String  sku;
  final double  sellingPrice;
  final double  costPrice;
  final int     stockQuantity;
  final String  unit;
  final String? barcode;
  final String? categoryId;
  final String? categoryName;
  final String? brandId;
  final String? brandName;
  final String? imageUrl;
  final int     minStockLevel;
  final bool    isActive;
  final bool    trackInventory;
  final bool    allowNegative;
  // Clothing-style color/size variants. A product list/get/barcode response
  // already embeds these (they're stored on the product document itself),
  // so no extra request is needed to show the picker.
  final List<ProductVariantModel> variants;
  // Set only by the barcode lookup, when the scanned code is one specific
  // variant's own barcode rather than the product's — lets the caller
  // auto-select that exact variant instead of opening the full picker.
  final String? matchedVariantId;

  bool get isLowStock => stockQuantity <= minStockLevel;
  bool get isOutOfStock =>
      trackInventory && !allowNegative && stockQuantity <= 0;
  bool get hasVariants => variants.isNotEmpty;

  static double _d(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  static int _i(dynamic v) =>
      v is num ? v.toInt() : int.tryParse('$v') ?? 0;

  factory ProductModel.fromJson(Map<String, dynamic> j) => ProductModel(
    id:            j['id']?.toString()              ?? '',
    name:          j['name']?.toString()            ?? '',
    sku:           j['sku']?.toString()             ?? '',
    sellingPrice:  _d(j['sale_price']  ?? j['selling_price']),
    costPrice:     _d(j['cost_price']),
    stockQuantity: _i(j['stock_quantity']),
    unit:          j['unit']?.toString()            ?? 'pcs',
    barcode:       j['barcode']?.toString(),
    categoryId:    j['category_id']?.toString(),
    categoryName:  j['category_name']?.toString(),
    brandId:       j['brand_id']?.toString(),
    brandName:     j['brand_name']?.toString(),
    imageUrl:      resolveImageUrl((j['image'] ?? j['image_url'])?.toString()),
    minStockLevel: _i(j['low_stock_alert'] ?? j['min_stock_level'] ?? 0),
    isActive:      j['is_active'] == true || j['is_active'] == 1,
    trackInventory: j['track_inventory'] != false,
    allowNegative:  j['allow_negative']  == true,
    variants: ((j['variants'] as List?) ?? [])
        .map((e) => ProductVariantModel.fromJson(e as Map<String, dynamic>))
        .where((v) => v.isActive)
        .toList(),
    matchedVariantId: (j['matched_variant'] as Map<String, dynamic>?)?['id']?.toString() ??
        (j['matched_variant'] as Map<String, dynamic>?)?['_id']?.toString(),
  );
}

/// One color/size combination of a [ProductModel]. Embedded on the product
/// document server-side, so it rides along on every product response —
/// list, get-one and the barcode lookup all already include it.
class ProductVariantModel {
  const ProductVariantModel({
    required this.id,
    required this.sku,
    this.barcode,
    this.size,
    this.color,
    required this.costPrice,
    required this.salePrice,
    required this.stockQuantity,
    this.isActive = true,
  });

  final String  id;
  final String  sku;
  final String? barcode;
  final String? size;
  final String? color;
  final double  costPrice;
  final double  salePrice;
  final int     stockQuantity;
  final bool    isActive;

  /// "Red · M", falling back to the SKU when neither is set.
  String get label {
    final parts = [size, color]
        .where((s) => s != null && s.isNotEmpty)
        .toList();
    return parts.isEmpty ? sku : parts.join(' · ');
  }

  /// " · Red · M" — appended to the product name for a cart line/receipt.
  String get suffix {
    final parts = [size, color]
        .where((s) => s != null && s.isNotEmpty)
        .toList();
    return parts.isEmpty ? '' : ' · ${parts.join(' · ')}';
  }

  factory ProductVariantModel.fromJson(Map<String, dynamic> j) =>
      ProductVariantModel(
        id:            j['id']?.toString() ?? j['_id']?.toString() ?? '',
        sku:           j['sku']?.toString() ?? '',
        barcode:       j['barcode']?.toString(),
        size:          j['size']?.toString(),
        color:         j['color']?.toString(),
        costPrice:     ProductModel._d(j['cost_price']),
        salePrice:     ProductModel._d(j['sale_price']),
        stockQuantity: ProductModel._i(j['stock_quantity']),
        isActive:      j['is_active'] != false,
      );
}
