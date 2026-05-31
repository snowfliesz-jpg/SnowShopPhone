import Product from "../models/product.model";

const isSameVariant = (variantItem: any, selectedVariant: any[]) => {
  const variantAttributes = Array.isArray(variantItem?.attributeValue) ? variantItem.attributeValue : [];

  if (variantAttributes.length !== selectedVariant.length) {
    return false;
  }

  return variantAttributes.every((attr: any) => {
    const selected = selectedVariant.find((item: any) => `${item.attrId}` === `${attr.attrId}`);
    return selected && `${selected.value}` === `${attr.value}`;
  });
};

export const deductStockAfterSuccessfulOrder = async (order: any) => {
  if (!order || order.stockDeducted) {
    return;
  }

  const orderItems = Array.isArray(order.items) ? order.items : [];

  for (const item of orderItems) {
    const quantity = Number(item.quantity) || 0;

    if (quantity <= 0) {
      continue;
    }

    const productDetail: any = await Product.findOne({
      _id: item.productId,
      deleted: false
    });

    if (!productDetail) {
      continue;
    }

    const selectedVariant = Array.isArray(item.variantSelection) ? item.variantSelection : [];
    const productVariants = Array.isArray(productDetail.variants) ? productDetail.variants : [];

    if (selectedVariant.length > 0 && productVariants.length > 0) {
      const variantMatched = productDetail.variants.find((variantItem: any) => isSameVariant(variantItem, selectedVariant));

    if (!variantMatched) {
        throw new Error(`Khong tim thay bien the cua san pham ${productDetail.name}.`);
      }

      const variantStock = Number(variantMatched.stock) || 0;
      if (variantStock < quantity) {
        throw new Error(`Bien the cua san pham ${productDetail.name} khong du so luong ton kho.`);
      }

        variantMatched.stock = variantStock - quantity;
      productDetail.markModified("variants");
      productDetail.stock = productVariants.reduce((total: number, variantItem: any) => {
        return total + (Number(variantItem.stock) || 0);
      }, 0);
    } else {
      const productStock = Number(productDetail.stock) || 0;
      if (productStock < quantity) {
        throw new Error(`San pham ${productDetail.name} khong du so luong ton kho.`);
      }

      productDetail.stock = productStock - quantity;
    }

    await productDetail.save();
  }

  order.stockDeducted = true;
};