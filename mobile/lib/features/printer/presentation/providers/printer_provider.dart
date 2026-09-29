import 'dart:io' show Platform;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../pos/presentation/providers/cart_provider.dart';
import '../../../sales/data/models/sale_model.dart';
import '../../utils/esc_pos_builder.dart';

// ── Local persistence keys ──────────────────────────────────────────────────

const _kPrefAddress    = 'printer_saved_address';
const _kPrefName       = 'printer_saved_name';
const _kPrefPaperWidth = 'printer_paper_width_mm';

// ── State ─────────────────────────────────────────────────────────────────────

class PrinterState {
  const PrinterState({
    this.connectedDevice,
    this.pairedDevices   = const [],
    this.isScanning      = false,
    this.isPrinting      = false,
    this.isConnecting    = false,
    this.paperWidthMm    = 80,
    this.savedAddress,
    this.savedName,
    this.lastStatus,
    this.error,
  });

  final BluetoothInfo?       connectedDevice;
  final List<BluetoothInfo>  pairedDevices;
  final bool                 isScanning;
  final bool                 isPrinting;
  final bool                 isConnecting;
  final int                  paperWidthMm; // 58 | 80
  final String?              savedAddress;
  final String?              savedName;
  final String?              lastStatus;
  final String?              error;

  bool get isConnected     => connectedDevice != null;
  bool get hasSavedPrinter => savedAddress != null;

  /// True only on iOS — the plugin uses CoreBluetooth (BLE) there, so
  /// Bluetooth Classic/SPP printers that work on Android will not appear.
  bool get isIOSBleOnly => Platform.isIOS;

  PrinterState copyWith({
    Object? connectedDevice = _none,
    List<BluetoothInfo>? pairedDevices,
    bool?   isScanning,
    bool?   isPrinting,
    bool?   isConnecting,
    int?    paperWidthMm,
    Object? savedAddress = _none,
    Object? savedName    = _none,
    Object? lastStatus   = _none,
    Object? error        = _none,
  }) => PrinterState(
    connectedDevice: connectedDevice == _none
        ? this.connectedDevice
        : connectedDevice as BluetoothInfo?,
    pairedDevices: pairedDevices ?? this.pairedDevices,
    isScanning:    isScanning   ?? this.isScanning,
    isPrinting:    isPrinting   ?? this.isPrinting,
    isConnecting:  isConnecting ?? this.isConnecting,
    paperWidthMm:  paperWidthMm ?? this.paperWidthMm,
    savedAddress: savedAddress == _none ? this.savedAddress : savedAddress as String?,
    savedName:    savedName    == _none ? this.savedName    : savedName    as String?,
    lastStatus: lastStatus == _none ? this.lastStatus : lastStatus as String?,
    error:      error      == _none ? this.error      : error      as String?,
  );

  static const _none = Object();
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class PrinterNotifier extends StateNotifier<PrinterState> {
  PrinterNotifier() : super(const PrinterState()) {
    _init();
  }

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final width = prefs.getInt(_kPrefPaperWidth) ?? 80;
    final address = prefs.getString(_kPrefAddress);
    final name    = prefs.getString(_kPrefName);

    state = state.copyWith(
      paperWidthMm: width == 58 ? 58 : 80,
      savedAddress: address,
      savedName:    name,
    );

    if (address != null) {
      // Best-effort silent reconnect to the last-used printer. Never shown
      // as "Connected" until this genuinely succeeds.
      await _silentReconnect(address, name);
    } else {
      final connected = await PrintBluetoothThermal.connectionStatus;
      if (!connected) state = state.copyWith(connectedDevice: null);
    }
  }

  Future<void> _silentReconnect(String address, String? name) async {
    try {
      final alreadyConnected = await PrintBluetoothThermal.connectionStatus;
      if (alreadyConnected) {
        state = state.copyWith(
          connectedDevice: BluetoothInfo(name: name ?? 'Printer', macAdress: address),
        );
        return;
      }
      final ok = await PrintBluetoothThermal.connect(macPrinterAddress: address);
      if (ok) {
        state = state.copyWith(
          connectedDevice: BluetoothInfo(name: name ?? 'Printer', macAdress: address),
        );
      }
    } catch (_) {
      // Silent — startup reconnect is best-effort, not a user action.
    }
  }

  // ── Permissions ──────────────────────────────────────────────────────────

