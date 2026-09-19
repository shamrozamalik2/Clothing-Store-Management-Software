import 'dart:async';

enum AuthEvent { sessionExpired }

/// Decoupled event bus so the Dio interceptor can signal auth failure
/// to the AuthNotifier without a circular provider dependency.
class AuthEventBus {
  static final AuthEventBus instance = AuthEventBus._();
  AuthEventBus._();

  final _controller = StreamController<AuthEvent>.broadcast();
  Stream<AuthEvent> get stream => _controller.stream;
  void emit(AuthEvent event) => _controller.add(event);
}
