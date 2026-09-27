import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Singleton camera controller shared by BarcodeScannerScreen and the POS
/// quick-scan sheet.  Never stopped or disposed between screen transitions —
/// CameraX handles Activity-lifecycle pausing automatically.  This prevents
/// the one-way-door NPE in CameraX ProcessCameraProvider that occurs on
/// devices such as Infinix X688B after a single releaseCamera() cycle.
final mobileScannerControllerProvider = Provider<MobileScannerController>((ref) {
  final controller = MobileScannerController(
    autoStart: false,
    detectionSpeed: DetectionSpeed.noDuplicates,
    cameraResolution: const Size(640, 480),
  );
  ref.onDispose(controller.dispose);
  return controller;
});
