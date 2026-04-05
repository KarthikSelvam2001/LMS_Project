import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set global API base URL for the library to use in production
const prodBackendUrl = "https://lms-project-be-hbhd.onrender.com/api";
const currentUrl = typeof window !== 'undefined' ? window.location.href : "";
const isProdDomain = currentUrl.includes("lms-project-h9a8.onrender.com");

(window as any).__LMS_API_BASE_URL__ = import.meta.env.VITE_API_URL || 
                                     (isProdDomain ? prodBackendUrl : "") || 
                                     import.meta.env.VITE_API_PROXY_URL || "";

createRoot(document.getElementById("root")!).render(<App />);
