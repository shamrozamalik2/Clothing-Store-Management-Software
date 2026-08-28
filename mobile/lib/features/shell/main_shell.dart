import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/pbc_logo.dart';
import '../notifications/presentation/providers/notifications_provider.dart';

// ── PBC brand colours — always dark navy for the sidebar ─────────────────────
const _kNavyBg      = Color(0xFF0C1427);
const _kNavyBorder  = Color(0x1AFFFFFF);
const _kNavyDivider = Color(0x1AFFFFFF);
const _kNavyText    = Color(0xFF94A3B8);
const _kActiveText  = Color(0xFFA5B4FC);
const _kActiveBg    = Color(0x1A818CF8);

// ── Nav items: owner-focused, POS removed ────────────────────────────────────
const _kMainNavItems = [
  _NavItem('/dashboard',      Icons.dashboard_rounded,        Icons.dashboard_outlined,       'Dashboard'),
  _NavItem('/notifications',  Icons.notifications_rounded,    Icons.notifications_outlined,   'Notifications'),
  _NavItem('/sales',          Icons.receipt_long_rounded,     Icons.receipt_long_outlined,    'Sales'),
  _NavItem('/reports',        Icons.bar_chart_rounded,        Icons.bar_chart_outlined,       'Reports'),
  _NavItem('/stock',          Icons.inventory_2_rounded,      Icons.inventory_2_outlined,     'Stock'),
  _NavItem('/staff',          Icons.badge_rounded,            Icons.badge_outlined,           'Staff'),
  _NavItem('/customers',      Icons.person_pin_rounded,       Icons.person_pin_outlined,      'Customers'),
  _NavItem('/printer',        Icons.print_rounded,            Icons.print_outlined,           'Printer'),
];

const _kSettingsItem =
    _NavItem('/settings', Icons.settings_rounded, Icons.settings_outlined, 'Settings');

// ── Shell ─────────────────────────────────────────────────────────────────────

class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.child});
  final Widget child;

  static final scaffoldKey = GlobalKey<ScaffoldState>();

  String _currentPath(BuildContext ctx) {
    final loc  = GoRouterState.of(ctx).matchedLocation;
    final all  = [..._kMainNavItems, _kSettingsItem];
    final match = all.firstWhere(
      (t) => loc.startsWith(t.path),
      orElse: () => _kMainNavItems.first,
    );
    return match.path;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isWide      = MediaQuery.of(context).size.width >= 720;
    final currentPath = _currentPath(context);
    final unread      = ref.watch(unreadCountProvider);

    if (isWide) {
      return _TabletShell(currentPath: currentPath, unread: unread, child: child);
    }

    return Scaffold(
      key:    scaffoldKey,
      body:   child,
      drawer: _AppDrawer(currentPath: currentPath, unread: unread),
    );
  }
}

// ── Tablet / large-screen: persistent side rail ───────────────────────────────

class _TabletShell extends StatelessWidget {
  const _TabletShell({
    required this.currentPath,
    required this.unread,
    required this.child,
  });
  final String currentPath;
  final int    unread;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final extended = MediaQuery.of(context).size.width >= 1024;
    final all      = [..._kMainNavItems, _kSettingsItem];
    final selIdx   = all.indexWhere((t) => currentPath.startsWith(t.path));

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
                  SizedBox(
                    height: 64,
                    child: Padding(
                      padding: EdgeInsets.symmetric(horizontal: extended ? 16 : 0),
                      child: extended
                          ? const PBCLogoFull(size: 32, onDark: true, showTagline: false)
                          : const Center(child: PBCLogoMark(size: 36, onDark: true)),
                    ),
                  ),
                  const Divider(color: _kNavyDivider, thickness: 1, height: 1),
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 6),
                      children: all.asMap().entries.map((e) {
                        final selected = selIdx == e.key;
                        final badge    = e.value.path == '/notifications' && unread > 0
                            ? unread : 0;
                        return _RailItem(
                          item:     e.value,
                          selected: selected,
                          extended: extended,
                          badge:    badge,
                          onTap:    () => context.go(e.value.path),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),
          ),
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
    required this.badge,
    required this.onTap,
  });

  final _NavItem     item;
  final bool         selected;
  final bool         extended;
  final int          badge;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message:     extended ? '' : item.label,
      preferBelow: false,
      child: InkWell(
        onTap:        onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration:   const Duration(milliseconds: 150),
          height:     40,
          margin:     const EdgeInsets.symmetric(vertical: 2),
          decoration: BoxDecoration(
            color:        selected ? _kActiveBg : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: selected
                ? Border.all(color: _kActiveText.withValues(alpha: 0.2))
                : null,
          ),
          padding:   EdgeInsets.symmetric(horizontal: extended ? 12 : 0),
          alignment: extended ? Alignment.centerLeft : Alignment.center,
          child: Row(
            mainAxisSize: extended ? MainAxisSize.max : MainAxisSize.min,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Icon(
                    selected ? item.activeIcon : item.inactiveIcon,
                    color: selected ? _kActiveText : _kNavyText,
                    size:  20,
                  ),
                  if (badge > 0)
                    Positioned(
                      right: -6,
                      top:   -4,
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                        padding: const EdgeInsets.all(1),
                        decoration: BoxDecoration(
                          color:        const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(7),
                        ),
                        child: Text(
                          badge > 9 ? '9+' : '$badge',
                          style: const TextStyle(
                            color:      Colors.white,
                            fontSize:   9,
                            fontWeight: FontWeight.w700,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                ],
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
                if (badge > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                    decoration: BoxDecoration(
                      color:        const Color(0xFFEF4444),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      badge > 9 ? '9+' : '$badge',
                      style: const TextStyle(
                        color:      Colors.white,
                        fontSize:   10,
                        fontWeight: FontWeight.w700,
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

// ── Phone drawer ──────────────────────────────────────────────────────────────

class _AppDrawer extends StatelessWidget {
  const _AppDrawer({required this.currentPath, required this.unread});
  final String currentPath;
  final int    unread;

  @override
  Widget build(BuildContext context) {
    return Drawer(
      width:           272,
      backgroundColor: _kNavyBg,
      child: SafeArea(
        child: Column(
          children: [
            // Brand header
            Container(
              padding: const EdgeInsets.fromLTRB(20, 20, 20, 18),
              width:   double.infinity,
              child:   const PBCLogoFull(size: 40, onDark: true, showTagline: true),
            ),
            Container(height: 1, color: _kNavyDivider),
            const SizedBox(height: 6),

            // Main nav items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 10),
                children: _kMainNavItems
                    .map((item) => _DrawerTile(
                          item:        item,
                          selected:    currentPath.startsWith(item.path),
                          badge:       item.path == '/notifications' ? unread : 0,
                          onTap: (ctx) {
                            Navigator.of(ctx).pop();
                            ctx.go(item.path);
                          },
                        ))
                    .toList(),
              ),
            ),

            // Settings pinned at bottom
            Container(height: 1, color: _kNavyDivider),
            Padding(
              padding: const EdgeInsets.fromLTRB(10, 6, 10, 8),
              child: _DrawerTile(
                item:     _kSettingsItem,
                selected: currentPath.startsWith(_kSettingsItem.path),
                badge:    0,
                onTap: (ctx) {
                  Navigator.of(ctx).pop();
                  ctx.go(_kSettingsItem.path);
                },
              ),
            ),

            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                'SAS Garments — Owner App',
                style: TextStyle(
                  color:         Colors.white.withValues(alpha: 0.18),
                  fontSize:      10,
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
    required this.badge,
    required this.onTap,
  });

  final _NavItem    item;
  final bool        selected;
  final int         badge;
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
          trailing: badge > 0
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color:        const Color(0xFFEF4444),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    badge > 9 ? '9+' : '$badge',
                    style: const TextStyle(
                      color:      Colors.white,
                      fontSize:   11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                )
              : null,
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
