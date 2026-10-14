import 'dart:async';

import 'package:cookie_jar/cookie_jar.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:home_widget/home_widget.dart';
import 'package:path_provider/path_provider.dart';
import 'package:workmanager/workmanager.dart';

import 'core/api/api_client.dart';
import 'core/api/api_endpoints.dart';
import 'core/router/app_router.dart';
import 'core/services/biometric_lock_service.dart';
import 'core/services/notification_service.dart';
import 'core/storage/hive_storage.dart';
import 'core/theme/app_theme.dart';
import 'core/widget/home_widget_service.dart';
import 'features/notifications/data/models/sale_notification_model.dart';
import 'features/notifications/presentation/providers/notifications_provider.dart';
import 'features/settings/presentation/providers/settings_provider.dart';

// Unique names for the periodic job that keeps the home screen widget's
// numbers fresh even while the app isn't open. 15 minutes is Android
// WorkManager's own enforced floor for periodic work; iOS treats this as a
// request, not a guarantee — BGTaskScheduler runs it opportunistically based
// on the device's own usage/battery heuristics.
const _kWidgetRefreshTaskId   = 'pbc-widget-refresh';
const _kWidgetRefreshTaskName = 'refreshHomeWidget';

/// Entry point for every Workmanager background task. Runs in a separate,
/// headless Dart isolate with no access to the running app's state — hence
/// [HomeWidgetService.refresh] doing its own storage read and network call
/// rather than reaching into any provider.
@pragma('vm:entry-point')
void _widgetRefreshCallbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    if (task == _kWidgetRefreshTaskName) {
      await HomeWidgetService.refresh();
    }
    return true;
  });
}

// Global container so the FCM listener (outside the widget tree) can
// push received sale notifications directly into Riverpod state.
final _container = ProviderContainer();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize the persistent cookie jar BEFORE any providers are created.
  // This keeps the HttpOnly refresh_token cookie alive across app restarts.
  final cookieDir = await getApplicationDocumentsDirectory();
  appCookieJar = PersistCookieJar(
    storage: FileStorage('${cookieDir.path}/.cookies/'),
  );

  await HiveStorage.init();

  // Home screen widget: App Group on iOS only (harmless no-op on Android),
  // one immediate push so it's not blank right after install/login, and a
  // periodic background job so it stays roughly current the rest of the
  // time. The dashboard screen itself pushes fresher numbers on every real
  // visit — see dashboard_provider.dart — this is just the floor for when
  // the app never gets opened in between.
  await HomeWidget.setAppGroupId(HomeWidgetService.iosAppGroupId);
  unawaited(HomeWidgetService.refresh());
  try {
    await Workmanager().initialize(_widgetRefreshCallbackDispatcher);
    await Workmanager().registerPeriodicTask(
      _kWidgetRefreshTaskId,
      _kWidgetRefreshTaskName,
      frequency: const Duration(minutes: 15),
      existingWorkPolicy: ExistingPeriodicWorkPolicy.keep,
      constraints: Constraints(networkType: NetworkType.connected),
    );
  } catch (_) {
    // Widget refresh is a nice-to-have — never block app startup over it.
  }

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

  // Keep FCM token fresh — Firebase rotates tokens periodically; re-register immediately.
  FirebaseMessaging.instance.onTokenRefresh.listen((newToken) async {
    try {
      await _container.read(apiClientProvider).post(
        ApiEndpoints.fcmToken,
        data: {'token': newToken},
      );
    } catch (_) {}
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

    return ScreenUtilInit(
      designSize:      const Size(390, 844), // iPhone 14 Pro baseline
      minTextAdapt:    true,
      splitScreenMode: true,
      builder: (_, __) => MaterialApp.router(
        title:                      'ProBusiness',
        debugShowCheckedModeBanner: false,
        theme:                      AppTheme.light(),
        darkTheme:                  AppTheme.dark(),
        themeMode:                  themeMode,
        routerConfig:               router,
        builder: (ctx, child) => BiometricLockOverlay(child: child ?? const SizedBox()),
      ),
    );
  }
}
