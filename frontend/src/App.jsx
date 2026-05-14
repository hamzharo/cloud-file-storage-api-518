import { useState } from "react";
import UploadFile from "./components/UploadFile";
import FileList from "./components/FileList";
import "./App.css";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshFiles = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="app">
      <h1>Cloud File Storage and Sharing</h1>
      <p>
        Upload, store, download, delete, and share files using a REST API and
        Supabase Storage.
      </p>

      <UploadFile onUploadSuccess={refreshFiles} />
      <FileList refreshKey={refreshKey} />
    </div>
  );
}

export default App;