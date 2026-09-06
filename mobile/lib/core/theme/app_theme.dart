import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

// ── Brand seeds ───────────────────────────────────────────────────────────────

const _kPrimary           = Color(0xFF4F46E5); // indigo-600
const _kPrimaryContainer  = Color(0xFFE8E7FF);
const _kSecondary         = Color(0xFF7C3AED); // violet-600
const _kSecondaryContainer= Color(0xFFF3E8FF);
const _kTertiary          = Color(0xFF0EA5E9); // sky-500
const _kTertiaryContainer = Color(0xFFE0F2FE);
const _kError             = Color(0xFFEF4444);

// ── Typography (Plus Jakarta Sans — rounded, modern display face) ─────────────

TextTheme _buildTextTheme() {
  // ignore: prefer_const_declarations
  final g = GoogleFonts.plusJakartaSans;
  return TextTheme(
    displayLarge:  g(fontSize: 57, fontWeight: FontWeight.w800, letterSpacing: -0.5, height: 1.12),
    displayMedium: g(fontSize: 45, fontWeight: FontWeight.w700, letterSpacing: -0.4, height: 1.16),
    displaySmall:  g(fontSize: 36, fontWeight: FontWeight.w700, letterSpacing: -0.3, height: 1.2),
    headlineLarge: g(fontSize: 32, fontWeight: FontWeight.w700, letterSpacing: -0.3, height: 1.25),
    headlineMedium:g(fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: -0.2, height: 1.28),
    headlineSmall: g(fontSize: 24, fontWeight: FontWeight.w700, letterSpacing: -0.2, height: 1.3),
    titleLarge:    g(fontSize: 20, fontWeight: FontWeight.w700, letterSpacing: -0.1, height: 1.4),
    titleMedium:   g(fontSize: 16, fontWeight: FontWeight.w600, height: 1.4),
    titleSmall:    g(fontSize: 14, fontWeight: FontWeight.w600, height: 1.4),
    bodyLarge:     g(fontSize: 16, fontWeight: FontWeight.w400, height: 1.5),
    bodyMedium:    g(fontSize: 14, fontWeight: FontWeight.w400, height: 1.5),
    bodySmall:     g(fontSize: 12, fontWeight: FontWeight.w400, letterSpacing: 0.1, height: 1.4),
    labelLarge:    g(fontSize: 14, fontWeight: FontWeight.w600, height: 1.4),
    labelMedium:   g(fontSize: 12, fontWeight: FontWeight.w500, letterSpacing: 0.1, height: 1.4),
    labelSmall:    g(fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0.2, height: 1.4),
  );
}

// ── Shared sub-themes ─────────────────────────────────────────────────────────

const _kSubThemes = FlexSubThemesData(
  interactionEffects:                    true,
  tintedDisabledControls:                true,
  blendOnColors:                         true,
  useM2StyleDividerInM3:                 true,
  inputDecoratorBorderType:              FlexInputBorderType.outline,
  inputDecoratorRadius:                  12,
  inputDecoratorUnfocusedBorderIsColored: false,
  cardRadius:                            16,
  dialogRadius:                          20,
  bottomSheetRadius:                     24,
  elevatedButtonRadius:                  12,
  outlinedButtonRadius:                  12,
  filledButtonRadius:                    12,
  textButtonRadius:                      12,
  chipRadius:                            8,
  snackBarRadius:                        12,
  snackBarElevation:                     4,
  elevatedButtonSchemeColor:             SchemeColor.primary,
  elevatedButtonSecondarySchemeColor:    SchemeColor.onPrimary,
  outlinedButtonOutlineSchemeColor:      SchemeColor.outlineVariant,
  switchSchemeColor:                     SchemeColor.primary,
  checkboxSchemeColor:                   SchemeColor.primary,
  radioSchemeColor:                      SchemeColor.primary,
);

// ── System overlay helpers ────────────────────────────────────────────────────

