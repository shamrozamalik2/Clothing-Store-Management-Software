import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../features/auth/presentation/screens/login_screen.dart';
import '../../features/auth/presentation/screens/splash_screen.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../features/shell/main_shell.dart';
import '../../features/dashboard/presentation/screens/dashboard_screen.dart';
import '../../features/notifications/presentation/screens/notifications_screen.dart';
import '../../features/sales/presentation/screens/sales_screen.dart';
import '../../features/reports/presentation/screens/reports_screen.dart';
import '../../features/stock/presentation/screens/stock_screen.dart';
import '../../features/staff/presentation/screens/staff_screen.dart';
import '../../features/customers/presentation/screens/customers_screen.dart';
import '../../features/settings/presentation/screens/settings_screen.dart';
import '../../features/printer/presentation/screens/printer_screen.dart';
import '../../features/pos/presentation/screens/pos_screen.dart';
import '../../features/pos/presentation/screens/checkout_screen.dart';
import '../../features/scanner/presentation/screens/barcode_scanner_screen.dart';

// ── Page transition helpers ───────────────────────────────────────────────────

Page<void> _fadePage(Widget child) => CustomTransitionPage<void>(
  child: child,
  transitionsBuilder: (_, animation, __, child) => FadeTransition(
    opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
    child: child,
  ),
  transitionDuration: const Duration(milliseconds: 200),
);

Page<void> _slidePage(Widget child) => CustomTransitionPage<void>(
  child: child,
  transitionsBuilder: (_, animation, __, child) {
    final slide = Tween<Offset>(
      begin: const Offset(0.06, 0),
      end:   Offset.zero,
    ).animate(CurvedAnimation(parent: animation, curve: Curves.easeOutCubic));
    return FadeTransition(
      opacity: CurvedAnimation(parent: animation, curve: Curves.easeOut),
      child:   SlideTransition(position: slide, child: child),
    );
  },
  transitionDuration: const Duration(milliseconds: 250),
);

// ── Router ────────────────────────────────────────────────────────────────────

final routerProvider = Provider<GoRouter>((ref) {
  final auth = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (ctx, state) {
      final loggedIn = auth is AuthAuthenticated;
      final loading  = auth is AuthLoading;
      final path     = state.matchedLocation;

      if (loading)                                              return '/';
      if (!loggedIn && path != '/login')                       return '/login';
      if (loggedIn && (path == '/login' || path == '/'))       return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(
        path:        '/',
        pageBuilder: (_, __) => _fadePage(const SplashScreen()),
      ),
      GoRoute(
        path:        '/login',
        pageBuilder: (_, __) => _fadePage(const LoginScreen()),
      ),
      ShellRoute(
        builder: (ctx, state, child) => MainShell(child: child),
        routes: [
          GoRoute(path: '/dashboard',
              pageBuilder: (_, __) => _slidePage(const DashboardScreen())),
          GoRoute(path: '/notifications',
              pageBuilder: (_, __) => _slidePage(const NotificationsScreen())),
          GoRoute(path: '/sales',
              pageBuilder: (_, __) => _slidePage(const SalesScreen())),
          GoRoute(path: '/reports',
              pageBuilder: (_, __) => _slidePage(const ReportsScreen())),
          GoRoute(path: '/stock',
              pageBuilder: (_, __) => _slidePage(const StockScreen())),
          GoRoute(path: '/staff',
              pageBuilder: (_, __) => _slidePage(const StaffScreen())),
          GoRoute(path: '/customers',
              pageBuilder: (_, __) => _slidePage(const CustomersScreen())),
          GoRoute(path: '/settings',
              pageBuilder: (_, __) => _slidePage(const SettingsScreen())),
          GoRoute(path: '/printer',
              pageBuilder: (_, __) => _slidePage(const PrinterScreen())),
          GoRoute(path: '/pos',
              pageBuilder: (_, __) => _slidePage(const PosScreen())),
          GoRoute(
            path:        '/pos/checkout',
            pageBuilder: (_, state) => _slidePage(
                CheckoutScreen(cartExtra: state.extra)),
          ),
        ],
      ),
      // Scanner: full-screen modal with fade-in
      GoRoute(
        path: '/scanner',
        pageBuilder: (_, __) => const MaterialPage(
          fullscreenDialog: true,
          child: BarcodeScannerScreen(),
        ),
      ),
    ],
    errorBuilder: (_, state) => Scaffold(
      body: Center(child: Text('Page not found: ${state.error}')),
    ),
  );
});
