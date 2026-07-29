import 'package:equatable/equatable.dart';

class UserEntity extends Equatable {
  const UserEntity({
    required this.id,
    required this.name,
    required this.email,
    required this.companyId,
    required this.companySlug,
    required this.companyName,
    required this.roleName,
    required this.permissions,
    this.avatar,
    this.phone,
  });

  final int    id;
  final String name;
  final String email;
  final int    companyId;
  final String companySlug;
  final String companyName;
  final String roleName;
  final Map<String, dynamic> permissions;
  final String? avatar;
  final String? phone;

  bool get isAdmin   => roleName == 'admin' || roleName == 'owner';
  bool get isManager => roleName == 'manager' || isAdmin;

  bool can(String module, String action) {
    final mod = permissions[module];
    if (mod == null) return false;
    if (mod is Map) return mod[action] == true;
    return false;
  }

  @override
  List<Object?> get props => [id, email, companyId];
}
