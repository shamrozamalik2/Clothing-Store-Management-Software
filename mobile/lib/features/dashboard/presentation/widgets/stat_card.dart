import 'package:flutter/material.dart';

import '../../../../core/widgets/grad_widgets.dart';

class StatCard extends StatelessWidget {
  const StatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.subtitle,
    this.gradColors,
  });

  final String       title;
  final String       value;
  final IconData     icon;
  final Color        color;
  final String?      subtitle;
  // Optional gradient pair; defaults to color→shifted-violet
  final List<Color>? gradColors;

  List<Color> get _grad => gradColors ?? [color, _shiftToViolet(color)];

  // Nudge the "to" color toward violet for the PBC gradient identity
  static Color _shiftToViolet(Color c) {
    const violet = Color(0xFF8B5CF6);
    return Color.lerp(c, violet, 0.45)!;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return Container(
      decoration: BoxDecoration(
        color:        cs.surfaceContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border(
          left: BorderSide(
            color: _grad[0].withValues(alpha: 0.6),
            width: 3,
          ),
          top:    BorderSide(color: cs.outlineVariant.withValues(alpha: 0.4)),
          right:  BorderSide(color: cs.outlineVariant.withValues(alpha: 0.4)),
          bottom: BorderSide(color: cs.outlineVariant.withValues(alpha: 0.4)),
        ),
        boxShadow: [
          BoxShadow(
            color:  _grad[0].withValues(alpha: 0.07),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Gradient icon box
            GradIconBox(
              icon:         icon,
              colors:       _grad,
              size:         38,
              iconSize:     18,
              borderRadius: 10,
            ),

            const SizedBox(height: 8),

            // Value
            Text(
              value,
              style: tt.titleMedium?.copyWith(
                fontWeight:    FontWeight.w800,
                letterSpacing: -0.4,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),

            const SizedBox(height: 2),

            // Title
            Text(
              title,
              style: tt.labelSmall?.copyWith(
                color:      cs.onSurfaceVariant,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),

            if (subtitle != null) ...[
              const SizedBox(height: 2),
              Text(
                subtitle!,
                style: tt.labelSmall?.copyWith(
                  color:    _grad[0],
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }
}
