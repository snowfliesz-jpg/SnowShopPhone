import { NextFunction, Request, Response } from "express";
import CategoryProduct from "../../models/category-product.model";
import { buildCategoryTree } from "../../helpers/category.helper";
import CategoryBlog from "../../models/category-blog.model";

export const getAllCategory = async (req: Request, res: Response, next: NextFunction) => {
  // Danh sách danh mục sản phẩm
  const categoryProductList = await CategoryProduct.find({
    deleted: false
  });
  const categoryProductTree = buildCategoryTree(categoryProductList);
  res.locals.categoryProductList = categoryProductTree;
  // Hết Danh sách danh mục sản phẩm

  // Danh sách danh mục bài viết
  const categoryArticleList = await CategoryBlog.find({
    deleted: false
  });
  const categoryArticleTree = buildCategoryTree(categoryArticleList);
  res.locals.categoryArticleList = categoryArticleTree;
  // Hết Danh sách danh mục bài viết

  next();
}