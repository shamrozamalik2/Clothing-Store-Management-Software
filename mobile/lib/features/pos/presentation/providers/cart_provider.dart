import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/models/cart_item_model.dart';
import '../../../products/data/models/product_model.dart';
import '../../../products/data/sources/products_remote_source.dart';

// ---------------------------------------------------------------------------
// CartState
// ---------------------------------------------------------------------------

class CartState {
  final List<CartItemModel> items;
  final int? customerId;
  final String? customerName;

  /// Overall cart discount as a percentage 0–100.
  final double discountPercent;

  /// Tax applied to (subtotal − discountAmount).
  final double taxPercent;

  /// 'cash' | 'card' | 'bank' | 'split'
  final String paymentMethod;
  final String note;

  const CartState({
    this.items = const [],
    this.customerId,
    this.customerName,
    this.discountPercent = 0.0,
    this.taxPercent = 0.0,
    this.paymentMethod = 'cash',
    this.note = '',
  });

  // --- Computed ---------------------------------------------------------

  double get subtotal =>
      items.fold(0.0, (sum, item) => sum + item.lineTotal);

  double get discountAmount => subtotal * discountPercent / 100;

  double get taxAmount =>
      (subtotal - discountAmount) * taxPercent / 100;

  double get total => subtotal - discountAmount + taxAmount;

  int get itemCount =>
      items.fold(0, (sum, item) => sum + item.quantity);

  // --- Helpers ----------------------------------------------------------

  CartState copyWith({
    List<CartItemModel>? items,
    Object? customerId = _kSentinel,
    Object? customerName = _kSentinel,
    double? discountPercent,
    double? taxPercent,
    String? paymentMethod,
    String? note,
  }) =>
      CartState(
        items: items ?? this.items,
        customerId: customerId == _kSentinel
            ? this.customerId
            : customerId as int?,
        customerName: customerName == _kSentinel
            ? this.customerName
            : customerName as String?,
        discountPercent: discountPercent ?? this.discountPercent,
        taxPercent: taxPercent ?? this.taxPercent,
        paymentMethod: paymentMethod ?? this.paymentMethod,
        note: note ?? this.note,
      );

  Map<String, dynamic> toJson() => {
        'items': items.map((i) => i.toJson()).toList(),
        'customerId': customerId,
        'customerName': customerName,
        'discountPercent': discountPercent,
        'taxPercent': taxPercent,
        'paymentMethod': paymentMethod,
        'note': note,
      };

  factory CartState.fromJson(Map<String, dynamic> json) => CartState(
        items: (json['items'] as List? ?? [])
            .map((e) => CartItemModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        customerId: json['customerId'] as int?,
        customerName: json['customerName'] as String?,
        discountPercent:
            (json['discountPercent'] as num?)?.toDouble() ?? 0.0,
        taxPercent: (json['taxPercent'] as num?)?.toDouble() ?? 0.0,
        paymentMethod: json['paymentMethod'] as String? ?? 'cash',
        note: json['note'] as String? ?? '',
      );
}

const Object _kSentinel = Object();

// ---------------------------------------------------------------------------
// CartNotifier
// ---------------------------------------------------------------------------

class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState());

  // --- Cart mutations ---------------------------------------------------

  void addItem(ProductModel product) {
    final pid = product.id.toString();
    final idx = state.items.indexWhere((i) => i.productId == pid);
    if (idx >= 0) {
      final items = List<CartItemModel>.from(state.items);
      items[idx] = items[idx].copyWith(quantity: items[idx].quantity + 1);
      state = state.copyWith(items: items);
    } else {
      state = state.copyWith(
        items: [
          ...state.items,
          CartItemModel(
            productId: pid,
            name: product.name,
            price: product.sellingPrice,
            costPrice: product.costPrice,
            quantity: 1,
            barcode: product.barcode,
          ),
        ],
      );
    }
  }

  void removeItem(String productId) {
    state = state.copyWith(
      items: state.items
          .where((i) => i.productId != productId)
          .toList(),
    );
  }

  void updateQty(String productId, int qty) {
    if (qty <= 0) {
      removeItem(productId);
      return;
    }
    state = state.copyWith(
      items: state.items
          .map((i) => i.productId == productId ? i.copyWith(quantity: qty) : i)
          .toList(),
    );
  }

  void updateItemDiscount(String productId, double discount) {
    state = state.copyWith(
      items: state.items
          .map((i) =>
              i.productId == productId ? i.copyWith(discount: discount.clamp(0, double.infinity)) : i)
          .toList(),
    );
  }

  // --- Cart-level settings ----------------------------------------------

  void setDiscount(double percent) {
    state = state.copyWith(discountPercent: percent.clamp(0.0, 100.0));
  }

  void setTax(double percent) {
    state = state.copyWith(taxPercent: percent.clamp(0.0, 100.0));
  }

  void setCustomer(int id, String name) {
    state = state.copyWith(customerId: id, customerName: name);
  }

  void clearCustomer() {
    state = state.copyWith(
      customerId: null,
      customerName: null,
    );
  }

  void setPaymentMethod(String method) {
    state = state.copyWith(paymentMethod: method);
  }

  void setNote(String note) {
    state = state.copyWith(note: note);
  }

  void clearCart() {
    state = const CartState();
  }

  /// Restore a previously held cart (e.g. loaded from SharedPreferences).
  void restoreCart(CartState restored) {
    state = restored;
  }

  // --- Barcode lookup ---------------------------------------------------

  /// Looks up [barcode] via [productsSource] and adds the matching product.
  ///
  /// [ProductsRemoteSource] is expected to expose:
  ///   Future<List<ProductModel>> getProducts({String? barcode, ...})
  Future<void> applyBarcodeResult(
    String barcode,
    ProductsRemoteSource productsSource,
  ) async {
    final results = await productsSource.getProducts(barcode: barcode);
    if (results.items.isNotEmpty) {
      addItem(results.items.first);
    }
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final cartProvider =
    StateNotifierProvider<CartNotifier, CartState>((ref) => CartNotifier());

/// Convenience provider — use when you only need the running total.
final cartTotalProvider = Provider<double>((ref) {
  return ref.watch(cartProvider).total;
});
