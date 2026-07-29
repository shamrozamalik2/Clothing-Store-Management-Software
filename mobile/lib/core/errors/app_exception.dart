class AppException implements Exception {
  const AppException(this.message, {this.code});
  final String message;
  final String? code;

  @override
  String toString() => 'AppException($code): $message';
}

class NetworkException extends AppException {
  const NetworkException(super.message, {super.code});
}

class UnauthorizedException extends AppException {
  const UnauthorizedException(super.message, {super.code});
}

class NotFoundException extends AppException {
  const NotFoundException(super.message, {super.code});
}

class ValidationException extends AppException {
  const ValidationException(super.message, {super.code});
}

class ServerException extends AppException {
  const ServerException(super.message, {super.code});
}
