// Import Express framework
// Express is used to create the backend REST API server
const express = require("express");

// Import CORS
// CORS allows the frontend React app to communicate with this backend
const cors = require("cors");

// Import dotenv
// dotenv loads variables from the .env file into process.env
const dotenv = require("dotenv");

// IMPORTANT:
// Load environment variables before importing routes.
// This is necessary because fileRoutes.js uses Supabase variables from .env.
dotenv.config();

// Import file routes
// These routes handle upload, list, view, download, share, and delete
const fileRoutes = require("./routes/fileRoutes");

// Create an Express application
const app = express();

// Enable CORS
// This allows requests from the frontend running on localhost:5173
app.use(cors());

// Allow the server to read JSON data from request bodies
app.use(express.json());

// Main API route
// All file-related APIs will start with /api/files
app.use("/api/files", fileRoutes);

// Use the port from .env, or use 5001 if no port is provided
const PORT = process.env.PORT || 5001;

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});