const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

// Load .env first before importing routes
dotenv.config();

const fileRoutes = require("./routes/fileRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/files", fileRoutes);

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});