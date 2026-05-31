import { Router } from "express";
import * as articleController from "../../controllers/admin/article.controller";
import multer from "multer";
import * as articleValidate from "../../validates/admin/article.validate";
import { checkPermission } from "../../middlewares/admin/auth.middleware";

const router = Router();

const upload = multer();

router.get('/category', articleController.category);

router.get('/category/trash', articleController.trashCategory);

router.get('/category/create', articleController.createCategory);

router.post(
  '/category/create', 
  upload.none(), 
  articleValidate.createCategoryPost, 
  articleController.createCategoryPost
);

router.get('/category/edit/:id', articleController.editCategory);

router.patch(
  '/category/edit/:id', 
  upload.none(), 
  articleValidate.createCategoryPost, 
  articleController.editCategoryPatch
);

router.patch('/category/delete/:id', articleController.deleteCategoryPatch);

router.patch('/category/undo/:id', articleController.undoCategoryPatch);

router.delete('/category/destroy/:id', articleController.destroyCategoryDelete);

router.get('/create', articleController.create);

router.post(
  '/create', 
  upload.none(), 
  checkPermission("article-create"),
  articleValidate.createPost, 
  articleController.createPost
);

router.get('/list', articleController.list);

router.get('/edit/:id', articleController.edit);

router.patch(
  '/edit/:id', 
  upload.none(), 
  checkPermission("article-edit"),
  articleValidate.createPost, 
  articleController.editPatch
);

router.patch(
  '/delete/:id', 
  checkPermission("article-delete"),
  articleController.deletePatch
);

export default router;