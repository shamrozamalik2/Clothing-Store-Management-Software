const String kAppName = 'SAS Garments';
const String kDefaultApiUrl = 'https://api.probusinesscloud.com/api';

// Hive box names
const String kBoxPendingSales = 'pending_sales';
const String kBoxSettings     = 'settings';
const String kBoxProducts     = 'cached_products';

// Pagination
const int kDefaultPageSize = 20;

// Timeouts — receiveTimeout is 90s to survive Render.com free-tier cold starts
const Duration kConnectTimeout = Duration(seconds: 30);
const Duration kReceiveTimeout = Duration(seconds: 90);

// Receipt widths
const int kPrinterWidth58mm = 32;
const int kPrinterWidth80mm = 48;
