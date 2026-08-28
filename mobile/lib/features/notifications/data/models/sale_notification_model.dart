import 'dart:convert';

class SaleNotification {
  const SaleNotification({
    required this.id,
    required this.invoiceNo,
    required this.total,
    required this.itemCount,
    required this.customerName,
    required this.cashierName,
    required this.paymentMethod,
    required this.receivedAt,
    this.isRead = false,
    this.saleId,
  });

  final String   id;
  final String   invoiceNo;
  final double   total;
  final int      itemCount;
  final String   customerName;
  final String   cashierName;
  final String   paymentMethod;
  final DateTime receivedAt;
  final bool     isRead;
  final int?     saleId;

  SaleNotification copyWith({bool? isRead}) => SaleNotification(
    id:            id,
    invoiceNo:     invoiceNo,
    total:         total,
    itemCount:     itemCount,
    customerName:  customerName,
    cashierName:   cashierName,
    paymentMethod: paymentMethod,
    receivedAt:    receivedAt,
    isRead:        isRead ?? this.isRead,
    saleId:        saleId,
  );

  Map<String, dynamic> toJson() => {
    'id':             id,
    'invoiceNo':      invoiceNo,
    'total':          total,
    'itemCount':      itemCount,
    'customerName':   customerName,
    'cashierName':    cashierName,
    'paymentMethod':  paymentMethod,
    'receivedAt':     receivedAt.toIso8601String(),
    'isRead':         isRead,
    'saleId':         saleId,
  };

  factory SaleNotification.fromJson(Map<String, dynamic> j) => SaleNotification(
    id:            j['id']?.toString()           ?? '',
    invoiceNo:     j['invoiceNo']?.toString()    ?? '',
    total:         (j['total'] as num?)?.toDouble() ?? 0,
    itemCount:     (j['itemCount'] as num?)?.toInt() ?? 0,
    customerName:  j['customerName']?.toString() ?? 'Walk-in',
    cashierName:   j['cashierName']?.toString()  ?? '',
    paymentMethod: j['paymentMethod']?.toString() ?? 'cash',
    receivedAt:    DateTime.tryParse(j['receivedAt']?.toString() ?? '') ?? DateTime.now(),
    isRead:        j['isRead'] == true,
    saleId:        (j['saleId'] as num?)?.toInt(),
  );

  String toJsonString() => jsonEncode(toJson());

  factory SaleNotification.fromJsonString(String s) =>
      SaleNotification.fromJson(jsonDecode(s) as Map<String, dynamic>);

  // Build from an FCM data payload (all values are strings)
  factory SaleNotification.fromFcmData(Map<String, dynamic> data) => SaleNotification(
    id:            data['reference']?.toString()    ?? DateTime.now().millisecondsSinceEpoch.toString(),
    invoiceNo:     data['reference']?.toString()    ?? '',
    total:         double.tryParse(data['total']?.toString() ?? '0') ?? 0,
    itemCount:     int.tryParse(data['item_count']?.toString() ?? '0') ?? 0,
    customerName:  data['customer_name']?.toString()  ?? 'Walk-in',
    cashierName:   data['cashier_name']?.toString()   ?? '',
    paymentMethod: data['payment_method']?.toString() ?? 'cash',
    receivedAt:    DateTime.now(),
    isRead:        false,
    saleId:        int.tryParse(data['sale_id']?.toString() ?? ''),
  );
}
