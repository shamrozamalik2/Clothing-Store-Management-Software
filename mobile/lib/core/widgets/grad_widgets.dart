import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

// ── PBC gradient palette ──────────────────────────────────────────────────────

const kGradPrimary  = [Color(0xFF4F46E5), Color(0xFF7C3AED)];
const kGradElectric = [Color(0xFF3B82F6), Color(0xFF8B5CF6)];
const kGradCyan     = [Color(0xFF06B6D4), Color(0xFF3B82F6)];
const kGradBlue     = [Color(0xFF3B82F6), Color(0xFF8B5CF6)];
const kGradGreen    = [Color(0xFF10B981), Color(0xFF3B82F6)];
const kGradViolet   = [Color(0xFF8B5CF6), Color(0xFF6366F1)];
const kGradAmber    = [Color(0xFFF59E0B), Color(0xFFF97316)];
const kGradSky      = [Color(0xFF0EA5E9), Color(0xFF6366F1)];

// ── GradButton ────────────────────────────────────────────────────────────────

class GradButton extends StatelessWidget {
  const GradButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.height = 52,
    this.borderRadius = 14,
    this.colors = kGradPrimary,
    this.loading = false,
  });

  final String       label;
  final VoidCallback onPressed;
  final IconData?    icon;
  final double       height;
  final double       borderRadius;
  final List<Color>  colors;
  final bool         loading;

  @override
  Widget build(BuildContext context) {
    final r = borderRadius.r;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(r),
        boxShadow: [
          BoxShadow(
            color: colors[0].withValues(alpha: 0.32),
            blurRadius: 14,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(r),
        child: InkWell(
          onTap: loading ? null : onPressed,
          borderRadius: BorderRadius.circular(r),
          splashColor: Colors.white.withValues(alpha: 0.12),
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(r),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end:   Alignment.bottomRight,
                colors: colors,
              ),
            ),
            child: SizedBox(
              height: height.h,
              child: loading
                  ? Center(
                      child: SizedBox(
                        width: 22.r, height: 22.r,
                        child: const CircularProgressIndicator(
                          strokeWidth: 2.5,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (icon != null) ...[
                          Icon(icon, color: Colors.white, size: 20.sp),
                          SizedBox(width: 8.w),
                        ],
                        Text(
                          label,
                          style: TextStyle(
                            color:      Colors.white,
                            fontWeight: FontWeight.w700,
                            fontSize:   15.sp,
                            letterSpacing: 0.1,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── GradIconBox ───────────────────────────────────────────────────────────────

class GradIconBox extends StatelessWidget {
  const GradIconBox({
    super.key,
    required this.icon,
    required this.colors,
    this.size = 44,
    this.iconSize = 22,
    this.borderRadius = 12,
  });

  final IconData    icon;
  final List<Color> colors;
  final double      size;
  final double      iconSize;
  final double      borderRadius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width:  size.r,
      height: size.r,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius.r),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end:   Alignment.bottomRight,
          colors: [
            colors[0].withValues(alpha: 0.18),
            colors[1].withValues(alpha: 0.12),
          ],
        ),
        border: Border.all(color: colors[0].withValues(alpha: 0.15)),
      ),
      child: Icon(icon, color: colors[0], size: iconSize.sp),
    );
  }
}

// ── GradSmallButton ───────────────────────────────────────────────────────────

class GradSmallButton extends StatelessWidget {
  const GradSmallButton({
    super.key,
    required this.label,
    required this.icon,
    required this.onPressed,
    this.colors = kGradPrimary,
  });

  final String       label;
  final IconData     icon;
  final VoidCallback onPressed;
  final List<Color>  colors;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(10.r),
        boxShadow: [
          BoxShadow(
            color: colors[0].withValues(alpha: 0.25),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(10.r),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(10.r),
          child: Ink(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end:   Alignment.bottomRight,
                colors: colors,
              ),
              borderRadius: BorderRadius.circular(10.r),
            ),
            padding: EdgeInsets.symmetric(horizontal: 14.w, vertical: 9.h),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: Colors.white, size: 16.sp),
                SizedBox(width: 6.w),
                Text(
                  label,
                  style: TextStyle(
                    color:      Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize:   13.sp,
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

// ── GradAvatar ────────────────────────────────────────────────────────────────

class GradAvatar extends StatelessWidget {
  const GradAvatar({
    super.key,
    required this.name,
    this.radius = 24,
    this.colors = kGradPrimary,
  });

  final String       name;
  final double       radius;
  final List<Color>  colors;

  String get _initials {
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final r = radius.r;
    return Container(
      width:  r * 2,
      height: r * 2,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end:   Alignment.bottomRight,
          colors: colors,
        ),
        boxShadow: [
          BoxShadow(
            color: colors[0].withValues(alpha: 0.30),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Center(
        child: Text(
          _initials,
          style: TextStyle(
            color:      Colors.white,
            fontWeight: FontWeight.w700,
            fontSize:   (radius * 0.58).sp,
          ),
        ),
      ),
    );
  }
}

// ── GradSectionLabel ──────────────────────────────────────────────────────────

class GradSectionLabel extends StatelessWidget {
  const GradSectionLabel(this.label, {super.key});
  final String label;

  @override
  Widget build(BuildContext context) {
    final tt = Theme.of(context).textTheme;
    return Padding(
      padding: EdgeInsets.fromLTRB(16.w, 20.h, 16.w, 8.h),
      child: Row(
        children: [
          Container(
            width:  3.w,
            height: 16.h,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(2.r),
              gradient: const LinearGradient(
                begin: Alignment.topCenter,
                end:   Alignment.bottomCenter,
                colors: kGradPrimary,
              ),
            ),
          ),
          SizedBox(width: 8.w),
          Text(
            label.toUpperCase(),
            style: tt.labelSmall?.copyWith(
              fontWeight:    FontWeight.w700,
              letterSpacing: 0.8,
              color:         const Color(0xFF6366F1),
            ),
          ),
        ],
      ),
    );
  }
}
