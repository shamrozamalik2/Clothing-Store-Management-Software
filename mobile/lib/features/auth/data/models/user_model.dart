import '../../domain/entities/user_entity.dart';

class UserModel extends UserEntity {
  const UserModel({
    required super.id,
    required super.name,
    required super.email,
    required super.companyId,
    required super.companySlug,
    required super.companyName,
    required super.roleName,
    required super.permissions,
    super.avatar,
    super.phone,
  });

  static String _s(dynamic v) => v?.toString() ?? '';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final roleName  = json['role']        as String?
                   ?? json['role_name']   as String? ?? '';
    final perms     = json['permissions'] as Map<String, dynamic>? ?? {};
    final companyId = _s(json['companyId'] ?? json['company_id']);

    return UserModel(
      id:          _s(json['id']),
      name:        json['name']?.toString()  ?? '',
      email:       json['email']?.toString() ?? '',
      companyId:   companyId,
      companySlug: json['companySlug']?.toString()  ?? json['company_slug']?.toString()  ?? '',
      companyName: json['companyName']?.toString() ?? json['company_name']?.toString() ?? '',
      roleName:    roleName,
      permissions: perms,
      avatar:      json['avatar']?.toString(),
      phone:       json['phone']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
    'id':          id,
    'name':        name,
    'email':       email,
    'companyId':   companyId,
    'companySlug': companySlug,
    'companyName': companyName,
    'role':        roleName,
    'permissions': permissions,
    'avatar':      avatar,
    'phone':       phone,
  };
}
