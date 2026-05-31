import { Router } from "express";
import * as productController from "../../controllers/client/product.controller";

const router = Router();

router.get('/category', productController.productByCategory);

router.get('/category/:slug', productController.productByCategory);

router.get('/suggest', productController.suggest);

router.get('/detail/:slug', productController.detail);

export default router;