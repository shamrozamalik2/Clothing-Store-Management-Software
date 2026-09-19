import 'dart:async';
import 'package:dio/dio.dart';
import '../../auth/auth_event_bus.dart';
import '../../constants/storage_keys.dart';
import '../../storage/secure_storage.dart';
import '../api_endpoints.dart';

/// Extra key that marks the refresh request so the interceptor skips it,
/// preventing recursive 401 handling.
const _kSkipAuth = '_skipAuth';

/// 401 codes that indicate a real account problem — don't attempt a refresh.
const _kNonRefreshableCodes = {
  'COMPANY_SUSPENDED',
  'COMPANY_EXPIRED',
  'TRIAL_EXPIRED',
};

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._storage, this._dio);

  final SecureStorageService _storage;
  final Dio                  _dio;

  // ── Single-flight refresh guard ──────────────────────────────────────────────
  // At most one refresh request is in flight at a time.
  // Any other request that receives 401 while a refresh is in progress waits
  // for the same Completer rather than firing its own refresh.

  bool               _isRefreshing      = false;
  Completer<String?>? _refreshCompleter;

  // ── Attach access token to every request ─────────────────────────────────────

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // The refresh call is already marked — don't add/overwrite its headers.
    if (options.extra[_kSkipAuth] != true) {
      final token = await _storage.getAccessToken();
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  // ── Handle 401 errors ────────────────────────────────────────────────────────

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    // Never intercept our own refresh request.
    if (err.requestOptions.extra[_kSkipAuth] == true) {
      return handler.next(err);
    }

    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    final data = err.response?.data as Map?;
    final code = data?['code'] as String?;

    // Subscription / account problems — pass through so the UI can show the
    // specific message (e.g. "Your subscription has expired").
    if (code != null && _kNonRefreshableCodes.contains(code)) {
      return handler.next(err);
    }

    // ── Attempt token refresh (single-flight) ─────────────────────────────────

    if (_isRefreshing) {
      // Another request already started a refresh — wait for its result.
      final newToken = await _refreshCompleter!.future;
      if (newToken != null) {
        try {
          final retried = await _dio.fetch(
            err.requestOptions
              ..headers['Authorization'] = 'Bearer $newToken',
          );
          return handler.resolve(retried);
        } catch (_) {}
      }
      return handler.next(err);
    }

    _isRefreshing      = true;
    _refreshCompleter  = Completer<String?>();

    try {
      // Mark request so this interceptor ignores any 401 on the refresh call.
      final res = await _dio.post(
        ApiEndpoints.refresh,
        options: Options(extra: {_kSkipAuth: true}),
      );

      final newToken = res.data?['data']?['token'] as String?;

      if (newToken == null) {
        _refreshCompleter!.complete(null);
        _onRefreshFailed();
        return handler.next(err);
      }

      await _storage.write(kKeyAccessToken, newToken);
      _refreshCompleter!.complete(newToken);

      final retried = await _dio.fetch(
        err.requestOptions
          ..headers['Authorization'] = 'Bearer $newToken',
      );
      return handler.resolve(retried);
    } catch (_) {
      // Refresh request failed (network error, invalid cookie, etc.)
      // Also catches if the retry-after-refresh threw — but in that case the
      // Completer was already completed with the new token, so skip it.
      if (!_refreshCompleter!.isCompleted) {
        _refreshCompleter!.complete(null);
        _onRefreshFailed();
      }
      return handler.next(err);
    } finally {
      _isRefreshing     = false;
      _refreshCompleter = null;
    }
  }

  // ── Permanent failure ─────────────────────────────────────────────────────────

  Future<void> _onRefreshFailed() async {
    try {
      await _storage.clearTokens();
      await _storage.delete(kKeyUser);
    } catch (_) {}
    // Signal auth state to navigate to Login
    AuthEventBus.instance.emit(AuthEvent.sessionExpired);
  }
}
