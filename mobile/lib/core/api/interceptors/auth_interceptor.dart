import 'dart:async';
import 'package:dio/dio.dart';
import '../../constants/storage_keys.dart';
import '../../storage/secure_storage.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._storage, this._dio);

  final SecureStorageService _storage;
  final Dio _dio;

  // Prevents concurrent token refreshes when multiple requests get 401
  bool _isRefreshing = false;
  Completer<String?>? _refreshCompleter;

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      final data = err.response?.data as Map?;
      final code = data?['code'] as String?;

      if (code == 'TOKEN_EXPIRED') {
        // If a refresh is already in flight, wait for it instead of firing another
        if (_isRefreshing) {
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

        _isRefreshing = true;
        _refreshCompleter = Completer<String?>();

        try {
          final res = await _dio.post('/auth/refresh');
          final newToken = res.data['data']?['token'] as String?;

          if (newToken == null) {
            _refreshCompleter!.complete(null);
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
          await _storage.clearTokens();
          _refreshCompleter!.complete(null);
        } finally {
          _isRefreshing = false;
          _refreshCompleter = null;
        }
      }
    }
    handler.next(err);
  }
}
