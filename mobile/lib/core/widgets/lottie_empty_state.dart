import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:lottie/lottie.dart';

/// Drop-in replacement for icon-based empty / loading / success states.
/// Falls back to a Material icon if the Lottie asset is missing.
/// Download free animations from https://lottiefiles.com and save to
/// assets/animations/ (listed in pubspec under flutter → assets).
class LottieEmptyState extends StatelessWidget {
  const LottieEmptyState({
    super.key,
    required this.animation,
    this.message,
    this.submessage,
    this.width = 180,
    this.repeat = true,
    this.fallbackIcon = Icons.inbox_outlined,
    this.action,
  });

  final String   animation;
  final String?  message;
  final String?  submessage;
  final double   width;
  final bool     repeat;
  final IconData fallbackIcon;
  final Widget?  action;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    final cs = Theme.of(context).colorScheme;

    return Center(
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 32.w, vertical: 24.h),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Lottie.asset(
              animation,
              width:  width.w,
              repeat: repeat,
              errorBuilder: (_, __, ___) => Icon(
                fallbackIcon,
                size:  64.sp,
                color: cs.onSurfaceVariant.withValues(alpha: 0.35),
              ),
            ),
            if (message != null) ...[
              SizedBox(height: 16.h),
              Text(
                message!,
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700),
                textAlign: TextAlign.center,
              ),
            ],
            if (submessage != null) ...[
              SizedBox(height: 6.h),
              Text(
                submessage!,
                style: tt.bodyMedium?.copyWith(color: cs.onSurfaceVariant),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null) ...[
              SizedBox(height: 20.h),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

/// Compact loading state — small animated spinner with optional label.
class LottieLoading extends StatelessWidget {
  const LottieLoading({super.key, this.animation, this.size = 80});

  final String? animation;
  final double  size;

  @override
  Widget build(BuildContext context) {
    if (animation != null) {
      return Center(
        child: Lottie.asset(
          animation!,
          width:  size.w,
          height: size.w,
          repeat: true,
          errorBuilder: (_, __, ___) => const Center(
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }
    return const Center(child: CircularProgressIndicator());
  }
}
