import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/shell/main_shell.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/pos/presentation/screens/pos_screen.dart';
import '../../features/pos/presentation/screens/checkout_screen.dart';
import '../../features/products/presentation/screens/products_screen.dart';
import '../../features/customers/presentation/screens/customers_screen.dart';
import '../../features/sales/presentation/screens/sales_screen.dart';
import '../../features/reports/presentation/screens/reports_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (ctx, state) {
      final loggedIn = auth is AuthAuthenticated;
      final loading  = auth is AuthLoading;
      final path     = state.matchedLocation;

      if (loading)             return '/';
      if (!loggedIn && path != '/login') return '/login';
      if (loggedIn  && (path == '/login' || path == '/')) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const SplashScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      ShellRoute(
        builder: (ctx, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/dashboard',  builder: (_, __) => const DashboardScreen()),
          GoRoute(path: '/pos',        builder: (_, __) => const PosScreen()),
          GoRoute(
            path: '/pos/checkout',
            builder: (_, state) => CheckoutScreen(
              cartExtra: state.extra,
            ),
          ),
          GoRoute(path: '/products',   builder: (_, __) => const ProductsScreen()),
          GoRoute(path: '/customers',  builder: (_, __) => const CustomersScreen()),
          GoRoute(path: '/sales',      builder: (_, __) => const SalesScreen()),
          GoRoute(path: '/reports',    builder: (_, __) => const ReportsScreen()),
          GoRoute(path: '/settings',   builder: (_, __) => const SettingsScreen()),
        ],
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.error}')),
    ),
  );
});
