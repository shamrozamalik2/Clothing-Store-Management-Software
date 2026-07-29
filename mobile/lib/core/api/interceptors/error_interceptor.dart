import 'package:dio/dio.dart';
import '../../errors/app_exception.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final message = _extractMessage(err);
    final code    = _extractCode(err);

    AppException mapped;
    switch (err.response?.statusCode) {
      case 401:
        mapped = UnauthorizedException(message, code: code);
      case 404:
        mapped = NotFoundException(message, code: code);
      case 422:
        mapped = ValidationException(message, code: code);
      case >= 500:
        mapped = ServerException(message, code: code);
      default:
        if (err.type == DioExceptionType.connectionTimeout ||
            err.type == DioExceptionType.receiveTimeout ||
            err.type == DioExceptionType.connectionError) {
          mapped = NetworkException('No internet connection or server is unreachable.');
        } else {
          mapped = AppException(message, code: code);
        }
    }

    handler.next(err.copyWith(error: mapped));
  }

  String _extractMessage(DioException err) {
    try {
      final data = err.response?.data;
      if (data is Map) return data['message'] as String? ?? err.message ?? 'Unknown error';
    } catch (_) {}
    return err.message ?? 'Unknown error';
  }

  String? _extractCode(DioException err) {
    try {
      final data = err.response?.data;
      if (data is Map) return data['code'] as String?;
    } catch (_) {}
    return null;
  }
}
