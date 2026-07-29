class CartItemModel {
  final String productId;
  final String name;
  final double price;
  final double costPrice;
  final int quantity;
  final double discount;
  final String? barcode;
  final String unit;

  const CartItemModel({
    required this.productId,
    required this.name,
    required this.price,
    required this.costPrice,
    required this.quantity,
    this.discount = 0.0,
    this.barcode,
    this.unit = 'pcs',
  });

  /// Revenue after per-line discount: price × qty − discount
  double get lineTotal => (price * quantity) - discount;

  /// Gross profit for this line: (price − costPrice) × qty − discount
  double get profit => ((price - costPrice) * quantity) - discount;

  CartItemModel copyWith({
    String? productId,
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
          productId == other.productId &&
          quantity == other.quantity &&
          discount == other.discount;

  @override
  int get hashCode => productId.hashCode ^ quantity.hashCode ^ discount.hashCode;
}
