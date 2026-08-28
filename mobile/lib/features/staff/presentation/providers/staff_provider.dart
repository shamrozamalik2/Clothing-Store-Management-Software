import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../data/models/staff_model.dart';
import '../../data/sources/staff_remote_source.dart';

final staffSourceProvider = Provider<StaffRemoteSource>(
  (ref) => StaffRemoteSource(ref.watch(apiClientProvider)),
);

final staffDateFromProvider = StateProvider<String?>((ref) => null);
final staffDateToProvider   = StateProvider<String?>((ref) => null);

final staffProvider = FutureProvider.autoDispose<List<StaffStat>>((ref) {
  final src  = ref.watch(staffSourceProvider);
  final from = ref.watch(staffDateFromProvider);
  final to   = ref.watch(staffDateToProvider);
  return src.getStaff(from: from, to: to);
});
