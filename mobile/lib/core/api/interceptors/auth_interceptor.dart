import 'package:dio/dio.dart';
import '../../constants/storage_keys.dart';
import '../../storage/secure_storage.dart';

class AuthInterceptor extends Interceptor {
  AuthInterceptor(this._storage, this._dio);

  final SecureStorageService _storage;
  final Dio _dio;

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
      final data   = err.response?.data as Map?;
      final code   = data?['code'] as String?;

      if (code == 'TOKEN_EXPIRED') {
        try {
          final refreshToken = await _storage.getRefreshToken();
          if (refreshToken == null) return handler.next(err);

          final res = await _dio.post(
            '/auth/refresh',
            options: Options(headers: {'Cookie': 'refreshToken=$refreshToken'}),
          );
          final newToken = res.data['data']?['token'] as String?;
          if (newToken == null) return handler.next(err);

          await _storage.write(kKeyAccessToken, newToken);

          final retried = await _dio.fetch(
            err.requestOptions..headers['Authorization'] = 'Bearer $newToken',
          );
          return handler.resolve(retried);
        } catch (_) {
          await _storage.clearTokens();
        }
      }
    }
    handler.next(err);
  }
}
