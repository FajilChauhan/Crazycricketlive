import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ✅ HARDCODED — always use this exact path, no platform check needed
const UPLOAD_DIR = "C:\\Users\\fajil\\OneDrive\\Dokumen\\CrazyCricketLiveImages";

// Ensure the directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log("📁 Created upload directory:", UPLOAD_DIR);
}

console.log("🔍 Upload directory is set to:", UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const finalName = file.fieldname + '-' + uniqueSuffix + ext;
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
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
  fileFilter: fileFilter,
});

// ✅ Export the path so other files (controller, static serving) use the SAME constant
export const UPLOAD_DIRECTORY = UPLOAD_DIR;