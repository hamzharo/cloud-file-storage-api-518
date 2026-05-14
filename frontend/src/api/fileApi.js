import axios from "axios";

const API_BASE_URL = "http://localhost:5001/api/files";

export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

export const getFiles = async () => {
  const response = await axios.get(API_BASE_URL);
  return response.data;
};

export const deleteFile = async (id) => {
  const response = await axios.delete(`${API_BASE_URL}/${id}`);
  return response.data;
};

export const getShareLink = async (id) => {
  const response = await axios.get(`${API_BASE_URL}/share/${id}`);
  return response.data;
};

export const getDownloadUrl = (id) => {
  return `${API_BASE_URL}/download/${id}`;
};