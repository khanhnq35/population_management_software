import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

export type LoginPayload = {
  username: string;
  password: string;
};

export type User = {
  id: number;
  username: string;
  full_name: string;
  role: string;
};

export const authApi = {
  async login(payload: LoginPayload) {
    const { data } = await apiClient.post<{ access_token: string }>("/auth/login", payload);
    return data;
  },
  async getCurrentUser() {
    const { data } = await apiClient.get<User>("/users/me");
    return data;
  }
};

export const householdsApi = {
  async list(keyword?: string) {
    const { data } = await apiClient.get("/hogiadinh", { params: { keyword } });
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post("/hogiadinh", payload);
    return data;
  }
};

export const citizensApi = {
  async list(params?: Record<string, unknown>) {
    const { data } = await apiClient.get("/nhankhau", { params });
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post("/nhankhau", payload);
    return data;
  }
};

export const feesApi = {
  async list(keyword?: string) {
    const { data } = await apiClient.get("/thuphi", { params: { keyword } });
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post("/thuphi", payload);
    return data;
  },
  async stats() {
    const { data } = await apiClient.get("/thuphi/stats/summary");
    return data;
  },
  async createPayment(feeId: number, payload: Record<string, unknown>) {
    const { data } = await apiClient.post(`/thuphi/${feeId}/payments`, payload);
    return data;
  },
  async listPayments(feeId: number) {
    const { data } = await apiClient.get(`/thuphi/${feeId}/payments`);
    return data;
  }
};

export const usersApi = {
  async list() {
    const { data } = await apiClient.get("/users");
    return data;
  }
};
