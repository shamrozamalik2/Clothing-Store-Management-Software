import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../auth/presentation/providers/auth_provider.dart';
import '../../../sales/data/models/sale_model.dart';
import '../../../sales/data/sources/sales_remote_source.dart';
import '../../../shell/main_shell.dart';
import '../providers/printer_provider.dart';

// ── Local providers ───────────────────────────────────────────────────────────

final _todaySalesProvider = FutureProvider.autoDispose<List<SaleModel>>((ref) async {
  final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
  final src   = SalesRemoteSource(ref.watch(apiClientProvider));
  final resp  = await src.getSales(dateFrom: today, dateTo: today, limit: 30);
  return resp.items;
});

final _shopNameProvider = Provider<String>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.companyName.isNotEmpty == true ? user!.companyName : 'SAS Garments';
});

// ── Screen ────────────────────────────────────────────────────────────────────

class PrinterScreen extends ConsumerStatefulWidget {
  const PrinterScreen({super.key});

  @override
  ConsumerState<PrinterScreen> createState() => _PrinterScreenState();
}

class _PrinterScreenState extends ConsumerState<PrinterScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(printerProvider.notifier).scanDevices();
    });
  }

  Future<void> _connect(BluetoothInfo device) async {
    final ok = await ref.read(printerProvider.notifier).connect(device);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok ? 'Connected to ${device.name}' : 'Failed to connect'),
      backgroundColor: ok ? Colors.green.shade700 : Colors.red.shade700,
    ));
  }

  Future<void> _testPrint() async {
    final shop = ref.read(_shopNameProvider);
    final ok   = await ref.read(printerProvider.notifier).printTest(shop);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(ok ? 'Test page printed!' : 'Print failed. Check printer.'),
      backgroundColor: ok ? Colors.green.shade700 : Colors.red.shade700,
    ));
  }

  Future<void> _printReceipt(SaleModel sale) async {
    final src  = SalesRemoteSource(ref.read(apiClientProvider));
    final shop = ref.read(_shopNameProvider);
    try {
      final detail = await src.getSale(sale.id);
      if (!mounted) return;
      final ok = await ref.read(printerProvider.notifier).printSaleReceipt(detail, shop);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(ok ? 'Printed: ${sale.invoiceNo}' : 'Print failed'),
        backgroundColor: ok ? Colors.green.shade700 : Colors.red.shade700,
      ));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('Error loading sale: $e'),
        backgroundColor: Colors.red.shade700,
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    final printer = ref.watch(printerProvider);
    final theme   = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title:   const Text('Bluetooth Printer'),
        leading: IconButton(
          icon:     const Icon(Icons.menu),
          onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
        ),
        actions: [
          if (printer.isPrinting)
            const Padding(
              padding: EdgeInsets.all(14),
              child:   SizedBox(width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2)),
            ),
          IconButton(
            icon:     const Icon(Icons.bluetooth_searching),
            tooltip:  'Scan for devices',
            onPressed: printer.isScanning
                ? null
                : () => ref.read(printerProvider.notifier).scanDevices(),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ConnectionCard(printer: printer, onTest: _testPrint),
          const SizedBox(height: 16),
          _DeviceList(
            printer:      printer,
            onConnect:    _connect,
            onDisconnect: () => ref.read(printerProvider.notifier).disconnect(),
          ),
          if (printer.isConnected) ...[
            const SizedBox(height: 20),
            Text("Today's Sales — Reprint Receipt",
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 10),
            _TodaySalesList(onPrint: _printReceipt),
          ],
        ],
      ),
    );
  }
}

// ── Connection card ───────────────────────────────────────────────────────────

class _ConnectionCard extends StatelessWidget {
  const _ConnectionCard({required this.printer, required this.onTest});
  final PrinterState printer;
  final VoidCallback onTest;

