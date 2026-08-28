import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
// import 'package:firebase_core/firebase_core.dart';

import 'core/router/app_router.dart';
import 'core/storage/hive_storage.dart';
import 'core/theme/app_theme.dart';
// import 'core/services/notification_service.dart';
// import 'features/notifications/data/models/sale_notification_model.dart';
// import 'features/notifications/data/sources/notifications_local_source.dart';
import 'features/settings/presentation/providers/settings_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Hive offline storage (includes sale_notifications box)
  await HiveStorage.init();

  // Firebase / FCM — re-enable after adding google-services.json
  // Steps:
  //   1. Create a Firebase project → Add Android app → download google-services.json
  //   2. Place google-services.json in mobile/android/app/
  //   3. Uncomment the three import lines and the block below
  //   4. Run `flutter pub get` and rebuild
  //
  // await Firebase.initializeApp();
  // await NotificationService.init();
  //
  // // Save incoming FCM sale notifications to Hive (foreground)
  // final _notifSource = NotificationsLocalSource();
  // NotificationService.onMessage((message) {
  //   if (message.data['type'] == 'new_sale') {
  //     final n = SaleNotification.fromFcmData(message.data);
  //     _notifSource.add(n);
  //   }
  // });
  //
  // // Subscribe to company topic for broadcast sale alerts
  // // NotificationService.subscribeToTopic(companySlug);

  runApp(const ProviderScope(child: SasGarmentsApp()));
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
