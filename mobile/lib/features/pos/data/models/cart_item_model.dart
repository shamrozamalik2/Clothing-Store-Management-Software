class CartItemModel {
  final String productId;
  // Set when this line is a specific color/size variant, not the base product.
  final String? variantId;
  final String name;
  final double price;
  final double costPrice;
  final int quantity;
  final double discount;
  final String? barcode;
  final String unit;

  const CartItemModel({
    required this.productId,
    this.variantId,
    required this.name,
    required this.price,
    required this.costPrice,
    required this.quantity,
    this.discount = 0.0,
    this.barcode,
    this.unit = 'pcs',
  });

  /// Identifies one cart line. Two variants of the same product must never
  /// collapse into a single line just because they share a productId.
  String get key => variantId == null ? '$productId-base' : '$productId-$variantId';

  /// Revenue after per-line discount: price × qty − discount
  double get lineTotal => (price * quantity) - discount;

  /// Gross profit for this line: (price − costPrice) × qty − discount
  double get profit => ((price - costPrice) * quantity) - discount;

  CartItemModel copyWith({
    String? productId,
    Object? variantId = _kSentinel,
    String? name,
    double? price,
    double? costPrice,
    int? quantity,
    double? discount,
    String? barcode,
    String? unit,
  }) =>
      CartItemModel(
        productId: productId ?? this.productId,
        variantId: identical(variantId, _kSentinel) ? this.variantId : variantId as String?,
        name: name ?? this.name,
        price: price ?? this.price,
        costPrice: costPrice ?? this.costPrice,
        quantity: quantity ?? this.quantity,
        discount: discount ?? this.discount,
        barcode: barcode ?? this.barcode,
        unit: unit ?? this.unit,
      );

  Map<String, dynamic> toJson() => {
        'productId': productId,
        'variantId': variantId,
        'name': name,
        'price': price,
        'costPrice': costPrice,
        'quantity': quantity,
        'discount': discount,
        'barcode': barcode,
        'unit': unit,
      };

  factory CartItemModel.fromJson(Map<String, dynamic> json) => CartItemModel(
        productId: json['productId'] as String,
        variantId: json['variantId'] as String?,
        name: json['name'] as String,
        price: (json['price'] as num).toDouble(),
        costPrice: (json['costPrice'] as num).toDouble(),
        quantity: json['quantity'] as int,
        discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
        barcode: json['barcode'] as String?,
        unit: json['unit'] as String? ?? 'pcs',
      );

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is CartItemModel &&
          key == other.key &&
          quantity == other.quantity &&
          discount == other.discount;

  @override
  int get hashCode => key.hashCode ^ quantity.hashCode ^ discount.hashCode;
}

const Object _kSentinel = Object();
