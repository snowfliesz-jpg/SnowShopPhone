import { Request, Response } from 'express';
import slugify from 'slugify';
import CategoryBlog from '../../models/category-blog.model';
import Blog from '../../models/blog.model';
import { generateRandomString } from '../../helpers/generate.helper';
import CategoryProduct from '../../models/category-product.model';
import Product from '../../models/product.model';

const models: any = {
  CategoryBlog: CategoryBlog,
  Blog: Blog,
  CategoryProduct: CategoryProduct,
  Product: Product
};

export const generateSlugPost = async (req: Request, res: Response) => {
  try {
    const { string, modalName } = req.body;

    let slug = slugify(string, {
      lower: true, // Chữ thường
      strict: true, // Loại bỏ ký tự đặc biệt
    })

    const Model = models[modalName];

    const existSlug = await Model.findOne({
      slug: slug
    })

    if(existSlug) {
      const stringRandom = generateRandomString(4);
      slug = `${slug}-${stringRandom}`;
    }

    res.json({
      code: "success",
      message: "Tạo đường dẫn thành công!",
      slug: slug
    })
  } catch (error) {
    res.json({
      code: "error",
      message: "Model không hợp lệ!"
    })
  }
}