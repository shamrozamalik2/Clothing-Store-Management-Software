import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen(authProvider, (_, next) {
      if (next is AuthAuthenticated)   context.go('/dashboard');
      if (next is AuthUnauthenticated) context.go('/login');
    });

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end:   Alignment.bottomRight,
            colors: [
              Color(0xFF14122D), // dark navy-purple — matches website hero
              Color(0xFF1E0E3A), // deep purple-navy
              Color(0xFF332C3F), // dark purple-gray
            ],
            stops: [0.0, 0.55, 1.0],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // ── Decorative blobs ─────────────────────────────────────────
              Positioned(
                top:   -60,
                right: -60,
                child: _Blob(
                  color: const Color(0xFF8380B4).withValues(alpha: 0.12),
                  size:  260,
                ),
              ),
              Positioned(
                bottom: -80,
                left:   -60,
                child: _Blob(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.10),
                  size:  300,
                ),
              ),

              // ── Center content ───────────────────────────────────────────
              Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Logo — PNG only, no text
                    Container(
                      decoration: BoxDecoration(
                        color:        Colors.white,
                        borderRadius: BorderRadius.circular(24),
                        boxShadow: [
                          BoxShadow(
                            color:      const Color(0xFF4F46E5).withValues(alpha: 0.22),
                            blurRadius: 40,
                            offset:     const Offset(0, 10),
                          ),
                        ],
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 24),
                      child: Image.asset(
                        'assets/images/newlogo.png',
                        width:  220,
                        fit:    BoxFit.contain,
                      ),
                    ),

                    const SizedBox(height: 72),

                    // Loading indicator
                    SizedBox(
                      width:  28,
                      height: 28,
                      child: CircularProgressIndicator(
                        strokeWidth:  2.5,
                        color:        Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  ],
                ),
              ),

              // ── Bottom tag ───────────────────────────────────────────────
              const Positioned(
                bottom: 20,
                left:   0,
                right:  0,
                child: Text(
                  'Secure · Cloud · Professional',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color:      Color(0x604D9FFF),
                    fontSize:   11,
                    letterSpacing: 1.2,
                    fontFamily: 'Inter',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Blob extends StatelessWidget {
  const _Blob({required this.color, required this.size});
  final Color  color;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Container(
      width:  size,
      height: size,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }
}