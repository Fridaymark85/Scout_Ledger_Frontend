// Axios client for the Django API: attaches the JWT and transparently refreshes it on 401.
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

export const tokens = {
  get access() { return localStorage.getItem(ACCESS_KEY); },
  get refresh() { return localStorage.getItem(REFRESH_KEY); },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const api = axios.create({ baseURL, headers: { "Content-Type": "application/json" } });

// Attach the access token to every request.
api.interceptors.request.use((config) => {
  const token = tokens.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// A single in-flight refresh is shared so parallel 401s don't each rotate the token.
let refreshing: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  const refresh = tokens.refresh;
  if (!refresh) return Promise.reject(new Error("No refresh token"));
  // Plain axios (not `api`) so this call bypasses our own interceptors.
  return axios
    .post(`${baseURL}/api/token/refresh/`, { refresh })
    .then((res) => {
      tokens.set(res.data.access, res.data.refresh); // refresh is returned only if rotation is enabled
      return res.data.access as string;
    });
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    if (error.response?.status !== 401 || !original || original._retry) return Promise.reject(error);
    // Never try to refresh for the auth endpoints themselves.
    if (original.url?.includes("/api/token/")) return Promise.reject(error);

    original._retry = true;
    try {
      refreshing ??= refreshAccessToken().finally(() => { refreshing = null; });
      const access = await refreshing;
      original.headers.Authorization = `Bearer ${access}`;
      return api(original);
    } catch (refreshError) {
      tokens.clear();
      window.location.assign("/login");
      return Promise.reject(refreshError);
    }
  },
);

// Login helper: stores both tokens on success.
export async function login(username: string, password: string): Promise<void> {
  const { data } = await api.post("/api/token/", { username, password });
  tokens.set(data.access, data.refresh);
}

// Public sign-up. Uses bare axios so a stale token in localStorage can't make the server reject it.
export interface RegisterData { username: string; email: string; password: string }
export interface RegisterResult { username: string; role: "ADMIN" | "REQUESTOR"; is_active: boolean }

export async function register(data: RegisterData): Promise<RegisterResult> {
  const res = await axios.post(`${baseURL}/api/users/register/`, data);
  return res.data;
}

// Change own username/password (JWT attached by the interceptor).
export interface CredentialsData { current_password: string; username?: string; password?: string }

export async function updateCredentials(data: CredentialsData): Promise<void> {
  await api.patch("/api/users/me/credentials/", data);
}

export default api;
