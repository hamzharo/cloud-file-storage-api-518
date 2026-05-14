const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

const router = express.Router();

/*
  Supabase setup
*/
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const bucketName = process.env.SUPABASE_BUCKET || "files";

/*
  Multer setup
  We keep the file in memory before sending it to Supabase.
*/
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

/*
  Local JSON metadata file.
  Supabase stores the actual file.
  files.json stores file information.
*/
const dataFilePath = path.join(__dirname, "../data/files.json");

/*
  Read file metadata from files.json.
*/
function readFilesData() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }

  const data = fs.readFileSync(dataFilePath, "utf8");
  return JSON.parse(data || "[]");
}

/*
  Write file metadata to files.json.
*/
function writeFilesData(files) {
  fs.writeFileSync(dataFilePath, JSON.stringify(files, null, 2));
}

/*
  Helper function to find one file by ID.
*/
function findFileById(id) {
  const files = readFilesData();
  return files.find((file) => file.id === id);
}

/*
  Test route
*/
router.get("/test", (req, res) => {
  res.json({ message: "File API is working" });
});

/*
  Upload file API

  POST /api/files/upload
*/
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

    /*
      Upload file to Supabase Storage.
    */
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

    /*
      Get public URL for viewing.
    */
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

/*
  Get all files API

  GET /api/files
*/
router.get("/", (req, res) => {
  const files = readFilesData();
  res.json(files);
});

/*
  Public receiver page

  GET /api/files/public/:id

  This is the link that will be shared with another person.
  The receiver can choose either:
  - View File
  - Download File
*/
router.get("/public/:id", (req, res) => {
  try {
    const file = findFileById(req.params.id);

    if (!file) {
      return res.status(404).send(`
        <html>
          <body>
            <h2>File not found</h2>
            <p>The file may have been deleted or the link is incorrect.</p>
          </body>
        </html>
      `);
    }

    const viewUrl = `/api/files/view/${file.id}`;
    const downloadUrl = `/api/files/download/${file.id}`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Shared File</title>

        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f6f8;
            margin: 0;
            padding: 0;
          }

          .container {
            max-width: 600px;
            margin: 80px auto;
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
          }

          h1 {
            color: #222;
          }

          p {
            color: #555;
            word-break: break-word;
          }

          .buttons {
            margin-top: 25px;
          }

          a {
            display: inline-block;
            margin: 8px;
            padding: 10px 16px;
            border-radius: 6px;
            text-decoration: none;
            color: white;
            background-color: #2563eb;
          }

          a:hover {
            background-color: #1d4ed8;
          }

          .download {
            background-color: #16a34a;
          }

          .download:hover {
            background-color: #15803d;
          }
        </style>
      </head>

      <body>
        <div class="container">
          <h1>Shared File</h1>

          <p><strong>File Name:</strong> ${file.originalName}</p>
          <p><strong>File Type:</strong> ${file.fileType}</p>

          <div class="buttons">
            <a href="${viewUrl}" target="_blank">View File</a>
            <a href="${downloadUrl}" class="download">Download File</a>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error("Public page error:", error);

    res.status(500).send(`
      <html>
        <body>
          <h2>Server error</h2>
          <p>Something went wrong while opening the shared file.</p>
        </body>
      </html>
    `);
  }
});

/*
  View file API

  GET /api/files/view/:id

  This opens the file in the browser.
*/
router.get("/view/:id", (req, res) => {
  try {
    const file = findFileById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    /*
      Redirect to Supabase public URL.
      This allows image, PDF, and text files to open in the browser.
    */
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
  Download file API

  GET /api/files/download/:id

  This downloads the file instead of only opening it.
*/
router.get("/download/:id", async (req, res) => {
  try {
    const file = findFileById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    /*
      Download file from Supabase Storage.
      This gives the backend the actual file content.
    */
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(file.storagePath);

    if (error) {
      console.error("Supabase download error:", error);

      return res.status(500).json({
        message: "Failed to download file from Supabase",
        error: error.message,
      });
    }

    /*
      Convert Supabase file data into a Node.js Buffer.
    */
    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    /*
      Set headers to force browser download.
    */
    res.setHeader("Content-Type", file.fileType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalName}"`
    );

    /*
      Send file content to the browser.
    */
    res.send(buffer);
  } catch (error) {
    console.error("Download error:", error);

    res.status(500).json({
      message: "Server error during file download",
      error: error.message,
    });
  }
});

/*
  Share file API

  GET /api/files/share/:id

  This returns a receiver page link, not just the raw Supabase file URL.
*/
router.get("/share/:id", (req, res) => {
  try {
    const file = findFileById(req.params.id);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    /*
      This is the link the sender shares with another person.

      Receiver opens this page and sees:
      - View File
      - Download File
    */
    const sharePageLink = `${req.protocol}://${req.get("host")}/api/files/public/${file.id}`;

    res.json({
      message: "Share link generated successfully",
      fileName: file.originalName,
      shareLink: sharePageLink,
      viewLink: `${req.protocol}://${req.get("host")}/api/files/view/${file.id}`,
      downloadLink: `${req.protocol}://${req.get("host")}/api/files/download/${file.id}`,
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
  Delete file API

  DELETE /api/files/:id
*/
router.delete("/:id", async (req, res) => {
  try {
    const files = readFilesData();
    const file = files.find((f) => f.id === req.params.id);

    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    /*
      Delete the actual file from Supabase Storage.
    */
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

    /*
      Remove file metadata from files.json.
    */
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