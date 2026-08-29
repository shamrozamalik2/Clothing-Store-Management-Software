import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/widgets/pbc_logo.dart';
import '../notifications/presentation/providers/notifications_provider.dart';

const _kSeed = Color(0xFF4F46E5);

// ── Bottom nav tabs (4 pinned + More) ────────────────────────────────────────

const _kBottomTabs = [
  _NavItem('/dashboard',  Icons.home_rounded,          Icons.home_outlined,          'Home'),
  _NavItem('/pos',        Icons.point_of_sale_rounded,  Icons.point_of_sale_outlined, 'POS'),
  _NavItem('/sales',      Icons.receipt_long_rounded,   Icons.receipt_long_outlined,  'Sales'),
  _NavItem('/stock',      Icons.inventory_2_rounded,    Icons.inventory_2_outlined,   'Stock'),
];

// Items shown in the "More" sheet
const _kMoreItems = [
  _NavItem('/reports',       Icons.bar_chart_rounded,       Icons.bar_chart_outlined,       'Reports'),
  _NavItem('/staff',         Icons.badge_rounded,            Icons.badge_outlined,            'Staff'),
  _NavItem('/customers',     Icons.person_pin_rounded,       Icons.person_pin_outlined,       'Customers'),
  _NavItem('/notifications', Icons.notifications_rounded,    Icons.notifications_outlined,    'Alerts'),
  _NavItem('/printer',       Icons.print_rounded,            Icons.print_outlined,            'Printer'),
  _NavItem('/settings',      Icons.settings_rounded,         Icons.settings_outlined,         'Settings'),
];

// ── PBC navy colours — tablet rail only ──────────────────────────────────────
const _kNavyBg      = Color(0xFF0C1427);
const _kNavyBorder  = Color(0x1AFFFFFF);
const _kNavyDivider = Color(0x1AFFFFFF);
const _kNavyText    = Color(0xFF94A3B8);
const _kActiveText  = Color(0xFFA5B4FC);
const _kActiveBg    = Color(0x1A818CF8);

// ── Shell ─────────────────────────────────────────────────────────────────────

class MainShell extends ConsumerWidget {
  const MainShell({super.key, required this.child});
  final Widget child;

  static final scaffoldKey = GlobalKey<ScaffoldState>();

  String _currentPath(BuildContext ctx) =>
      GoRouterState.of(ctx).matchedLocation;

  int _tabIndex(String path) {
    for (int i = 0; i < _kBottomTabs.length; i++) {
      if (path.startsWith(_kBottomTabs[i].path)) return i;
    }
    return 4; // "More"
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
      key:  scaffoldKey,
      body: child,
      bottomNavigationBar: _BottomNavBar(
        selectedIndex: _tabIndex(currentPath),
        unread:        unread,
        currentPath:   currentPath,
      ),
    );
  }
}

// ── Bottom Navigation Bar ─────────────────────────────────────────────────────

class _BottomNavBar extends StatelessWidget {
  const _BottomNavBar({
    required this.selectedIndex,
    required this.unread,
    required this.currentPath,
  });
  final int    selectedIndex;
  final int    unread;
  final String currentPath;

  void _onTap(BuildContext context, int index) {
    if (index < _kBottomTabs.length) {
      context.go(_kBottomTabs[index].path);
    } else {
      showModalBottomSheet(
        context:            context,
        showDragHandle:     true,
        isScrollControlled: false,
        builder: (_) => _MoreSheet(currentPath: currentPath, unread: unread),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cs     = Theme.of(context).colorScheme;
    final hasBadge = unread > 0;
    final badgeLabel = unread > 9 ? '9+' : '$unread';

    return Container(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.5))),
      ),
      child: NavigationBar(
        selectedIndex:         selectedIndex.clamp(0, 4),
        onDestinationSelected: (i) => _onTap(context, i),
        backgroundColor:       cs.surfaceContainer,
        surfaceTintColor:      Colors.transparent,
        elevation:             0,
        indicatorColor:        _kSeed.withValues(alpha: 0.12),
        height:                64,
        labelBehavior:         NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          ..._kBottomTabs.map((t) => NavigationDestination(
            icon:         Icon(t.inactiveIcon),
            selectedIcon: Icon(t.activeIcon, color: _kSeed),
            label:        t.label,
          )),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: hasBadge,
              label:          Text(badgeLabel),
              child:          const Icon(Icons.more_horiz_rounded),
            ),
            selectedIcon: Badge(
              isLabelVisible: hasBadge,
              label:          Text(badgeLabel),
              child:          const Icon(Icons.more_horiz_rounded, color: _kSeed),
            ),
            label: 'More',
          ),
        ],
      ),
    );
  }
}

// ── More Sheet ────────────────────────────────────────────────────────────────

class _MoreSheet extends StatelessWidget {
  const _MoreSheet({required this.currentPath, required this.unread});
  final String currentPath;
  final int    unread;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return SafeArea(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Text(
              'More',
              style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
          ),
          GridView.builder(
            shrinkWrap: true,
            physics:    const NeverScrollableScrollPhysics(),
            padding:    const EdgeInsets.fromLTRB(16, 0, 16, 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount:   3,
              mainAxisSpacing:  10,
              crossAxisSpacing: 10,
              childAspectRatio: 1.15,
            ),
            itemCount: _kMoreItems.length,
            itemBuilder: (context, i) {
              final item     = _kMoreItems[i];
              final selected = currentPath.startsWith(item.path);
              final isBadge  = item.path == '/notifications' && unread > 0;

              return GestureDetector(
                onTap: () {
                  Navigator.of(context).pop();
                  context.go(item.path);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 120),
                  decoration: BoxDecoration(
                    color: selected
                        ? _kSeed.withValues(alpha: 0.10)
                        : cs.surfaceContainerHighest.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: selected
                          ? _kSeed.withValues(alpha: 0.3)
                          : cs.outlineVariant.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Badge(
                        isLabelVisible: isBadge,
                        label: Text(unread > 9 ? '9+' : '$unread'),
                        child: Icon(
                          selected ? item.activeIcon : item.inactiveIcon,
                          color: selected ? _kSeed : cs.onSurfaceVariant,
                          size:  24,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.label,
                        style: tt.labelSmall?.copyWith(
                          color:      selected ? _kSeed : cs.onSurface,
                          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ── Tablet: persistent side rail ──────────────────────────────────────────────

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
    final all      = [..._kBottomTabs, ..._kMoreItems];
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
                      right: -6, top: -4,
                      child: Container(
                        constraints: const BoxConstraints(minWidth: 14, minHeight: 14),
                        padding:     const EdgeInsets.all(1),
                        decoration:  BoxDecoration(
                          color:        const Color(0xFFEF4444),
                          borderRadius: BorderRadius.circular(7),
                        ),
                        child: Text(
                          badge > 9 ? '9+' : '$badge',
                          style: const TextStyle(
                            color: Colors.white, fontSize: 9, fontWeight: FontWeight.w700),
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
                        color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
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

// ── Data class ────────────────────────────────────────────────────────────────

class _NavItem {
  const _NavItem(this.path, this.activeIcon, this.inactiveIcon, this.label);
  final String   path;
  final IconData activeIcon;
  final IconData inactiveIcon;
  final String   label;
}
