import 'dart:typed_data';

import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../constants/app_constants.dart';
import '../constants/storage_keys.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Data models
// ─────────────────────────────────────────────────────────────────────────────

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

  final String         companyName;
  final String         companyAddress;
  final String         companyPhone;
  final String         invoiceNo;
  final String         cashierName;
  final String         paymentMethod;
  final DateTime       date;
  final List<ReceiptItem> items;
  final double         subtotal;
  final double         discount;
  final double         tax;
  final double         total;
  final String?        customerName;
  final String?        footerMessage;
}

// ─────────────────────────────────────────────────────────────────────────────
// PrinterService
// ─────────────────────────────────────────────────────────────────────────────

class PrinterService {
  PrinterService._();

  static BluetoothConnection? _connection;

  // ── Discovery ─────────────────────────────────────────────────────────────

  /// Returns devices already paired (bonded) with this phone.
  static Future<List<BluetoothDevice>> getPairedDevices() async {
    final devices = await FlutterBluetoothSerial.instance.getBondedDevices();
    return devices;
  }

  // ── Connection ────────────────────────────────────────────────────────────

  /// Connects to the printer at [address] (MAC, e.g. "00:11:22:AA:BB:CC").
  /// Returns `true` on success.
  static Future<bool> connect(String address) async {
    await disconnect();
    try {
      _connection = await BluetoothConnection.toAddress(address);
      // Persist as the default printer address.
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(kKeyDefaultPrinter, address);
      return true;
    } catch (_) {
      _connection = null;
      return false;
    }
  }

  static Future<void> disconnect() async {
    try {
      await _connection?.finish();
    } catch (_) {}
    _connection = null;
  }