const _kOverlayLight = SystemUiOverlayStyle(
  statusBarColor:                    Colors.transparent,
  statusBarIconBrightness:           Brightness.dark,
  systemNavigationBarColor:          Color(0xFFF1F5F9),
  systemNavigationBarIconBrightness: Brightness.dark,
);

const _kOverlayDark = SystemUiOverlayStyle(
  statusBarColor:                    Colors.transparent,
  statusBarIconBrightness:           Brightness.light,
  systemNavigationBarColor:          Color(0xFF0F172A),
  systemNavigationBarIconBrightness: Brightness.light,
);

// ── AppTheme ──────────────────────────────────────────────────────────────────

class AppTheme {
  static ThemeData light() {
    final tt = _buildTextTheme(); // not const — GoogleFonts generates at runtime
    final base = FlexThemeData.light(
      colors: const FlexSchemeColor(
        primary:            _kPrimary,
        primaryContainer:   _kPrimaryContainer,
        secondary:          _kSecondary,
        secondaryContainer: _kSecondaryContainer,
        tertiary:           _kTertiary,
        tertiaryContainer:  _kTertiaryContainer,
        error:              _kError,
        errorContainer:     Color(0xFFFFEDED),
      ),
      surface:             const Color(0xFFFFFFFF),
      scaffoldBackground:  const Color(0xFFF1F5F9),
      surfaceMode:         FlexSurfaceMode.levelSurfacesLowScaffold,
      blendLevel:          7,
      subThemesData:       _kSubThemes,
      visualDensity:       FlexColorScheme.comfortablePlatformDensity,
      useMaterial3:        true,
      textTheme:           tt,
      primaryTextTheme:    tt,
    );

    return base.copyWith(
      appBarTheme: base.appBarTheme.copyWith(
        systemOverlayStyle: _kOverlayLight,
        centerTitle:        false,
        elevation:          0,
        scrolledUnderElevation: 0.5,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: const Color(0xFF0F172A),
          fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.1),
      ),
      snackBarTheme: base.snackBarTheme.copyWith(
        behavior:         SnackBarBehavior.floating,
        contentTextStyle: GoogleFonts.plusJakartaSans(
          color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }

  static ThemeData dark() {
    final tt = _buildTextTheme();
    final base = FlexThemeData.dark(
      colors: const FlexSchemeColor(
        primary:            Color(0xFF818CF8),
        primaryContainer:   Color(0xFF3730A3),
        secondary:          Color(0xFFA78BFA),
        secondaryContainer: Color(0xFF5B21B6),
        tertiary:           Color(0xFF38BDF8),
        tertiaryContainer:  Color(0xFF0369A1),
        error:              Color(0xFFF87171),
        errorContainer:     Color(0xFF7F1D1D),
      ),
      surface:             const Color(0xFF1E293B),
      scaffoldBackground:  const Color(0xFF0F172A),
      surfaceMode:         FlexSurfaceMode.levelSurfacesLowScaffold,
      blendLevel:          13,
      subThemesData:       _kSubThemes,
      visualDensity:       FlexColorScheme.comfortablePlatformDensity,
      useMaterial3:        true,
      textTheme:           tt,
      primaryTextTheme:    tt,
    );

    return base.copyWith(
      appBarTheme: base.appBarTheme.copyWith(
        systemOverlayStyle: _kOverlayDark,
        centerTitle:        false,
        elevation:          0,
        scrolledUnderElevation: 0.5,
        titleTextStyle: GoogleFonts.plusJakartaSans(
          color: const Color(0xFFF1F5F9),
          fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: -0.1),
      ),
      snackBarTheme: base.snackBarTheme.copyWith(
        behavior:         SnackBarBehavior.floating,
        contentTextStyle: GoogleFonts.plusJakartaSans(
          color: Colors.white, fontSize: 13, fontWeight: FontWeight.w500),
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
    );
  }
}
