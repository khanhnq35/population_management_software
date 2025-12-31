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
    const { data } = await apiClient.get("/hogiadinh/", { params: { keyword } });
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post("/hogiadinh/", payload);
    return data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await apiClient.put(`/hogiadinh/${id}`, payload);
    return data;
  },
  async delete(id: number) {
    await apiClient.delete(`/hogiadinh/${id}`);
  },
  async importExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/hogiadinh/import/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  },
  async exportExcel() {
    const { data } = await apiClient.get("/hogiadinh/export/excel", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "households.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
};

export const citizensApi = {
  async list(params?: Record<string, unknown>) {
    const { data } = await apiClient.get("/nhankhau/", { params });
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post("/nhankhau/", payload);
    return data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await apiClient.put(`/nhankhau/${id}`, payload);
    return data;
  },
  async delete(id: number) {
    await apiClient.delete(`/nhankhau/${id}`);
  },
  async importExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/nhankhau/import/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  },
  async exportExcel() {
    const { data } = await apiClient.get("/nhankhau/export/excel", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "citizens.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  async getPayments(citizenId: number) {
    const { data } = await apiClient.get(`/nhankhau/${citizenId}/payments`);
    return data;
  }
};

export type FeeCollectionType =
  | "bat_buoc_ca_nhan"
  | "bat_buoc_theo_ho"
  | "bat_buoc_theo_danh_sach"
  | "tu_nguyen"
  | "none";

export type FeeObligationEntry = {
  code: string;
  name: string;
  paid_amount?: number;
};

export type FeeObligations = {
  collection_type: FeeCollectionType;
  paid: FeeObligationEntry[];
  unpaid: FeeObligationEntry[];
};

export type DashboardFilters = {
  from?: string;
  to?: string;
  fee_id?: number | null;
};

export type DashboardOverview = {
  filters: DashboardFilters;
  kpis: {
    total_households: number;
    total_citizens: number;
    total_fees: number;
    expected_total: number;
    collected_total: number;
    outstanding_total: number;
    completion_rate: number;
    households_full: number;
    households_partial: number;
    households_none: number;
  };
  timeseries: {
    expected_vs_collected: Array<{ period: string; expected: number; collected: number }>;
    status_distribution: { full: number; partial: number; none: number };
  };
  fees: {
    summary: Array<{
      id: number;
      name: string;
      collection_type: FeeCollectionType;
      expected: number;
      collected: number;
      outstanding: number;
      completion: number;
    }>;
    low_completion: Array<{
      id: number;
      name: string;
      collection_type: FeeCollectionType;
      expected: number;
      collected: number;
      outstanding: number;
      completion: number;
    }>;
  };
  households: {
    top_debtors: Array<{
      household_code: string;
      head_of_household: string;
      expected: number;
      paid: number;
      outstanding: number;
      pending_fees: number;
    }>;
  };
};

export const feesApi = {
  async list(keyword?: string) {
    const { data } = await apiClient.get("/thuphi/", { params: { keyword } });
    return data;
  },
  async create(payload: Record<string, unknown>) {
    const { data } = await apiClient.post("/thuphi/", payload);
    return data;
  },
  async update(id: number, payload: Record<string, unknown>) {
    const { data } = await apiClient.put(`/thuphi/${id}`, payload);
    return data;
  },
  async delete(id: number) {
    await apiClient.delete(`/thuphi/${id}`);
  },
  async stats() {
    const { data } = await apiClient.get("/thuphi/stats/summary/");
    return data;
  },
  async createPayment(feeId: number, payload: Record<string, unknown>) {
    const { data } = await apiClient.post(`/thuphi/${feeId}/payments/`, payload);
    return data;
  },
  async listPayments(feeId: number) {
    const { data } = await apiClient.get(`/thuphi/${feeId}/payments/`);
    return data;
  },
  async updatePayment(feeId: number, paymentId: number, payload: Record<string, unknown>) {
    const { data } = await apiClient.put(`/thuphi/${feeId}/payments/${paymentId}`, payload);
    return data;
  },
  async deletePayment(feeId: number, paymentId: number) {
    await apiClient.delete(`/thuphi/${feeId}/payments/${paymentId}`);
  },
  async importExcel(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post("/thuphi/import/", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  },
  async exportExcel() {
    const { data } = await apiClient.get("/thuphi/export/excel", { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "fees.xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  async exportPayments(feeId: number) {
    const { data } = await apiClient.get(`/thuphi/${feeId}/payments/export/`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `payments_${feeId}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
  async importPayments(feeId: number, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const { data } = await apiClient.post(`/thuphi/${feeId}/payments/import`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return data;
  },
  async getObligations(feeId: number) {
    const { data } = await apiClient.get<FeeObligations>(`/thuphi/${feeId}/obligations`);
    return data;
  }
};

export const dashboardApi = {
  async overview(params: DashboardFilters) {
    const { data } = await apiClient.get<DashboardOverview>("/dashboard/overview", {
      params: {
        from: params.from || undefined,
        to: params.to || undefined,
        fee_id: params.fee_id ?? undefined
      }
    });
    return data;
  }
};

export const usersApi = {
  async list() {
    const { data } = await apiClient.get("/users");
    return data;
  },
  async delete(id: number) {
    await apiClient.delete(`/users/${id}`);
  }
};
