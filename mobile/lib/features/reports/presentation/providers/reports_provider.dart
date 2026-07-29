import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/report_model.dart';
import '../../data/sources/reports_remote_source.dart';
import '../../../../core/api/api_client.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Source provider
// ─────────────────────────────────────────────────────────────────────────────

final reportsSourceProvider = Provider<ReportsRemoteSource>((ref) {
  return ReportsRemoteSource(ref.watch(apiClientProvider));
});

// ─────────────────────────────────────────────────────────────────────────────
// Filter — drives all report queries reactively
// ─────────────────────────────────────────────────────────────────────────────

final reportFilterProvider = StateProvider<ReportFilter>((ref) {
  return ReportFilter.thisMonth();
});

// ─────────────────────────────────────────────────────────────────────────────
// Data providers — auto-dispose and react to filter changes
// ─────────────────────────────────────────────────────────────────────────────

final salesSummaryProvider = FutureProvider.autoDispose<SalesSummary>((ref) {
  final filter = ref.watch(reportFilterProvider);
  return ref.watch(reportsSourceProvider).getSalesSummary(filter);
});

final dailySalesProvider =
    FutureProvider.autoDispose<List<DailySalePoint>>((ref) {
  final filter = ref.watch(reportFilterProvider);
  return ref.watch(reportsSourceProvider).getDailySales(filter);
});

final topProductsProvider =
    FutureProvider.autoDispose<List<ProductReport>>((ref) {
  final filter = ref.watch(reportFilterProvider);
  return ref.watch(reportsSourceProvider).getTopProducts(filter);
});

final paymentReportProvider =
    FutureProvider.autoDispose<Map<String, double>>((ref) {
  final filter = ref.watch(reportFilterProvider);
  return ref.watch(reportsSourceProvider).getPaymentReport(filter);
});
