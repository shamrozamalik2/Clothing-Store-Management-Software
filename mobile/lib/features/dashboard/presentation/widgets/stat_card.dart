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
  final List<Color>? gradColors;

  List<Color> get _grad => gradColors ?? [color, _shiftToViolet(color)];

  static Color _shiftToViolet(Color c) {
    const violet = Color(0xFF8B5CF6);
    return Color.lerp(c, violet, 0.45)!;
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    // Flutter does not allow borderRadius with non-uniform border colors.
    // Fix: ClipRRect handles rounding; inner border is uniform; left accent
    // is a separate stretched Container inside an IntrinsicHeight Row.
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color:      _grad[0].withValues(alpha: 0.07),
            blurRadius: 12,
            offset:     const Offset(0, 3),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color:  cs.surfaceContainer,
            border: Border.all(color: cs.outlineVariant.withValues(alpha: 0.4)),
          ),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Left gradient accent bar (replaces the non-uniform BorderSide)
                Container(
                  width: 3,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end:   Alignment.bottomCenter,
                      colors: [
                        _grad[0].withValues(alpha: 0.85),
                        _grad[1].withValues(alpha: 0.65),
                      ],
                    ),
                  ),
                ),
                // Card content
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(10, 10, 12, 10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        GradIconBox(
                          icon:         icon,
                          colors:       _grad,
                          size:         38,
                          iconSize:     18,
                          borderRadius: 10,
                        ),
                        const SizedBox(height: 8),
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
                              color:      _grad[0],
                              fontSize:   10,
                              fontWeight: FontWeight.w600,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}