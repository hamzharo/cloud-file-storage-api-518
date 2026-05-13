const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Supabase setup
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const bucketName = process.env.SUPABASE_BUCKET || "files";

// Store uploaded file temporarily in memory
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// JSON file path for metadata
const dataFilePath = path.join(__dirname, "../data/files.json");

// Helper: read files metadata
function readFilesData() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }

  const data = fs.readFileSync(dataFilePath, "utf8");
  return JSON.parse(data || "[]");
}

// Helper: write files metadata
function writeFilesData(files) {
  fs.writeFileSync(dataFilePath, JSON.stringify(files, null, 2));
}

// Test route
router.get("/test", (req, res) => {
  res.json({ message: "File API is working" });
});

// Upload file API
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileId = uuidv4();
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName);
    const storedName = `${fileId}${fileExtension}`;

    const filePath = `uploads/${storedName}`;

    // Upload file to Supabase Storage
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return res.status(500).json({
        message: "Failed to upload file to Supabase",
        error: error.message,
      });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    const fileRecord = {
      id: fileId,
      originalName,
      storedName,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      storagePath: filePath,
      publicUrl: publicUrlData.publicUrl,
      uploadDate: new Date().toISOString(),
    };

    const files = readFilesData();
    files.push(fileRecord);
    writeFilesData(files);

    res.status(201).json({
      message: "File uploaded successfully",
      file: fileRecord,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      message: "Server error during file upload",
      error: error.message,
    });
  }
});

// Get all files API
router.get("/", (req, res) => {
  const files = readFilesData();
  res.json(files);
});

// Download file API
router.get("/download/:id", (req, res) => {
  try {
    const files = readFilesData();
    const file = files.find((f) => f.id === req.params.id);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Since bucket is public, redirect user to Supabase public URL
    res.redirect(file.publicUrl);
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({
      message: "Server error during file download",
      error: error.message,
    });
  }
});

// Share file API
router.get("/share/:id", (req, res) => {
  try {
    const files = readFilesData();
    const file = files.find((f) => f.id === req.params.id);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    res.json({
      message: "Share link generated successfully",
      fileName: file.originalName,
      shareLink: file.publicUrl,
    });
  } catch (error) {
    console.error("Share error:", error);
    res.status(500).json({
      message: "Server error while generating share link",
      error: error.message,
    });
  }
});

// Delete file API
router.delete("/:id", async (req, res) => {
  try {
    const files = readFilesData();
    const file = files.find((f) => f.id === req.params.id);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([file.storagePath]);

    if (error) {
      console.error("Supabase delete error:", error);
      return res.status(500).json({
        message: "Failed to delete file from Supabase",
        error: error.message,
      });
    }

    // Remove from local metadata JSON
    const updatedFiles = files.filter((f) => f.id !== req.params.id);
    writeFilesData(updatedFiles);

    res.json({
      message: "File deleted successfully",
      deletedFile: file.originalName,
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      message: "Server error during file delete",
      error: error.message,
    });
  }
});

module.exports = router;