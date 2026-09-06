import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/widgets/grad_widgets.dart';

// ── Bottom nav tabs (5 direct tabs — no More sheet, no tablet rail) ───────────

const _kBottomTabs = [
  _NavItem('/dashboard', Iconsax.home5,         Iconsax.home,         'Home'),
  _NavItem('/sales',     Iconsax.receipt_item2, Iconsax.receipt_item, 'Sales'),
  _NavItem('/pos',       Iconsax.bag5,          Iconsax.bag,          'POS'),
  _NavItem('/printer',   Iconsax.printer2,      Iconsax.printer,      'Printer'),
  _NavItem('/settings',  Iconsax.setting_22,    Iconsax.setting_2,    'Settings'),
];

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
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentPath = _currentPath(context);

    return Scaffold(
      key:  scaffoldKey,
      body: child,
      bottomNavigationBar: _PremiumBottomNav(
        selectedIndex: _tabIndex(currentPath),
      ),
    );
  }
}

// ── Premium Bottom Navigation Bar ─────────────────────────────────────────────

class _PremiumBottomNav extends StatelessWidget {
  const _PremiumBottomNav({required this.selectedIndex});
  final int selectedIndex;

  @override
  Widget build(BuildContext context) {
    final cs   = Theme.of(context).colorScheme;
    final dark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: cs.surfaceContainer,
        border: Border(
          top: BorderSide(
            color: cs.outlineVariant.withValues(alpha: dark ? 0.25 : 0.5),
            width: 0.5,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color:      Colors.black.withValues(alpha: dark ? 0.35 : 0.06),
            blurRadius: 24,
            offset:     const Offset(0, -6),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              for (int i = 0; i < _kBottomTabs.length; i++)
                _NavBtn(
                  item:     _kBottomTabs[i],
                  selected: selectedIndex == i,
                  onTap:    () => context.go(_kBottomTabs[i].path),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Individual Nav Button ─────────────────────────────────────────────────────

class _NavBtn extends StatelessWidget {
  const _NavBtn({
    required this.item,
    required this.selected,
    required this.onTap,
  });

  final _NavItem item;
  final bool     selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Expanded(
      child: GestureDetector(
        behavior:  HitTestBehavior.opaque,
        onTap:     onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 220),
              curve:    Curves.easeInOut,
              padding: EdgeInsets.symmetric(
                horizontal: selected ? 14 : 10,
                vertical:   4,
              ),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                gradient: selected
                    ? const LinearGradient(
                        begin: Alignment.topLeft,
                        end:   Alignment.bottomRight,
                        colors: kGradPrimary,
                      )
                    : null,
              ),
              child: Icon(
                selected ? item.activeIcon : item.inactiveIcon,
                size:  22,
                color: selected ? Colors.white : cs.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 3),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 220),
              style: TextStyle(
                fontSize:   10,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                color:      selected
                    ? const Color(0xFF6366F1)
                    : cs.onSurfaceVariant,
                letterSpacing: selected ? 0.1 : 0,
              ),
              child: Text(item.label),
            ),
          ],
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
