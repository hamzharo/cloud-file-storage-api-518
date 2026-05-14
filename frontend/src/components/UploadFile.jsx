import { useState } from "react";
import { uploadFile } from "../api/fileApi";

function UploadFile({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("");

      await uploadFile(selectedFile);

      setMessage("File uploaded successfully.");
      setSelectedFile(null);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to upload file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h2>Upload File</h2>

      <input type="file" onChange={handleFileChange} />

      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {message && <p>{message}</p>}
    </div>
  );
}

export default UploadFile;