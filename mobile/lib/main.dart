import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_core/firebase_core.dart';

import 'core/router/app_router.dart';
import 'core/storage/hive_storage.dart';
import 'core/theme/app_theme.dart';
import 'core/services/notification_service.dart';
import 'features/settings/presentation/providers/settings_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Hive offline storage
  await HiveStorage.init();

  // Firebase (FCM)
  await Firebase.initializeApp();
  await NotificationService.init();

  runApp(const ProviderScope(child: SasGarmentsApp()));
}

class SasGarmentsApp extends ConsumerWidget {
  const SasGarmentsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router    = ref.watch(routerProvider);
    final themeMode = ref.watch(themeModeProvider);

    return MaterialApp.router(
      title:           'SAS Garments',
      debugShowCheckedModeBanner: false,
      theme:           AppTheme.light(),
      darkTheme:       AppTheme.dark(),
      themeMode:       themeMode,
      routerConfig:    router,
    );
  }
}
