const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const AUTH_BASE = API_BASE.replace(/\/api$/, "/auth");
const TOKEN_KEY = "gbf_auth_token";

export function getAuthToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token) {
  if (!token) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

function withAuthHeaders(options = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...options,
    headers
  };
}

export async function fetchJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, withAuthHeaders(options));

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

export async function fetchAuth(path, options) {
  const response = await fetch(`${AUTH_BASE}${path}`, withAuthHeaders(options));

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // Keep default message.
    }

    throw new Error(message);
  }

  return response.json();
}

export { API_BASE, AUTH_BASE };
