import 'package:uuid/uuid.dart';

/// Generates and tracks one idempotency key per checkout attempt, mirroring
/// the mechanism already used by the web POS against the same `/sales`
/// endpoint.
///
/// The key is reused across retries of the same attempt (a failed submit
/// does not consume it, so resubmitting the same cart after a network error
/// lets the backend collapse it into the original sale instead of creating a
/// duplicate). It is cleared only once that attempt actually succeeds, so the
/// next, genuinely new sale gets a fresh key.
class CheckoutIdempotency {
  CheckoutIdempotency([Uuid? uuid]) : _uuid = uuid ?? const Uuid();

  final Uuid _uuid;
  String? _key;

  /// The current attempt's key, generating one on first use.
  String keyFor() => _key ??= _uuid.v4();

  /// Call once the sale this key was used for has actually succeeded.
  void clear() => _key = null;
}
