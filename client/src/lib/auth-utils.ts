export function getToken() {
  return localStorage.getItem("pexcoin_token");
}

export function setToken(token: string) {
  localStorage.setItem("pexcoin_token", token);
}

export function removeToken() {
  localStorage.removeItem("pexcoin_token");
}

export function getAdminToken() {
  return localStorage.getItem("pexcoin_admin_token");
}

export function setAdminToken(token: string) {
  localStorage.setItem("pexcoin_admin_token", token);
}

export function removeAdminToken() {
  localStorage.removeItem("pexcoin_admin_token");
}
