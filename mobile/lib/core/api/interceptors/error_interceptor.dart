import 'package:dio/dio.dart';
import '../../errors/app_exception.dart';

class ErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    final message = _extractMessage(err);
    final code    = _extractCode(err);

    final status = err.response?.statusCode;
    AppException mapped;
    if (status == 401) {
      mapped = UnauthorizedException(message, code: code);
    } else if (status == 404) {
      mapped = NotFoundException(message, code: code);
    } else if (status == 422) {
      mapped = ValidationException(message, code: code);
    } else if (status != null && status >= 500) {
      mapped = ServerException(message, code: code);
    } else if (err.type == DioExceptionType.receiveTimeout) {
      mapped = const NetworkException(
        'Server is taking too long to respond. It may be waking up — please try again in a moment.',
      );
    } else if (err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.connectionError) {
      mapped = const NetworkException('No internet connection or server is unreachable.');
    } else {
      mapped = AppException(message, code: code);
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
