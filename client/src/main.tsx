import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
// Import logger to disable console in production
import "./utils/logger";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename="/tetris">
      <App />
    </BrowserRouter>
  </StrictMode>
);
