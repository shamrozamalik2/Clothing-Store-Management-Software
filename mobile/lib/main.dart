import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// import 'package:firebase_core/firebase_core.dart';

import 'core/router/app_router.dart';
import 'core/storage/hive_storage.dart';
import 'core/theme/app_theme.dart';
// import 'core/services/notification_service.dart';
// import 'features/notifications/data/models/sale_notification_model.dart';
// import 'features/notifications/presentation/providers/notifications_provider.dart';
import 'features/settings/presentation/providers/settings_provider.dart';

// Global container so the FCM listener (outside the widget tree) can
// push received sale notifications directly into Riverpod state.
final _container = ProviderContainer();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await HiveStorage.init();

  // ── Firebase / FCM ────────────────────────────────────────────────────────
  // To enable:
  //   1. Go to https://console.firebase.google.com → Add project → Add Android app
  //      Use package name: com.sasgarments.sas_garments_mobile
  //   2. Download google-services.json → place it in  mobile/android/app/
  //   3. Uncomment the 3 import lines above and the block below
  //   4. flutter pub get && flutter run
  //
  // await Firebase.initializeApp();
  // await NotificationService.init();
  //
  // // Foreground sale notifications → save to Hive + update UI badge
  // NotificationService.onMessage((msg) {
  //   if (msg.data['type'] == 'new_sale') {
  //     final n = SaleNotification.fromFcmData(msg.data);
  //     _container.read(notificationsProvider.notifier).add(n);
  //   }
  // });
  //
  // // Tapped notification (background/terminated) → navigate to /notifications
  // NotificationService.onMessageOpenedApp((msg) {
  //   if (msg.data['type'] == 'new_sale') {
  //     final n = SaleNotification.fromFcmData(msg.data);
  //     _container.read(notificationsProvider.notifier).add(n);
  //   }
  // });

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
      title:                      'SAS Garments',
      debugShowCheckedModeBanner: false,
      theme:                      AppTheme.light(),
      darkTheme:                  AppTheme.dark(),
      themeMode:                  themeMode,
      routerConfig:               router,
    );
  }
}
