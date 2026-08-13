// Bluetooth printing is not yet supported on this build.
// Re-enable by adding flutter_bluetooth_serial + esc_pos_utils_plus to pubspec.yaml
// once a jcenter()-free fork is available.

class ReceiptItem {
  const ReceiptItem({
    required this.name,
    required this.qty,
    required this.price,
    this.discount = 0,
  });

  final String name;
  final int    qty;
  final double price;
  final double discount;

  double get lineTotal => (price * qty) - discount;
}

class ReceiptData {
  const ReceiptData({
    required this.companyName,
    required this.companyAddress,
    required this.companyPhone,
    required this.invoiceNo,
    required this.cashierName,
    required this.paymentMethod,
    required this.date,
    required this.items,
    required this.subtotal,
    required this.discount,
    required this.tax,
    required this.total,
    this.customerName,
    this.footerMessage,
  });

  final String            companyName;
  final String            companyAddress;
  final String            companyPhone;
  final String            invoiceNo;
  final String            cashierName;
  final String            paymentMethod;
  final DateTime          date;
  final List<ReceiptItem> items;
  final double            subtotal;
  final double            discount;
  final double            tax;
  final double            total;
  final String?           customerName;
  final String?           footerMessage;
}

class PrinterService {
  PrinterService._();

  static Future<List<String>> getPairedDevices() async => [];

  static Future<bool> connect(String address) async => false;

  static Future<void> disconnect() async {}

  static Future<String?> getDefaultPrinterAddress() async => null;

  static Future<void> printReceipt(ReceiptData data, {String? address}) async {
    throw UnsupportedError('Bluetooth printing not available in this build.');
  }

  static Future<void> printTest({String? address}) async {
    throw UnsupportedError('Bluetooth printing not available in this build.');
  }
}
