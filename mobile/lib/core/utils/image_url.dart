import '../constants/app_constants.dart';

/// Resolves a possibly-relative image path (e.g. `/uploads/products/x.jpg`
/// or a bare filename like `products-123.jpg`) returned by the backend into
/// a fully-qualified URL that `Image.network` / `CachedNetworkImage` can load.
String? resolveImageUrl(String? raw) {
  if (raw == null || raw.trim().isEmpty) return null;
  final value = raw.trim();

  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value;
  }

  final origin = kDefaultApiUrl.replaceFirst(RegExp(r'/api/?$'), '');

  if (value.startsWith('/')) return '$origin$value';
  return '$origin/uploads/products/$value';
}
