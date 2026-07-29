const String kAppName = 'SAS Garments';
const String kDefaultApiUrl = 'https://clothing-store-management-software.onrender.com/api';

// Hive box names
const String kBoxPendingSales = 'pending_sales';
const String kBoxSettings     = 'settings';
const String kBoxProducts     = 'cached_products';

// Pagination
const int kDefaultPageSize = 20;

// Timeouts
const Duration kConnectTimeout = Duration(seconds: 15);
const Duration kReceiveTimeout = Duration(seconds: 30);

// Receipt widths
const int kPrinterWidth58mm = 32;
const int kPrinterWidth80mm = 48;
