import { Request, Response } from 'express';
import Product from '../../models/product.model';
import AttributeProduct from '../../models/attribute-product.model';
import { normalizeProductVariants, normalizeVariantSelection } from '../../helpers/product.helper';

export const wishlist = (req: Request, res: Response) => {
  res.render("client/pages/wishlist", {
    pageTitle: "Sản phẩm yêu thích"
  });
}

export const list = async (req: Request, res: Response) => {
  try {
    const wishlist = req.body;
    const wishlistDetail: any[] = [];

    for (const item of wishlist) {
      const productDetail = await Product.findOne({
        _id: item.productId,
        deleted: false,
        status: "active"
      })

      if(productDetail) {
        const attributeList = await AttributeProduct
          .find({
            _id: { $in: productDetail.attributes }
          })
          .lean();

        const normalizedVariants = normalizeProductVariants(productDetail.variants || [], attributeList);
        const normalizedItemVariant = item.variant
          ? normalizeVariantSelection(item.variant, attributeList)
          : item.variant;

        const itemDetail = {
          ...item,
          variant: normalizedItemVariant,
          detail: {
            images: productDetail.images,
            slug: productDetail.slug,
            name: productDetail.name,
            priceNew: productDetail.priceNew,
            priceOld: productDetail.priceOld,
            stock: productDetail.stock,
            attributeList: attributeList,
            variants: normalizedVariants
          }
        };

        wishlistDetail.push(itemDetail);
      }
    }

    res.json({
      code: "success",
      message: "Thành công!",
      wishlist: wishlistDetail
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Dữ liệu không hợp lệ!"
    })
  }
}
