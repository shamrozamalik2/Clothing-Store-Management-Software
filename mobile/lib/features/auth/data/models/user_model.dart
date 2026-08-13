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
    // Backend returns role as a flat string and permissions as a flat object
    final roleName  = json['role']        as String?
                   ?? json['role_name']   as String? ?? '';
    final perms     = json['permissions'] as Map<String, dynamic>? ?? {};
    final companyId = (json['companyId']  ?? json['company_id']) as int;

    return UserModel(
      id:          json['id'] as int,
      name:        json['name'] as String,
      email:       json['email'] as String,
      companyId:   companyId,
      companySlug: json['companySlug'] as String? ?? json['company_slug'] as String? ?? '',
      companyName: json['companyName'] as String? ?? json['company_name'] as String? ?? '',
      roleName:    roleName,
      permissions: perms,
      avatar:      json['avatar'] as String?,
      phone:       json['phone']  as String?,
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
