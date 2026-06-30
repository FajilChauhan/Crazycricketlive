// middleware/upload.middleware.ts
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = process.platform === 'win32'
  ? "C:\\Users\\fajil\\OneDrive\\Dokumen\\CrazyCricketLiveImages"
  : path.join(process.cwd(), 'uploads');

console.log("🔍 Platform:", process.platform);
console.log("🔍 Upload directory resolved to:", UPLOAD_DIR);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 Created upload directory");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("📥 Saving file to:", UPLOAD_DIR);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const finalName = file.fieldname + '-' + uniqueSuffix + ext;
    console.log("📝 Generated filename:", finalName);
    cb(null, finalName);
  },
});

const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'));
  }
};

export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
});