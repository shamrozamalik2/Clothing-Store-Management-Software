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

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final company = json['company'] as Map<String, dynamic>? ?? {};
    final role    = json['role']    as Map<String, dynamic>? ?? {};
    final perms   = role['permissions'] as Map<String, dynamic>? ?? {};

    return UserModel(
      id:          json['id'] as int,
      name:        json['name'] as String,
      email:       json['email'] as String,
      companyId:   json['company_id'] as int,
      companySlug: company['slug'] as String? ?? '',
      companyName: company['name'] as String? ?? '',
      roleName:    role['name']   as String? ?? '',
      permissions: perms,
      avatar:      json['avatar'] as String?,
      phone:       json['phone']  as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id':         id,
    'name':       name,
    'email':      email,
    'company_id': companyId,
    'avatar':     avatar,
    'phone':      phone,
    'company': {'slug': companySlug, 'name': companyName},
    'role':    {'name': roleName,    'permissions': permissions},
  };
}
