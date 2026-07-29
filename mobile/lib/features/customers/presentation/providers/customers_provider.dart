import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/models/api_response.dart';
import '../../data/models/customer_model.dart';
import '../../data/sources/customers_remote_source.dart';

final customersSourceProvider = Provider<CustomersRemoteSource>((ref) {
  return CustomersRemoteSource(ref.watch(apiClientProvider));
});

final customerSearchProvider = StateProvider<String>((ref) => '');

final customersProvider = FutureProvider.autoDispose<PaginatedResponse<CustomerModel>>((ref) {
  final search = ref.watch(customerSearchProvider);
  return ref.watch(customersSourceProvider).getCustomers(
    search: search.isEmpty ? null : search,
  );
});
