import { Router } from "express";
import * as fileManagerController from "../../controllers/admin/file-manager.controller";
import multer from "multer";

const router = Router();

// const upload = multer();

// Dùng memoryStorage để giữ file trong buffer
const storage = multer.memoryStorage();

// Fix lỗi font tiếng Việt trong tên file (multer mặc định Latin1)
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Ép originalname về UTF-8
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, true);
  }
});

router.get('/', fileManagerController.fileManager);

router.post('/upload', upload.array('files'), fileManagerController.uploadPost);

router.patch(
  '/change-file-name/:id', 
  upload.none(), 
  fileManagerController.changeFileNamePatch
);

router.delete('/delete-file/:id', fileManagerController.deleteFileDel);

router.post(
  '/folder/create', 
  upload.none(), 
  fileManagerController.createFolderPost
);

router.delete('/folder/delete', fileManagerController.deleteFolderDel);

router.get('/iframe', fileManagerController.iframe);

export default router;