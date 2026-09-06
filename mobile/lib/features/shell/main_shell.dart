import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:iconsax/iconsax.dart';

import '../../core/widgets/grad_widgets.dart';
import '../../core/widgets/pbc_logo.dart';

// ── Bottom nav tabs (5 direct tabs — no More sheet) ───────────────────────────

const _kBottomTabs = [
  _NavItem('/dashboard', Iconsax.home5,         Iconsax.home,         'Home'),
  _NavItem('/sales',     Iconsax.receipt_item2, Iconsax.receipt_item, 'Sales'),
  _NavItem('/pos',       Iconsax.bag5,          Iconsax.bag,          'POS'),
  _NavItem('/printer',   Iconsax.printer2,      Iconsax.printer,      'Printer'),
  _NavItem('/settings',  Iconsax.setting_22,    Iconsax.setting_2,    'Settings'),
];

// ── Tablet rail colours ───────────────────────────────────────────────────────
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
    return 0;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isWide      = MediaQuery.of(context).size.width >= 720;
    final currentPath = _currentPath(context);

    if (isWide) {
      return _TabletShell(currentPath: currentPath, child: child);
    }

    return Scaffold(
      key:  scaffoldKey,
      body: child,
      bottomNavigationBar: _PremiumBottomNav(
        selectedIndex: _tabIndex(currentPath),
        currentPath:   currentPath,
      ),
    );
  }
}

// ── Premium Bottom Navigation Bar ─────────────────────────────────────────────

class _PremiumBottomNav extends StatelessWidget {
  const _PremiumBottomNav({
    required this.selectedIndex,
    required this.currentPath,
  });
  final int    selectedIndex;
  final String currentPath;

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

// ── Tablet: persistent side rail ──────────────────────────────────────────────

class _TabletShell extends StatelessWidget {
  const _TabletShell({
    required this.currentPath,
    required this.child,
  });
  final String currentPath;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final extended = MediaQuery.of(context).size.width >= 1024;
    final selIdx   = _kBottomTabs.indexWhere((t) => currentPath.startsWith(t.path));

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
                      children: _kBottomTabs.asMap().entries.map((e) {
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

  final _NavItem     item;
  final bool         selected;
  final bool         extended;
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

// ── Data class ────────────────────────────────────────────────────────────────

class _NavItem {
  const _NavItem(this.path, this.activeIcon, this.inactiveIcon, this.label);
  final String   path;
  final IconData activeIcon;
  final IconData inactiveIcon;
  final String   label;
}
