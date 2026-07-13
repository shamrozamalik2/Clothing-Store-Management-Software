'use strict';

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { UPLOADS_DIR, MAX_FILE_SIZE, ALLOWED_IMAGE_TYPES } = require('../config/constants');

function makeUploader(subdir = '') {
  const dest = subdir ? path.join(UPLOADS_DIR, subdir) : UPLOADS_DIR;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: dest,
    filename: (_, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${subdir || 'file'}-${Date.now()}${ext}`;
      cb(null, name);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_, file, cb) => {
      if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) return cb(null, true);
      cb(new Error('Only JPEG, PNG, or WebP images are allowed.'));
    },
  });
}

/** Build the public URL path for an uploaded file. */
function fileUrl(filename, subdir = '') {
  if (!filename) return null;
  return subdir ? `/uploads/${subdir}/${filename}` : `/uploads/${filename}`;
}

module.exports = { makeUploader, fileUrl };
