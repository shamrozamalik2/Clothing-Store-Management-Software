import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../models/user_model.dart';

class AuthRemoteSource {
  const AuthRemoteSource(this._api);
  final ApiClient _api;

  Future<({String accessToken, String refreshToken, UserModel user})> login({
    required String slug,
    required String email,
    required String password,
  }) async {
    final res = await _api.post(ApiEndpoints.login, data: {
      'slug':     slug,
      'email':    email,
      'password': password,
    });
    final data  = res.data['data'] as Map<String, dynamic>;
    final token = data['token']        as String;
    final rt    = data['refreshToken'] as String? ?? '';
    final user  = UserModel.fromJson(data['user'] as Map<String, dynamic>);
    return (accessToken: token, refreshToken: rt, user: user);
  }

  Future<UserModel> getMe() async {
    final res  = await _api.get(ApiEndpoints.me);
    final data = res.data['data'] as Map<String, dynamic>;
    return UserModel.fromJson(data);
  }

  Future<void> logout() async {
    try { await _api.post(ApiEndpoints.logout); } catch (_) {}
  }
}
