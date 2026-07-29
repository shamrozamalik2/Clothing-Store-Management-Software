import 'package:intl/intl.dart';

final _pkr = NumberFormat('#,##0.00', 'en_US');

String formatCurrency(num amount, {String symbol = 'PKR '}) {
  return '$symbol${_pkr.format(amount)}';
}

String formatCompact(num amount) {
  if (amount >= 1000000) return 'PKR ${(amount / 1000000).toStringAsFixed(1)}M';
  if (amount >= 1000)    return 'PKR ${(amount / 1000).toStringAsFixed(1)}K';
  return formatCurrency(amount);
}
