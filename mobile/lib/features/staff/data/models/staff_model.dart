class StaffStat {
  const StaffStat({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.saleCount,
    required this.revenue,
    required this.collected,
  });

  final int    id;
  final String name;
  final String email;
  final String role;
  final int    saleCount;
  final double revenue;
  final double collected;

  static double _d(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  static int _i(dynamic v) =>
      v is num ? v.toInt() : int.tryParse('$v') ?? 0;

  factory StaffStat.fromJson(Map<String, dynamic> j) => StaffStat(
    id:        _i(j['id']),
    name:      j['name']?.toString()  ?? '',
    email:     j['email']?.toString() ?? '',
    role:      j['role']?.toString()  ?? 'staff',
    saleCount: _i(j['sale_count']),
    revenue:   _d(j['revenue']),
    collected: _d(j['collected']),
  );
}
