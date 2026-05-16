export const BASE = import.meta.env.VITE_API_URL || "https://finance-and-expense-tracker-kji1.onrender.com/api";
const TOKEN_KEY = "finance_auth_token";

export function getAuthToken() {
  return typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
}

export function setAuthToken(token) {
  if (typeof localStorage !== "undefined") {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearAuthToken() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getAuthToken();
  const isPublicAuthCall =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/google/enabled");

  const headers = {
    ...(options.headers || {}),
  };
  const hasExplicitContentType =
    typeof headers["Content-Type"] !== "undefined" ||
    typeof headers["content-type"] !== "undefined";

  const body = options.body;
  let method = options.method ?? "GET";
  if (
    typeof body !== "undefined" &&
    body !== null &&
    method !== "GET" &&
    method !== "HEAD" &&
    !hasExplicitContentType
  ) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401 && !isPublicAuthCall && token) {
      clearAuthToken();
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/app")) {
        window.location.assign("/");
      }
    }
    const msg = data?.error || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  login: (body) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/auth/me"),
  googleOAuthEnabled: () => request("/auth/google/enabled"),

  accounts: () => request("/accounts"),
  createAccount: (body) => request("/accounts", { method: "POST", body: JSON.stringify(body) }),
  updateAccount: (id, body) =>
    request(`/accounts/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteAccount: (id) => request(`/accounts/${id}`, { method: "DELETE" }),

  categories: (flow) => request(`/categories${flow ? `?flow=${flow}` : ""}`),
  createCategory: (body) => request("/categories", { method: "POST", body: JSON.stringify(body) }),
  updateCategory: (id, body) =>
    request(`/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: "DELETE" }),

  transactions: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/transactions${q ? `?${q}` : ""}`);
  },
  createTransaction: (body) =>
    request("/transactions", { method: "POST", body: JSON.stringify(body) }),
  updateTransaction: (id, body) =>
    request(`/transactions/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: "DELETE" }),

  summaryMonth: (year, month) =>
    request(`/summary/month?year=${year}&month=${month}`),
  accountBalances: () => request("/summary/account-balances"),

  budgets: (year, month) => {
    const q = new URLSearchParams();
    if (year != null) q.set("year", year);
    if (month != null) q.set("month", month);
    const s = q.toString();
    return request(`/budgets${s ? `?${s}` : ""}`);
  },
  createBudget: (body) => request("/budgets", { method: "POST", body: JSON.stringify(body) }),
  updateBudget: (id, body) =>
    request(`/budgets/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteBudget: (id) => request(`/budgets/${id}`, { method: "DELETE" }),
};
