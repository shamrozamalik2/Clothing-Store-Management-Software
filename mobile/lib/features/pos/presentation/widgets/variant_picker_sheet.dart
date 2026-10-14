import 'package:flutter/material.dart';

import '../../../products/data/models/product_model.dart';
import '../../../../core/utils/currency_formatter.dart';

/// Shows the color/size choices for [product] and resolves with the one the
/// user tapped, or null if they dismissed the sheet without picking one.
Future<ProductVariantModel?> showVariantPicker(
  BuildContext context,
  ProductModel product,
) {
  return showModalBottomSheet<ProductVariantModel>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => _VariantPickerSheet(product: product),
  );
}

class _VariantPickerSheet extends StatelessWidget {
  const _VariantPickerSheet({required this.product});
  final ProductModel product;

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final tt = Theme.of(context).textTheme;

    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('SELECT VARIANT',
                style: tt.labelSmall?.copyWith(
                  color: cs.onSurfaceVariant,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                )),
            const SizedBox(height: 2),
            Text(product.name,
                style: tt.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: 12),
            ConstrainedBox(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.5),
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: product.variants.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final v = product.variants[i];
                  final oos = v.stockQuantity <= 0;
                  final price = v.salePrice > 0 ? v.salePrice : product.sellingPrice;

                  return InkWell(
                    borderRadius: BorderRadius.circular(14),
                    onTap: oos ? null : () => Navigator.of(context).pop(v),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      decoration: BoxDecoration(
                        color: cs.surfaceContainer,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: cs.outlineVariant.withValues(alpha: oos ? 0.2 : 0.4),
                        ),
                      ),
                      child: Opacity(
                        opacity: oos ? 0.45 : 1,
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(v.label,
                                      style: tt.bodyMedium?.copyWith(fontWeight: FontWeight.w700)),
                                  if (v.sku.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 2),
                                      child: Text(v.sku,
                                          style: tt.labelSmall?.copyWith(
                                            color: cs.onSurfaceVariant,
                                            fontFamily: 'monospace',
                                          )),
                                    ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(formatCurrency(price),
                                    style: tt.bodyMedium?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF2C6BF5),
                                    )),
                                const SizedBox(height: 2),
                                Text(
                                  oos ? 'Out of stock' : '${v.stockQuantity} in stock',
                                  style: tt.labelSmall?.copyWith(
                                    color: oos ? cs.error : cs.onSurfaceVariant,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
