import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

// PBC brand seed — indigo-500, matches the web primary colour
const _kSeed = Color(0xFF4F46E5); // indigo-600

// PBC design palette
const _kCardLight  = Color(0xFFFFFFFF); // white cards on light bg
const _kBgLight    = Color(0xFFF1F5F9); // slate-100 page background
const _kCardDark   = Color(0xFF1E293B); // slate-800 cards on dark bg
const _kBgDark     = Color(0xFF0F172A); // slate-900 page background

class AppTheme {
  // ── Light theme ──────────────────────────────────────────────────────────────
  static ThemeData light() {
    final cs = ColorScheme.fromSeed(
      seedColor:  _kSeed,
      brightness: Brightness.light,
    ).copyWith(
      surface:           _kBgLight,
      surfaceContainer:  _kCardLight,
      onSurface:         const Color(0xFF0F172A), // slate-900
      onSurfaceVariant:  const Color(0xFF64748B), // slate-500
      outlineVariant:    const Color(0xFFE2E8F0), // slate-200
      primary:           _kSeed,
      onPrimary:         Colors.white,
    );

    return ThemeData(
      useMaterial3:         true,
      colorScheme:          cs,
      scaffoldBackgroundColor: _kBgLight,
      fontFamily:           'Inter',

      // App bar — clean white
      appBarTheme: AppBarTheme(
        centerTitle:     false,
        elevation:       0,
        scrolledUnderElevation: 1,
        backgroundColor: _kCardLight,
        foregroundColor: const Color(0xFF0F172A),
        shadowColor:     Colors.black.withValues(alpha: 0.06),
        systemOverlayStyle: SystemUiOverlayStyle.dark,
        titleTextStyle:  const TextStyle(
          color:      Color(0xFF0F172A),
          fontSize:   16,
          fontWeight: FontWeight.w700,
          fontFamily: 'Inter',
        ),
      ),

      // Cards — white with subtle border
      cardTheme: CardThemeData(
        elevation: 0,
        color:     _kCardLight,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        margin: const EdgeInsets.all(0),
      ),

      // Inputs
      inputDecorationTheme: InputDecorationTheme(
        filled:        true,
        fillColor:     _kCardLight,
        border:        OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   const BorderSide(color: Color(0xFFE2E8F0)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   BorderSide(color: _kSeed, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   const BorderSide(color: Color(0xFFEF4444)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle:    const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w500),
        hintStyle:     const TextStyle(color: Color(0xFF94A3B8)),
        prefixIconColor: const Color(0xFF94A3B8),
      ),

      // Buttons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _kSeed,
          foregroundColor: Colors.white,
          minimumSize:     const Size(double.infinity, 52),
          shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle:       const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, fontFamily: 'Inter'),
          elevation:       0,
        ),
      ),

      // List tiles
      listTileTheme: const ListTileThemeData(
        contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 2),
        minLeadingWidth: 24,
      ),

      // Dividers
      dividerTheme: const DividerThemeData(
        color:     Color(0xFFE2E8F0),
        thickness: 1,
        space:     1,
      ),

      // Chips
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFFF1F5F9),
        selectedColor:   _kSeed.withValues(alpha: 0.12),
        side: const BorderSide(color: Color(0xFFE2E8F0)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      ),
    );
  }

  // ── Dark theme ───────────────────────────────────────────────────────────────
  static ThemeData dark() {
    final cs = ColorScheme.fromSeed(
      seedColor:  _kSeed,
      brightness: Brightness.dark,
    ).copyWith(
      surface:           _kBgDark,
      surfaceContainer:  _kCardDark,
      onSurface:         const Color(0xFFF1F5F9),
      onSurfaceVariant:  const Color(0xFF94A3B8),
      outlineVariant:    const Color(0xFF334155),
      primary:           const Color(0xFF818CF8), // indigo-400 lighter for dark
      onPrimary:         Colors.white,
    );

    return ThemeData(
      useMaterial3:         true,
      colorScheme:          cs,
      scaffoldBackgroundColor: _kBgDark,
      fontFamily:           'Inter',

      // App bar — dark
      appBarTheme: AppBarTheme(
        centerTitle:     false,
        elevation:       0,
        scrolledUnderElevation: 1,
        backgroundColor: _kBgDark,
        foregroundColor: const Color(0xFFF1F5F9),
        shadowColor:     Colors.black.withValues(alpha: 0.3),
        systemOverlayStyle: SystemUiOverlayStyle.light,
        titleTextStyle:  const TextStyle(
          color:      Color(0xFFF1F5F9),
          fontSize:   16,
          fontWeight: FontWeight.w700,
          fontFamily: 'Inter',
        ),
      ),

      // Cards
      cardTheme: CardThemeData(
        elevation: 0,
        color:     _kCardDark,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
          side: const BorderSide(color: Color(0xFF334155)),
        ),
        margin: const EdgeInsets.all(0),
      ),

      // Inputs
      inputDecorationTheme: InputDecorationTheme(
        filled:       true,
        fillColor:    _kCardDark,
        border:       OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   const BorderSide(color: Color(0xFF334155)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   const BorderSide(color: Color(0xFF334155)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   const BorderSide(color: Color(0xFF818CF8), width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide:   const BorderSide(color: Color(0xFFEF4444)),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        labelStyle:    const TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w500),
        hintStyle:     const TextStyle(color: Color(0xFF475569)),
        prefixIconColor: const Color(0xFF64748B),
      ),

      // Buttons
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF4F46E5),
          foregroundColor: Colors.white,
          minimumSize:     const Size(double.infinity, 52),
          shape:           RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle:       const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, fontFamily: 'Inter'),
          elevation:       0,
        ),
      ),

      // Dividers
      dividerTheme: const DividerThemeData(
        color:     Color(0xFF334155),
        thickness: 1,
        space:     1,
      ),

      // Chips
      chipTheme: ChipThemeData(
        backgroundColor: const Color(0xFF1E293B),
        selectedColor:   const Color(0xFF4F46E5).withValues(alpha: 0.2),
        side: const BorderSide(color: Color(0xFF334155)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
      ),
    );
  }
}