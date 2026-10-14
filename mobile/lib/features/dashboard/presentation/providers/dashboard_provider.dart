import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/dashboard_stats_model.dart';
import '../../data/sources/dashboard_remote_source.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/widget/home_widget_service.dart';
import '../../../auth/presentation/providers/auth_provider.dart';

final dashboardSourceProvider = Provider<DashboardRemoteSource>((ref) {
  return DashboardRemoteSource(ref.watch(apiClientProvider));
});

final dashboardProvider = FutureProvider.autoDispose<DashboardStats>((ref) async {
  final stats = await ref.watch(dashboardSourceProvider).getStats();
  // Piggyback on every real dashboard fetch (app open, pull-to-refresh, the
  // post-sale invalidate in checkout_screen.dart) to keep the home screen
  // widget current with zero extra network calls. Best-effort — a widget
  // that isn't pinned, or a platform call that fails, must never break the
  // dashboard screen itself over it.
  final user = ref.read(currentUserProvider);
  unawaited(HomeWidgetService.push(
    companyName: user?.companyName ?? 'My Store',
    todaySales:  stats.todaySales,
    todayOrders: stats.todayOrders,
    todayProfit: stats.todayProfit,
  ).catchError((_) {}));
  return stats;
});
