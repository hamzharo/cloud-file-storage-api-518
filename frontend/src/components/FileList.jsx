// Import React hooks
// useEffect is used to load files when the component opens
// useState is used to store files, messages, share links, and email input
import { useEffect, useState } from "react";

// Import API helper functions from fileApi.js
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
  This component displays all uploaded files.

  It allows the user to:
  - View a file
  - Download a file
  - Generate a share link
  - Open the share page directly
  - Send the share link by email using mailto
  - Delete a file
*/
function FileList({ refreshKey }) {
  // Stores all uploaded files from backend
  const [files, setFiles] = useState([]);

  // Stores success or error messages
  const [message, setMessage] = useState("");

  /*
    shareData stores the current shared file information.

    Example:
    {
      fileId: "123",
      fileName: "report.pdf",
      shareLink: "http://localhost:5001/api/files/public/123"
    }
  */
  const [shareData, setShareData] = useState(null);

  // Stores the receiver email typed by the user
  const [receiverEmail, setReceiverEmail] = useState("");

  /*
    loadFiles()

    Purpose:
    Calls the backend API to get all uploaded files.
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
    useEffect()

    This runs when the component first loads.
    It also runs again whenever refreshKey changes.

    refreshKey changes after a successful upload,
    so the file list updates automatically.
  */
  useEffect(() => {
    loadFiles();
  }, [refreshKey]);

  /*
    handleDelete(id)

    Purpose:
    Deletes a selected file.

    Steps:
    1. Ask user for confirmation
    2. Call backend delete API
    3. Reload file list
  */
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this file?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteFile(id);

      setMessage("File deleted successfully.");

      // If the deleted file is currently shared in the share box, clear it
      if (shareData && shareData.fileId === id) {
        setShareData(null);
        setReceiverEmail("");
      }

      // Reload the updated file list
      loadFiles();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete file.");
    }
  };

  /*
    handleShare(file)

    Purpose:
    Gets the share page link from the backend.

    Before:
    We only copied the link to clipboard.

    Now:
    We show the link on the page so the user can click it directly.
  */
  const handleShare = async (file) => {
    try {
      const data = await getShareLink(file.id);

      // Store share information so it can be displayed on the page
      setShareData({
        fileId: file.id,
        fileName: data.fileName,
        shareLink: data.shareLink,
      });

      setMessage("Share link generated successfully.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to generate share link.");
    }
  };

  /*
    handleCopyShareLink()

    Purpose:
    Copies the generated share link to clipboard.
  */
  const handleCopyShareLink = async () => {
    if (!shareData) {
      setMessage("Please generate a share link first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.shareLink);
      setMessage("Share link copied to clipboard.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to copy share link.");
    }
  };

  /*
    handleSendEmail()

    Purpose:
    Opens the user's email app with the receiver email,
    subject, and message already prepared.

    This uses mailto, so it is free and does not require
    an email API or email server.
  */
  const handleSendEmail = () => {
    if (!shareData) {
      setMessage("Please generate a share link first.");
      return;
    }

    if (!receiverEmail) {
      setMessage("Please enter the receiver email.");
      return;
    }

    // Email subject
    const subject = `Shared file: ${shareData.fileName}`;

    // Email body
    const body = `Hello,

I am sharing this file with you:

${shareData.fileName}

You can view or download it using this link:
${shareData.shareLink}

Thank you.`;

    /*
      mailto opens the default email app.

      encodeURIComponent is used to safely place spaces,
      new lines, and special characters inside the email URL.
    */
    const mailtoLink = `mailto:${receiverEmail}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    // Open email app
    window.location.href = mailtoLink;
  };

  /*
    formatFileSize(size)

    Purpose:
    Converts file size from bytes to KB or MB.
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

    Purpose:
    Converts upload date into a readable format.
  */
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="card">
      <h2>Uploaded Files</h2>

      {/* Display success or error messages */}
      {message && <p className="message">{message}</p>}

      {/* Share section appears only after user clicks Share Link */}
      {shareData && (
        <div className="share-box">
          <h3>Share File</h3>

          <p>
            <strong>File:</strong> {shareData.fileName}
          </p>

          <p>
            <strong>Share Page:</strong>{" "}
            <a href={shareData.shareLink} target="_blank" rel="noreferrer">
              Open Share Page
            </a>
          </p>

          <p className="share-url">{shareData.shareLink}</p>

          <button onClick={handleCopyShareLink}>Copy Link</button>

          <div className="email-row">
            <input
              type="email"
              placeholder="Enter receiver email"
              value={receiverEmail}
              onChange={(event) => setReceiverEmail(event.target.value)}
            />

            <button onClick={handleSendEmail}>Send Email</button>
          </div>
        </div>
      )}

      {/* If there are no uploaded files */}
      {files.length === 0 ? (
        <p>No files uploaded yet.</p>
      ) : (
        <div className="file-list">
          {files.map((file) => (
            <div className="file-item" key={file.id}>
              {/* File information */}
              <div className="file-info">
                <strong>{file.originalName}</strong>
                <p>Type: {file.fileType}</p>
                <p>Size: {formatFileSize(file.fileSize)}</p>
                <p>Uploaded: {formatDate(file.uploadDate)}</p>
              </div>

              {/* File actions */}
              <div className="actions">
                {/* View opens the file in the browser */}
                <a href={getViewUrl(file.id)} target="_blank" rel="noreferrer">
                  View
                </a>

                {/* Download downloads the file */}
                <a
                  href={getDownloadUrl(file.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Download
                </a>

                {/* Generate share page link */}
                <button onClick={() => handleShare(file)}>Share Link</button>

                {/* Delete removes file from Supabase and metadata */}
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