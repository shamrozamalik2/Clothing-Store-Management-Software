import 'package:intl/intl.dart';

final _date     = DateFormat('dd MMM yyyy');
final _dateTime = DateFormat('dd MMM yyyy, hh:mm a');
final _time     = DateFormat('hh:mm a');
final _short    = DateFormat('dd/MM/yy');

String formatDate(dynamic d) {
  if (d == null) return '—';
  final dt = d is DateTime ? d : DateTime.tryParse(d.toString());
  return dt == null ? '—' : _date.format(dt.toLocal());
}

String formatDateTime(dynamic d) {
  if (d == null) return '—';
  final dt = d is DateTime ? d : DateTime.tryParse(d.toString());
  return dt == null ? '—' : _dateTime.format(dt.toLocal());
}

String formatTime(dynamic d) {
  if (d == null) return '—';
  final dt = d is DateTime ? d : DateTime.tryParse(d.toString());
  return dt == null ? '—' : _time.format(dt.toLocal());
}

String formatShort(dynamic d) {
  if (d == null) return '—';
  final dt = d is DateTime ? d : DateTime.tryParse(d.toString());
  return dt == null ? '—' : _short.format(dt.toLocal());
}
