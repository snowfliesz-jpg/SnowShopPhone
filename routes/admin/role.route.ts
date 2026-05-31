import { Router } from "express";
import * as roleController from "../../controllers/admin/role.controller";
import multer from "multer";
import * as roleValidate from "../../validates/admin/role.validate";

const router = Router();

const upload = multer();

router.get('/create', roleController.create);

router.post(
  '/create', 
  upload.none(), 
  roleValidate.createPost,
  roleController.createPost
);

router.get('/list', roleController.list);

router.get('/edit/:id', roleController.edit);

router.patch(
  '/edit/:id', 
  upload.none(), 
  roleValidate.createPost,
  roleController.editPatch
);

router.patch('/delete/:id', roleController.deletePatch);

export default router;