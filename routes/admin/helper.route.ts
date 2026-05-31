import { Router } from "express";
import * as helperController from "../../controllers/admin/helper.controller";

const router = Router();

router.post('/generate-slug', helperController.generateSlugPost);

export default router;