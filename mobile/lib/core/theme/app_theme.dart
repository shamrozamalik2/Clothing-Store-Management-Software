import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// ── Brand tokens ──────────────────────────────────────────────────────────────

const _kSeed       = Color(0xFF4F46E5); // indigo-600
const _kCardLight  = Color(0xFFFFFFFF);
const _kBgLight    = Color(0xFFF1F5F9); // slate-100
const _kCardDark   = Color(0xFF1E293B); // slate-800
const _kBgDark     = Color(0xFF0F172A); // slate-900

// ── TextTheme helper ──────────────────────────────────────────────────────────

TextStyle _ts(double size, FontWeight weight, Color color, {double spacing = 0}) =>
    TextStyle(
      fontFamily:  'Inter',
      fontFamilyFallback: const ['Roboto', 'sans-serif'],
      fontSize:    size,
      fontWeight:  weight,
      color:       color,
      letterSpacing: spacing,
      height:      1.4,
    );

TextTheme _buildTextTheme(Color onSurface, Color onSurfaceVariant) {
  final text  = onSurface;
  final muted = onSurfaceVariant;

  return TextTheme(
    displayLarge:   _ts(57, FontWeight.w800, text,  spacing: -0.5),
    displayMedium:  _ts(45, FontWeight.w700, text,  spacing: -0.4),
    displaySmall:   _ts(36, FontWeight.w700, text,  spacing: -0.3),
    headlineLarge:  _ts(32, FontWeight.w700, text,  spacing: -0.3),
    headlineMedium: _ts(28, FontWeight.w700, text,  spacing: -0.2),
    headlineSmall:  _ts(24, FontWeight.w700, text,  spacing: -0.2),
    titleLarge:     _ts(20, FontWeight.w700, text,  spacing: -0.1),
    titleMedium:    _ts(16, FontWeight.w600, text),
    titleSmall:     _ts(14, FontWeight.w600, text),
    bodyLarge:      _ts(16, FontWeight.w400, text),
    bodyMedium:     _ts(14, FontWeight.w400, text),
    bodySmall:      _ts(12, FontWeight.w400, muted, spacing: 0.1),
    labelLarge:     _ts(14, FontWeight.w600, text),
    labelMedium:    _ts(12, FontWeight.w500, muted, spacing: 0.1),
    labelSmall:     _ts(11, FontWeight.w500, muted, spacing: 0.1),
  );
}

// ── Shared component themes ───────────────────────────────────────────────────

InputDecorationTheme _inputTheme(Color fill, Color border, Color focused, Color label, Color hint) =>
  InputDecorationTheme(
    filled:        true,
    fillColor:     fill,
    border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: border)),
    enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: border)),
    focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: focused, width: 2)),
    errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFEF4444))),
    focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFEF4444), width: 2)),
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    labelStyle: TextStyle(fontFamily: 'Inter', color: label,
        fontWeight: FontWeight.w500, fontSize: 14),
    hintStyle:  TextStyle(fontFamily: 'Inter', color: hint, fontSize: 14),
    prefixIconColor: hint,
  );

BottomSheetThemeData _sheetTheme(Color bg) => BottomSheetThemeData(
  backgroundColor:     bg,
  surfaceTintColor:    Colors.transparent,
  elevation:           0,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
  dragHandleSize: const Size(40, 4),
);

