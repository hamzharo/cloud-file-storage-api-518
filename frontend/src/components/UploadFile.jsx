// Import useState from React
// useState allows us to store component state
import { useState } from "react";

// Import uploadFile API function
import { uploadFile } from "../api/fileApi";

/*
  UploadFile Component

  Purpose:
  Allows the user to choose a file and upload it.

  Props:
  onUploadSuccess:
  - This function is passed from App.jsx
  - It refreshes the file list after a successful upload
*/
function UploadFile({ onUploadSuccess }) {
  // Stores the selected file
  const [selectedFile, setSelectedFile] = useState(null);

  // Stores success or error messages
  const [message, setMessage] = useState("");

  // Tracks whether upload is currently happening
  const [uploading, setUploading] = useState(false);

  /*
    handleFileChange

    This function runs when the user selects a file.
  */
  const handleFileChange = (event) => {
    // Save selected file in state
    setSelectedFile(event.target.files[0]);

    // Clear old messages
    setMessage("");
  };

  /*
    handleUpload

    This function runs when the user clicks the Upload button.
  */
  const handleUpload = async () => {
    // Make sure user selected a file
    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      // Start upload loading state
      setUploading(true);

      // Clear old message
      setMessage("");

      // Send file to backend API
      await uploadFile(selectedFile);

      // Show success message
      setMessage("File uploaded successfully.");

      // Clear selected file from state
      setSelectedFile(null);

      // Refresh file list in parent component
      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      // Log error in console for debugging
      console.error(error);

      // Show error message to user
      setMessage("Failed to upload file.");
    } finally {
      // Stop upload loading state
      setUploading(false);
    }
  };

  return (
    <div className="card">
      <h2>Upload File</h2>

      {/* File input */}
      <input type="file" onChange={handleFileChange} />

      {/* Upload button */}
      <button onClick={handleUpload} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {/* Message area */}
      {message && <p>{message}</p>}
    </div>
  );
}

export default UploadFile;