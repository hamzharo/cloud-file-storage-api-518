// Import React hooks
import { useEffect, useState } from "react";

// Import API helper functions
import {
  getFiles,
  deleteFile,
  getShareLink,
  getDownloadUrl,
  getViewUrl,
} from "../api/fileApi";

/*
  FileList Component

  Purpose:
  Displays uploaded files and gives options to:
  - View
  - Download
  - Share Link
  - Delete

  Props:
  refreshKey:
  - Comes from App.jsx
  - When refreshKey changes, this component reloads the file list
*/
function FileList({ refreshKey }) {
  // Stores all uploaded files
  const [files, setFiles] = useState([]);

  // Stores success or error messages
  const [message, setMessage] = useState("");

  /*
    loadFiles()

    This function gets the uploaded files from the backend API.
  */
  const loadFiles = async () => {
    try {
      const data = await getFiles();
      setFiles(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load files.");
    }
  };

  /*
    useEffect

    This runs when the component first loads.
    It also runs again when refreshKey changes.
  */
  useEffect(() => {
    loadFiles();
  }, [refreshKey]);

  /*
    handleDelete(id)

    Deletes a file by ID.
  */
  const handleDelete = async (id) => {
    // Ask user for confirmation before deleting
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this file?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteFile(id);
      setMessage("File deleted successfully.");

      // Reload files after delete
      loadFiles();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete file.");
    }
  };

  /*
    handleShare(id)

    Gets the share link from backend and copies it to clipboard.
  */
  const handleShare = async (id) => {
    try {
      const data = await getShareLink(id);

      // Copy share link to user's clipboard
      await navigator.clipboard.writeText(data.shareLink);

      setMessage("Share link copied to clipboard.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to copy share link.");
    }
  };

  /*
    formatFileSize(size)

    Converts file size from bytes into a readable format.
  */
  const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`;

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(2)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  /*
    formatDate(dateString)

    Converts ISO date into a readable date and time.
  */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="card">
      <h2>Uploaded Files</h2>

      {/* Message area */}
      {message && <p className="message">{message}</p>}

      {/* If no files exist */}
      {files.length === 0 ? (
        <p>No files uploaded yet.</p>
      ) : (
        <div className="file-list">
          {/* Display each file */}
          {files.map((file) => (
            <div className="file-item" key={file.id}>
              {/* File information */}
              <div className="file-info">
                <strong>{file.originalName}</strong>
                <p>Type: {file.fileType}</p>
                <p>Size: {formatFileSize(file.fileSize)}</p>
                <p>Uploaded: {formatDate(file.uploadDate)}</p>
              </div>

              {/* File action buttons */}
              <div className="actions">
                {/* View opens file in new tab */}
                <a href={getViewUrl(file.id)} target="_blank" rel="noreferrer">
                  View
                </a>

                {/* Download opens/downloads file */}
                <a
                  href={getDownloadUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>

                {/* Share link copies public URL */}
                <button onClick={() => handleShare(file.id)}>Share Link</button>

                {/* Delete removes file */}
                <button
                  className="delete-button"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileList;