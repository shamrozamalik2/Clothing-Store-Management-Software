import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});
  final Widget child;

  // GlobalKey lets any screen's AppBar open this drawer programmatically
  static final scaffoldKey = GlobalKey<ScaffoldState>();

  static const _navItems = [
    _NavItem('/dashboard', Icons.dashboard_rounded,     Icons.dashboard_outlined,     'Dashboard'),
    _NavItem('/pos',       Icons.point_of_sale_rounded, Icons.point_of_sale_outlined, 'Point of Sale'),
    _NavItem('/products',  Icons.inventory_2_rounded,   Icons.inventory_2_outlined,   'Products'),
    _NavItem('/customers', Icons.people_rounded,        Icons.people_outlined,        'Customers'),
    _NavItem('/sales',     Icons.receipt_long_rounded,  Icons.receipt_long_outlined,  'Sales'),
    _NavItem('/reports',   Icons.bar_chart_rounded,     Icons.bar_chart_outlined,     'Reports'),
    _NavItem('/settings',  Icons.settings_rounded,      Icons.settings_outlined,      'Settings'),
  ];

  String _currentPath(BuildContext ctx) {
    final loc = GoRouterState.of(ctx).matchedLocation;
    final match = _navItems.firstWhere(
      (t) => loc.startsWith(t.path),
      orElse: () => _navItems.first,
    );
    return match.path;
  }

  @override
  Widget build(BuildContext context) {
    final isWide      = MediaQuery.of(context).size.width >= 720;
    final currentPath = _currentPath(context);

    if (isWide) {
      // Tablet / landscape — persistent side rail
      return Scaffold(
        body: Row(children: [
          NavigationRail(
            extended:         MediaQuery.of(context).size.width >= 1024,
            selectedIndex:    _navItems.indexWhere((t) => t.path == currentPath),
            onDestinationSelected: (i) => context.go(_navItems[i].path),
            leading: const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Icon(Icons.storefront_rounded, size: 32),
            ),
            destinations: _navItems.map((t) => NavigationRailDestination(
              icon:         Icon(t.inactiveIcon),
              selectedIcon: Icon(t.activeIcon),
              label:        Text(t.label),
            )).toList(),
          ),
          const VerticalDivider(width: 1),
          Expanded(child: child),
        ]),
      );
    }

    // Phone — left drawer
    return Scaffold(
      key:   scaffoldKey,
      body:  child,
      drawer: _AppDrawer(currentPath: currentPath),
    );
  }
}

// ── Left navigation drawer ────────────────────────────────────────────────────

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.currentPath});
  final String currentPath;

  static const _mainItems = [
    _NavItem('/dashboard', Icons.dashboard_rounded,     Icons.dashboard_outlined,     'Dashboard'),
    _NavItem('/pos',       Icons.point_of_sale_rounded, Icons.point_of_sale_outlined, 'Point of Sale'),
    _NavItem('/products',  Icons.inventory_2_rounded,   Icons.inventory_2_outlined,   'Products'),
    _NavItem('/customers', Icons.people_rounded,        Icons.people_outlined,        'Customers'),
    _NavItem('/sales',     Icons.receipt_long_rounded,  Icons.receipt_long_outlined,  'Sales'),
    _NavItem('/reports',   Icons.bar_chart_rounded,     Icons.bar_chart_outlined,     'Reports'),
  ];

  static const _bottomItem =
    _NavItem('/settings', Icons.settings_rounded, Icons.settings_outlined, 'Settings');

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Drawer(
      width: 280,
      child: SafeArea(
        child: Column(
          children: [
            // ── Header ──────────────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
              child: Row(
                children: [
                  Container(
                    width:  48,
                    height: 48,
                    decoration: BoxDecoration(
                      color:        cs.primary,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Icon(Icons.storefront_rounded,
                        color: cs.onPrimary, size: 28),
                  ),
                  const SizedBox(width: 14),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('SAS Garments',
                          style: tt.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700)),
                      Text('Management System',
                          style: tt.labelSmall?.copyWith(
                              color: cs.onSurfaceVariant)),
                    ],
                  ),
                ],
              ),
            ),
            Divider(height: 1, color: cs.outlineVariant.withValues(alpha: 0.5)),
            const SizedBox(height: 8),

            // ── Main nav items ───────────────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: _mainItems
                    .map((item) => _DrawerTile(
                          item:        item,
                          selected:    currentPath.startsWith(item.path),
                          onTap: (ctx) {
                            Navigator.of(ctx).pop();
                            ctx.go(item.path);
                          },
                        ))
                    .toList(),
              ),
            ),

            // ── Bottom: Settings ─────────────────────────────────────────────
            Divider(height: 1, color: cs.outlineVariant.withValues(alpha: 0.5)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: _DrawerTile(
                item:     _bottomItem,
                selected: currentPath.startsWith(_bottomItem.path),
                onTap: (ctx) {
                  Navigator.of(ctx).pop();
                  ctx.go(_bottomItem.path);
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerTile extends StatelessWidget {
  const _DrawerTile({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _NavItem    item;
  final bool        selected;
  final void Function(BuildContext) onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: ListTile(
        shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        selected:        selected,
        selectedColor:   cs.onPrimaryContainer,
        selectedTileColor: cs.primaryContainer,
        leading: Icon(
          selected ? item.activeIcon : item.inactiveIcon,
          color: selected ? cs.primary : cs.onSurfaceVariant,
          size: 22,
        ),
        title: Text(
          item.label,
          style: TextStyle(
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
            fontSize:   14,
            color: selected ? cs.primary : cs.onSurface,
          ),
        ),
        onTap: () => onTap(context),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        minLeadingWidth: 24,
      ),
    );
  }
}

// ── Data class ────────────────────────────────────────────────────────────────

class _NavItem {
  const _NavItem(this.path, this.activeIcon, this.inactiveIcon, this.label);
  final String   path;
  final IconData activeIcon;
  final IconData inactiveIcon;
  final String   label;
}