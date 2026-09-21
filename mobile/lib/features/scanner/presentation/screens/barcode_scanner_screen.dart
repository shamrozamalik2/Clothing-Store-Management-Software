import 'package:barcode_scan2/barcode_scan2.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/widgets/grad_widgets.dart';

// ── Product lookup provider ───────────────────────────────────────────────────

final _scannedProductProvider =
    FutureProvider.autoDispose.family<List<_ScannedProduct>, String>((ref, code) async {
  if (code.isEmpty) return [];
  final res = await ref.watch(apiClientProvider).get(
    ApiEndpoints.products,
    queryParameters: {'search': code, 'limit': 5},
  );
  final body = res.data as Map<String, dynamic>? ?? {};
  final dataField = body['data'];
  final List<dynamic> items;
  if (dataField is List) {
    items = dataField;
  } else if (dataField is Map<String, dynamic>) {
    items = (dataField['items'] as List?) ?? (dataField['data'] as List?) ?? [];
  } else {
    items = [];
  }
  return items.map((j) => _ScannedProduct.fromJson(j as Map<String, dynamic>)).toList();
});

// ── Simple product view model ─────────────────────────────────────────────────

class _ScannedProduct {
  final String  id;
  final String  name;
  final String  sku;
  final double  salePrice;
  final double  costPrice;
  final int     stockQuantity;
  final String? categoryName;
  final String? brandName;
  final String? unit;

  const _ScannedProduct({
    required this.id,
    required this.name,
    required this.sku,
    required this.salePrice,
    required this.costPrice,
    required this.stockQuantity,
    this.categoryName,
    this.brandName,
    this.unit,
  });

  factory _ScannedProduct.fromJson(Map<String, dynamic> j) => _ScannedProduct(
    id:            j['id']?.toString()                     ?? '',
    name:          j['name']?.toString()                   ?? '',
    sku:           j['sku']?.toString()                    ?? '',
    salePrice:     (j['sale_price']     as num?)?.toDouble() ?? 0,
    costPrice:     (j['cost_price']     as num?)?.toDouble() ?? 0,
    stockQuantity: (j['stock_quantity'] as num?)?.toInt()   ?? 0,
    categoryName:  j['category_name']?.toString(),
    brandName:     j['brand_name']?.toString(),
    unit:          j['unit']?.toString(),
  );
}

// ── Permission state ──────────────────────────────────────────────────────────

enum _PermState { checking, granted, denied, permanentlyDenied }

