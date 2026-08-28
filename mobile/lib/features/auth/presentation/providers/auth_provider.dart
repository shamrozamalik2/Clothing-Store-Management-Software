import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/user_model.dart';
import '../../data/sources/auth_remote_source.dart';
import '../../domain/entities/user_entity.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/api/api_endpoints.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/constants/storage_keys.dart';
import '../../../../core/services/notification_service.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final authRemoteSourceProvider = Provider<AuthRemoteSource>((ref) {
  return AuthRemoteSource(ref.watch(apiClientProvider));
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRemoteSourceProvider),
    ref.watch(secureStorageProvider),
    ref.watch(apiClientProvider),
  );
});

// ── State ─────────────────────────────────────────────────────────────────────

sealed class AuthState {}
class AuthLoading         extends AuthState {}
class AuthUnauthenticated extends AuthState {}
class AuthAuthenticated   extends AuthState {
  AuthAuthenticated(this.user);
  final UserEntity user;
}
class AuthError extends AuthState {
  AuthError(this.message);
  final String message;
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._source, this._storage, this._api) : super(AuthLoading()) {
    _tryRestore();
  }

  final AuthRemoteSource     _source;
  final SecureStorageService _storage;
  final ApiClient            _api;

  Future<void> _tryRestore() async {
    try {
      final token = await _storage.getAccessToken()
          .timeout(const Duration(seconds: 5));
      final json  = await _storage.read(kKeyUser)
          .timeout(const Duration(seconds: 5));
      if (token != null && json != null) {
        final user = UserModel.fromJson(
          jsonDecode(json) as Map<String, dynamic>,
        );
        state = AuthAuthenticated(user);
        _registerFcmToken();
        return;
      }
    } catch (_) {
      try { await _storage.deleteAll().timeout(const Duration(seconds: 3)); } catch (_) {}
    }
    state = AuthUnauthenticated();
  }

  Future<void> login({
    required String slug,
    required String email,
    required String password,
    bool remember = false,
  }) async {
    state = AuthLoading();
    try {
      final result = await _source.login(
        slug: slug, email: email, password: password,
      );
      await _storage.write(kKeyAccessToken, result.accessToken);
      await _storage.write(kKeyUser,        jsonEncode(result.user.toJson() as Map));
      await _storage.write(kKeyCompanySlug, slug);
      if (remember) await _storage.write(kKeyRememberLogin, 'true');
      state = AuthAuthenticated(result.user);
      _registerFcmToken();
    } catch (e) {
      state = AuthError(e.toString().replaceFirst('AppException(null): ', ''));
    }
  }

  Future<void> logout() async {
    _clearFcmToken();
    await _source.logout();
    await _storage.clearTokens();
    await _storage.delete(kKeyUser);
    state = AuthUnauthenticated();
  }

  // ── FCM token management ─────────────────────────────────────────────────

  Future<void> _registerFcmToken() async {
    try {
      final token = await NotificationService.getToken();
      if (token != null) {
        await _api.post(ApiEndpoints.fcmToken, data: {'token': token});
      }
    } catch (_) {}
  }

  Future<void> _clearFcmToken() async {
    try {
      await _api.post(ApiEndpoints.fcmToken, data: {'token': ''});
    } catch (_) {}
  }

  UserEntity? get currentUser =>
      state is AuthAuthenticated ? (state as AuthAuthenticated).user : null;
}

// Convenience provider
final currentUserProvider = Provider<UserEntity?>((ref) {
  final s = ref.watch(authProvider);
  return s is AuthAuthenticated ? s.user : null;
});
