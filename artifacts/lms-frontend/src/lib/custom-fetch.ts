const BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_PROXY_URL || "";

export async function customFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  // If the url is relative, prepend the BASE_URL
  const fullUrl = url.startsWith("http") ? url : `${BASE_URL.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;

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