// ── Screen ────────────────────────────────────────────────────────────────────

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {

  _PermState _permState = _PermState.checking;
  bool _scanning = false;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    _checkPermissionThenScan();
  }

  // ── Permission → auto-launch scanner ────────────────────────────────────────

  Future<void> _checkPermissionThenScan() async {
    if (!mounted) return;
    setState(() => _permState = _PermState.checking);

    var status = await Permission.camera.status;
    if (!mounted) return;

    if (status.isGranted || status.isLimited) {
      setState(() => _permState = _PermState.granted);
      _launchScanner();
      return;
    }

    if (status.isPermanentlyDenied || status.isRestricted) {
      setState(() => _permState = _PermState.permanentlyDenied);
      return;
    }

    status = await Permission.camera.request();
    if (!mounted) return;

    if (status.isGranted || status.isLimited) {
      setState(() => _permState = _PermState.granted);
      _launchScanner();
    } else if (status.isPermanentlyDenied || status.isRestricted) {
      setState(() => _permState = _PermState.permanentlyDenied);
    } else {
      setState(() => _permState = _PermState.denied);
    }
  }

  // ── ZXing native scanner ─────────────────────────────────────────────────────

  Future<void> _launchScanner() async {
    if (_scanning || !mounted) return;
    setState(() => _scanning = true);

    try {
      final result = await BarcodeScanner.scan(
        options: const ScanOptions(
          strings: {'cancel': 'Cancel', 'flash_on': 'Flash on', 'flash_off': 'Flash off'},
          autoEnableFlash: false,
          useCamera: -1,
        ),
      );

      if (!mounted) return;
      setState(() => _scanning = false);

      if (result.type == ResultType.Cancelled) {
        Navigator.of(context).pop();
        return;
      }

      final code = result.rawContent;
      if (code.isEmpty) return;

      _showProductSheet(code);
    } catch (_) {
      if (mounted) setState(() => _scanning = false);
    }
  }

  void _showProductSheet(String code) {
    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ProductResultSheet(
        barcode:     code,
        onScanAgain: _launchScanner,
      ),
    ).whenComplete(() {
      // Auto-relaunch scanner when sheet is dismissed
      if (mounted && _permState == _PermState.granted) {
        _launchScanner();
      }
    });
  }

  // ── Build ───────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Barcode Scanner',
            style: TextStyle(color: Colors.white)),
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_permState) {
      case _PermState.checking:
        return const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: Colors.white),
              SizedBox(height: 16),
              Text('Checking camera permission…',
                  style: TextStyle(color: Colors.white60, fontSize: 13)),
            ],
          ),
        );

      case _PermState.denied:
        return _PermissionCard(
          permanentlyDenied: false,
          onRequest:  _checkPermissionThenScan,
          onSettings: () async => openAppSettings(),
        );

      case _PermState.permanentlyDenied:
        return _PermissionCard(
          permanentlyDenied: true,
          onRequest:  _checkPermissionThenScan,
          onSettings: () async => openAppSettings(),
        );

      case _PermState.granted:
        // Native ZXing scanner is open or about to open.
        // Show a friendly placeholder while it's running.
        return Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.qr_code_scanner_rounded,
                  size: 72, color: Colors.white24),
              const SizedBox(height: 20),
              Text(
                _scanning ? 'Scanner open…' : 'Tap to scan',
                style: const TextStyle(color: Colors.white60, fontSize: 15),
              ),
              const SizedBox(height: 28),
              if (!_scanning)
                FilledButton.icon(
                  onPressed: _launchScanner,
                  icon:  const Icon(Icons.qr_code_scanner_rounded),
                  label: const Text('Open Scanner'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF2C6BF5),
                    minimumSize:     const Size(200, 48),
                  ),
                ),
            ],
          ),
        );
    }
  }
}

// ── Permission card ───────────────────────────────────────────────────────────

class _PermissionCard extends StatelessWidget {
  const _PermissionCard({
    required this.permanentlyDenied,
    required this.onRequest,
    required this.onSettings,
  });

