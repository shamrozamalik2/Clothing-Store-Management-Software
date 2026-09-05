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

    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color:      _grad[0].withValues(alpha: 0.07),
            blurRadius: 10,
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
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Top gradient accent bar
              Container(
                height: 3,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end:   Alignment.centerRight,
                    colors: [
                      _grad[0].withValues(alpha: 0.85),
                      _grad[1].withValues(alpha: 0.50),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Icon + value row
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        GradIconBox(
                          icon:         icon,
                          colors:       _grad,
                          size:         34,
                          iconSize:     16,
                          borderRadius: 9,
                        ),
                        const Spacer(),
                        if (subtitle != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color:        _grad[0].withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              subtitle!,
                              style: TextStyle(
                                fontFamily: 'Inter',
                                fontSize:   9,
                                fontWeight: FontWeight.w700,
                                color:      _grad[0],
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    FittedBox(
                      fit:       BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        value,
                        style: tt.titleLarge?.copyWith(
                          fontWeight:    FontWeight.w800,
                          letterSpacing: -0.5,
                          color:         cs.onSurface,
                        ),
                      ),
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
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
