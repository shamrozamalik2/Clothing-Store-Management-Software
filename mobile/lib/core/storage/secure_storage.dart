import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../constants/storage_keys.dart';

final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

class SecureStorageService {
  static const _opts = AndroidOptions(encryptedSharedPreferences: true);
  final _storage = const FlutterSecureStorage(aOptions: _opts);

  Future<void>   write(String key, String value) => _storage.write(key: key, value: value);
  Future<String?> read(String key)               => _storage.read(key: key);
  Future<void>   delete(String key)              => _storage.delete(key: key);
  Future<void>   deleteAll()                     => _storage.deleteAll();

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      write(kKeyAccessToken,  accessToken),
      write(kKeyRefreshToken, refreshToken),
    ]);
  }

  Future<String?> getAccessToken()  => read(kKeyAccessToken);
  Future<String?> getRefreshToken() => read(kKeyRefreshToken);

  Future<void> clearTokens() async {
    await Future.wait([
      delete(kKeyAccessToken),
      delete(kKeyRefreshToken),
    ]);
  }
}
