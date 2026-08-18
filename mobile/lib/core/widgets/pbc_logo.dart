import 'package:flutter/material.dart';

// ─── PBC Logo Mark — uses the official newlogo.png asset ─────────────────────
class PBCLogoMark extends StatelessWidget {
  const PBCLogoMark({super.key, this.size = 40.0, this.onDark = true});

  final double size;
  final bool   onDark;

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/newlogo.png',
      width:  size,
      height: size,
      fit:    BoxFit.contain,
      color:  onDark ? Colors.white : null,
      colorBlendMode: onDark ? BlendMode.srcIn : null,
    );
  }
}

// ─── Full logo: image + optional tagline ─────────────────────────────────────
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
    final subtitleColor = onDark ? Colors.white54 : const Color(0xFF64748B);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Image.asset(
          'assets/images/newlogo.png',
          height: size,
          fit:    BoxFit.contain,
          color:  onDark ? Colors.white : null,
          colorBlendMode: onDark ? BlendMode.srcIn : null,
        ),
        if (showTagline) ...[
          SizedBox(height: size * 0.15),
          Text(
            'Business Management Platform',
            style: TextStyle(
              color:      subtitleColor,
              fontSize:   size * 0.22,
              fontWeight: FontWeight.w500,
              letterSpacing: 0.1,
            ),
          ),
        ],
      ],
    );
  }
}
