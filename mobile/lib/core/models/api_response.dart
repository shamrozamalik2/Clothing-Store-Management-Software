class ApiResponse<T> {
  const ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.meta,
  });

  final bool success;
  final String message;
  final T? data;
  final Map<String, dynamic>? meta;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic json) fromData,
  ) {
    return ApiResponse<T>(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? '',
      data:    json['data'] != null ? fromData(json['data']) : null,
      meta:    json['meta'] as Map<String, dynamic>?,
    );
  }
}

class PaginatedResponse<T> {
  const PaginatedResponse({
    required this.items,
    required this.total,
    required this.page,
    required this.limit,
  });

  final List<T> items;
  final int total;
  final int page;
  final int limit;

  int get totalPages => (total / limit).ceil();
  bool get hasMore   => page < totalPages;

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromItem,
  ) {
    final rawItems = (json['data'] as List<dynamic>?) ?? [];
    final meta     = json['meta'] as Map<String, dynamic>? ?? {};
    return PaginatedResponse<T>(
      items: rawItems.map((e) => fromItem(e as Map<String, dynamic>)).toList(),
      total: meta['total'] as int? ?? rawItems.length,
      page:  meta['page']  as int? ?? 1,
      limit: meta['limit'] as int? ?? rawItems.length,
    );
  }
}
