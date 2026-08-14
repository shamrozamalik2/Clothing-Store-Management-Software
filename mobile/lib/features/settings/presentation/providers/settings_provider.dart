import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../../core/constants/app_constants.dart';
import '../../../../core/constants/storage_keys.dart';
import '../../../../core/storage/secure_storage.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Theme mode
// ─────────────────────────────────────────────────────────────────────────────

final themeModeProvider =
    StateNotifierProvider<ThemeModeNotifier, ThemeMode>((ref) {
  return ThemeModeNotifier();
});

class ThemeModeNotifier extends StateNotifier<ThemeMode> {
  ThemeModeNotifier() : super(ThemeMode.light) {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(kKeyThemeMode);
    if (saved != null) {
      final parsed = ThemeMode.values.firstWhere(
        (m) => m.name == saved,
        orElse: () => ThemeMode.system,
      );
      state = parsed;
    }
  }

  Future<void> setMode(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(kKeyThemeMode, mode.name);
    state = mode;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// App / server URL
// ─────────────────────────────────────────────────────────────────────────────

final appUrlProvider =
    StateNotifierProvider<AppUrlNotifier, String>((ref) {
  return AppUrlNotifier(ref.watch(secureStorageProvider));
});

class AppUrlNotifier extends StateNotifier<String> {
  AppUrlNotifier(this._storage) : super(kDefaultApiUrl) {
    _load();
  }

  final SecureStorageService _storage;

  Future<void> _load() async {
    final saved = await _storage.read(kKeyApiUrl);
    if (saved != null && saved.trim().isNotEmpty) {
      state = saved.trim();
    }
  }

  Future<void> setUrl(String url) async {
    final trimmed = url.trim();
    if (trimmed.isEmpty) return;
    await _storage.write(kKeyApiUrl, trimmed);
    state = trimmed;
  }

  Future<void> resetToDefault() async {
    await _storage.delete(kKeyApiUrl);
    state = kDefaultApiUrl;
  }
}