  /// Requests only what's needed to scan/connect on this Android version.
  /// On Android 12+ (API 31+) BLUETOOTH_SCAN/BLUETOOTH_CONNECT are runtime
  /// permissions; on older Android these auto-resolve as granted (the app
  /// only lists already-paired devices, so location isn't requested — it's
  /// only required for live discovery of new devices, which this flow
  /// doesn't do). iOS handles its own CoreBluetooth authorization prompt.
  Future<bool> _ensureBluetoothPermission() async {
    if (!Platform.isAndroid) return true;
    final statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
    ].request();
    return statuses.values.every((s) => s.isGranted);
  }

  // ── Discovery / connection ──────────────────────────────────────────────

  Future<void> scanDevices() async {
    state = state.copyWith(isScanning: true, error: null);

    final granted = await _ensureBluetoothPermission();
    if (!granted) {
      state = state.copyWith(
        isScanning: false,
        error: 'Bluetooth permission is required to find and connect to printers.',
      );
      return;
    }

    if (Platform.isAndroid) {
      final enabled = await PrintBluetoothThermal.bluetoothEnabled;
      if (!enabled) {
        state = state.copyWith(
          isScanning: false,
          error: 'Bluetooth is turned off. Please enable Bluetooth and try again.',
        );
        return;
      }
    }

    try {
      final devices = await PrintBluetoothThermal.pairedBluetooths;
      state = state.copyWith(pairedDevices: devices, isScanning: false);
    } catch (e) {
      state = state.copyWith(
        isScanning: false,
        error: 'Could not list devices: $e',
      );
    }
  }

  Future<bool> connect(BluetoothInfo device) async {
    state = state.copyWith(error: null, isConnecting: true);

    final granted = await _ensureBluetoothPermission();
    if (!granted) {
      state = state.copyWith(
        isConnecting: false,
        error: 'Bluetooth permission is required to find and connect to printers.',
      );
      return false;
    }

    try {
      final ok = await PrintBluetoothThermal.connect(
        macPrinterAddress: device.macAdress,
      );
      if (ok) {
        state = state.copyWith(
          connectedDevice: device,
          isConnecting: false,
          lastStatus: 'Connected to ${device.name}',
        );
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_kPrefAddress, device.macAdress);
        await prefs.setString(_kPrefName, device.name);
        state = state.copyWith(savedAddress: device.macAdress, savedName: device.name);
      } else {
        state = state.copyWith(
          isConnecting: false,
          error: 'Printer is unavailable. Please check printer power, connection and try again.',
        );
      }
      return ok;
    } catch (e) {
      state = state.copyWith(isConnecting: false, error: 'Connection error: $e');
      return false;
    }
  }

  /// Reconnects to the persisted saved printer (user-initiated — shows real
  /// errors, unlike the silent best-effort attempt on startup).
  Future<bool> reconnectSaved() async {
    final address = state.savedAddress;
    if (address == null) return false;
    return connect(BluetoothInfo(name: state.savedName ?? 'Printer', macAdress: address));
  }

  Future<void> disconnect() async {
    await PrintBluetoothThermal.disconnect;
    state = state.copyWith(
      connectedDevice: null,
      lastStatus: 'Disconnected',
    );
  }

  /// Forgets the saved printer entirely (not just the live connection).
  Future<void> forgetSavedPrinter() async {
    await disconnect();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kPrefAddress);
    await prefs.remove(_kPrefName);
    state = state.copyWith(savedAddress: null, savedName: null);
  }

  // ── Paper width ──────────────────────────────────────────────────────────

  Future<void> setPaperWidth(int mm) async {
    final width = mm == 58 ? 58 : 80;
    state = state.copyWith(paperWidthMm: width);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_kPrefPaperWidth, width);
  }

  int get _charWidth => state.paperWidthMm == 58 ? 32 : 48;

  // ── Printing ─────────────────────────────────────────────────────────────

  Future<bool> _ensureReadyToPrint() async {
    if (state.isPrinting) return false; // duplicate-print guard
    if (!state.isConnected) {
      state = state.copyWith(error: 'Please select a printer first.');
      return false;
    }
    return true;
  }

  Future<bool> printTest(String shopName) async {
    if (!await _ensureReadyToPrint()) return false;
    state = state.copyWith(isPrinting: true, error: null);

    final now = DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now());
    final b = EscPosBuilder(width: _charWidth)
        ..init()
        ..center().bold(true).size(0x11).ln(shopName).size(0x00).bold(false)
        ..ln('')
        ..ln('*** TEST PRINT ***')
        ..ln('Paper: ${state.paperWidthMm}mm')
        ..ln('')
        ..divider()
        ..left().ln('Printer OK')
        ..ln('Date: $now')
        ..divider()
        ..center().ln('If you can read this,')
        ..ln('your printer is configured.')
        ..feed(4)
        ..cut();

    final ok = await _writeAndReport(b.build(), successLabel: 'Test page printed');
    return ok;
  }

  Future<bool> printSaleReceipt(SaleDetailModel sale, String shopName) async {
    if (!await _ensureReadyToPrint()) return false;
    state = state.copyWith(isPrinting: true, error: null);

    final fmt  = NumberFormat('#,##0.00', 'en_US');
    final date = DateFormat('dd/MM/yyyy HH:mm').format(
      DateTime.tryParse(sale.createdAt) ?? DateTime.now(),
    );

    final width = _charWidth;
    final b = EscPosBuilder(width: width)
        ..init()
        ..center().bold(true).size(0x11).ln(shopName).size(0x00).bold(false)
        ..ln('Receipt')
        ..ln('')
        ..divider()
        ..left()
        ..ln('Invoice : ${sale.invoiceNo}')
        ..ln('Date    : $date')
        ..ln('Payment : ${sale.paymentMethod.toUpperCase()}');

    if (sale.customerName != null && sale.customerName!.isNotEmpty) {
      b.ln('Customer: ${sale.customerName}');
    }

    b.divider();
    for (final item in sale.items) {
      b.ln(item.productName);
      b.row('  ${item.quantity} x PKR ${fmt.format(item.unitPrice)}',
          'PKR ${fmt.format(item.total)}');
    }
    b.divider();

    if (sale.discountAmount > 0) {
      b.row('Subtotal', 'PKR ${fmt.format(sale.subtotal)}');
      b.row('Discount', '-PKR ${fmt.format(sale.discountAmount)}');
    }
    if (sale.taxAmount > 0) b.row('Tax', 'PKR ${fmt.format(sale.taxAmount)}');

    b.bold(true)
     .row('TOTAL', 'PKR ${fmt.format(sale.totalAmount)}')
     .bold(false)
     .divider()
     .center()
     .ln('Thank you for shopping!')
     .ln(shopName)
     .feed(4)
     .cut();

    return _writeAndReport(b.build(), successLabel: 'Receipt printed: ${sale.invoiceNo}');
  }

  /// Prints a receipt straight from the just-completed cart/checkout state —
  /// used right after a sale is created, before any server round-trip, so
  /// printing keeps working with no internet connection.
  Future<bool> printCartReceipt(
    CartState cart,
    String invoiceNumber,
    String shopName,
  ) async {
    if (!await _ensureReadyToPrint()) return false;
    state = state.copyWith(isPrinting: true, error: null);

    final fmt  = NumberFormat('#,##0.00', 'en_US');
    final date = DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now());
    final width = _charWidth;

    final b = EscPosBuilder(width: width)
        ..init()
        ..center().bold(true).size(0x11).ln(shopName).size(0x00).bold(false)
        ..ln('Receipt')
        ..ln('')
        ..divider()
        ..left()
        ..ln('Invoice : $invoiceNumber')
        ..ln('Date    : $date')
        ..ln('Payment : ${cart.paymentMethod.toUpperCase()}');

    if (cart.customerName != null && cart.customerName!.isNotEmpty) {
      b.ln('Customer: ${cart.customerName}');
    }

    b.divider();
    for (final item in cart.items) {
      b.ln(item.name);
      final lineTotal = (item.price * item.quantity) - item.discount;
      b.row('  ${item.quantity} x PKR ${fmt.format(item.price)}',
          'PKR ${fmt.format(lineTotal)}');
    }
    b.divider();

    if (cart.discountAmount > 0) {
      b.row('Subtotal', 'PKR ${fmt.format(cart.subtotal)}');
      b.row('Discount', '-PKR ${fmt.format(cart.discountAmount)}');
    }
    if (cart.taxAmount > 0) b.row('Tax', 'PKR ${fmt.format(cart.taxAmount)}');

    b.bold(true)
     .row('TOTAL', 'PKR ${fmt.format(cart.total)}')
     .bold(false)
     .divider()
     .center()
     .ln('Thank you for shopping!')
     .ln(shopName)
     .feed(4)
     .cut();

    return _writeAndReport(b.build(), successLabel: 'Receipt printed: $invoiceNumber');
  }

  Future<bool> _writeAndReport(List<int> bytes, {required String successLabel}) async {
    try {
      final ok = await PrintBluetoothThermal.writeBytes(bytes);
      state = state.copyWith(
        isPrinting: false,
        lastStatus: ok ? successLabel : null,
        error: ok ? null : 'Receipt could not be printed.',
      );
      return ok;
    } catch (e) {
      state = state.copyWith(isPrinting: false, error: 'Receipt could not be printed.');
      return false;
    }
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final printerProvider =
    StateNotifierProvider<PrinterNotifier, PrinterState>(
      (_) => PrinterNotifier(),
    );
