import 'package:flutter/material.dart';

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.icon,
    this.variant = AppButtonVariant.primary,
    this.small = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final Widget? icon;
  final AppButtonVariant variant;
  final bool small;

  @override
  Widget build(BuildContext context) {
    final cs      = Theme.of(context).colorScheme;
    final child   = loading
        ? SizedBox(
            width: 20, height: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: variant == AppButtonVariant.primary ? cs.onPrimary : cs.primary,
            ),
          )
        : icon != null
            ? Row(mainAxisSize: MainAxisSize.min, children: [
                icon!,
                const SizedBox(width: 8),
                Text(label),
              ])
            : Text(label);

    final minSize = small
        ? const Size(0, 40)
        : const Size(double.infinity, 52);

    return switch (variant) {
      AppButtonVariant.primary => ElevatedButton(
          style: ElevatedButton.styleFrom(
            minimumSize: minSize,
            backgroundColor: cs.primary,
            foregroundColor: cs.onPrimary,
          ),
          onPressed: loading ? null : onPressed,
          child: child,
        ),
      AppButtonVariant.secondary => OutlinedButton(
          style: OutlinedButton.styleFrom(minimumSize: minSize),
          onPressed: loading ? null : onPressed,
          child: child,
        ),
      AppButtonVariant.danger => ElevatedButton(
          style: ElevatedButton.styleFrom(
            minimumSize: minSize,
            backgroundColor: cs.error,
            foregroundColor: cs.onError,
          ),
          onPressed: loading ? null : onPressed,
          child: child,
        ),
    };
  }
}

enum AppButtonVariant { primary, secondary, danger }
