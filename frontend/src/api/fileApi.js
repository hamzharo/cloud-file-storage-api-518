// Import Axios
// Axios is used to send HTTP requests from React to the backend API
import axios from "axios";

// Base URL of the backend file API
// The backend server runs on port 5001
const API_BASE_URL = "http://localhost:5001/api/files";

/*
  uploadFile(file)

  Purpose:
  Sends a selected file from the frontend to the backend upload API.

  Backend route:
  POST /api/files/upload

  Important:
  The key name must be "file" because backend uses:
  upload.single("file")
*/
export const uploadFile = async (file) => {
  // FormData is required when sending files
  const formData = new FormData();

  // Append the selected file using key name "file"
  formData.append("file", file);

  // Send POST request to backend
  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  // Return response data to the component
  return response.data;
};

/*
  getFiles()

  Purpose:
  Gets the list of uploaded files from the backend.

  Backend route:
  GET /api/files
*/
export const getFiles = async () => {
  const response = await axios.get(API_BASE_URL);
  return response.data;
};

/*
  deleteFile(id)

  Purpose:
  Deletes a file by ID.

  Backend route:
  DELETE /api/files/:id
*/
export const deleteFile = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/${id}`);
  return response.data;
};

/*
  getShareLink(id)

  Purpose:
  Gets a shareable link for a file.

  Backend route:
  GET /api/files/share/:id
*/
export const getShareLink = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/share/${id}`);
  return response.data;
};

/*
  getDownloadUrl(id)

  Purpose:
  Returns the backend download URL.

  This does not call Axios because it is used directly in an <a> tag.
*/
export const getDownloadUrl = (id) => {
  return `${API_BASE_URL}/download/${id}`;
};

/*
  getViewUrl(id)

  Purpose:
  Returns the backend view URL.

  This opens the file in a new browser tab.
*/
export const getViewUrl = (id) => {
  return `${API_BASE_URL}/view/${id}`;
};