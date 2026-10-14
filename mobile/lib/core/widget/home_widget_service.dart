import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:home_widget/home_widget.dart';
import 'package:intl/intl.dart';

import '../api/api_endpoints.dart';
import '../constants/app_constants.dart';
import '../constants/storage_keys.dart';
import '../storage/secure_storage.dart';
import '../../features/dashboard/data/models/dashboard_stats_model.dart';

/// Pushes today's sales/orders/profit to the Android + iOS home screen
/// widgets. Every call here is self-contained — it reads the stored access
/// token itself rather than depending on the app's provider tree — so it
/// works identically whether it's called from the running app or from a
/// background isolate with no UI at all (see `main.dart`'s Workmanager
/// callback).
class HomeWidgetService {
  HomeWidgetService._();

  /// Must match the Kotlin class name of the Android AppWidgetProvider.
  static const androidWidgetName = 'TodaySalesWidgetProvider';

  /// Must match the `kind` string the iOS Widget declares in its bundle.
  static const iosWidgetName = 'TodaySalesWidget';

  /// iOS only — shares storage between the app and the Widget Extension.
  /// Must match the App Group configured in both Xcode targets (Runner and
  /// the Widget Extension) under Signing & Capabilities. See
  /// ios/WIDGET_SETUP.md for the one-time Xcode steps this needs.
  static const iosAppGroupId = 'group.com.sasgarments.sasGarmentsMobile';

  static const _kCompanyName = 'company_name';
  static const _kTodaySales  = 'today_sales';
  static const _kTodayOrders = 'today_orders';
  static const _kTodayProfit = 'today_profit';
  static const _kUpdatedAt   = 'updated_at';
  static const _kSignedIn    = 'signed_in';

  /// Pushes already-fetched stats straight to the widget — call this from
  /// the foreground app (e.g. whenever [dashboardProvider] loads) so the
  /// widget stays current without a second network round trip.
  static Future<void> push({
    required String companyName,
    required double todaySales,
    required int todayOrders,
    required double todayProfit,
  }) async {
    await Future.wait([
      HomeWidget.saveWidgetData<String>(_kCompanyName, companyName),
      HomeWidget.saveWidgetData<double>(_kTodaySales, todaySales),
      HomeWidget.saveWidgetData<int>(_kTodayOrders, todayOrders),
      HomeWidget.saveWidgetData<double>(_kTodayProfit, todayProfit),
      HomeWidget.saveWidgetData<String>(_kUpdatedAt, DateFormat('h:mm a').format(DateTime.now())),
      HomeWidget.saveWidgetData<bool>(_kSignedIn, true),
    ]);
    await HomeWidget.updateWidget(
      androidName: androidWidgetName,
      iOSName: iosWidgetName,
    );
  }

  /// Marks the widget as signed-out so it shows "Open the app to sign in"
  /// instead of the last company's numbers.
  static Future<void> clear() async {
    await HomeWidget.saveWidgetData<bool>(_kSignedIn, false);
    await HomeWidget.updateWidget(
      androidName: androidWidgetName,
      iOSName: iosWidgetName,
    );
  }

  /// Fetches fresh dashboard stats over the network and pushes them.
  ///
  /// Deliberately independent of [ApiClient]/Riverpod: this is the one path
  /// that also runs with no app in memory (the Workmanager periodic task),
  /// so it builds its own bare Dio call and a stored access token. If the
  /// token has expired it does NOT attempt a refresh — that needs the
  /// HttpOnly refresh cookie, which isn't reliably available outside the
  /// app's own cookie jar — it just skips this cycle quietly. The widget
  /// then shows its last-known numbers until the app is next opened, which
  /// refreshes it for real through [push].
  ///
  /// Returns whether the push happened, mainly so tests/callers can tell a
  /// quiet skip (no token, or a 401) apart from an actual network failure —
  /// both are non-fatal here, but worth distinguishing while debugging.
  static Future<bool> refresh() async {
    try {
      final storage = SecureStorageService();
      final token = await storage.getAccessToken();
      if (token == null) return false;

      final userJson = await storage.read(kKeyUser);
      String companyName = 'My Store';
      if (userJson != null) {
        try {
          final user = jsonDecode(userJson) as Map<String, dynamic>;
          final name = user['companyName'] as String?;
          if (name != null && name.isNotEmpty) companyName = name;
        } catch (_) {
          // Corrupt cache — fall back to the default label rather than fail.
        }
      }

      final dio = Dio(BaseOptions(
        baseUrl: kDefaultApiUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      ));

      final res = await dio.get(ApiEndpoints.dashboardStats);
      final data = (res.data as Map)['data'] as Map<String, dynamic>? ?? {};
      final stats = DashboardStats.fromJson(data);

      await push(
        companyName: companyName,
        todaySales: stats.todaySales,
        todayOrders: stats.todayOrders,
        todayProfit: stats.todayProfit,
      );
      return true;
    } catch (_) {
      // Expired/missing token, offline, server error — all non-fatal here.
      return false;
    }
  }
}
