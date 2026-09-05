import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/widgets/grad_widgets.dart';

// ── Product lookup provider ───────────────────────────────────────────────────

final _scannedProductProvider =
    FutureProvider.autoDispose.family<List<_ScannedProduct>, String>((ref, code) async {
  if (code.isEmpty) return [];
  final res  = await ref.watch(apiClientProvider).get(
    ApiEndpoints.products,
    queryParameters: {'search': code, 'limit': 5},
  );
  final data = (res.data as Map<String, dynamic>)['data'] as Map<String, dynamic>? ?? {};
  final items = (data['items'] as List?) ?? (data['data'] as List?) ?? [];
  return items.map((j) => _ScannedProduct.fromJson(j as Map<String, dynamic>)).toList();
});

// ── Simple product view model ─────────────────────────────────────────────────

class _ScannedProduct {
  final int    id;
  final String name;
  final String sku;
  final double salePrice;
  final double costPrice;
  final int    stockQuantity;
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
    id:            (j['id'] as num).toInt(),
    name:          j['name']?.toString()         ?? '',
    sku:           j['sku']?.toString()          ?? '',
    salePrice:     (j['sale_price'] as num?)?.toDouble()  ?? 0,
    costPrice:     (j['cost_price'] as num?)?.toDouble()  ?? 0,
    stockQuantity: (j['stock_quantity'] as num?)?.toInt() ?? 0,
    categoryName:  j['category_name']?.toString(),
    brandName:     j['brand_name']?.toString(),
    unit:          j['unit']?.toString(),
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

class BarcodeScannerScreen extends ConsumerStatefulWidget {
  const BarcodeScannerScreen({super.key});

  @override
  ConsumerState<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.noDuplicates,
  );

