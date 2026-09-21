import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen>
    with TickerProviderStateMixin {

  late final AnimationController _entryCtrl;
  late final AnimationController _glowCtrl;
  late final AnimationController _progressCtrl;
  late final AnimationController _nameCtrl;
  late final AnimationController _shimmerCtrl;

  late final Animation<double> _logoOpacity;
  late final Animation<double> _logoScale;
  late final Animation<double> _nameOpacity;
  late final Animation<double> _nameSlide;
  late final Animation<double> _shimmerPos;

  bool    _progressComplete = false;
  String? _pendingRoute;

  static const _kBrand = Color(0xFF2C6BF5);

  @override
  void initState() {
    super.initState();

    _entryCtrl = AnimationController(vsync: this,
        duration: const Duration(milliseconds: 800));

    _glowCtrl = AnimationController(vsync: this,
        duration: const Duration(milliseconds: 2200))
      ..repeat(reverse: true);

    _progressCtrl = AnimationController(vsync: this,
        duration: const Duration(milliseconds: 2000));

    _nameCtrl = AnimationController(vsync: this,
        duration: const Duration(milliseconds: 500));

    _shimmerCtrl = AnimationController(vsync: this,
        duration: const Duration(milliseconds: 900));

    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _entryCtrl,
          curve: const Interval(0.0, 0.6, curve: Curves.easeOut)));

    _logoScale = Tween<double>(begin: 0.68, end: 1.0).animate(
      CurvedAnimation(parent: _entryCtrl,
          curve: const Interval(0.0, 1.0, curve: Curves.easeOutBack)));

    _nameOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _nameCtrl, curve: Curves.easeOut));

    _nameSlide = Tween<double>(begin: 14.0, end: 0.0).animate(
      CurvedAnimation(parent: _nameCtrl, curve: Curves.easeOutCubic));

    _shimmerPos = Tween<double>(begin: -1.5, end: 2.5).animate(
      CurvedAnimation(parent: _shimmerCtrl, curve: Curves.easeInOut));

    // Sequence: logo in → name in → shimmer → progress
    Future.delayed(const Duration(milliseconds: 80), () {
      if (!mounted) return;
      _entryCtrl.forward().whenComplete(() {
        if (!mounted) return;
        _nameCtrl.forward();
        Future.delayed(const Duration(milliseconds: 200), () {
          if (mounted) _shimmerCtrl.forward();
        });
      });
    });

    Future.delayed(const Duration(milliseconds: 320), () {
      if (!mounted) return;
      _progressCtrl.forward().whenComplete(() {
        if (!mounted) return;
        _progressComplete = true;
        if (_pendingRoute != null) _navigate(_pendingRoute!);
      });
    });
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    _glowCtrl.dispose();
    _progressCtrl.dispose();
    _nameCtrl.dispose();
    _shimmerCtrl.dispose();
    super.dispose();
  }

  void _navigate(String route) {
    if (!mounted) return;
    context.go(route);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (_, next) {
      final route = next is AuthAuthenticated ? '/dashboard'
          : next is AuthUnauthenticated ? '/login'
          : null;
      if (route == null) return;
      if (_progressComplete) {
        _navigate(route);
      } else {
        _pendingRoute = route;
      }
    });

    return Scaffold(
      backgroundColor: const Color(0xFF05091A),
      body: AnimatedBuilder(
        animation: Listenable.merge([
          _entryCtrl, _glowCtrl, _progressCtrl, _nameCtrl, _shimmerCtrl,
        ]),
        builder: (context, _) => Stack(
          fit: StackFit.expand,
          children: [

            // ── Background ─────────────────────────────────────────────────
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end:   Alignment.bottomCenter,
                  colors: [Color(0xFF05091A), Color(0xFF070D22)],
                ),
              ),
            ),

            // ── Dot grid ───────────────────────────────────────────────────
            CustomPaint(painter: _DotGridPainter()),

            // ── Outer glow ring ────────────────────────────────────────────
            Center(
              child: Opacity(
                opacity: (0.18 + _glowCtrl.value * 0.15) * _logoOpacity.value,
                child: Container(
                  width:  340,
                  height: 340,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        _kBrand.withValues(alpha: 0.45),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 1.0],
                    ),
                  ),
                ),
              ),
            ),

            // ── Inner glow ─────────────────────────────────────────────────
            Center(
              child: Opacity(
                opacity: (0.35 + _glowCtrl.value * 0.30) * _logoOpacity.value,
                child: Container(
                  width:  180,
                  height: 180,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        _kBrand.withValues(alpha: 0.65),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // ── Logo + name column ─────────────────────────────────────────
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [

                  // Logo
                  Opacity(
                    opacity: _logoOpacity.value,
                    child: Transform.scale(
                      scale: _logoScale.value,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Logo image
                          Container(
                            width:  116,
                            height: 116,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(28),
                              boxShadow: [
                                BoxShadow(
                                  color:      _kBrand.withValues(alpha: 0.50),
                                  blurRadius: 48,
                                  offset:     const Offset(0, 10),
                                ),
                                BoxShadow(
                                  color:      Colors.black.withValues(alpha: 0.40),
                                  blurRadius: 24,
                                  offset:     const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(28),
                              child: SvgPicture.asset(
                                'assets/images/logo-mark.svg',
                                width:  116,
                                height: 116,
                                fit:    BoxFit.cover,
                              ),
                            ),
                          ),

                          // Shimmer sweep
                          if (_shimmerCtrl.value > 0)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(28),
                              child: SizedBox(
                                width: 116, height: 116,
                                child: Transform.translate(
                                  offset: Offset(_shimmerPos.value * 116, 0),
                                  child: Transform.rotate(
                                    angle: -math.pi / 5,
                                    child: Container(
                                      width: 50,
                                      decoration: BoxDecoration(
                                        gradient: LinearGradient(
                                          colors: [
                                            Colors.white.withValues(alpha: 0.0),
                                            Colors.white.withValues(alpha: 0.22),
                                            Colors.white.withValues(alpha: 0.0),
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 22),

                  // App name
                  Transform.translate(
                    offset: Offset(0, _nameSlide.value),
                    child: Opacity(
                      opacity: _nameOpacity.value,
                      child: RichText(
                        text: TextSpan(children: [
                          TextSpan(
                            text: 'ProBusiness',
                            style: TextStyle(
                              fontFamily:    'Inter',
                              fontSize:      18,
                              fontWeight:    FontWeight.w700,
                              color:         Colors.white.withValues(alpha: 0.90),
                              letterSpacing: -0.3,
                            ),
                          ),
                          const TextSpan(
                            text: 'Cloud',
                            style: TextStyle(
                              fontFamily:    'Inter',
                              fontSize:      18,
                              fontWeight:    FontWeight.w700,
                              color:         _kBrand,
                              letterSpacing: -0.3,
                            ),
                          ),
                        ]),
                      ),
                    ),
                  ),

                ],
              ),
            ),

            // ── Progress bar ────────────────────────────────────────────────
            Positioned(
              bottom: 0, left: 0, right: 0,
              child: SizedBox(
                height: 3,
                child: LayoutBuilder(
                  builder: (_, c) => Stack(
                    children: [
                      Container(color: Colors.white.withValues(alpha: 0.05)),
                      Container(
                        width: c.maxWidth * _progressCtrl.value,
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Color(0xFF1A4ED8),
                              Color(0xFF2C6BF5),
                              Color(0xFF6BA3FF),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          ],
        ),
      ),
    );
  }
}

// ── Dot grid background ──────────────────────────────────────────────────────

class _DotGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.028)
      ..style  = PaintingStyle.fill;
    const spacing = 30.0;
    const r       = 1.1;
    for (double x = spacing; x < size.width;  x += spacing) {
      for (double y = spacing; y < size.height; y += spacing) {
        canvas.drawCircle(Offset(x, y), r, paint);
      }
    }
  }

  @override
  bool shouldRepaint(_DotGridPainter _) => false;
}
