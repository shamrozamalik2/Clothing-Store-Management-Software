import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/pbc_logo.dart';

// ── PBC brand colours — always dark navy for the sidebar ────────────────────
const _kNavyBg     = Color(0xFF0C1427);
const _kNavyBorder = Color(0x1AFFFFFF); // white/10
const _kNavyDivider= Color(0x1AFFFFFF); // white/10
const _kNavyText   = Color(0xFF94A3B8); // slate-400
const _kActiveText = Color(0xFFA5B4FC); // indigo-300
const _kActiveBg   = Color(0x1A818CF8); // indigo/10

class MainShell extends StatelessWidget {
  const MainShell({super.key, required this.child});
  final Widget child;

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
      return _TabletShell(currentPath: currentPath, child: child);
    }

    return Scaffold(
      key:    scaffoldKey,
      body:   child,
      drawer: _AppDrawer(currentPath: currentPath),
    );
  }
}

// ── Tablet / large-screen: persistent side rail ──────────────────────────────

class _TabletShell extends StatelessWidget {
  const _TabletShell({required this.currentPath, required this.child});
  final String currentPath;
  final Widget child;

  static const _items = MainShell._navItems;

  @override
  Widget build(BuildContext context) {
    final extended = MediaQuery.of(context).size.width >= 1024;
    final selIdx   = _items.indexWhere((t) => currentPath.startsWith(t.path));

    return Scaffold(
      body: Row(
        children: [
          Container(
            color: _kNavyBg,
            width: extended ? 220 : 68,
            child: SafeArea(
              right: false,
              child: Column(
                children: [
                  // Brand header
                  SizedBox(
                    height: 64,
                    child: Padding(
                      padding: EdgeInsets.symmetric(
                        horizontal: extended ? 16 : 0,
                      ),
                      child: extended
                          ? const PBCLogoFull(size: 32, onDark: true, showTagline: false)
                          : const Center(
                              child: PBCLogoMark(size: 36, onDark: true),
                            ),
                    ),
                  ),
                  const Divider(color: _kNavyDivider, thickness: 1, height: 1),

                  // Nav items
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                      children: _items.asMap().entries.map((e) {
                        final selected = selIdx == e.key;
                        return _RailItem(
                          item:     e.value,
                          selected: selected,
                          extended: extended,
                          onTap:    () => context.go(e.value.path),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Right border
          Container(width: 1, color: _kNavyBorder),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _RailItem extends StatelessWidget {
  const _RailItem({
    required this.item,
    required this.selected,
    required this.extended,
    required this.onTap,
  });

  final _NavItem item;
  final bool     selected;
  final bool     extended;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message:    extended ? '' : item.label,
      preferBelow: false,
      child: InkWell(
        onTap:        onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration:    const Duration(milliseconds: 150),
          height:      40,
          margin:      const EdgeInsets.symmetric(vertical: 2),
          decoration:  BoxDecoration(
            color:        selected ? _kActiveBg : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border:       selected
                ? Border.all(color: _kActiveText.withValues(alpha: 0.2))
                : null,
          ),
          padding: EdgeInsets.symmetric(horizontal: extended ? 12 : 0),
          alignment: extended ? Alignment.centerLeft : Alignment.center,
          child: Row(
            mainAxisSize: extended ? MainAxisSize.max : MainAxisSize.min,
            children: [
              Icon(
                selected ? item.activeIcon : item.inactiveIcon,
                color: selected ? _kActiveText : _kNavyText,
                size:  20,
              ),
              if (extended) ...[
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    item.label,
                    style: TextStyle(
                      color:      selected ? _kActiveText : _kNavyText,
                      fontSize:   13,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Phone drawer ─────────────────────────────────────────────────────────────

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
    return Drawer(
      width: 272,
      backgroundColor: _kNavyBg,
      child: SafeArea(
        child: Column(
          children: [
            // ── PBC brand header ───────────────────────────────────────────
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
              width: double.infinity,
              child: const PBCLogoFull(
                size:        40,
                onDark:      true,
                showTagline: true,
              ),
            ),
            Container(height: 1, color: _kNavyDivider),
            const SizedBox(height: 6),

            // ── Main nav ──────────────────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                children: _mainItems
                    .map((item) => _DrawerTile(
                          item:     item,
                          selected: currentPath.startsWith(item.path),
                          onTap: (ctx) {
                            Navigator.of(ctx).pop();
                            ctx.go(item.path);
                          },
                        ))
                    .toList(),
              ),
            ),

            // ── Settings pinned at bottom ─────────────────────────────────
            Container(height: 1, color: _kNavyDivider),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
              child: _DrawerTile(
                item:     _bottomItem,
                selected: currentPath.startsWith(_bottomItem.path),
                onTap: (ctx) {
                  Navigator.of(ctx).pop();
                  ctx.go(_bottomItem.path);
                },
              ),
            ),

            // ── Version tag ───────────────────────────────────────────────
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                'ProBusinessCloud v2.0',
                style: TextStyle(
                  color:    Colors.white.withValues(alpha: 0.18),
                  fontSize: 10,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Drawer tile ───────────────────────────────────────────────────────────────

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
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1.5),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 150),
        decoration: BoxDecoration(
          color:        selected ? _kActiveBg : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border:       selected
              ? Border.all(color: _kActiveText.withValues(alpha: 0.2))
              : Border.all(color: Colors.transparent),
        ),
        child: ListTile(
          contentPadding:  const EdgeInsets.symmetric(horizontal: 14, vertical: 0),
          minLeadingWidth: 20,
          dense:           true,
          leading: Icon(
            selected ? item.activeIcon : item.inactiveIcon,
            color: selected ? _kActiveText : _kNavyText,
            size:  20,
          ),
          title: Text(
            item.label,
            style: TextStyle(
              color:      selected ? _kActiveText : _kNavyText,
              fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
              fontSize:   13.5,
            ),
          ),
          onTap: () => onTap(context),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
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