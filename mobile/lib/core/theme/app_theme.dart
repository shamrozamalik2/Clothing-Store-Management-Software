import 'package:flutter/material.dart';

const _seed = Color(0xFF6366F1); // indigo — matches the web app

class AppTheme {
  static ThemeData light() => ThemeData(
    useMaterial3:  true,
    colorScheme:   ColorScheme.fromSeed(
      seedColor:   _seed,
      brightness:  Brightness.light,
    ),
    fontFamily:    'Inter',
    cardTheme:     const CardThemeData(elevation: 0),
    appBarTheme:   const AppBarTheme(centerTitle: false, elevation: 0),
    inputDecorationTheme: InputDecorationTheme(
      filled:       true,
      border:       OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize:  const Size(double.infinity, 52),
        shape:        RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle:    const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );

  static ThemeData dark() => ThemeData(
    useMaterial3:  true,
    colorScheme:   ColorScheme.fromSeed(
      seedColor:   _seed,
      brightness:  Brightness.dark,
    ),
    fontFamily:    'Inter',
    scaffoldBackgroundColor: const Color(0xFF0F172A),
    cardTheme: CardThemeData(
      elevation: 0,
      color: const Color(0xFF1E293B),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    appBarTheme: const AppBarTheme(
      centerTitle: false,
      elevation:   0,
      backgroundColor: Color(0xFF0F172A),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled:      true,
      fillColor:   const Color(0xFF1E293B),
      border:      OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        minimumSize:  const Size(double.infinity, 52),
        shape:        RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle:    const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
