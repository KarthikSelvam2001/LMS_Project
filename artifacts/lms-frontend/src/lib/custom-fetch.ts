const globalBaseUrl = (typeof window !== 'undefined' && (window as any).__LMS_API_BASE_URL__);
const envBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_PROXY_URL || "";
const BASE_URL = globalBaseUrl || envBaseUrl;

export async function customFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  // If the url is relative, prepend the BASE_URL
  const normalizedBase = BASE_URL.replace(/\/$/, "");
  const normalizedUrl = url.startsWith("/") ? url : `/${url}`;
  
  let fullUrl = url;
  if (!url.startsWith("http")) {
    if (normalizedBase.endsWith("/api") && normalizedUrl.startsWith("/api")) {
      fullUrl = `${normalizedBase.replace(/\/api$/, "")}${normalizedUrl}`;
    } else {
      fullUrl = `${normalizedBase}${normalizedUrl}`;
    }
  }

  // Debug log for production troubleshooting
  if (import.meta.env.PROD) {
    console.log(`[Frontend Fetch] Fetching: ${fullUrl} (Base: ${normalizedBase})`);
  }

  const response = await fetch(fullUrl, {
    ...options,
    credentials: "include", // Ensure cookies are sent
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    let errorMsg = response.statusText;
    if (contentType && contentType.includes("application/json")) {
      const errorData = await response.json().catch(() => ({}));
      errorMsg = errorData.message || errorMsg;
    } else {
      const text = await response.text().catch(() => "");
      console.error("Non-JSON error response:", text);
    }
    throw new Error(errorMsg);
  }

  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    console.warn("Empty response body from:", fullUrl);
    return {} as T;
  }
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response from:", fullUrl, "Content:", text.substring(0, 100));
    throw new Error("Invalid JSON response from server");
  }
}
