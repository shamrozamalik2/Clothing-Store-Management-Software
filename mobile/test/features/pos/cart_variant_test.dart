import 'package:flutter_test/flutter_test.dart';
import 'package:sas_garments_mobile/features/pos/presentation/providers/cart_provider.dart';
import 'package:sas_garments_mobile/features/pos/data/models/cart_item_model.dart';
import 'package:sas_garments_mobile/features/products/data/models/product_model.dart';

ProductModel _productJson(Map<String, dynamic> extra) => ProductModel.fromJson({
      'id': 'p1',
      'name': 'T-Shirt',
      'sku': 'TSH-1',
      'sale_price': 1000,
      'cost_price': 600,
      'stock_quantity': 0, // derived sum would be 0 for a base listing of a variant product
      'unit': 'pcs',
      ...extra,
    });

void main() {
  group('ProductModel variant parsing', () {
    test('embeds variants from a list/get/barcode response with no extra request', () {
      final product = _productJson({
        'variants': [
          {'_id': 'v1', 'sku': 'TSH-1-RED-S', 'size': 'S', 'color': 'Red', 'cost_price': 650, 'sale_price': 1100, 'stock_quantity': 4},
          {'_id': 'v2', 'sku': 'TSH-1-BLU-M', 'size': 'M', 'color': 'Blue', 'cost_price': 650, 'sale_price': 1100, 'stock_quantity': 0},
        ],
      });

      expect(product.hasVariants, isTrue);
      expect(product.variants, hasLength(2));
      expect(product.variants[0].id, 'v1');
      expect(product.variants[0].label, 'S · Red');
      expect(product.variants[0].suffix, ' · S · Red');
      expect(product.variants[1].stockQuantity, 0);
    });

    test('drops inactive variants — they should not be sellable on a fresh install', () {
      final product = _productJson({
        'variants': [
          {'_id': 'v1', 'sku': 'A', 'cost_price': 1, 'sale_price': 2, 'stock_quantity': 1, 'is_active': false},
          {'_id': 'v2', 'sku': 'B', 'cost_price': 1, 'sale_price': 2, 'stock_quantity': 1},
        ],
      });
      expect(product.variants.map((v) => v.id), ['v2']);
    });

    test('parses matched_variant from a barcode lookup that hit a variant-specific code', () {
      final product = _productJson({
        'variants': [
          {'_id': 'v1', 'sku': 'A', 'cost_price': 1, 'sale_price': 2, 'stock_quantity': 1},
        ],
        'matched_variant': {'_id': 'v1', 'sku': 'A'},
      });
      expect(product.matchedVariantId, 'v1');
    });

    test('a simple product with no variants array behaves exactly as before', () {
      final product = _productJson({});
      expect(product.hasVariants, isFalse);
      expect(product.variants, isEmpty);
    });
  });

  group('CartNotifier + variants', () {
    late CartNotifier cart;
    setUp(() => cart = CartNotifier());

    const variantRed = ProductVariantModel(
      id: 'v1', sku: 'TSH-1-RED-S', size: 'S', color: 'Red',
      costPrice: 650, salePrice: 1100, stockQuantity: 4,
    );
    const variantBlue = ProductVariantModel(
      id: 'v2', sku: 'TSH-1-BLU-M', size: 'M', color: 'Blue',
      costPrice: 650, salePrice: 1100, stockQuantity: 3,
    );

    test('two different variants of the same product stay on separate lines', () {
      final product = _productJson({'variants': []});
      cart.addVariant(product, variantRed);
      cart.addVariant(product, variantBlue);

      expect(cart.state.items, hasLength(2));
      expect(cart.state.items[0].variantId, 'v1');
      expect(cart.state.items[0].name, 'T-Shirt · S · Red');
      expect(cart.state.items[1].variantId, 'v2');
      expect(cart.state.items[1].name, 'T-Shirt · M · Blue');
      // This is exactly the bug a productId-only key would reintroduce:
      // a second scan of a different variant must not bump the first line.
      expect(cart.state.items[0].quantity, 1);
    });

    test('scanning the same variant twice merges into one line with qty 2', () {
      final product = _productJson({'variants': []});
      cart.addVariant(product, variantRed);
      cart.addVariant(product, variantRed);

      expect(cart.state.items, hasLength(1));
      expect(cart.state.items.single.quantity, 2);
    });

    test('a variant line and a base (non-variant) line of the same product never collide', () {
      final variantProduct = _productJson({'variants': []});
      final simpleProduct  = _productJson({'id': 'p2', 'name': 'Plain Mug', 'stock_quantity': 10});

      cart.addVariant(variantProduct, variantRed);
      cart.addItem(simpleProduct);
      cart.addItem(simpleProduct); // qty 2 on the base line

      expect(cart.state.items, hasLength(2));
      final base = cart.state.items.firstWhere((i) => i.productId == 'p2');
      expect(base.variantId, isNull);
      expect(base.quantity, 2);
    });

    test('removeItem/updateQty operate on the composite key, not bare productId', () {
      final product = _productJson({'variants': []});
      cart.addVariant(product, variantRed);
      cart.addVariant(product, variantBlue);
      final redKey = cart.state.items.firstWhere((i) => i.variantId == 'v1').key;

      cart.updateQty(redKey, 5);
      expect(cart.state.items.firstWhere((i) => i.variantId == 'v1').quantity, 5);
      expect(cart.state.items.firstWhere((i) => i.variantId == 'v2').quantity, 1);

      cart.removeItem(redKey);
      expect(cart.state.items, hasLength(1));
      expect(cart.state.items.single.variantId, 'v2');
    });
  });

  group('CartItemModel', () {
    test('round-trips variantId through toJson/fromJson', () {
      const item = CartItemModel(
        productId: 'p1', variantId: 'v1', name: 'T-Shirt · S · Red',
        price: 1100, costPrice: 650, quantity: 2,
      );
      final restored = CartItemModel.fromJson(item.toJson());
      expect(restored.variantId, 'v1');
      expect(restored.key, item.key);
    });

    test('a base-product line has no variantId and a distinct "-base" key', () {
      const item = CartItemModel(productId: 'p1', name: 'Plain Mug', price: 500, costPrice: 300, quantity: 1);
      expect(item.variantId, isNull);
      expect(item.key, 'p1-base');
    });
  });
}
