import 'package:flutter_test/flutter_test.dart';
import 'package:sas_garments_mobile/features/pos/presentation/providers/checkout_idempotency.dart';

void main() {
  group('CheckoutIdempotency', () {
    test('generates a key on first use', () {
      final idem = CheckoutIdempotency();
      final key = idem.keyFor();
      expect(key, isNotEmpty);
    });

    test('reuses the same key across repeated calls (a retry of the same attempt)', () {
      final idem = CheckoutIdempotency();
      final first  = idem.keyFor();
      final second = idem.keyFor();
      final third  = idem.keyFor();
      expect(second, equals(first));
      expect(third, equals(first));
    });

    test('generates a new key only after clear() — i.e. after a confirmed success', () {
      final idem = CheckoutIdempotency();
      final first = idem.keyFor();

      idem.clear();
      final second = idem.keyFor();

      expect(second, isNot(equals(first)), reason: 'the next sale after a success must get a fresh key');
    });

    test('does not change the key just because clear() was never called (a failed attempt)', () {
      final idem = CheckoutIdempotency();
      final first = idem.keyFor();

      // Simulate a failed submit: nothing calls clear(), caller just retries.
      final retry = idem.keyFor();

      expect(retry, equals(first), reason: 'a retry after failure must reuse the same key, not generate a new one');
    });
  });
}
