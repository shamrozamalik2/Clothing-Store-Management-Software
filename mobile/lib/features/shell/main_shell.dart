import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});
  final Widget child;

  static const _tabs = [
    _Tab('/dashboard', Icons.dashboard_rounded,       Icons.dashboard_outlined,       'Dashboard'),
    _Tab('/pos',       Icons.point_of_sale_rounded,   Icons.point_of_sale_outlined,   'POS'),
    _Tab('/products',  Icons.inventory_2_rounded,     Icons.inventory_2_outlined,     'Products'),
    _Tab('/customers', Icons.people_rounded,          Icons.people_outlined,          'Customers'),
    _Tab('/sales',     Icons.receipt_long_rounded,    Icons.receipt_long_outlined,    'Sales'),
    _Tab('/reports',   Icons.bar_chart_rounded,       Icons.bar_chart_outlined,       'Reports'),
    _Tab('/settings',  Icons.settings_rounded,        Icons.settings_outlined,        'Settings'),
  ];

  int _currentIndex(BuildContext ctx) {
    final loc = GoRouterState.of(ctx).matchedLocation;
    final idx = _tabs.indexWhere((t) => loc.startsWith(t.path));
    return idx < 0 ? 0 : idx;
  }

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width >= 720;
    final idx    = _currentIndex(context);

    if (isWide) {
      // Tablet / landscape — side rail
      return Scaffold(
        body: Row(children: [
          NavigationRail(
            extended:         MediaQuery.of(context).size.width >= 1024,
            selectedIndex:    idx,
            onDestinationSelected: (i) => context.go(_tabs[i].path),
            leading: const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Icon(Icons.storefront_rounded, size: 32),
            ),
            destinations: _tabs.map((t) => NavigationRailDestination(
              icon:          Icon(t.inactiveIcon),
              selectedIcon:  Icon(t.activeIcon),
              label:         Text(t.label),
            )).toList(),
          ),
          const VerticalDivider(width: 1),
          Expanded(child: child),
        ]),
      );
    }

    // Phone — bottom nav
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: idx,
        onDestinationSelected: (i) => context.go(_tabs[i].path),
        destinations: _tabs.map((t) => NavigationDestination(
          icon:          Icon(t.inactiveIcon),
          selectedIcon:  Icon(t.activeIcon),
          label:         t.label,
        )).toList(),
      ),
    );
  }
}

class _Tab {
  const _Tab(this.path, this.activeIcon, this.inactiveIcon, this.label);
  final String  path;
  final IconData activeIcon;
  final IconData inactiveIcon;
  final String  label;
}
