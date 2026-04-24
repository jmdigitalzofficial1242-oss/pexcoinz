import { getToken, getAdminToken } from "./auth-utils";

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = input.toString();
  const options = init || {};
  const headers = new Headers(options.headers);

  if (url.includes("/api/admin")) {
    const adminToken = getAdminToken();
    if (adminToken) {
      headers.set("Authorization", `Bearer ${adminToken}`);
    }
  } else if (
    !url.includes("/api/auth/login") &&
    !url.includes("/api/auth/register")
  ) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  return originalFetch(input, { ...options, headers });
};
