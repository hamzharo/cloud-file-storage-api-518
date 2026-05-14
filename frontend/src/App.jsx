// Import useState from React
import { useState } from "react";

// Import upload component
import UploadFile from "./components/UploadFile";

// Import file list component
import FileList from "./components/FileList";

// Import CSS file
import "./App.css";

/*
  App Component

  This is the main frontend component.

  It displays:
  - Page title
  - Upload file section
  - Uploaded file list
*/
function App() {
  /*
    refreshKey is used to refresh the file list.

    When a file is uploaded successfully,
    refreshKey changes, and FileList reloads the files.
  */
  const [refreshKey, setRefreshKey] = useState(0);

  /*
    refreshFiles()

    Increases refreshKey by 1.
    This tells FileList to load the updated file list.
  */
  const refreshFiles = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="app">
      <h1>Cloud File Storage and Sharing</h1>

      <p>
        Upload, view, download, delete, and share files using a REST API and
        Supabase Storage.
      </p>

      {/* Upload component */}
      <UploadFile onUploadSuccess={refreshFiles} />

      {/* File list component */}
      <FileList refreshKey={refreshKey} />
    </div>
  );
}

export default App;