  @override
  Widget build(BuildContext context) {
    final theme     = Theme.of(context);
    final cs        = theme.colorScheme;
    final connected = printer.isConnected;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 10, height: 10,
                  decoration: BoxDecoration(
                    color:  connected ? Colors.green : Colors.red.shade400,
                    shape:  BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    connected
                        ? 'Connected: ${printer.connectedDevice!.name}'
                        : 'No printer connected',
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            if (printer.lastStatus != null) ...[
              const SizedBox(height: 4),
              Text(
                printer.lastStatus!,
                style: theme.textTheme.bodySmall
                    ?.copyWith(color: cs.onSurface.withValues(alpha: 0.55)),
              ),
            ],
            if (printer.error != null) ...[
              const SizedBox(height: 4),
              Text(
                printer.error!,
                style: theme.textTheme.bodySmall?.copyWith(color: cs.error),
              ),
            ],
            if (connected) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  icon:     const Icon(Icons.print_outlined, size: 18),
                  label:    const Text('Test Print'),
                  onPressed: printer.isPrinting ? null : onTest,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Device list ───────────────────────────────────────────────────────────────

class _DeviceList extends StatelessWidget {
  const _DeviceList({
    required this.printer,
    required this.onConnect,
    required this.onDisconnect,
  });
  final PrinterState                         printer;
  final Future<void> Function(BluetoothInfo) onConnect;
  final VoidCallback                         onDisconnect;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text('Paired Bluetooth Devices',
                style: theme.textTheme.titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const Spacer(),
            if (printer.isScanning)
              const SizedBox(
                  width: 16, height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2)),
          ],
        ),
        const SizedBox(height: 8),
        if (printer.pairedDevices.isEmpty && !printer.isScanning)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'No paired devices found.\n'
                'Pair your printer in Android Bluetooth settings first, '
                'then tap the scan button above.',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
              ),
            ),
          )
        else
          ...printer.pairedDevices.map((device) {
            final isThis = printer.connectedDevice?.macAdress == device.macAdress;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(
                  Icons.print_rounded,
                  color: isThis
                      ? Colors.green
                      : theme.colorScheme.onSurface.withValues(alpha: 0.4),
                ),
                title:    Text(device.name,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text(device.macAdress,
                    style: theme.textTheme.bodySmall),
                trailing: isThis
                    ? TextButton(
                        onPressed: onDisconnect,
                        child: const Text('Disconnect',
                            style: TextStyle(color: Colors.red)),
                      )
                    : FilledButton(
                        onPressed: () => onConnect(device),
                        child: const Text('Connect'),
                      ),
              ),
            );
          }),
      ],
    );
  }
}

// ── Today's sales list ────────────────────────────────────────────────────────

class _TodaySalesList extends ConsumerWidget {
  const _TodaySalesList({required this.onPrint});
  final Future<void> Function(SaleModel) onPrint;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final salesAsync = ref.watch(_todaySalesProvider);
    final theme      = Theme.of(context);

    return salesAsync.when(
      loading: () => const Center(
          child: Padding(
            padding: EdgeInsets.all(32),
            child:   CircularProgressIndicator(),
          )),
      error: (e, _) => Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text('Could not load sales: $e',
              style: TextStyle(color: theme.colorScheme.error)),
        ),
      ),
      data: (sales) {
        if (sales.isEmpty) {
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text('No sales today yet.',
                  style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.55))),
            ),
          );
        }
        return Column(
          children: sales.map((s) => _SaleTile(sale: s, onPrint: onPrint)).toList(),
        );
      },
    );
  }
}

class _SaleTile extends StatefulWidget {
  const _SaleTile({required this.sale, required this.onPrint});
  final SaleModel                        sale;
  final Future<void> Function(SaleModel) onPrint;

  @override
  State<_SaleTile> createState() => _SaleTileState();
}

class _SaleTileState extends State<_SaleTile> {
  bool _printing = false;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final time  = DateFormat('HH:mm').format(
      DateTime.tryParse(widget.sale.createdAt) ?? DateTime.now(),
    );

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          radius: 18,
          backgroundColor: theme.colorScheme.primaryContainer,
          child: Icon(Icons.receipt_outlined, size: 18,
              color: theme.colorScheme.onPrimaryContainer),
        ),
        title:    Text(widget.sale.invoiceNo,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          '$time  •  ${widget.sale.customerName ?? 'Walk-in'}  •  '
          '${widget.sale.paymentMethod.toUpperCase()}',
          style: theme.textTheme.bodySmall,
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(formatCurrency(widget.sale.totalAmount),
                style: theme.textTheme.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(width: 4),
            _printing
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : IconButton(
                    icon:     const Icon(Icons.print_rounded),
                    tooltip:  'Print receipt',
                    onPressed: () async {
                      setState(() => _printing = true);
                      await widget.onPrint(widget.sale);
                      if (mounted) setState(() => _printing = false);
                    },
                  ),
          ],
        ),
      ),
    );
  }
}
