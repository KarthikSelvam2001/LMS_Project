const BASE_URL = import.meta.env.VITE_API_URL || "";

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

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || response.statusText);
  }

  return response.json();
}
