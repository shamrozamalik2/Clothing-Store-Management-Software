import 'package:hive_flutter/hive_flutter.dart';
import '../constants/app_constants.dart';

class HiveStorage {
  static Future<void> init() async {
    await Hive.initFlutter();
    await Future.wait([
      Hive.openBox<Map>(kBoxPendingSales),
      Hive.openBox(kBoxSettings),
      Hive.openBox<Map>(kBoxProducts),
    ]);
  }

  static Box<Map> get pendingSales => Hive.box<Map>(kBoxPendingSales);
  static Box     get settings      => Hive.box(kBoxSettings);
  static Box<Map> get products     => Hive.box<Map>(kBoxProducts);

  static Future<void> addPendingSale(Map<String, dynamic> sale) async {
    await pendingSales.add(sale);
  }

  static List<Map<dynamic, dynamic>> getAllPendingSales() {
    return pendingSales.values.toList();
  }

  static Future<void> removePendingSale(int index) async {
    await pendingSales.deleteAt(index);
  }

  static Future<void> clearPendingSales() async {
    await pendingSales.clear();
  }
}
