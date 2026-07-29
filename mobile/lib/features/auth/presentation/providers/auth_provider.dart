import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/user_model.dart';
import '../../data/sources/auth_remote_source.dart';
import '../../domain/entities/user_entity.dart';
import '../../../../core/api/api_client.dart';
import '../../../../core/storage/secure_storage.dart';
import '../../../../core/constants/storage_keys.dart';

// ── Providers ─────────────────────────────────────────────────────────────────

final authRemoteSourceProvider = Provider<AuthRemoteSource>((ref) {
  return AuthRemoteSource(ref.watch(apiClientProvider));
});

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(
    ref.watch(authRemoteSourceProvider),
    ref.watch(secureStorageProvider),
  );
});

// ── State ─────────────────────────────────────────────────────────────────────

sealed class AuthState {}
class AuthLoading    extends AuthState {}
class AuthUnauthenticated extends AuthState {}
class AuthAuthenticated  extends AuthState {
  AuthAuthenticated(this.user);
  final UserEntity user;
}
class AuthError extends AuthState {
  AuthError(this.message);
  final String message;
}

// ── Notifier ──────────────────────────────────────────────────────────────────

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier(this._source, this._storage) : super(AuthLoading()) {
    _tryRestore();
  }

  final AuthRemoteSource _source;
  final SecureStorageService _storage;

  Future<void> _tryRestore() async {
    final token = await _storage.getAccessToken();
    final json  = await _storage.read(kKeyUser);
    if (token != null && json != null) {
      try {
        final user = UserModel.fromJson(
          jsonDecode(json) as Map<String, dynamic>,
        );
        state = AuthAuthenticated(user);
        return;
      } catch (_) {}
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
      await _storage.saveTokens(
        accessToken:  result.accessToken,
        refreshToken: result.refreshToken,
      );
      await _storage.write(kKeyUser,        jsonEncode(result.user.toJson() as Map));
      await _storage.write(kKeyCompanySlug, slug);
      if (remember) await _storage.write(kKeyRememberLogin, 'true');
      state = AuthAuthenticated(result.user);
    } catch (e) {
      state = AuthError(e.toString().replaceFirst('AppException(null): ', ''));
    }
  }

  Future<void> logout() async {
    await _source.logout();
    await _storage.clearTokens();
    await _storage.delete(kKeyUser);
    state = AuthUnauthenticated();
  }

  UserEntity? get currentUser =>
      state is AuthAuthenticated ? (state as AuthAuthenticated).user : null;
}

// Convenience provider
final currentUserProvider = Provider<UserEntity?>((ref) {
  final s = ref.watch(authProvider);
  return s is AuthAuthenticated ? s.user : null;
});
