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

  final int     id;
  final String  name;
  final String? email;
  final String? phone;
  final String? address;
  final int?    loyaltyPoints;
  final double? outstandingBalance;
  final double? totalPurchases;
  final bool?   isActive;

  factory CustomerModel.fromJson(Map<String, dynamic> j) => CustomerModel(
    id:                 j['id']                  as int,
    name:               j['name']?.toString()    ?? '',
    email:              j['email']?.toString(),
    phone:              j['phone']?.toString(),
    address:            j['address']?.toString(),
    loyaltyPoints:      (j['loyalty_points']      as num?)?.toInt(),
    outstandingBalance: (j['outstanding_balance'] as num?)?.toDouble(),
    totalPurchases:     (j['total_purchases']     as num?)?.toDouble(),
    isActive:           j['is_active']            as bool?,
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
