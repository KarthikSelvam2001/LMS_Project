import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set global API base URL for the library to use in production
(window as any).__LMS_API_BASE_URL__ = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_PROXY_URL || "";

createRoot(document.getElementById("root")!).render(<App />);
