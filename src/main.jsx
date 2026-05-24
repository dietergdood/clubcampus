import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Tabler Icons laden - versuche mehrere Pfade
const loadTablerIcons = () => {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.47.0/tabler-icons.min.css";
  link.crossOrigin = "anonymous";
  document.head.appendChild(link);
};
loadTablerIcons();

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
);
