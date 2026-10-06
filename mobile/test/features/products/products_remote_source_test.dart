import 'package:cookie_jar/cookie_jar.dart';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sas_garments_mobile/core/api/api_client.dart';
import 'package:sas_garments_mobile/core/providers/company_features_provider.dart';
import 'package:sas_garments_mobile/core/storage/secure_storage.dart';
import 'package:sas_garments_mobile/features/products/data/sources/products_remote_source.dart';

typedef _Responder = Future<Map<String, dynamic>> Function(String method, String path, Object? body);

/// Replaces the network layer. Records every call, and answers with the given responder.
class _FakeApi extends ApiClient {
  _FakeApi(this._respond) : super(SecureStorageService());

  final _Responder _respond;
  final List<String> calls = [];

  @override
  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? queryParameters}) async {
    calls.add('GET $path');
    return _wrap<T>(path, await _respond('GET', path, null));
  }

  @override
  Future<Response<T>> post<T>(String path, {dynamic data, Map<String, dynamic>? queryParameters}) async {
    calls.add('POST $path');
    return _wrap<T>(path, await _respond('POST', path, data));
  }

  Response<T> _wrap<T>(String path, Map<String, dynamic> body) =>
      Response<T>(requestOptions: RequestOptions(path: path), data: body as T, statusCode: 200);
}

DioException _httpError(String path, int status) => DioException(
      requestOptions: RequestOptions(path: path),
      response: Response(
        requestOptions: RequestOptions(path: path),
        statusCode: status,
        data: {'success': false, 'message': 'error $status'},
      ),
    );

Map<String, dynamic> _product({String id = 'p1', String name = 'Coca-Cola 500ml'}) => {
      'success': true,
      'data': {
        'id': id,
        'name': name,
        'sku': 'COLA-500',
        'sale_price': 120,
        'cost_price': 95,
        'stock_quantity': 18,
        'barcode': '5449000000996',
      },
    };

void main() {
  setUpAll(() {
    appCookieJar = CookieJar();
  });

  group('barcode lookup', () {
    test('an exact barcode goes to the barcode endpoint, never the product list', () async {
      final api = _FakeApi((method, path, body) async => _product());
      final source = ProductsRemoteSource(api);

      final result = await source.getProducts(barcode: '5449000000996');

      expect(result.items.length, 1);
      expect(result.items.first.name, 'Coca-Cola 500ml');
      expect(api.calls, ['GET /products/barcode/5449000000996']);
    });

    test('a code no product uses returns an empty result, not an error', () async {
      final api = _FakeApi((method, path, body) async => throw _httpError(path, 404));
      final source = ProductsRemoteSource(api);

      final result = await source.getProducts(barcode: '0000000000000');

      expect(result.items, isEmpty);
      expect(await source.findByBarcode('0000000000000'), isNull);
    });

    test('other failures are still reported', () async {
      final api = _FakeApi((method, path, body) async => throw _httpError(path, 500));
      final source = ProductsRemoteSource(api);

      expect(() => source.findByBarcode('5449000000996'), throwsA(isA<DioException>()));
    });

    test('the code is encoded in the path', () async {
      final api = _FakeApi((method, path, body) async => _product());
      await ProductsRemoteSource(api).findByBarcode('AB/12');
      expect(api.calls, ['GET /products/barcode/AB%2F12']);
    });
  });

  group('createProduct', () {
    test('posts the fields as JSON and returns the saved product', () async {
      Object? sent;
      final api = _FakeApi((method, path, body) async {
        sent = body;
        return {
          'success': true,
          'data': {'id': 'p2', 'name': 'Tea', 'sku': 'TEA', 'sale_price': 50, 'stock_quantity': 0},
        };
      });

      final created = await ProductsRemoteSource(api).createProduct({
        'name': 'Tea',
        'barcode': '5449000000996',
        'sale_price': 50.0,
      });

      expect(api.calls, ['POST /products']);
      expect((sent as Map)['barcode'], '5449000000996');
      expect(created.id, 'p2');
      expect(created.sellingPrice, 50);
    });
  });

  group('featureOn', () {
    test('is on until the feature map has loaded', () {
      expect(featureOn(const AsyncLoading<Map<String, bool>>(), 'EXTERNAL_BARCODE'), isTrue);
    });

    test('is off only when the map says it is off', () {
      expect(featureOn(const AsyncData({'EXTERNAL_BARCODE': false}), 'EXTERNAL_BARCODE'), isFalse);
      expect(featureOn(const AsyncData({'EXTERNAL_BARCODE': true}), 'EXTERNAL_BARCODE'), isTrue);
    });

    test('a feature missing from the map is on, as on the backend', () {
      expect(featureOn(const AsyncData(<String, bool>{}), 'EXTERNAL_BARCODE'), isTrue);
    });
  });
}
