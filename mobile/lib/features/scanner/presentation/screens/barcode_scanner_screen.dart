import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
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
    id:            j['id']?.toString()                       ?? '',
    name:          j['name']?.toString()                     ?? '',
    sku:           j['sku']?.toString()                      ?? '',
    salePrice:     (j['sale_price']     as num?)?.toDouble() ?? 0,
    costPrice:     (j['cost_price']     as num?)?.toDouble() ?? 0,
    stockQuantity: (j['stock_quantity'] as num?)?.toInt()    ?? 0,
    categoryName:  j['category_name']?.toString(),
    brandName:     j['brand_name']?.toString(),
    unit:          j['unit']?.toString(),
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

enum _PermState { checking, granted, denied, permanentlyDenied }

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  MobileScannerController? _ctrl;
  bool _sheetOpen = false;
  _PermState _perm = _PermState.checking;

  @override
  void initState() {
    super.initState();
    _requestPermission();
  }

  @override
  void dispose() {
    _ctrl?.dispose();
    super.dispose();
  }

  Future<void> _requestPermission() async {
    if (!mounted) return;
    setState(() => _perm = _PermState.checking);

    var status = await Permission.camera.status;

    if (status.isPermanentlyDenied || status.isRestricted) {
      if (mounted) setState(() => _perm = _PermState.permanentlyDenied);
      return;
    }
    if (!status.isGranted && !status.isLimited) {
      status = await Permission.camera.request();
    }
    if (!mounted) return;

    if (status.isGranted || status.isLimited) {
      _ctrl = MobileScannerController(detectionSpeed: DetectionSpeed.noDuplicates);
      setState(() => _perm = _PermState.granted);
    } else if (status.isPermanentlyDenied || status.isRestricted) {
      setState(() => _perm = _PermState.permanentlyDenied);
    } else {
      setState(() => _perm = _PermState.denied);
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_sheetOpen) return;
    final barcodes = capture.barcodes;
    if (barcodes.isEmpty) return;
    final code = barcodes.first.rawValue;
    if (code == null || code.isEmpty) return;

    _sheetOpen = true;
    _ctrl?.stop();
    _showProductSheet(code);
  }

  void _showProductSheet(String code) {
    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _ProductResultSheet(
        barcode:     code,
        onScanAgain: () => Navigator.of(context).pop(),
      ),
    ).whenComplete(() {
      _sheetOpen = false;
      if (mounted) _ctrl?.start();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor:           Colors.black,
        foregroundColor:           Colors.white,
        automaticallyImplyLeading: true,
        title: const Text('Barcode Scanner',
            style: TextStyle(color: Colors.white)),
        actions: [
          if (_perm == _PermState.granted && _ctrl != null)
            ValueListenableBuilder<MobileScannerState>(
              valueListenable: _ctrl!,
              builder: (_, state, __) => IconButton(
                icon: Icon(
                  state.torchState == TorchState.on
                      ? Icons.flash_on_rounded
                      : Icons.flash_off_rounded,
                  color: Colors.white,
                ),
                onPressed: _ctrl!.toggleTorch,
              ),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    switch (_perm) {
      case _PermState.checking:
        return const Center(
          child: CircularProgressIndicator(color: Color(0xFF2C6BF5)),
        );

      case _PermState.denied:
        return _PermCard(
          icon:    Icons.camera_alt_outlined,
          title:   'Camera Access Needed',
          message: 'Camera permission is required to scan barcodes.',
          primaryLabel:   'Grant Permission',
          primaryIcon:    Icons.camera_alt_rounded,
          onPrimary:      _requestPermission,
          secondaryLabel: 'Open Settings',
          onSecondary:    () => openAppSettings(),
        );

      case _PermState.permanentlyDenied:
        return _PermCard(
          icon:    Icons.camera_alt_outlined,
          title:   'Camera Permission Required',
          message: 'Camera was denied. Open Settings → enable Camera for this app → return.',
          primaryLabel:   'Open Settings',
          primaryIcon:    Icons.settings_rounded,
          onPrimary:      () => openAppSettings(),
          secondaryLabel: 'Already granted? Retry',
          onSecondary:    _requestPermission,
        );

      case _PermState.granted:
        final ctrl = _ctrl;
        if (ctrl == null) return const SizedBox.shrink();
        return Stack(
          children: [
            MobileScanner(
              controller:   ctrl,
              onDetect:     _onDetect,
              errorBuilder: (_, error, __) => _ScanError(
                error:   error,
                onRetry: _requestPermission,
              ),
            ),
            Center(
              child: Container(
                width:  260,
                height: 260,
                decoration: BoxDecoration(
                  border:       Border.all(color: const Color(0xFF2C6BF5), width: 2.5),
                  borderRadius: BorderRadius.circular(18),
                ),
              ),
            ),
            const Positioned(
              bottom: 52,
              left:   0,
              right:  0,
              child: Text(
                'Aim at a barcode or QR code',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
            ),
          ],
        );
    }
  }
}

class _PermCard extends StatelessWidget {
  const _PermCard({
    required this.icon,
    required this.title,
    required this.message,
    required this.primaryLabel,
    required this.primaryIcon,
    required this.onPrimary,
    required this.secondaryLabel,
    required this.onSecondary,
  });

  final IconData    icon;
  final String      title;
  final String      message;
  final String      primaryLabel;
  final IconData    primaryIcon;
  final VoidCallback onPrimary;
  final String      secondaryLabel;
  final VoidCallback onSecondary;

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
                width: 72, height: 72,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.08),
                ),
                child: Icon(icon, color: Colors.white54, size: 36),
              ),
              const SizedBox(height: 20),
              Text(title,
                  style: const TextStyle(
                      color: Colors.white, fontSize: 18,
                      fontWeight: FontWeight.w700),
                  textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(message,
                  style: const TextStyle(
                      color: Colors.white60, fontSize: 13, height: 1.5),
                  textAlign: TextAlign.center),
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: onPrimary,
                icon:  Icon(primaryIcon),
                label: Text(primaryLabel),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF2C6BF5),
                  minimumSize:     const Size(200, 48),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: onSecondary,
                child: Text(secondaryLabel,
                    style: const TextStyle(
                        color: Colors.white54, fontSize: 12)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Scanner error state ───────────────────────────────────────────────────────

class _ScanError extends StatelessWidget {
  const _ScanError({required this.error, required this.onRetry});
  final MobileScannerException error;
  final VoidCallback           onRetry;

  @override
  Widget build(BuildContext context) {
    final bool isPermission =
        error.errorCode == MobileScannerErrorCode.permissionDenied;

    final String msg = isPermission
        ? 'Camera permission denied.\nOpen Settings → enable Camera for this app.'
        : error.errorCode == MobileScannerErrorCode.unsupported
            ? 'Camera is not supported on this device.'
            : 'Camera failed to start. Please try again.';

    return Container(
      color: Colors.black,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.camera_alt_outlined,
                  color: Colors.white38, size: 56),
              const SizedBox(height: 20),
              Text(msg,
                  style: const TextStyle(
                      color: Colors.white70, fontSize: 14, height: 1.6),
                  textAlign: TextAlign.center),
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: isPermission ? () => openAppSettings() : onRetry,
                icon:  Icon(isPermission
                    ? Icons.settings_rounded
                    : Icons.refresh_rounded),
                label: Text(isPermission ? 'Open Settings' : 'Try Again'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF2C6BF5),
                  minimumSize:     const Size(200, 48),
                ),
              ),
              if (isPermission) ...[
                const SizedBox(height: 12),
                TextButton(
                  onPressed: onRetry,
                  child: const Text('Already granted? Retry',
                      style: TextStyle(color: Colors.white54, fontSize: 12)),
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
              onPressed: onScanAgain,
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
                style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant)),
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
