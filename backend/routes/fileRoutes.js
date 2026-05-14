// Import Express to create API routes
const express = require("express");

// Import multer
// Multer is used to handle file uploads from the frontend
const multer = require("multer");

// Import Supabase client
// This allows our backend to communicate with Supabase Storage
const { createClient } = require("@supabase/supabase-js");

// Import uuid
// UUID creates unique IDs for files so filenames do not conflict
const { v4: uuidv4 } = require("uuid");

// Import file system module
// fs is used to read and write the local JSON metadata file
const fs = require("fs");

// Import path module
// path helps create safe file paths
const path = require("path");

// Create an Express router
const router = express.Router();

/*
  Supabase setup

  SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_BUCKET
  are stored in the .env file.

  Example .env:

  PORT=5001
  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_ANON_KEY=your_publishable_key
  SUPABASE_BUCKET=files
*/
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Bucket name from .env
// If not found, default to "files"
const bucketName = process.env.SUPABASE_BUCKET || "files";

/*
  Multer setup

  We are using memoryStorage.
  This means the uploaded file is temporarily kept in memory,
  then sent directly to Supabase Storage.

  We are NOT saving the uploaded file permanently in local backend/uploads.
*/
const storage = multer.memoryStorage();

const upload = multer({
  storage,

  // File size limit: 10 MB
  // This prevents users from uploading very large files
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

/*
  Metadata file

  Supabase stores the actual uploaded files.
  This local JSON file stores file information such as:
  - file id
  - original file name
  - file type
  - file size
  - Supabase storage path
  - public URL
  - upload date
*/
const dataFilePath = path.join(__dirname, "../data/files.json");

/*
  Helper function: readFilesData()

  This function reads all file metadata from files.json.
  If files.json does not exist, it creates an empty JSON array.
*/
function readFilesData() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }

  const data = fs.readFileSync(dataFilePath, "utf8");

  // If the file is empty, return an empty array
  return JSON.parse(data || "[]");
}

/*
  Helper function: writeFilesData()

  This function saves updated file metadata back to files.json.
*/
function writeFilesData(files) {
  fs.writeFileSync(dataFilePath, JSON.stringify(files, null, 2));
}

/*
  TEST ROUTE

  Method: GET
  URL: /api/files/test

  Purpose:
  Used to check if the backend file API is working.
*/
router.get("/test", (req, res) => {
  res.json({ message: "File API is working" });
});

/*
  UPLOAD FILE API

  Method: POST
  URL: /api/files/upload

  Frontend sends:
  - form-data
  - key name must be "file"

  What this API does:
  1. Receives the uploaded file from frontend
  2. Creates a unique file name
  3. Uploads the file to Supabase Storage
  4. Gets the public URL from Supabase
  5. Saves file metadata in files.json
  6. Returns success response
*/
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    // Check if the frontend actually sent a file
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Create a unique ID for the file
    const fileId = uuidv4();

    // Original file name uploaded by the user
    const originalName = req.file.originalname;

    // Get file extension, for example: .png, .pdf, .txt
    const fileExtension = path.extname(originalName);

    // Create a unique stored file name
    // Example: 1234abcd.png
    const storedName = `${fileId}${fileExtension}`;

    // Path inside Supabase bucket
    // The file will be stored under uploads/
    const filePath = `uploads/${storedName}`;

    /*
      Upload file to Supabase Storage

      req.file.buffer contains the uploaded file data.
      req.file.mimetype stores the file type, such as image/png or application/pdf.
    */
    const { error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    // If Supabase returns an error, stop and send error response
    if (error) {
      console.error("Supabase upload error:", error);

      return res.status(500).json({
        message: "Failed to upload file to Supabase",
        error: error.message,
      });
    }

    /*
      Get public URL

      Because this prototype uses a public bucket,
      the file can be opened using this public URL.

      For a real secure production system, signed URLs would be better.
    */
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    /*
      Create metadata record

      This record is saved locally in files.json.
      The actual file is stored in Supabase Storage.
    */
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

    // Read current file metadata
    const files = readFilesData();

    // Add the new file record
    files.push(fileRecord);

    // Save updated metadata
    writeFilesData(files);

    // Return success response to frontend
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

/*
  GET ALL FILES API

  Method: GET
  URL: /api/files

  Purpose:
  Returns all uploaded file metadata from files.json.
  The frontend uses this to display the file list.
*/
router.get("/", (req, res) => {
  const files = readFilesData();
  res.json(files);
});

/*
  VIEW FILE API

  Method: GET
  URL: /api/files/view/:id

  Purpose:
  Opens the file in the browser using its public Supabase URL.

  Works well for:
  - images
  - PDFs
  - text files

  Some file types, like .docx or .zip, may download instead.
  That depends on the browser.
*/
router.get("/view/:id", (req, res) => {
  try {
    // Read all file metadata
    const files = readFilesData();

    // Find the file with the matching ID
    const file = files.find((f) => f.id === req.params.id);

    // If no file is found, return 404
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Redirect the browser to the Supabase public URL
    res.redirect(file.publicUrl);
  } catch (error) {
    console.error("View error:", error);

    res.status(500).json({
      message: "Server error during file view",
      error: error.message,
    });
  }
});

/*
  DOWNLOAD FILE API

  Method: GET
  URL: /api/files/download/:id

  Purpose:
  Redirects the user to the Supabase public URL.

  In this simple version, view and download are similar.
  The browser decides whether to preview or download the file.
*/
router.get("/download/:id", (req, res) => {
  try {
    // Read all file metadata
    const files = readFilesData();

    // Find file by ID
    const file = files.find((f) => f.id === req.params.id);

    // If file does not exist, return 404
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Redirect user to the Supabase public URL
    res.redirect(file.publicUrl);
  } catch (error) {
    console.error("Download error:", error);

    res.status(500).json({
      message: "Server error during file download",
      error: error.message,
    });
  }
});

/*
  SHARE FILE API

  Method: GET
  URL: /api/files/share/:id

  Purpose:
  Returns a shareable public link for the file.

  Since this prototype does not use login/register,
  anyone with the share link can open the file.
*/
router.get("/share/:id", (req, res) => {
  try {
    // Read all file metadata
    const files = readFilesData();

    // Find file by ID
    const file = files.find((f) => f.id === req.params.id);

    // If file does not exist, return 404
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Return share link
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

/*
  DELETE FILE API

  Method: DELETE
  URL: /api/files/:id

  Purpose:
  Deletes a file from:
  1. Supabase Storage
  2. Local files.json metadata
*/
router.delete("/:id", async (req, res) => {
  try {
    // Read all file metadata
    const files = readFilesData();

    // Find the file to delete
    const file = files.find((f) => f.id === req.params.id);

    // If file does not exist, return 404
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    /*
      Delete file from Supabase Storage

      file.storagePath looks like:
      uploads/unique-file-name.png
    */
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([file.storagePath]);

    // If Supabase deletion fails, return error
    if (error) {
      console.error("Supabase delete error:", error);

      return res.status(500).json({
        message: "Failed to delete file from Supabase",
        error: error.message,
      });
    }

    // Remove the file record from files.json
    const updatedFiles = files.filter((f) => f.id !== req.params.id);

    // Save updated metadata
    writeFilesData(updatedFiles);

    // Return success response
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

// Export router so server.js can use it
module.exports = router;