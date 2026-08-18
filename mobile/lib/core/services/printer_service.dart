import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BluetoothPrinter {
  const BluetoothPrinter({required this.name, required this.address});
  final String name;
  final String address;
}

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

  static const _prefKey = 'default_printer_address';

  // ── Device discovery ────────────────────────────────────────────────────────

  static Future<List<BluetoothPrinter>> getPairedDevices() async {
    try {
      final list = await PrintBluetoothThermal.pairedBluetooths;
      return list
          .map((b) => BluetoothPrinter(
                name: b.name,
                address: b.macAdress, // package has intentional typo
              ))
          .toList();
    } catch (_) {
      return [];
    }
  }

  // ── Connection ──────────────────────────────────────────────────────────────

  static Future<bool> connect(String address) async {
    try {
      return await PrintBluetoothThermal.connect(
          macPrinterAddress: address);
    } catch (_) {
      return false;
    }
  }

  static Future<void> disconnect() async {
    try {
      await PrintBluetoothThermal.disconnect;
    } catch (_) {}
  }

  // ── Persisted default ───────────────────────────────────────────────────────

  static Future<String?> getDefaultPrinterAddress() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_prefKey);
  }

  static Future<void> setDefaultPrinterAddress(String address) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_prefKey, address);
  }

  // ── Printing ────────────────────────────────────────────────────────────────

  static Future<void> printReceipt(ReceiptData data,
      {String? address}) async {
    if (address != null) {
      final ok = await connect(address);
      if (!ok) throw Exception('Could not connect to printer at $address');
    }
    final connected = await PrintBluetoothThermal.connectionStatus;
    if (!connected) throw Exception('No printer connected');

    final bytes = _buildEscPosReceipt(data);
    await PrintBluetoothThermal.writeBytes(bytes);
  }

  static Future<void> printTest({String? address}) async {
    if (address != null) {
      final ok = await connect(address);
      if (!ok) throw Exception('Could not connect to printer');
    }
    final connected = await PrintBluetoothThermal.connectionStatus;
    if (!connected) throw Exception('No printer connected');

    final bytes = <int>[];
    bytes.addAll([27, 64]); // ESC @ – initialize
    bytes.addAll([27, 97, 1]); // center
    bytes.addAll([27, 69, 1]); // bold on
    bytes.addAll('TEST PRINT\n'.codeUnits);
    bytes.addAll([27, 69, 0]); // bold off
    bytes.addAll('Printer is working correctly!\n'.codeUnits);
    bytes.addAll([10, 10, 10, 10]);
    bytes.addAll([29, 86, 66, 0]); // GS V – partial cut
    await PrintBluetoothThermal.writeBytes(bytes);
  }

  // ── ESC/POS receipt builder ─────────────────────────────────────────────────

  static List<int> _buildEscPosReceipt(ReceiptData data) {
    const int width = 32; // chars for 58mm paper; use 48 for 80mm
    final bytes = <int>[];

    void add(String text) => bytes.addAll(text.codeUnits);
    void init()    => bytes.addAll([27, 64]);
    void center()  => bytes.addAll([27, 97, 1]);
    void left()    => bytes.addAll([27, 97, 0]);
    void boldOn()  => bytes.addAll([27, 69, 1]);
    void boldOff() => bytes.addAll([27, 69, 0]);
    void divider() => add('${'=' * width}\n');
    void thin()    => add('${'─' * width}\n');

    String twoCol(String label, String value) {
      final gap = width - label.length - value.length;
      if (gap <= 0) return '$label $value\n';
      return '$label${' ' * gap}$value\n';
    }

    init();

    // Header
    center(); boldOn();
    add('${data.companyName}\n');
    boldOff();
    if (data.companyAddress.isNotEmpty) add('${data.companyAddress}\n');
    if (data.companyPhone.isNotEmpty) add('${data.companyPhone}\n');
    divider();

    // Invoice meta
    left();
    final d = data.date;
    final dateStr =
        '${d.day.toString().padLeft(2, '0')}/${d.month.toString().padLeft(2, '0')}/${d.year}';
    add('Invoice: ${data.invoiceNo}\n');
    add('Date   : $dateStr\n');
    add('Cashier: ${data.cashierName}\n');
    if (data.customerName != null && data.customerName!.isNotEmpty) {
      add('Customer: ${data.customerName}\n');
    }
    add('Payment: ${data.paymentMethod.toUpperCase()}\n');
    divider();

    // Items
    for (final item in data.items) {
      final nameLine = item.name.length > width
          ? '${item.name.substring(0, width - 1)}…'
          : item.name;
      add('$nameLine\n');
      final qtyPrice =
          '  ${item.qty} x ${item.price.toStringAsFixed(2)}';
      final total = item.lineTotal.toStringAsFixed(2);
      final gap = width - qtyPrice.length - total.length;
      if (gap > 0) {
        add('$qtyPrice${' ' * gap}$total\n');
      } else {
        add('$qtyPrice  $total\n');
      }
    }
    divider();

    // Totals
    add(twoCol('Subtotal', data.subtotal.toStringAsFixed(2)));
    if (data.discount > 0) {
      add(twoCol('Discount', '-${data.discount.toStringAsFixed(2)}'));
    }
    if (data.tax > 0) {
      add(twoCol('Tax', data.tax.toStringAsFixed(2)));
    }
    thin();
    boldOn();
    add(twoCol('TOTAL', data.total.toStringAsFixed(2)));
    boldOff();

    // Footer
    center();
    divider();
    add('${data.footerMessage ?? 'Thank you for your purchase!'}\n');

    // Feed & cut
    bytes.addAll([10, 10, 10, 10]);
    bytes.addAll([29, 86, 66, 0]); // partial cut
    return bytes;
  }
}
