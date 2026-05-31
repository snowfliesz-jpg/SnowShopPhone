import { Router } from "express";
import * as accountAdminController from "../../controllers/admin/account-admin.controller";
import multer from "multer";
import * as accountAdminValidate from "../../validates/admin/account-admin.validate";

const router = Router();

const upload = multer();

router.get('/create', accountAdminController.create);

router.post(
  '/create', 
  upload.none(), 
  accountAdminValidate.createPost,
  accountAdminController.createPost
);

router.get('/list', accountAdminController.list);

router.get('/edit/:id', accountAdminController.edit);

router.patch(
  '/edit/:id', 
  upload.none(), 
  accountAdminValidate.editPatch,
  accountAdminController.editPatch
);

router.patch('/delete/:id', accountAdminController.deletePatch);

router.get('/change-password/:id', accountAdminController.changePassword);

router.patch(
  '/change-password/:id', 
  upload.none(), 
  accountAdminValidate.changePasswordPatch,
  accountAdminController.changePasswordPatch
);

export default router;