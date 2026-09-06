import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/utils/currency_formatter.dart';
import '../../../../core/widgets/grad_widgets.dart';
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
    final cs      = Theme.of(context).colorScheme;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            floating:         true,
            snap:             true,
            backgroundColor:  cs.surface,
            surfaceTintColor: Colors.transparent,
            elevation:        0,
            leading: IconButton(
              icon:      const Icon(Icons.menu_rounded),
              onPressed: () => MainShell.scaffoldKey.currentState?.openDrawer(),
            ),
            title: Row(
              children: [
                const GradIconBox(
                  icon:         Icons.print_rounded,
                  colors:       kGradSky,
                  size:         32,
                  iconSize:     16,
                  borderRadius: 9,
                ),
                const SizedBox(width: 10),
                ShaderMask(
                  shaderCallback: (b) =>
                      const LinearGradient(colors: kGradSky).createShader(b),
                  child: const Text(
                    'Bluetooth Printer',
                    style: TextStyle(
                      color:      Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize:   18,
                    ),
                  ),
                ),
              ],
            ),
            actions: [
              if (printer.isPrinting)
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: SizedBox(
                    width: 20, height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: kGradSky[0],
                    ),
                  ),
                ),
              Container(
                margin:     const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color:        kGradSky[0].withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: IconButton(
                  icon:      Icon(Icons.bluetooth_searching, color: kGradSky[0]),
                  tooltip:   'Scan for devices',
                  onPressed: printer.isScanning
                      ? null
                      : () => ref.read(printerProvider.notifier).scanDevices(),
                ),
              ),
              const SizedBox(width: 4),
            ],
            bottom: PreferredSize(
              preferredSize: const Size.fromHeight(1),
              child: Container(
                height: 1,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(colors: kGradSky),
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ConnectionCard(printer: printer, onTest: _testPrint),
                  const SizedBox(height: 16),
                  _DeviceList(
                    printer:      printer,
                    onConnect:    _connect,
                    onDisconnect: () =>
                        ref.read(printerProvider.notifier).disconnect(),
                  ),
                  if (printer.isConnected) ...[
                    const SizedBox(height: 24),
                    const _SectionHeader(
                      icon:   Icons.receipt_long_rounded,
                      colors: kGradPrimary,
                      label:  "Today's Sales — Reprint Receipt",
                    ),
                    const SizedBox(height: 10),
                    _TodaySalesList(onPrint: _printReceipt),
                  ],
                ],
              ),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 32)),
        ],
      ),
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({
    required this.icon,
    required this.colors,
    required this.label,
  });
  final IconData    icon;
  final List<Color> colors;
  final String      label;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        GradIconBox(
          icon:         icon,
          colors:       colors,
          size:         26,
          iconSize:     13,
          borderRadius: 7,
        ),
        const SizedBox(width: 8),
        ShaderMask(
          shaderCallback: (b) =>
              LinearGradient(colors: colors).createShader(b),
          child: Text(
            label,
            style: const TextStyle(
              color:      Colors.white,
              fontWeight: FontWeight.w700,
              fontSize:   15,
            ),
          ),
        ),
      ],
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
    final cs        = Theme.of(context).colorScheme;
    final tt        = Theme.of(context).textTheme;
    final connected = printer.isConnected;
    final grad      = connected ? kGradGreen : kGradSky;

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(color: cs.surfaceContainer),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Gradient top bar
            Container(
              height:     3,
              decoration: BoxDecoration(
                gradient: LinearGradient(colors: grad),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      GradIconBox(
                        icon:         connected
                            ? Icons.print_rounded
                            : Icons.print_disabled_rounded,
                        colors:       grad,
                        size:         44,
                        iconSize:     22,
                        borderRadius: 12,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              connected ? 'Connected' : 'No Printer Connected',
                              style: tt.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w600),
                            ),
                            if (connected) ...[
                              const SizedBox(height: 2),
                              ShaderMask(
                                shaderCallback: (b) =>
                                    const LinearGradient(colors: kGradGreen)
                                        .createShader(b),
                                child: Text(
                                  printer.connectedDevice!.name,
                                  style: const TextStyle(
                                    color:      Colors.white,
                                    fontWeight: FontWeight.w700,
                                    fontSize:   13,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      // Status dot
                      Container(
                        width:  10,
                        height: 10,
                        decoration: BoxDecoration(
                          shape:    BoxShape.circle,
                          gradient: LinearGradient(
                            colors: connected
                                ? kGradGreen
                                : [
                                    const Color(0xFFEF4444),
                                    const Color(0xFFDC2626),
                                  ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (printer.lastStatus != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      printer.lastStatus!,
                      style: tt.bodySmall
                          ?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                  if (printer.error != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      printer.error!,
                      style: tt.bodySmall?.copyWith(color: cs.error),
                    ),
                  ],
                  if (connected) ...[
                    const SizedBox(height: 14),
                    GradButton(
                      label:     'Test Print',
                      icon:      Icons.print_outlined,
                      onPressed: onTest,
                      loading:   printer.isPrinting,
                      colors:    kGradSky,
                      height:    44,
                    ),
                  ],
                ],
              ),
            ),
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
    final cs = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const _SectionHeader(
              icon:   Icons.bluetooth_rounded,
              colors: kGradSky,
              label:  'Paired Bluetooth Devices',
            ),
            const Spacer(),
            if (printer.isScanning)
              SizedBox(
                width: 16, height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: kGradSky[0],
                ),
              ),
          ],
        ),
        const SizedBox(height: 10),
        if (printer.pairedDevices.isEmpty && !printer.isScanning)
          Container(
            decoration: BoxDecoration(
              color:        cs.surfaceContainer,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: cs.outlineVariant.withValues(alpha: 0.4)),
            ),
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                const GradIconBox(
                  icon:         Icons.bluetooth_searching,
                  colors:       kGradSky,
                  size:         44,
                  iconSize:     22,
                  borderRadius: 12,
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(
                    'No paired devices found.\n'
                    'Pair your printer in Android Bluetooth settings first, '
                    'then tap the scan button above.',
                    style: Theme.of(context).textTheme.bodyMedium
                        ?.copyWith(color: cs.onSurfaceVariant),
                  ),
                ),
              ],
            ),
          )
        else
          ...printer.pairedDevices.map((device) {
            final isThis =
                printer.connectedDevice?.macAdress == device.macAdress;
            final devGrad = isThis ? kGradGreen : kGradSky;

            return Container(
              margin: const EdgeInsets.only(bottom: 8),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isThis
                      ? kGradGreen[0].withValues(alpha: 0.4)
                      : cs.outlineVariant.withValues(alpha: 0.35),
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Material(
                  color: cs.surfaceContainer,
                  child: InkWell(
                    onTap: isThis ? null : () => onConnect(device),
                    child: Column(
                      children: [
                        Container(
                          height:     2,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(colors: devGrad),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 10),
                          child: Row(
                            children: [
                              GradIconBox(
                                icon:         Icons.print_rounded,
                                colors:       devGrad,
                                size:         40,
                                iconSize:     20,
                                borderRadius: 11,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(device.name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600)),
                                    Text(device.macAdress,
                                        style: Theme.of(context)
                                            .textTheme
                                            .bodySmall),
                                  ],
                                ),
                              ),
                              if (isThis)
                                GestureDetector(
                                  onTap: onDisconnect,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFEF4444)
                                          .withValues(alpha: 0.12),
                                      borderRadius:
                                          BorderRadius.circular(8),
                                      border: Border.all(
                                        color: const Color(0xFFEF4444)
                                            .withValues(alpha: 0.3),
                                      ),
                                    ),
                                    child: const Text(
                                      'Disconnect',
                                      style: TextStyle(
                                        color:      Color(0xFFEF4444),
                                        fontWeight: FontWeight.w600,
                                        fontSize:   12,
                                      ),
                                    ),
                                  ),
                                )
                              else
                                GestureDetector(
                                  onTap: () => onConnect(device),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                          colors: kGradSky),
                                      borderRadius:
                                          BorderRadius.circular(8),
                                    ),
                                    child: const Text(
                                      'Connect',
                                      style: TextStyle(
                                        color:      Colors.white,
                                        fontWeight: FontWeight.w700,
                                        fontSize:   12,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
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
    final cs         = Theme.of(context).colorScheme;

    return salesAsync.when(
      loading: () => Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: CircularProgressIndicator(color: kGradPrimary[0]),
        ),
      ),
      error: (e, _) => Container(
        decoration: BoxDecoration(
          color:        cs.errorContainer.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(14),
        ),
        padding: const EdgeInsets.all(16),
        child: Text('Could not load sales: $e',
            style: TextStyle(color: cs.error)),
      ),
      data: (sales) {
        if (sales.isEmpty) {
          return Container(
            decoration: BoxDecoration(
              color:        cs.surfaceContainer,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                  color: cs.outlineVariant.withValues(alpha: 0.4)),
            ),
            padding: const EdgeInsets.all(20),
            child: Row(
              children: [
                const GradIconBox(
                  icon:         Icons.receipt_long_outlined,
                  colors:       kGradPrimary,
                  size:         44,
                  iconSize:     22,
                  borderRadius: 12,
                ),
                const SizedBox(width: 14),
                Text('No sales today yet.',
                    style: Theme.of(context).textTheme.bodyMedium
                        ?.copyWith(color: cs.onSurfaceVariant)),
              ],
            ),
          );
        }
        return Column(
          children: sales
              .map((s) => _SaleTile(sale: s, onPrint: onPrint))
              .toList(),
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
    final cs   = Theme.of(context).colorScheme;
    final tt   = Theme.of(context).textTheme;
    final time = DateFormat('HH:mm').format(
      DateTime.tryParse(widget.sale.createdAt) ?? DateTime.now(),
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
            color: cs.outlineVariant.withValues(alpha: 0.35)),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Material(
          color: cs.surfaceContainer,
          child: InkWell(
            onTap: _printing
                ? null
                : () async {
                    setState(() => _printing = true);
                    await widget.onPrint(widget.sale);
                    if (mounted) setState(() => _printing = false);
                  },
            child: Column(
              children: [
                Container(
                  height:     2,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(colors: kGradPrimary),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 14, vertical: 10),
                  child: Row(
                    children: [
                      const GradIconBox(
                        icon:         Icons.receipt_outlined,
                        colors:       kGradPrimary,
                        size:         36,
                        iconSize:     18,
                        borderRadius: 10,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(widget.sale.invoiceNo,
                                style: const TextStyle(
                                    fontWeight: FontWeight.w600)),
                            const SizedBox(height: 2),
                            Text(
                              '$time  •  '
                              '${widget.sale.customerName ?? 'Walk-in'}  •  '
                              '${widget.sale.paymentMethod.toUpperCase()}',
                              style: tt.bodySmall
                                  ?.copyWith(color: cs.onSurfaceVariant),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          ShaderMask(
                            shaderCallback: (b) =>
                                const LinearGradient(colors: kGradGreen)
                                    .createShader(b),
                            child: Text(
                              formatCurrency(widget.sale.totalAmount),
                              style: const TextStyle(
                                color:      Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize:   13,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          _printing
                              ? SizedBox(
                                  width:  18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: kGradPrimary[0],
                                  ),
                                )
                              : Container(
                                  padding: const EdgeInsets.all(4),
                                  decoration: BoxDecoration(
                                    color: kGradSky[0].withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Icon(Icons.print_rounded,
                                      size: 16, color: kGradSky[0]),
                                ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
