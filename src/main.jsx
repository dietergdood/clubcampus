import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Tabler Icons Font direkt einbinden
// Das Package muss installiert sein: npm install @tabler/icons-webfont
import "@tabler/icons-webfont/dist/tabler-icons.min.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
