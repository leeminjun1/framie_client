const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function handleUnauthorized() {
  clearToken();
  localStorage.removeItem("refresh_token");
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.replace("/login");
  }
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token);
}

export function clearToken() {
  localStorage.removeItem("access_token");
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    if (res.status === 401 && token) {
      handleUnauthorized();
    }
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `요청 실패 (${res.status})`);
  }

  const contentType = res.headers.get("content-type");
  if (contentType?.includes("application/json")) return res.json();
  return res as unknown as T;
}

export const api = {
  auth: {
    signup(email: string, password: string, username?: string) {
      return request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, username }) });
    },

    async login(email: string, password: string) {
      const data = await request<{
        access_token: string;
        refresh_token: string;
        user: { id: string; email: string; username: string | null };
      }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setToken(data.access_token);
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
      return data;
    },

    me() {
      return request<{ id: string; email: string; username: string | null; created_at: string }>("/auth/me");
    },
  },

  frames: {
    list(params?: { shot_count?: number; title?: string }) {
      const qs = new URLSearchParams();
      if (params?.shot_count) qs.set("shot_count", String(params.shot_count));
      if (params?.title) qs.set("title", params.title);
      const query = qs.toString();
      return request<{ frames: Array<{ id: string; title: string; shot_count: number }> }>(
        `/frames${query ? `?${query}` : ""}`
      );
    },

    get(id: string) {
      return request<{ id: string; title: string; shot_count: number }>(`/frames/${id}`);
    },
  },

  images: {
    async removeBg(imageBlob: Blob): Promise<Blob> {
      const formData = new FormData();
      formData.append("image", imageBlob, "capture.png");
      const token = getToken();
      const res = await fetch(`${API_BASE}/images/remove-bg`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        if (res.status === 401 && token) handleUnauthorized();
        throw new Error("배경 제거에 실패했어요.");
      }
      return res.blob();
    },

    async upload(file: Blob, bucket: string, path: string) {
      const formData = new FormData();
      formData.append("file", file, "image.png");
      formData.append("bucket", bucket);
      formData.append("path", path);
      const token = getToken();
      const res = await fetch(`${API_BASE}/images/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (!res.ok) {
        if (res.status === 401 && token) handleUnauthorized();
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "업로드 실패");
      }
      return res.json() as Promise<{ url: string; path: string }>;
    },
  },

  sessions: {
    create(data: {
      frame_id: string;
      frame_owner_id?: string;
      source_type?: string;
      user_message?: string;
      result_image_path?: string;
      result_thumbnail_path?: string;
      is_saved?: boolean;
      display_user_id?: string;
      photos: Array<{
        shot_order: number;
        original_path?: string;
        processed_path?: string;
        is_transparent_png?: boolean;
      }>;
    }) {
      return request<{ session_id: string; share_code: string }>("/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    list(page = 1, limit = 20) {
      return request<{ sessions: unknown[]; total: number }>(`/sessions?page=${page}&limit=${limit}`);
    },

    get(id: string) {
      return request(`/sessions/${id}`);
    },
  },

  share: {
    getByCode(code: string) {
      return request<{ session: unknown }>(`/share/${code}`);
    },
  },

  users: {
    stats() {
      return request<{ saved_sessions_count: number; total_photos_count: number }>("/users/me/stats");
    },

    recentSessions(limit = 10) {
      return request<{ sessions: unknown[] }>(`/users/me/sessions?limit=${limit}`);
    },
  },
};