SnackBarThemeData _snackTheme(Color bg) => SnackBarThemeData(
  behavior:         SnackBarBehavior.floating,
  backgroundColor:  bg,
  contentTextStyle: const TextStyle(
    fontFamily: 'Inter', color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
  shape:            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
  elevation:        4,
  insetPadding:     const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
);

// ── Theme ─────────────────────────────────────────────────────────────────────

class AppTheme {
  static ThemeData light() {
    const onSurface        = Color(0xFF0F172A);
    const onSurfaceVariant = Color(0xFF64748B);

    final cs = ColorScheme.fromSeed(
      seedColor:  _kSeed,
      brightness: Brightness.light,
    ).copyWith(
      surface:           _kBgLight,
      surfaceContainer:  _kCardLight,
      onSurface:         onSurface,
      onSurfaceVariant:  onSurfaceVariant,
      outlineVariant:    const Color(0xFFE2E8F0),
      primary:           _kSeed,
      onPrimary:         Colors.white,
    );

    return ThemeData(
      useMaterial3:            true,
      colorScheme:             cs,
      fontFamily:              'Inter',
      scaffoldBackgroundColor: _kBgLight,
      textTheme:               _buildTextTheme(onSurface, onSurfaceVariant),

      appBarTheme: AppBarTheme(
        centerTitle:           false,
        elevation:             0,
        scrolledUnderElevation: 0.5,
        backgroundColor:       _kCardLight,
        foregroundColor:       onSurface,
        shadowColor:           Colors.black.withValues(alpha: 0.06),
        systemOverlayStyle:    const SystemUiOverlayStyle(
          statusBarColor:               Colors.transparent,
          statusBarIconBrightness:      Brightness.dark,
          systemNavigationBarColor:     _kBgLight,
          systemNavigationBarIconBrightness: Brightness.dark,
        ),
        titleTextStyle: const TextStyle(
          fontFamily: 'Inter', color: onSurface,
          fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.1),
      ),

      cardTheme: CardThemeData(
        elevation:        0,
        color:            _kCardLight,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        margin: EdgeInsets.zero,
      ),

      inputDecorationTheme: _inputTheme(
        _kCardLight,
        const Color(0xFFE2E8F0),
        _kSeed,
        onSurfaceVariant,
        const Color(0xFF94A3B8),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _kSeed,
          foregroundColor: Colors.white,
          minimumSize:     const Size(double.infinity, 52),
          shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 15, fontWeight: FontWeight.w700),
          elevation: 0,
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(88, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(88, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          side: const BorderSide(color: Color(0xFFE2E8F0), width: 1.5),
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      bottomSheetTheme: _sheetTheme(_kCardLight),
      snackBarTheme:    _snackTheme(const Color(0xFF1E293B)),

      listTileTheme: const ListTileThemeData(
        contentPadding:  EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        minLeadingWidth: 24,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500, color: onSurface),
        subtitleTextStyle: TextStyle(
          fontFamily: 'Inter', fontSize: 12, color: onSurfaceVariant),
      ),

      dividerTheme: const DividerThemeData(
        color: Color(0xFFE2E8F0), thickness: 1, space: 1),

      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFF1F5F9),
        selectedColor:   _kSeed.withValues(alpha: 0.12),
        side:            const BorderSide(color: Color(0xFFE2E8F0)),
        shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: const TextStyle(
          fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500),
      ),

      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected) ? _kSeed : Colors.white),
        trackColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected)
                ? _kSeed.withValues(alpha: 0.30)
                : const Color(0xFFCBD5E1)),
      ),

      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: _kSeed, linearMinHeight: 3),
    );
  }

  // ── Dark theme ───────────────────────────────────────────────────────────────

  static ThemeData dark() {
    const onSurface        = Color(0xFFF1F5F9);
    const onSurfaceVariant = Color(0xFF94A3B8);
    const primary          = Color(0xFF818CF8);

    final cs = ColorScheme.fromSeed(
      seedColor:  _kSeed,
      brightness: Brightness.dark,
    ).copyWith(
      surface:           _kBgDark,
      surfaceContainer:  _kCardDark,
      onSurface:         onSurface,
      onSurfaceVariant:  onSurfaceVariant,
      outlineVariant:    const Color(0xFF334155),
      primary:           primary,
      onPrimary:         Colors.white,
    );

    return ThemeData(
      useMaterial3:            true,
      colorScheme:             cs,
      fontFamily:              'Inter',
      scaffoldBackgroundColor: _kBgDark,
      textTheme:               _buildTextTheme(onSurface, onSurfaceVariant),

      appBarTheme: AppBarTheme(
        centerTitle:           false,
        elevation:             0,
        scrolledUnderElevation: 0.5,
        backgroundColor:       _kBgDark,
        foregroundColor:       onSurface,
        shadowColor:           Colors.black.withValues(alpha: 0.3),
        systemOverlayStyle:    const SystemUiOverlayStyle(
          statusBarColor:               Colors.transparent,
          statusBarIconBrightness:      Brightness.light,
          systemNavigationBarColor:     _kBgDark,
          systemNavigationBarIconBrightness: Brightness.light,
        ),
        titleTextStyle: const TextStyle(
          fontFamily: 'Inter', color: onSurface,
          fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.1),
      ),

      cardTheme: CardThemeData(
        elevation:        0,
        color:            _kCardDark,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF334155)),
        ),
        margin: EdgeInsets.zero,
      ),

      inputDecorationTheme: _inputTheme(
        _kCardDark,
        const Color(0xFF334155),
        primary,
        onSurfaceVariant,
        const Color(0xFF475569),
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4F46E5),
          foregroundColor: Colors.white,
          minimumSize:     const Size(double.infinity, 52),
          shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 15, fontWeight: FontWeight.w700),
          elevation: 0,
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size(88, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(88, 48),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          side: const BorderSide(color: Color(0xFF334155), width: 1.5),
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w600),
        ),
      ),

      bottomSheetTheme: _sheetTheme(_kCardDark),
      snackBarTheme:    _snackTheme(const Color(0xFF334155)),

      listTileTheme: const ListTileThemeData(
        contentPadding:  EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        minLeadingWidth: 24,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter', fontSize: 14, fontWeight: FontWeight.w500, color: onSurface),
        subtitleTextStyle: TextStyle(
          fontFamily: 'Inter', fontSize: 12, color: onSurfaceVariant),
      ),

      dividerTheme: const DividerThemeData(
        color: Color(0xFF334155), thickness: 1, space: 1),

      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFF1E293B),
        selectedColor:   const Color(0xFF4F46E5).withValues(alpha: 0.2),
        side:            const BorderSide(color: Color(0xFF334155)),
        shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: const TextStyle(
          fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w500),
      ),

      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          textStyle: const TextStyle(
            fontFamily: 'Inter', fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ),

      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected) ? primary : const Color(0xFF94A3B8)),
        trackColor: WidgetStateProperty.resolveWith((s) =>
            s.contains(WidgetState.selected)
                ? primary.withValues(alpha: 0.30)
                : const Color(0xFF334155)),
      ),

      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: primary, linearMinHeight: 3),
    );
  }
}
