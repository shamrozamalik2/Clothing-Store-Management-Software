class SaleModel {
  const SaleModel({
    required this.id,
    required this.invoiceNo,
    required this.subtotal,
    required this.discountAmount,
    required this.taxAmount,
    required this.totalAmount,
    required this.paymentMethod,
    required this.status,
    required this.createdAt,
    this.customerId,
    this.customerName,
  });

  final int    id;
  final String invoiceNo;
  final int?   customerId;
  final String? customerName;
  final double subtotal;
  final double discountAmount;
  final double taxAmount;
  final double totalAmount;
  final String paymentMethod;
  final String status;
  final String createdAt;

  factory SaleModel.fromJson(Map<String, dynamic> j) => SaleModel(
    id:             j['id']             as int? ?? 0,
    invoiceNo:      j['invoice_no']?.toString() ?? '#${j['id']}',
    customerId:     j['customer_id']    as int?,
    customerName:   j['customer_name']?.toString(),
    subtotal:       (j['subtotal']         as num?)?.toDouble() ?? 0,
    discountAmount: (j['discount_amount']  as num?)?.toDouble() ?? 0,
    taxAmount:      (j['tax_amount']       as num?)?.toDouble() ?? 0,
    totalAmount:    (j['total_amount']     as num?)?.toDouble() ?? 0,
    paymentMethod:  j['payment_method']?.toString() ?? 'cash',
    status:         j['status']?.toString() ?? 'completed',
    createdAt:      j['created_at']?.toString() ?? '',
  );
}

class SaleItemModel {
  const SaleItemModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
    required this.discount,
    required this.total,
  });

  final int    id;
  final int    productId;
  final String productName;
  final int    quantity;
  final double unitPrice;
  final double discount;
  final double total;

  factory SaleItemModel.fromJson(Map<String, dynamic> j) => SaleItemModel(
    id:          j['id']          as int? ?? 0,
    productId:   j['product_id']  as int? ?? 0,
    productName: j['product_name']?.toString() ?? '',
    quantity:    (j['quantity']   as num?)?.toInt()    ?? 0,
    unitPrice:   (j['unit_price'] as num?)?.toDouble() ?? 0,
    discount:    (j['discount']   as num?)?.toDouble() ?? 0,
    total:       (j['total']      as num?)?.toDouble() ?? 0,
  );
}

class SaleDetailModel extends SaleModel {
  const SaleDetailModel({
    required super.id,
    required super.invoiceNo,
    required super.subtotal,
    required super.discountAmount,
    required super.taxAmount,
    required super.totalAmount,
    required super.paymentMethod,
    required super.status,
    required super.createdAt,
    super.customerId,
    super.customerName,
    required this.items,
  });

  final List<SaleItemModel> items;

  factory SaleDetailModel.fromJson(Map<String, dynamic> j) {
    final base = SaleModel.fromJson(j);
    final rawItems = (j['items'] as List<dynamic>?) ?? [];
    return SaleDetailModel(
      id:             base.id,
      invoiceNo:      base.invoiceNo,
      customerId:     base.customerId,
      customerName:   base.customerName,
      subtotal:       base.subtotal,
      discountAmount: base.discountAmount,
      taxAmount:      base.taxAmount,
      totalAmount:    base.totalAmount,
      paymentMethod:  base.paymentMethod,
      status:         base.status,
      createdAt:      base.createdAt,
      items: rawItems
          .map((e) => SaleItemModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}
