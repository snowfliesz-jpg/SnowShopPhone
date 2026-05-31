import { NextFunction, Request, Response } from "express";
import AttributeProduct from "../../models/attribute-product.model";

export const getAttributeProduct = async (req: Request, res: Response, next: NextFunction) => {
  const attributeProductList: any = await AttributeProduct
    .find({
      deleted: false
    })
    .sort({
      createdAt: "desc"
    })

  res.locals.attributeProductList = attributeProductList;

  next();
}