import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/api/api_client.dart';
import '../../data/models/sales_analysis_model.dart';

/// Selected period for the sales analysis section.
/// Values: 'today' | '7days' | 'month' | 'year' | 'custom'
final analysisPeriodProvider = StateProvider<String>((ref) => '7days');

/// Custom date range (only used when period == 'custom')
final analysisCustomRangeProvider =
    StateProvider<({String from, String to})>((ref) {
  final now = DateTime.now();
  final str = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
  return (from: str, to: str);
});

/// Fetches sales analysis for the selected period.
final salesAnalysisProvider =
    FutureProvider.autoDispose<SalesAnalysis>((ref) async {
  final period = ref.watch(analysisPeriodProvider);
  final custom = ref.watch(analysisCustomRangeProvider);
  final api    = ref.watch(apiClientProvider);

  final params = <String, dynamic>{'period': period};
  if (period == 'custom') {
    params['from'] = custom.from;
    params['to']   = custom.to;
  }

  final res  = await api.get('/reports/sales-analysis', queryParameters: params);
  final data = (res.data as Map<String, dynamic>)['data'] as Map<String, dynamic>? ?? {};
  return SalesAnalysis.fromJson(data);
});
