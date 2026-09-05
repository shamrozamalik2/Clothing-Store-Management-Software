import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/services/biometric_lock_service.dart';
import 'core/services/notification_service.dart';
import 'core/storage/hive_storage.dart';
import 'core/theme/app_theme.dart';
import 'features/notifications/data/models/sale_notification_model.dart';
import 'features/notifications/presentation/providers/notifications_provider.dart';
import 'features/settings/presentation/providers/settings_provider.dart';

// Global container so the FCM listener (outside the widget tree) can
// push received sale notifications directly into Riverpod state.
final _container = ProviderContainer();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await HiveStorage.init();

  await Firebase.initializeApp();
  await NotificationService.init();

  // Foreground sale notifications → save to Hive + update UI badge
  NotificationService.onMessage((msg) {
    if (msg.data['type'] == 'new_sale') {
      final n = SaleNotification.fromFcmData(msg.data);
      _container.read(notificationsProvider.notifier).add(n);
    }
  });

  // Tapped notification (background/terminated) → store + open notifications screen
  NotificationService.onMessageOpenedApp((msg) {
    if (msg.data['type'] == 'new_sale') {
      final n = SaleNotification.fromFcmData(msg.data);
      _container.read(notificationsProvider.notifier).add(n);
    }
  });

  runApp(UncontrolledProviderScope(
    container: _container,
    child: const SasGarmentsApp(),
  ));
}

class SasGarmentsApp extends ConsumerWidget {
  const SasGarmentsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router    = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title:                      'ProBusiness',
      debugShowCheckedModeBanner: false,
      theme:                      AppTheme.light(),
      darkTheme:                  AppTheme.dark(),
      themeMode:                  themeMode,
      routerConfig:               router,
      builder: (ctx, child) => BiometricLockOverlay(child: child ?? const SizedBox()),
    );
  }
}
