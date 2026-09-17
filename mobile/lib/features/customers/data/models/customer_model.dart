class CustomerModel {
  const CustomerModel({
    required this.id,
    required this.name,
    this.email,
    this.phone,
    this.address,
    this.loyaltyPoints,
    this.outstandingBalance,
    this.totalPurchases,
    this.isActive,
  });

  final String  id;
  final String  name;
  final String? email;
  final String? phone;
  final String? address;
  final int?    loyaltyPoints;
  final double? outstandingBalance;
  final double? totalPurchases;
  final bool?   isActive;

  static double _d(dynamic v) =>
      v is num ? v.toDouble() : double.tryParse('$v') ?? 0;
  static int _i(dynamic v) =>
      v is num ? v.toInt() : int.tryParse('$v') ?? 0;

  factory CustomerModel.fromJson(Map<String, dynamic> j) => CustomerModel(
    id:                 j['id']?.toString()             ?? '',
    name:               j['name']?.toString()           ?? '',
    email:              j['email']?.toString(),
    phone:              j['phone']?.toString(),
    address:            j['address']?.toString(),
    loyaltyPoints:      j['loyalty_points']      != null ? _i(j['loyalty_points'])      : null,
    outstandingBalance: j['outstanding_balance'] != null ? _d(j['outstanding_balance']) : null,
    totalPurchases:     j['total_purchases']     != null ? _d(j['total_purchases'])     : null,
    isActive:           j['is_active']           as bool?,
  );

  Map<String, dynamic> toJson() => {
    'id':                 id,
    'name':               name,
    if (email   != null) 'email':               email,
    if (phone   != null) 'phone':               phone,
    if (address != null) 'address':             address,
    if (loyaltyPoints      != null) 'loyalty_points':      loyaltyPoints,
    if (outstandingBalance != null) 'outstanding_balance': outstandingBalance,
    if (totalPurchases     != null) 'total_purchases':     totalPurchases,
    if (isActive           != null) 'is_active':           isActive,
  };
}
