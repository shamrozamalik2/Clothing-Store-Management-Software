import 'dart:math' as math;
import 'package:flutter/material.dart';

// ─── PBC Logo Mark — matches the web SVG brand mark ──────────────────────────
// Renders the two C-arcs + PB glyph that forms the ProBusinessCloud logo mark.
class PBCLogoMark extends StatelessWidget {
  const PBCLogoMark({super.key, this.size = 40.0, this.onDark = true});

  final double size;
  final bool   onDark; // true = white PB letters (on dark bg), false = navy (on light bg)

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width:  size,
      height: size,
      child: CustomPaint(painter: _PBCPainter(size: size, onDark: onDark)),
    );
  }
}

class _PBCPainter extends CustomPainter {
  const _PBCPainter({required this.size, required this.onDark});
  final double size;
  final bool   onDark;

  @override
  void paint(Canvas canvas, Size sz) {
    final w  = sz.width;
    final h  = sz.height;
    final cx = w / 2;
    final cy = h / 2;

    // ── Outer C arc (blue-400) ─────────────────────────────────────────────
    final outerPaint = Paint()
      ..color      = const Color(0xFF60A5FA)
      ..style      = PaintingStyle.stroke
      ..strokeWidth = w * 0.075
      ..strokeCap  = StrokeCap.round;

    // Arc: nearly full circle, gap at top-right (~60°)
    final outerR = w * 0.44;
    canvas.drawArc(
      Rect.fromCenter(center: Offset(cx, cy), width: outerR * 2, height: outerR * 2),
      math.pi * 0.72,    // start — lower-left
      math.pi * 1.67,    // sweep — ~300°
      false,
      outerPaint,
    );

    // ── Inner C arc (blue-500) ─────────────────────────────────────────────
    final innerPaint = Paint()
      ..color      = const Color(0xFF3B82F6)
      ..style      = PaintingStyle.stroke
      ..strokeWidth = w * 0.058
      ..strokeCap  = StrokeCap.round;

    final innerR = w * 0.275;
    canvas.drawArc(
      Rect.fromCenter(center: Offset(cx - w * 0.02, cy), width: innerR * 2, height: innerR * 2),
      math.pi * 0.72,
      math.pi * 1.67,
      false,
      innerPaint,
    );

    // ── "PB" letters ──────────────────────────────────────────────────────
    final letterColor = onDark ? Colors.white : const Color(0xFF1E3A8A);
    final tp = TextPainter(
      text: TextSpan(
        text: 'PB',
        style: TextStyle(
          color:       letterColor,
          fontSize:    w * 0.29,
          fontWeight:  FontWeight.w900,
          letterSpacing: -w * 0.015,
          height:      1.0,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();

    tp.paint(canvas, Offset(w * 0.22, h * 0.345));
  }

  @override
  bool shouldRepaint(covariant _PBCPainter old) =>
      old.size != size || old.onDark != onDark;
}

// ─── Full logo row: mark + wordmark ──────────────────────────────────────────
class PBCLogoFull extends StatelessWidget {
  const PBCLogoFull({
    super.key,
    this.size        = 40.0,
    this.onDark      = true,
    this.showTagline = true,
  });

  final double size;
  final bool   onDark;
  final bool   showTagline;

  @override
  Widget build(BuildContext context) {
    final titleColor    = onDark ? Colors.white            : const Color(0xFF0F172A);
    final subtitleColor = onDark ? Colors.white54          : const Color(0xFF64748B);
    final accentColor   = onDark ? const Color(0xFF60A5FA) : const Color(0xFF4F46E5);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        PBCLogoMark(size: size, onDark: onDark),
        SizedBox(width: size * 0.3),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            RichText(
              text: TextSpan(
                children: [
                  TextSpan(
                    text: 'ProBusiness',
                    style: TextStyle(
                      color:      titleColor,
                      fontSize:   size * 0.38,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.4,
                    ),
                  ),
                  TextSpan(
                    text: 'Cloud',
                    style: TextStyle(
                      color:      accentColor,
                      fontSize:   size * 0.38,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -0.4,
                    ),
                  ),
                ],
              ),
            ),
            if (showTagline) ...[
              const SizedBox(height: 2),
              Text(
                'Business Management Platform',
                style: TextStyle(
                  color:    subtitleColor,
                  fontSize: size * 0.22,
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.1,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}