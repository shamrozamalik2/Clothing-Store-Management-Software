const String kAppName = 'SAS Garments';
const String kDefaultApiUrl = 'https://api.probusinesscloud.com/api';

// Hive box names
const String kBoxPendingSales   = 'pending_sales';
const String kBoxSettings       = 'settings';
const String kBoxProducts       = 'cached_products';
const String kBoxNotifications  = 'sale_notifications';

// Max stored notifications
const int kMaxNotifications = 100;

// Pagination
const int kDefaultPageSize = 20;

// Timeouts
const Duration kConnectTimeout = Duration(seconds: 15);
const Duration kReceiveTimeout = Duration(seconds: 30);

// Receipt widths
const int kPrinterWidth58mm = 32;
const int kPrinterWidth80mm = 48;
