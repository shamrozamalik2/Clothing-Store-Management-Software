import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

import '../../../sales/data/models/sale_model.dart';
import '../../utils/esc_pos_builder.dart';

// ── State ─────────────────────────────────────────────────────────────────────

class PrinterState {
  const PrinterState({
    this.connectedDevice,
    this.pairedDevices   = const [],
    this.isScanning      = false,
    this.isPrinting      = false,
    this.lastStatus,
    this.error,
  });

  final BluetoothInfo?       connectedDevice;
  final List<BluetoothInfo>  pairedDevices;
  final bool                 isScanning;
  final bool                 isPrinting;
  final String?              lastStatus;
  final String?              error;

  bool get isConnected => connectedDevice != null;

  PrinterState copyWith({
    Object? connectedDevice = _none,
    List<BluetoothInfo>? pairedDevices,
    bool?   isScanning,
    bool?   isPrinting,
    Object? lastStatus = _none,
    Object? error      = _none,
  }) => PrinterState(
    connectedDevice: connectedDevice == _none
        ? this.connectedDevice
        : connectedDevice as BluetoothInfo?,
    pairedDevices:   pairedDevices ?? this.pairedDevices,
    isScanning:      isScanning  ?? this.isScanning,
    isPrinting:      isPrinting  ?? this.isPrinting,
    lastStatus: lastStatus == _none ? this.lastStatus : lastStatus as String?,
    error:      error      == _none ? this.error      : error      as String?,
  );

  static const _none = Object();
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class PrinterNotifier extends StateNotifier<PrinterState> {
  PrinterNotifier() : super(const PrinterState()) {
    _checkConnection();
  }

  Future<void> _checkConnection() async {
    final connected = await PrintBluetoothThermal.connectionStatus;
    if (!connected) state = state.copyWith(connectedDevice: null);
  }

  Future<void> scanDevices() async {
    state = state.copyWith(isScanning: true, error: null);
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
    state = state.copyWith(error: null);
    try {
      final ok = await PrintBluetoothThermal.connect(
        macPrinterAddress: device.macAdress,
      );
      if (ok) {
        state = state.copyWith(
          connectedDevice: device,
          lastStatus: 'Connected to ${device.name}',
        );
      } else {
        state = state.copyWith(error: 'Could not connect to ${device.name}');
      }
      return ok;
    } catch (e) {
      state = state.copyWith(error: 'Connection error: $e');
      return false;
    }
  }

  Future<void> disconnect() async {
    await PrintBluetoothThermal.disconnect;
    state = state.copyWith(
      connectedDevice: null,
      lastStatus: 'Disconnected',
    );
  }

  Future<bool> printTest(String shopName) async {
    if (!state.isConnected) return false;
    state = state.copyWith(isPrinting: true, error: null);

    final now = DateFormat('dd/MM/yyyy HH:mm').format(DateTime.now());
    final bytes = EscPosBuilder()
        .init()
        .center().bold(true).size(0x11).ln(shopName).size(0x00).bold(false)
        .ln('')
        .ln('*** TEST PRINT ***')
        .ln('')
        .divider()
        .left().ln('Printer OK')
        .ln('Date: $now')
        .divider()
        .center().ln('SAS Garments')
        .feed(4)
        .cut()
        .build();

    final ok = await PrintBluetoothThermal.writeBytes(bytes);
    state = state.copyWith(
      isPrinting:  false,
      lastStatus:  ok ? 'Test page printed' : 'Print failed',
    );
    return ok;
  }

  Future<bool> printSaleReceipt(SaleDetailModel sale, String shopName) async {
    if (!state.isConnected) return false;
    state = state.copyWith(isPrinting: true, error: null);

    final fmt  = NumberFormat('#,##0.00', 'en_US');
    final date = DateFormat('dd/MM/yyyy HH:mm').format(
      DateTime.tryParse(sale.createdAt) ?? DateTime.now(),
    );

    final b = EscPosBuilder()
        .init()
        .center().bold(true).size(0x11).ln(shopName).size(0x00).bold(false)
        .ln('Receipt')
        .ln('')
        .divider()
        .left()
        .ln('Invoice : ${sale.invoiceNo}')
        .ln('Date    : $date')
        .ln('Payment : ${sale.paymentMethod.toUpperCase()}');

    if (sale.customerName != null && sale.customerName!.isNotEmpty) {
      b.ln('Customer: ${sale.customerName}');
    }

    b.divider();

    for (final item in sale.items) {
      b.ln(item.productName);
      b.row(
        '  ${item.quantity} x PKR ${fmt.format(item.unitPrice)}',
        'PKR ${fmt.format(item.total)}',
      );
    }

    b.divider();

    if (sale.discountAmount > 0) {
      b.row('Subtotal', 'PKR ${fmt.format(sale.subtotal)}');
      b.row('Discount', '-PKR ${fmt.format(sale.discountAmount)}');
    }
    if (sale.taxAmount > 0) {
      b.row('Tax', 'PKR ${fmt.format(sale.taxAmount)}');
    }

    b.bold(true)
     .row('TOTAL', 'PKR ${fmt.format(sale.totalAmount)}')
     .bold(false)
     .divider()
     .center()
     .ln('Thank you for shopping!')
     .ln('SAS Garments')
     .feed(4)
     .cut();

    final ok = await PrintBluetoothThermal.writeBytes(b.build());
    state = state.copyWith(
      isPrinting: false,
      lastStatus: ok ? 'Receipt printed: ${sale.invoiceNo}' : 'Print failed',
    );
    return ok;
  }
}

// ── Providers ─────────────────────────────────────────────────────────────────

final printerProvider =
    StateNotifierProvider<PrinterNotifier, PrinterState>(
      (_) => PrinterNotifier(),
    );
