import 'dart:typed_data';

/// Lightweight ESC/POS byte builder for 58mm/80mm thermal printers.
///
/// [width] is the printable column count for the connected printer's paper
/// (32 for 58mm, 48 for 80mm) and is used as the default for [divider] and
/// [row] so callers don't have to pass it on every single call — that's
/// exactly what caused receipts to silently print at 58mm width even when
/// an 80mm printer/paper size was selected.
class EscPosBuilder {
  EscPosBuilder({this.width = 32});

  final int width;
  final List<int> _buf = [];

  // ── Control ──────────────────────────────────────────────────────────────────

  EscPosBuilder init()   { _buf.addAll([0x1B, 0x40]);          return this; }
  EscPosBuilder cut()    { _buf.addAll([0x1D, 0x56, 0x41, 0x10]); return this; }
  EscPosBuilder feed([int n = 3]) {
    for (var i = 0; i < n; i++) { _buf.add(0x0A); }
    return this;
  }

  // ── Alignment ─────────────────────────────────────────────────────────────────

  EscPosBuilder left()   { _buf.addAll([0x1B, 0x61, 0x00]); return this; }
  EscPosBuilder center() { _buf.addAll([0x1B, 0x61, 0x01]); return this; }
  EscPosBuilder right()  { _buf.addAll([0x1B, 0x61, 0x02]); return this; }

  // ── Style ────────────────────────────────────────────────────────────────────

  EscPosBuilder bold(bool on) { _buf.addAll([0x1B, 0x45, on ? 1 : 0]); return this; }

  /// Size multiplier: 0x00 = 1x, 0x11 = 2x height+width, 0x01 = 2x width only
  EscPosBuilder size(int n) { _buf.addAll([0x1D, 0x21, n]); return this; }

  // ── Text ─────────────────────────────────────────────────────────────────────

  EscPosBuilder text(String s) {
    // Encode as ISO-8859-1 — fall back to '?' for unmappable chars
    for (final cp in s.codeUnits) {
      _buf.add(cp <= 0xFF ? cp : 0x3F);
    }
    return this;
  }

  EscPosBuilder ln(String s) => text(s).feed(1);

  EscPosBuilder divider([int? overrideWidth]) => ln('-' * (overrideWidth ?? width));

  /// Two-column row: left text + right text padded to the builder's [width]
  /// (or [overrideWidth]) total chars.
  EscPosBuilder row(String left, String right, {int? overrideWidth}) {
    final w = overrideWidth ?? width;
    final gap = w - left.length - right.length;
    return text(left).text(gap > 0 ? ' ' * gap : ' ').ln(right);
  }

  // ── Build ────────────────────────────────────────────────────────────────────

  Uint8List build() => Uint8List.fromList(_buf);
}
