import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';

class SplashScreen extends ConsumerWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cs = Theme.of(context).colorScheme;

    ref.listen(authProvider, (_, next) {
      if (next is AuthAuthenticated)  context.go('/dashboard');
      if (next is AuthUnauthenticated) context.go('/login');
    });

    return Scaffold(
      backgroundColor: cs.primary,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 96, height: 96,
              decoration: BoxDecoration(
                color:        cs.onPrimary.withOpacity(0.15),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Icon(Icons.storefront_rounded, size: 56, color: cs.onPrimary),
            ),
            const SizedBox(height: 24),
            Text('SAS Garments',
              style: TextStyle(color: cs.onPrimary, fontSize: 26, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text('Management System',
              style: TextStyle(color: cs.onPrimary.withOpacity(0.7), fontSize: 14)),
            const SizedBox(height: 48),
            CircularProgressIndicator(color: cs.onPrimary),
          ],
        ),
      ),
    );
  }
}
