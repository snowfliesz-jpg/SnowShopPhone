import { NextFunction, Request, Response } from "express";
import Blog from "../../models/blog.model";
import moment from "moment";
import CategoryBlog from "../../models/category-blog.model";

export const getPopularBlog = async (req: Request, res: Response, next: NextFunction) => {
  const blogList: any = await Blog
    .find({
      deleted: false,
      status: "published"
    })
    .sort({
      view: "desc"
    })
    .limit(3);

  for (const item of blogList) {
    if(item.createdAt) {
      item.createdAtFormat = moment(item.createdAt).format("DD/MM/YYYY");
    }
  }

  res.locals.popularBlogList = blogList;

  next();
}

export const getPopularCategoryBlog = async (req: Request, res: Response, next: NextFunction) => {
  const categoryArticleList: any = await CategoryBlog
    .find({
      deleted: false,
      status: "active"
    })
    .sort({
      view: "desc"
    })
    .limit(5)

  for (const item of categoryArticleList) {
    const totalRecord = await Blog.countDocuments({
      category: item.id,
      deleted: false,
      status: "published"
    });

    item.totalRecord = totalRecord;
  }

  res.locals.popularCategoryBlogList = categoryArticleList;

  next();
}