  String _lastCode   = '';
  bool   _torchOn    = false;
  bool   _paused     = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    final code = capture.barcodes.firstOrNull?.rawValue ?? '';
    if (code.isEmpty || code == _lastCode) return;
    setState(() {
      _lastCode = code;
      _paused   = true;
    });
    _controller.stop();
    _showProductSheet(code);
  }

  void _resumeScanning() {
    setState(() {
      _lastCode = '';
      _paused   = false;
    });
    _controller.start();
  }

  void _showProductSheet(String code) {
    showModalBottomSheet<void>(
      context:            context,
      isScrollControlled: true,
      showDragHandle:     true,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _ProductResultSheet(barcode: code, onScanAgain: _resumeScanning),
    ).whenComplete(_resumeScanning);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: const Text('Barcode Scanner',
            style: TextStyle(color: Colors.white)),
        actions: [
          IconButton(
            icon: Icon(
              _torchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
              color: _torchOn ? Colors.amber : Colors.white,
            ),
            onPressed: () {
              _controller.toggleTorch();
              setState(() => _torchOn = !_torchOn);
            },
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios_rounded, color: Colors.white),
            onPressed: _controller.switchCamera,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Stack(
        children: [
          // Camera feed
          MobileScanner(
            controller:   _controller,
            onDetect:     _onDetect,
            errorBuilder: (context, error, child) {
              final denied = error.errorCode == MobileScannerErrorCode.permissionDenied;
              return _CameraPermissionError(
                permanent: denied,
                onRetry: () => _controller.start(),
              );
            },
          ),

          // Overlay — scanning frame
          CustomPaint(
            painter: _ScanOverlayPainter(cs.primary),
            child: const SizedBox.expand(),
          ),

          // Instruction label at bottom
          Positioned(
            bottom: 40,
            left: 0,
            right: 0,
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                  decoration: BoxDecoration(
                    color:        Colors.black.withValues(alpha: 0.6),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Text(
                    _paused ? 'Product found — swipe down to scan again'
                            : 'Point camera at a barcode or QR code',
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Scan overlay painter ──────────────────────────────────────────────────────

class _ScanOverlayPainter extends CustomPainter {
  const _ScanOverlayPainter(this.color);
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final cutW  = size.width  * 0.75;
    final cutH  = size.height * 0.30;
    final left  = (size.width  - cutW) / 2;
    final top   = (size.height - cutH) / 2;
    final rect  = Rect.fromLTWH(left, top, cutW, cutH);
    final rrect = RRect.fromRectAndRadius(rect, const Radius.circular(16));

    final dim = Paint()..color = Colors.black.withValues(alpha: 0.58);
    final full = Path()..addRect(Rect.fromLTWH(0, 0, size.width, size.height));
    final hole = Path()..addRRect(rrect);
    canvas.drawPath(Path.combine(PathOperation.difference, full, hole), dim);

    final border = Paint()
      ..color       = color
      ..style       = PaintingStyle.stroke
      ..strokeWidth = 3;
    canvas.drawRRect(rrect, border);

    // Corner accents
    const c = 22.0;
    final cp = Paint()
      ..color       = color
      ..style       = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap   = StrokeCap.round;
    // TL
    canvas.drawLine(Offset(left, top + c), Offset(left, top), cp);
    canvas.drawLine(Offset(left, top), Offset(left + c, top), cp);
    // TR
    canvas.drawLine(Offset(left + cutW - c, top), Offset(left + cutW, top), cp);
    canvas.drawLine(Offset(left + cutW, top), Offset(left + cutW, top + c), cp);
    // BL
    canvas.drawLine(Offset(left, top + cutH - c), Offset(left, top + cutH), cp);
    canvas.drawLine(Offset(left, top + cutH), Offset(left + c, top + cutH), cp);
    // BR
    canvas.drawLine(
        Offset(left + cutW - c, top + cutH), Offset(left + cutW, top + cutH), cp);
    canvas.drawLine(
        Offset(left + cutW, top + cutH - c), Offset(left + cutW, top + cutH), cp);
  }

  @override
  bool shouldRepaint(_ScanOverlayPainter o) => color != o.color;
}

// ── Product result bottom sheet ───────────────────────────────────────────────

class _ProductResultSheet extends ConsumerWidget {
  const _ProductResultSheet({required this.barcode, required this.onScanAgain});
  final String       barcode;
  final VoidCallback onScanAgain;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs      = Theme.of(context).colorScheme;
    final async   = ref.watch(_scannedProductProvider(barcode));

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Scanned code
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => _ErrorResult(message: e.toString()),
            data: (products) {
              if (products.isEmpty) {
                return _NotFoundResult(barcode: barcode);
              }
              return Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ...products.map((p) => _ProductCard(product: p)),
                ],
              );
            },
          ),

          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
              },
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
        border:       Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Color-coded stock icon
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: oos ? [const Color(0xFFEF4444), const Color(0xFFF87171)]
                                : low ? kGradAmber : kGradGreen,
                  ),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  oos ? Icons.remove_shopping_cart_outlined : Icons.inventory_2_outlined,
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
                        style: tt.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                        maxLines: 2, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(
                      'SKU: ${product.sku}'
                      '${product.categoryName != null ? '  •  ${product.categoryName}' : ''}',
                      style: tt.bodySmall?.copyWith(color: cs.onSurfaceVariant),
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
                value: oos ? 'Out of Stock'
                           : '${product.stockQuantity} ${product.unit ?? 'units'}',
                color: oos ? const Color(0xFFEF4444) : const Color(0xFF10B981),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  const _StatChip({required this.label, required this.value, required this.color});
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
          border:       Border.all(color: color.withValues(alpha: 0.2)),
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
      child: Center(
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
      child: Row(
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

// ── Camera permission error overlay ──────────────────────────────────────────

class _CameraPermissionError extends StatelessWidget {
  const _CameraPermissionError({required this.permanent, required this.onRetry});
  final bool         permanent;
  final VoidCallback onRetry;

  Future<void> _openSettings() async {
    // android-app://com.android.settings opens device settings
    final uri = Uri.parse('package:com.probusiness.sas_garments_mobile');
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      await launchUrl(Uri.parse('app-settings:'));
    }
  }

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
              const Text(
                'Camera Access Required',
                style: TextStyle(
                  color:      Colors.white,
                  fontSize:   18,
                  fontWeight: FontWeight.w700,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                permanent
                    ? 'Camera permission was denied.\nGo to Settings → Apps → ProBusiness → Permissions → Camera and enable it.'
                    : 'Allow camera access to scan barcodes.',
                style: const TextStyle(color: Colors.white60, fontSize: 13, height: 1.5),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              if (permanent)
                FilledButton.icon(
                  onPressed: _openSettings,
                  icon:  const Icon(Icons.settings_rounded),
                  label: const Text('Open Settings'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    minimumSize:     const Size(200, 48),
                  ),
                )
              else
                FilledButton.icon(
                  onPressed: onRetry,
                  icon:  const Icon(Icons.refresh_rounded),
                  label: const Text('Grant Permission'),
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    minimumSize:     const Size(200, 48),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
