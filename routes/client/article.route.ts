import { Router } from "express";
import * as articleController from "../../controllers/client/article.controller";
import { getPopularBlog, getPopularCategoryBlog } from "../../middlewares/client/article.middleware";

const router = Router();

router.get(
  '/category/:slug', 
  getPopularBlog,
  getPopularCategoryBlog,
  articleController.articleByCategory
);

router.get(
  '/detail/:slug', 
  getPopularBlog,
  getPopularCategoryBlog,
  articleController.detail
);


export default router;