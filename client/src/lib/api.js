const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export async function fetchJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, options);

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      try {
        const text = await response.text();
        message = text || message;
      } catch {
        // Ignore parse failures and keep the default message.
      }
    }

    throw new Error(message);
  }

  return response.json();
}

export { API_BASE };
