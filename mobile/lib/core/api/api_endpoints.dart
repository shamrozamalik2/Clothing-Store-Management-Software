class ApiEndpoints {
  // Auth
  static const String login          = '/auth/login';
  static const String refresh        = '/auth/refresh';
  static const String logout         = '/auth/logout';
  static const String me             = '/auth/me';

  // Dashboard
  static const String dashboardStats = '/reports/dashboard';

  // Products
  static const String products       = '/products';
  static String product(int id)      => '/products/$id';

  // Categories
  static const String categories     = '/categories';

  // Brands
  static const String brands         = '/brands';

  // Customers
  static const String customers      = '/customers';
  static String customer(int id)     => '/customers/$id';

  // Sales
  static const String sales          = '/sales';
  static String sale(int id)         => '/sales/$id';

  // Purchases
  static const String purchases      = '/purchases';

  // Suppliers
  static const String suppliers      = '/suppliers';

  // Reports
  static const String reportOverview        = '/reports/overview';
  static const String reportDailySales      = '/reports/daily-sales';
  static const String reportTopProducts     = '/reports/top-products';
  static const String reportPaymentMethods  = '/reports/payment-methods';
  static const String reportStock           = '/reports/stock';
  static const String reportStaff          = '/reports/staff';
  // legacy aliases kept for reference
  static const String reportSales    = '/reports/overview';
  static const String reportProducts = '/reports/top-products';
  static const String reportProfit   = '/reports/payment-methods';

  // Settings
  static const String settings       = '/settings';

  // Users
  static const String users          = '/users';
  static const String fcmToken       = '/users/me/fcm-token';

  // Returns
  static const String returns        = '/returns';

  // Expenses
  static const String expenses       = '/expenses';
}