  /// Returns the last-saved default printer address, or `null`.
  static Future<String?> getDefaultPrinterAddress() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(kKeyDefaultPrinter);
  }

  // ── Print ─────────────────────────────────────────────────────────────────

  /// Prints a full sale receipt. Connects automatically if [address] is given.
  static Future<void> printReceipt(
    ReceiptData data, {
    String? address,
    PaperSize paperSize = PaperSize.mm58,
  }) async {
    final conn = await _ensureConnected(address);
    final bytes = await _buildReceipt(data, paperSize);
    await _send(conn, bytes);
  }

  /// Prints a short test page to verify the connection.
  static Future<void> printTest({
    String? address,
    PaperSize paperSize = PaperSize.mm58,
  }) async {
    final conn  = await _ensureConnected(address);
    final profile = await CapabilityProfile.load();
    final gen   = Generator(paperSize, profile);
    List<int> bytes = [];
    bytes += gen.reset();
    bytes += gen.text('--- TEST PRINT ---',
        styles: const PosStyles(align: PosAlign.center, bold: true));
    bytes += gen.text('Printer OK',
        styles: const PosStyles(align: PosAlign.center));
    bytes += gen.feed(3);
    bytes += gen.cut();
    await _send(conn, bytes);
  }

  // ── Receipt builder ───────────────────────────────────────────────────────

  static Future<List<int>> _buildReceipt(
    ReceiptData d,
    PaperSize paperSize,
  ) async {
    final profile = await CapabilityProfile.load();
    final gen     = Generator(paperSize, profile);
    final width   = paperSize == PaperSize.mm80
        ? kPrinterWidth80mm
        : kPrinterWidth58mm;

    List<int> bytes = [];
    bytes += gen.reset();

    // ── Header ───────────────────────────────────────────────────────────────
    bytes += gen.text(
      d.companyName,
      styles: const PosStyles(
        align:    PosAlign.center,
        bold:     true,
        height:   PosTextSize.size2,
        width:    PosTextSize.size2,
      ),
    );
    if (d.companyAddress.isNotEmpty) {
      bytes += gen.text(d.companyAddress,
          styles: const PosStyles(align: PosAlign.center));
    }
    if (d.companyPhone.isNotEmpty) {
      bytes += gen.text('Tel: ${d.companyPhone}',
          styles: const PosStyles(align: PosAlign.center));
    }
    bytes += gen.hr(ch: '=');

    // ── Meta ─────────────────────────────────────────────────────────────────
    bytes += gen.row([
      PosColumn(
        text:  'Invoice:',
        width: 5,
        styles: const PosStyles(bold: true),
      ),
      PosColumn(
        text:  d.invoiceNo,
        width: 7,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += gen.row([
      PosColumn(text: 'Date:', width: 5, styles: const PosStyles(bold: true)),
      PosColumn(
        text:  _fmtDate(d.date),
        width: 7,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    bytes += gen.row([
      PosColumn(
        text:  'Cashier:',
        width: 5,
        styles: const PosStyles(bold: true),
      ),
      PosColumn(
        text:  d.cashierName,
        width: 7,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    if (d.customerName != null && d.customerName!.isNotEmpty) {
      bytes += gen.row([
        PosColumn(
          text:  'Customer:',
          width: 5,
          styles: const PosStyles(bold: true),
        ),
        PosColumn(
          text:  d.customerName!,
          width: 7,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    bytes += gen.hr();

    // ── Column headers ────────────────────────────────────────────────────────
    bytes += gen.row([
      PosColumn(
        text:  'Item',
        width: 6,
        styles: const PosStyles(bold: true),
      ),
      PosColumn(
        text:  'Qty',
        width: 2,
        styles: const PosStyles(bold: true, align: PosAlign.center),
      ),
      PosColumn(
        text:  'Price',
        width: 4,
        styles: const PosStyles(bold: true, align: PosAlign.right),
      ),
    ]);
    bytes += gen.hr(ch: '-');

    // ── Items ─────────────────────────────────────────────────────────────────
    for (final item in d.items) {
      // First line: name (truncated) + qty + unit price
      final nameMax = width - 10; // leave room for qty + price columns
      final name = item.name.length > nameMax
          ? '${item.name.substring(0, nameMax - 1)}.'
          : item.name;
      bytes += gen.row([
        PosColumn(text: name,               width: 6),
        PosColumn(
          text:  '${item.qty}',
          width: 2,
          styles: const PosStyles(align: PosAlign.center),
        ),
        PosColumn(
          text:  _fmtAmount(item.price),
          width: 4,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
      // If there's a line discount, print a discount line
      if (item.discount > 0) {
        bytes += gen.row([
          PosColumn(text: '  Disc:', width: 8),
          PosColumn(
            text:  '-${_fmtAmount(item.discount)}',
            width: 4,
            styles: const PosStyles(align: PosAlign.right),
          ),
        ]);
      }
    }
    bytes += gen.hr(ch: '=');

    // ── Totals ────────────────────────────────────────────────────────────────
    bytes += gen.row([
      PosColumn(text: 'Subtotal', width: 8),
      PosColumn(
        text:  _fmtAmount(d.subtotal),
        width: 4,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);
    if (d.discount > 0) {
      bytes += gen.row([
        PosColumn(text: 'Discount', width: 8),
        PosColumn(
          text:  '-${_fmtAmount(d.discount)}',
          width: 4,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    if (d.tax > 0) {
      bytes += gen.row([
        PosColumn(text: 'Tax', width: 8),
        PosColumn(
          text:  _fmtAmount(d.tax),
          width: 4,
          styles: const PosStyles(align: PosAlign.right),
        ),
      ]);
    }
    bytes += gen.hr(ch: '=');
    bytes += gen.row([
      PosColumn(
        text:  'TOTAL',
        width: 8,
        styles: const PosStyles(bold: true, height: PosTextSize.size2),
      ),
      PosColumn(
        text:  _fmtAmount(d.total),
        width: 4,
        styles: const PosStyles(
          bold:   true,
          align:  PosAlign.right,
          height: PosTextSize.size2,
        ),
      ),
    ]);
    bytes += gen.hr(ch: '=');
    bytes += gen.row([
      PosColumn(text: 'Payment:', width: 5, styles: const PosStyles(bold: true)),
      PosColumn(
        text:  d.paymentMethod,
        width: 7,
        styles: const PosStyles(align: PosAlign.right),
      ),
    ]);

    // ── Footer ────────────────────────────────────────────────────────────────
    bytes += gen.feed(1);
    final footer = d.footerMessage?.trim().isNotEmpty == true
        ? d.footerMessage!.trim()
        : 'Thank you for your purchase!';
    bytes += gen.text(footer,
        styles: const PosStyles(align: PosAlign.center));
    bytes += gen.feed(3);
    bytes += gen.cut();

    return bytes;
  }

  // ── I/O helpers ───────────────────────────────────────────────────────────

  static Future<BluetoothConnection> _ensureConnected(String? address) async {
    if (_connection != null && _connection!.isConnected) {
      return _connection!;
    }
    final addr = address ?? await getDefaultPrinterAddress();
    if (addr == null || addr.isEmpty) {
      throw StateError('No printer address provided and no default saved.');
    }
    final ok = await connect(addr);
    if (!ok || _connection == null) {
      throw StateError('Could not connect to printer at $addr');
    }
    return _connection!;
  }

  static Future<void> _send(
    BluetoothConnection conn,
    List<int> bytes,
  ) async {
    conn.output.add(Uint8List.fromList(bytes));
    await conn.output.allSent;
  }

  // ── Formatting helpers ────────────────────────────────────────────────────

  static String _fmtAmount(double amount) =>
      amount.toStringAsFixed(2);

  static String _fmtDate(DateTime dt) {
    final d = dt.toLocal();
    return '${d.day.toString().padLeft(2, '0')}/'
        '${d.month.toString().padLeft(2, '0')}/'
        '${d.year} '
        '${d.hour.toString().padLeft(2, '0')}:'
        '${d.minute.toString().padLeft(2, '0')}';
  }
}
