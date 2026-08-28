import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:dio_cookie_manager/dio_cookie_manager.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/app_constants.dart';
import '../storage/secure_storage.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/error_interceptor.dart';

final _cookieJar = CookieJar();

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(secureStorageProvider));
});

class ApiClient {
  ApiClient(SecureStorageService storage) {
    _dio = Dio(BaseOptions(
      baseUrl:        kDefaultApiUrl,
      connectTimeout: kConnectTimeout,
      receiveTimeout: kReceiveTimeout,
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.addAll([
      CookieManager(_cookieJar),
      AuthInterceptor(storage, _dio),
      ErrorInterceptor(),
      LogInterceptor(
        requestBody:  false,
        responseBody: false,
        logPrint: (obj) {}, // silence in prod
      ),
    ]);
  }

  late final Dio _dio;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) => _dio.get<T>(path, queryParameters: queryParameters);

  Future<Response<T>> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) => _dio.post<T>(path, data: data, queryParameters: queryParameters);

  Future<Response<T>> put<T>(
    String path, {
    dynamic data,
  }) => _dio.put<T>(path, data: data);

  Future<Response<T>> patch<T>(
    String path, {
    dynamic data,
  }) => _dio.patch<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete<T>(path);

  void updateBaseUrl(String url) {
    _dio.options.baseUrl = url;
  }
}
