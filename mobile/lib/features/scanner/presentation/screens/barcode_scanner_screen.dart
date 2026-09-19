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
    id:            j['id']?.toString()                    ?? '',
    name:          j['name']?.toString()                  ?? '',
    sku:           j['sku']?.toString()                   ?? '',
    salePrice:     (j['sale_price']    as num?)?.toDouble() ?? 0,
    costPrice:     (j['cost_price']    as num?)?.toDouble() ?? 0,
    stockQuantity: (j['stock_quantity'] as num?)?.toInt()  ?? 0,
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

class _BarcodeScannerScreenState extends ConsumerState<BarcodeScannerScreen>
    with WidgetsBindingObserver {

  _PermState _permState = _PermState.checking;
  MobileScannerController? _controller;
  String? _cameraError;

  String _lastCode = '';
  bool   _torchOn  = false;
  bool   _paused   = false;

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermission();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.resumed:
        if (_permState == _PermState.granted) {
          // Camera was already running — restart after background
          _controller?.start();
        } else {
          // User may have just enabled camera in system settings
          _checkPermission();
        }
      case AppLifecycleState.paused:
      case AppLifecycleState.inactive:
        _controller?.stop();
      default:
        break;
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _controller?.dispose();
    super.dispose();
  }

  // ── Permission flow ─────────────────────────────────────────────────────────

  Future<void> _checkPermission() async {
    if (!mounted) return;
    setState(() => _permState = _PermState.checking);

    var status = await Permission.camera.status;

    if (!mounted) return;

    if (status.isGranted || status.isLimited) {
      _startCamera();
      return;
    }

    if (status.isPermanentlyDenied || status.isRestricted) {
      setState(() => _permState = _PermState.permanentlyDenied);
      return;
    }

    // Status is denied — request from the user
    status = await Permission.camera.request();

    if (!mounted) return;

    if (status.isGranted || status.isLimited) {
      _startCamera();
    } else if (status.isPermanentlyDenied || status.isRestricted) {
      setState(() => _permState = _PermState.permanentlyDenied);
    } else {
      setState(() => _permState = _PermState.denied);
    }
  }

  void _startCamera() {
    // Re-use existing controller so we don't dispose + recreate unnecessarily
    _controller ??= MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
    );
    setState(() {
      _permState   = _PermState.granted;
      _cameraError = null;
    });
  }

  Future<void> _retryCamera() async {
    // Full controller reset — dispose old, create fresh
    _controller?.dispose();
    _controller = null;
    setState(() => _cameraError = null);
    _startCamera();
  }

  // ── Scanning callbacks ──────────────────────────────────────────────────────

  void _onDetect(BarcodeCapture capture) {
    final code = capture.barcodes.firstOrNull?.rawValue ?? '';
    if (code.isEmpty || code == _lastCode) return;
    setState(() {
      _lastCode = code;
      _paused   = true;
    });
    _controller?.stop();
    _showProductSheet(code);
  }

  void _resumeScanning() {
    setState(() {
      _lastCode    = '';
      _paused      = false;
      _cameraError = null;
    });
    _controller?.start();
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

  // ── Build ───────────────────────────────────────────────────────────────────

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
          if (_permState == _PermState.granted && _cameraError == null) ...[
            IconButton(
              icon: Icon(
                _torchOn ? Icons.flash_on_rounded : Icons.flash_off_rounded,
                color: _torchOn ? Colors.amber : Colors.white,
              ),
              onPressed: () {
                _controller?.toggleTorch();
                setState(() => _torchOn = !_torchOn);
              },
            ),
            IconButton(
              icon: const Icon(Icons.flip_camera_ios_rounded, color: Colors.white),
              onPressed: () => _controller?.switchCamera(),
            ),
          ],
          const SizedBox(width: 4),
        ],
      ),
      body: _buildBody(cs),
    );
  }

  Widget _buildBody(ColorScheme cs) {
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
          onRequest:  _checkPermission,
          onSettings: () async { await openAppSettings(); },
        );

      case _PermState.permanentlyDenied:
        return _PermissionCard(
          permanentlyDenied: true,
          onRequest:  _checkPermission,
          onSettings: () async { await openAppSettings(); },
        );

      case _PermState.granted:
        if (_cameraError != null) {
          return _CameraErrorCard(
            message:  _cameraError!,
            onRetry:  _retryCamera,
          );
        }
        return _buildScannerView(cs);
    }
  }

  Widget _buildScannerView(ColorScheme cs) {
    return Stack(
      children: [
        // Camera feed
        MobileScanner(
          controller: _controller!,
          onDetect:   _onDetect,
          errorBuilder: (context, error, child) {
            // Permission is already confirmed — this is a camera hardware/init error
            final msg = error.errorDetails?.toString() ?? error.errorCode.toString();
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) setState(() => _cameraError = msg);
            });
            return const SizedBox.shrink();
          },
        ),

        // Scanning frame overlay
        if (!_paused)
          IgnorePointer(
            child: CustomPaint(
              painter: _ScanOverlayPainter(cs.primary),
              child: const SizedBox.expand(),
            ),
          ),

        // Instruction label at bottom
        Positioned(
          bottom: 40,
          left: 0,
          right: 0,
          child: Center(
            child: Container(
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
          ),
        ),
      ],
    );
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
                    backgroundColor: const Color(0xFF4F46E5),
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
                    backgroundColor: const Color(0xFF4F46E5),
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

// ── Camera error card ─────────────────────────────────────────────────────────

class _CameraErrorCard extends StatelessWidget {
  const _CameraErrorCard({required this.message, required this.onRetry});
  final String       message;
  final VoidCallback onRetry;

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
              const Icon(Icons.videocam_off_outlined,
                  color: Colors.white38, size: 56),
              const SizedBox(height: 20),
              const Text(
                'Unable to start camera',
                style: TextStyle(
                    color:      Colors.white,
                    fontSize:   18,
                    fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                message,
                style: const TextStyle(
                    color: Colors.white54, fontSize: 12, height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 28),
              FilledButton.icon(
                onPressed: onRetry,
                icon:  const Icon(Icons.refresh_rounded),
                label: const Text('Retry'),
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF4F46E5),
                  minimumSize:     const Size(160, 48),
                ),
              ),
              const SizedBox(height: 12),
              TextButton(
                onPressed: () async => openAppSettings(),
                child: const Text(
                  'Open Settings',
                  style: TextStyle(color: Colors.white54, fontSize: 12),
                ),
              ),
            ],
          ),
        ),
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

    final dim  = Paint()..color = Colors.black.withValues(alpha: 0.58);
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
    canvas.drawLine(Offset(left, top + c),          Offset(left, top), cp);
    canvas.drawLine(Offset(left, top),               Offset(left + c, top), cp);
    // TR
    canvas.drawLine(Offset(left + cutW - c, top),   Offset(left + cutW, top), cp);
    canvas.drawLine(Offset(left + cutW, top),        Offset(left + cutW, top + c), cp);
    // BL
    canvas.drawLine(Offset(left, top + cutH - c),   Offset(left, top + cutH), cp);
    canvas.drawLine(Offset(left, top + cutH),        Offset(left + c, top + cutH), cp);
    // BR
    canvas.drawLine(Offset(left + cutW - c, top + cutH), Offset(left + cutW, top + cutH), cp);
    canvas.drawLine(Offset(left + cutW, top + cutH - c), Offset(left + cutW, top + cutH), cp);
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
