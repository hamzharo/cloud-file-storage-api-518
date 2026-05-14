import { useEffect, useState } from "react";
import { getFiles, deleteFile, getShareLink, getDownloadUrl } from "../api/fileApi";

function FileList({ refreshKey }) {
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");

  const loadFiles = async () => {
    try {
      const data = await getFiles();
      setFiles(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load files.");
    }
  };

  useEffect(() => {
    loadFiles();
  }, [refreshKey]);

  const handleDelete = async (id) => {
    try {
      await deleteFile(id);
      setMessage("File deleted successfully.");
      loadFiles();
    } catch (error) {
      console.error(error);
      setMessage("Failed to delete file.");
    }
  };

  const handleShare = async (id) => {
    try {
      const data = await getShareLink(id);
      await navigator.clipboard.writeText(data.shareLink);
      setMessage("Share link copied to clipboard.");
    } catch (error) {
      console.error(error);
      setMessage("Failed to copy share link.");
    }
  };

  const formatFileSize = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="card">
      <h2>Uploaded Files</h2>

      {message && <p>{message}</p>}

      {files.length === 0 ? (
        <p>No files uploaded yet.</p>
      ) : (
        <div className="file-list">
          {files.map((file) => (
            <div className="file-item" key={file.id}>
              <div>
                <strong>{file.originalName}</strong>
                <p>Type: {file.fileType}</p>
                <p>Size: {formatFileSize(file.fileSize)}</p>
              </div>

              <div className="actions">
                <a href={getDownloadUrl(file.id)} target="_blank" rel="noreferrer">
                  Download
                </a>

                <button onClick={() => handleShare(file.id)}>Share Link</button>

                <button onClick={() => handleDelete(file.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FileList;