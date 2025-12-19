import type { AuthResponse, User } from "@/types";

// API_BASE is set at build time via NEXT_PUBLIC_API_URL
// For production, set API_DOMAIN env var in your deployment
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

// Dynamic import to avoid SSR issues with Zustand persist
function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  // Lazy import to avoid circular dependency and SSR issues
  const { useAuthStore } = require("./store");
  return useAuthStore.getState().token;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Token expired or invalid - clear auth
    if (typeof window !== "undefined") {
      const { useAuthStore } = require("./store");
      useAuthStore.getState().clearAuth();
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(extractErrorMessage(error));
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Helper to extract error message from FastAPI responses
function extractErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    // FastAPI validation errors
    return error.map((e: { msg?: string }) => e.msg || "Validation error").join(", ");
  }
  if (error && typeof error === "object" && "detail" in error) {
    return extractErrorMessage((error as { detail: unknown }).detail);
  }
  return "Request failed";
}

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(extractErrorMessage(error));
    }
    
    return response.json();
  },
  
  logout: () => fetchWithAuth("/api/auth/logout", { method: "POST" }),
  
  me: (): Promise<User> => fetchWithAuth("/api/auth/me"),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    fetchWithAuth("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),
};

// Users API (admin only)
export const usersApi = {
  list: () => fetchWithAuth("/api/users"),
  create: (data: { email: string; password: string; full_name?: string; role: string }) =>
    fetchWithAuth("/api/users", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => fetchWithAuth(`/api/users/${id}`),
  update: (id: number, data: Partial<{ email: string; password: string; full_name: string; role: string; is_active: boolean }>) =>
    fetchWithAuth(`/api/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) => fetchWithAuth(`/api/users/${id}`, { method: "DELETE" }),
  roles: () => fetchWithAuth("/api/users/roles/available"),
};

// Spaces API
export const spacesApi = {
  list: () => fetchWithAuth("/api/spaces"),
  create: (data: { name: string; key: string; description?: string; icon?: string; is_private?: boolean }) =>
    fetchWithAuth("/api/spaces", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => fetchWithAuth(`/api/spaces/${id}`),
  getByKey: (key: string) => fetchWithAuth(`/api/spaces/key/${key}`),
  update: (id: number, data: Partial<{ name: string; description: string; icon: string; is_private: boolean }>) =>
    fetchWithAuth(`/api/spaces/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) => fetchWithAuth(`/api/spaces/${id}`, { method: "DELETE" }),
};

// Pages API
export const pagesApi = {
  listBySpace: (spaceId: number) => fetchWithAuth(`/api/pages/space/${spaceId}`),
  getTree: (spaceId: number) => fetchWithAuth(`/api/pages/space/${spaceId}/tree`),
  create: (data: { space_id: number; parent_id?: number | null; title: string; content_json?: Record<string, unknown>; status?: string }) =>
    fetchWithAuth("/api/pages", { method: "POST", body: JSON.stringify(data) }),
  get: (id: number) => fetchWithAuth(`/api/pages/${id}`),
  getBySlug: (spaceId: number, slug: string) => fetchWithAuth(`/api/pages/space/${spaceId}/slug/${slug}`),
  update: (id: number, data: Partial<{ title: string; content_json: Record<string, unknown>; status: string; parent_id: number | null; position: number }>) =>
    fetchWithAuth(`/api/pages/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  move: (id: number, data: { parent_id: number | null; position: number }) =>
    fetchWithAuth(`/api/pages/${id}/move`, { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => fetchWithAuth(`/api/pages/${id}`, { method: "DELETE" }),
  getVersions: (id: number) => fetchWithAuth(`/api/pages/${id}/versions`),
  getVersion: (id: number, version: number) => fetchWithAuth(`/api/pages/${id}/versions/${version}`),
};

// Files API
export const filesApi = {
  upload: async (file: File) => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE}/api/files/upload`, {
      method: "POST",
      headers,
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error("Upload failed");
    }
    
    return response.json();
  },
  delete: (path: string) => fetchWithAuth(`/api/files/${path}`, { method: "DELETE" }),
};

// Search API
export const searchApi = {
  search: (query: string, spaceId?: number) => {
    const params = new URLSearchParams({ q: query });
    if (spaceId) params.append("space_id", String(spaceId));
    return fetchWithAuth(`/api/search?${params}`);
  },
  semantic: (query: string, spaceId?: number, limit?: number) => {
    const params = new URLSearchParams({ q: query });
    if (spaceId) params.append("space_id", String(spaceId));
    if (limit) params.append("limit", String(limit));
    return fetchWithAuth(`/api/search/semantic?${params}`);
  },
};

// AI API
interface AIChatResponse {
  response: string;
  tool_calls: Array<{ name: string; args: Record<string, unknown> }>;
  page_edited: boolean;
  edited_page_id: number | null;
  page_created: boolean;
  created_page_id: number | null;
  created_page_slug: string | null;
}

interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  markdown_preview: string;
  success: boolean;
}

interface AIStatusResponse {
  chat_enabled: boolean;
  web_search_enabled: boolean;
  knowledge_search_enabled: boolean;
}

interface AISummarizeResponse {
  summary: string;
  page_title: string;
}

interface AIEditTextResponse {
  edited_text: string;
  original_text: string;
}

export const aiApi = {
  status: (): Promise<AIStatusResponse> => fetchWithAuth("/api/ai/status"),
  
  chat: (message: string, spaceId?: number, pageId?: number, documentId?: string, sessionId: string = "default"): Promise<AIChatResponse> =>
    fetchWithAuth("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        session_id: sessionId,
        space_id: spaceId,
        page_id: pageId,
        document_id: documentId,
      }),
    }),
  
  uploadDocument: async (file: File): Promise<DocumentUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    
    const token = getToken();
    const response = await fetch(`${API_BASE}/api/ai/upload-document`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || "Failed to upload document");
    }
    
    return response.json();
  },
  
  summarize: (pageId: number): Promise<AISummarizeResponse> =>
    fetchWithAuth("/api/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ page_id: pageId }),
    }),
  
  editText: (text: string, instruction: string): Promise<AIEditTextResponse> =>
    fetchWithAuth("/api/ai/edit-text", {
      method: "POST",
      body: JSON.stringify({ text, instruction }),
    }),
  
  clearSession: (sessionId: string = "default") =>
    fetchWithAuth(`/api/ai/clear-session?session_id=${sessionId}`, {
      method: "POST",
    }),
};
