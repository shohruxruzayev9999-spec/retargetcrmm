import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// StrictMode removed — it double-invokes every useEffect in dev
// causing duplicate Firebase listeners, race conditions and flickering.
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
