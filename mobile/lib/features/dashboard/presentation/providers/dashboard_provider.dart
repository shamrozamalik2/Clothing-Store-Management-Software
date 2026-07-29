import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/dashboard_stats_model.dart';
import '../../data/sources/dashboard_remote_source.dart';
import '../../../../core/api/api_client.dart';

final dashboardSourceProvider = Provider<DashboardRemoteSource>((ref) {
  return DashboardRemoteSource(ref.watch(apiClientProvider));
});

final dashboardProvider = FutureProvider.autoDispose<DashboardStats>((ref) async {
  return ref.watch(dashboardSourceProvider).getStats();
});