  final bool             permanentlyDenied;
  final VoidCallback     onRequest;
  final VoidCallback     onSettings;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width:  72,
                height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.08),
                ),
                child: const Icon(
                  Icons.camera_alt_outlined,
                  color: Colors.white54,
                  size:  36,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                permanentlyDenied
                    ? 'Camera Permission Required'
                    : 'Camera Access Needed',
                style: const TextStyle(
                  color:      Colors.white,
                  fontSize:   18,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                permanentlyDenied
                    ? 'Camera permission was denied. Open Settings, enable Camera for this app, then return.'
                    : 'Camera access is required to scan barcodes.',
                style: const TextStyle(
                    color: Colors.white60, fontSize: 13, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              if (permanentlyDenied) ...[
                FilledButton.icon(
                  onPressed: onSettings,
                  icon:  const Icon(Icons.settings_rounded),
                  label: const Text('Open Settings'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF2C6BF5),
                    minimumSize:     const Size(200, 48),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: onRequest,
                  child: const Text(
                    'Already granted? Tap to retry',
                    style: TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ),
              ] else ...[
                FilledButton.icon(
                  onPressed: onRequest,
                  icon:  const Icon(Icons.camera_alt_rounded),
                  label: const Text('Grant Camera Permission'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF2C6BF5),
                    minimumSize:     const Size(200, 48),
                  ),
                ),
                const SizedBox(height: 12),
                TextButton(
                  onPressed: onSettings,
                  child: const Text(
                    'Open Settings instead',
                    style: TextStyle(color: Colors.white54, fontSize: 12),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Product result bottom sheet ───────────────────────────────────────────────

class _ProductResultSheet extends ConsumerWidget {
  const _ProductResultSheet({required this.barcode, required this.onScanAgain});
  final String       barcode;
  final VoidCallback onScanAgain;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs    = Theme.of(context).colorScheme;
    final async = ref.watch(_scannedProductProvider(barcode));

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
      child: Column(
        mainAxisSize:       MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding:    const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color:        cs.primaryContainer,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.qr_code_rounded, size: 14, color: cs.primary),
                    const SizedBox(width: 6),
                    Text(barcode,
                        style: TextStyle(
                          color:      cs.primary,
                          fontSize:   12,
                          fontWeight: FontWeight.w700,
                          fontFamily: 'monospace',
                        )),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          async.when(
            loading: () => const Padding(
              padding: EdgeInsets.symmetric(vertical: 24),
              child:   Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => _ErrorResult(message: e.toString()),
            data: (products) {
              if (products.isEmpty) return _NotFoundResult(barcode: barcode);
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: products.map((p) => _ProductCard(product: p)).toList(),
              );
            },
          ),

          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => Navigator.of(context).pop(),
              icon:  const Icon(Icons.qr_code_scanner_rounded),
              label: const Text('Scan Another'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProductCard extends StatelessWidget {
  const _ProductCard({required this.product});
  final _ScannedProduct product;

  @override
  Widget build(BuildContext context) {
    final cs  = Theme.of(context).colorScheme;
    final tt  = Theme.of(context).textTheme;
    final oos = product.stockQuantity <= 0;
    final low = product.stockQuantity > 0 && product.stockQuantity <= 5;

    return Container(
      margin:     const EdgeInsets.only(bottom: 12),
      padding:    const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color:        cs.surfaceContainer,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width:  44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: oos
                        ? [const Color(0xFFEF4444), const Color(0xFFF87171)]
                        : low ? kGradAmber : kGradGreen,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  oos
                      ? Icons.remove_shopping_cart_outlined
                      : Icons.inventory_2_outlined,
                  color: Colors.white,
                  size:  22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.name,
                        style: tt.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w700),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(
                      'SKU: ${product.sku}'
                      '${product.categoryName != null ? '  •  ${product.categoryName}' : ''}',
                      style: tt.bodySmall
                          ?.copyWith(color: cs.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              _StatChip(
                label: 'Sale Price',
                value: 'PKR ${product.salePrice.toStringAsFixed(0)}',
                color: cs.primary,
              ),
              const SizedBox(width: 8),
              _StatChip(
                label: 'Stock',
                value: oos
                    ? 'Out of Stock'
                    : '${product.stockQuantity} ${product.unit ?? 'units'}',
                color: oos
                    ? const Color(0xFFEF4444)
                    : const Color(0xFF10B981),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip(
      {required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color  color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding:    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color:        color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: TextStyle(
                    color: color, fontSize: 10, fontWeight: FontWeight.w600)),
            const SizedBox(height: 2),
            Text(value,
                style: TextStyle(
                    color: color, fontSize: 13, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class _NotFoundResult extends StatelessWidget {
  const _NotFoundResult({required this.barcode});
  final String barcode;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child:   Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.search_off_rounded, size: 48, color: cs.onSurfaceVariant),
            const SizedBox(height: 12),
            Text('Product not found',
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text('No product with code "$barcode"',
                style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

class _ErrorResult extends StatelessWidget {
  const _ErrorResult({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child:   Row(
        children: [
          Icon(Icons.error_outline_rounded, color: cs.error),
          const SizedBox(width: 8),
          Expanded(
            child: Text('Could not load product: $message',
                style: TextStyle(color: cs.error)),
          ),
        ],
      ),
    );
  }
}
