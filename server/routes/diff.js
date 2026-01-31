const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsxParser = require('../services/xlsxParser');
const diffEngine = require('../services/diffEngine');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.xlsx' && ext !== '.xls') {
      return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
    cb(null, true);
  },
});

// Cleanup uploaded files
const cleanupFiles = (...filePaths) => {
  for (const filePath of filePaths) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to cleanup file:', filePath);
      }
    }
  }
};

router.post('/diff', upload.fields([
  { name: 'original', maxCount: 1 },
  { name: 'modified', maxCount: 1 },
]), async (req, res, next) => {
  let originalPath = null;
  let modifiedPath = null;

  try {
    if (!req.files?.original?.[0] || !req.files?.modified?.[0]) {
      throw new Error('Both original and modified files are required');
    }

    originalPath = req.files.original[0].path;
    modifiedPath = req.files.modified[0].path;

    // Parse both Excel files
    const originalData = xlsxParser.parseXlsx(originalPath);
    const modifiedData = xlsxParser.parseXlsx(modifiedPath);

    // Generate diff
    const diffResult = diffEngine.diffWorkbooks(originalData, modifiedData);

    // Cleanup files
    cleanupFiles(originalPath, modifiedPath);

    res.json({
      success: true,
      ...diffResult,
    });
  } catch (error) {
    cleanupFiles(originalPath, modifiedPath);
    next(error);
  }
});

module.exports = router;
