import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/widgets/grad_widgets.dart';

// ── Bottom nav tabs (5 direct tabs — no More sheet, no tablet rail) ───────────

const _kBottomTabs = [
  _NavItem('/dashboard', Iconsax.home5,         Iconsax.home,         'Home'),
  _NavItem('/sales',     Iconsax.receipt_item5, Iconsax.receipt_item, 'Sales'),
  // Every Iconsax "bag" glyph tried (bag5, bag_25) rendered off-center
  // on-device despite a correctly centered advance box — a font/hinting
  // issue in this specific package, not a layout bug. Using Flutter's
  // own Material icon font instead, which has no such issue on any
  // device, for both states so there's no cross-font mismatch.
  _NavItem('/pos',       Icons.shopping_bag_rounded, Icons.shopping_bag_outlined, 'POS'),
  _NavItem('/printer',   Iconsax.printer5,      Iconsax.printer,      'Printer'),
  // Same issue with every Iconsax "settings" glyph tried (setting_22,
  // setting_25, setting_35) — switched to Material icons for the same
  // reason as POS above.
  _NavItem('/settings',  Icons.settings_rounded, Icons.settings_outlined, 'Settings'),
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

  // Fixed-size icon/pill wrapper — identical for active and inactive states,
  // so the pill background can never shift the icon's layout position.
  static const double _boxWidth  = 48;
  static const double _boxHeight = 32;

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
            SizedBox(
              width:  _boxWidth,
              height: _boxHeight,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Active pill — absolutely fills the fixed box and only
                  // fades in/out. It never participates in layout sizing,
                  // so it cannot move the icon below.
                  Positioned.fill(
                    child: AnimatedOpacity(
                      duration: const Duration(milliseconds: 220),
                      curve:    Curves.easeInOut,
                      opacity:  selected ? 1 : 0,
                      child: DecoratedBox(
                        decoration: const BoxDecoration(
                          borderRadius: BorderRadius.all(Radius.circular(24)),
                          gradient: LinearGradient(
                            begin: Alignment.topLeft,
                            end:   Alignment.bottomRight,
                            colors: kGradPrimary,
                          ),
                        ),
                      ),
                    ),
                  ),
                  // Icon — identical structure and size for every tab and
                  // both states; only the icon data and color are swapped.
                  Icon(
                    selected ? item.activeIcon : item.inactiveIcon,
                    size:  22,
                    color: selected ? Colors.white : cs.onSurfaceVariant,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 3),
            AnimatedDefaultTextStyle(
              duration: const Duration(milliseconds: 220),
              style: TextStyle(
                fontSize:   10,
                fontWeight: selected ? FontWeight.w700 : FontWeight.w400,
                color:      selected
                    ? const Color(0xFF2C6BF5)
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
