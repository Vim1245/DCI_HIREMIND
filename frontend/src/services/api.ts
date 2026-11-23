/**
 * DCI HireMind - Enterprise API Service Client
 * Configured for FastAPI backend with Supabase PostgreSQL & Storage.
 * Supports http://127.0.0.1:8080, http://127.0.0.1:8000, and Vite proxy /api.
 */

import axios, { AxiosError } from 'axios';
import type {
  Candidate,
  CandidateCreate,
  CandidateUpdate,
  Job,
  JobCreate,
  JobUpdate,
  Application,
  ApplicationCreate,
  ApplicationStatusUpdate,
  PaginatedResponse,
  ResumeAnalysisRecord,
  ResumeItem,
  AIMatchResponse,
  User,
  PublicJobDetail,
  PublicJobListResponse,
  PublicApplicationResponse,
  HRDashboardStats,
  HRApplicationListResponse,
  HRStatusUpdateRequest,
} from '../types';

// Select primary API base URL
// When running Vite dev server, /api proxy redirects directly to backend.
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.port === '5173' ? '' : 'http://127.0.0.1:8080');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptor to attach Supabase JWT token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hiremind_token');
    if (token) {
      if (config.headers && typeof config.headers.set === 'function') {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers = config.headers || {};
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Response interceptor for consistent error extraction and 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ detail?: string | { msg?: string }[] }>) => {
    const originalRequest = error.config as (typeof error.config & { _retry?: boolean });

    // Handle 401 Unauthorized (attempt refresh before redirecting)
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem('hiremind_refresh_token');
      const currentPath = window.location.pathname;

      // Don't intercept login or register 401 errors
      if (currentPath !== '/login' && currentPath !== '/register' && refreshToken) {
        if (isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
                originalRequest.headers.set('Authorization', `Bearer ${token}`);
              } else if (originalRequest.headers) {
                originalRequest.headers['Authorization'] = `Bearer ${token}`;
              }
              return apiClient(originalRequest);
            })
            .catch((err) => Promise.reject(err));
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshRes = await authAPI.refreshToken(refreshToken);
          const newToken = refreshRes.access_token;
          const newRefreshToken = refreshRes.refresh_token;

          localStorage.setItem('hiremind_token', newToken);
          if (newRefreshToken) {
            localStorage.setItem('hiremind_refresh_token', newRefreshToken);
          }

          processQueue(null, newToken);

          if (originalRequest.headers && typeof originalRequest.headers.set === 'function') {
            originalRequest.headers.set('Authorization', `Bearer ${newToken}`);
          } else if (originalRequest.headers) {
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          }

          return apiClient(originalRequest);
        } catch (refreshErr) {
          processQueue(refreshErr, null);
          localStorage.removeItem('hiremind_token');
          localStorage.removeItem('hiremind_refresh_token');
          localStorage.removeItem('hiremind_user');
          const returnUrl = encodeURIComponent(currentPath + window.location.search);
          window.location.href = `/login?redirect=${returnUrl}`;
          return Promise.reject(refreshErr);
        } finally {
          isRefreshing = false;
        }
      } else if (currentPath !== '/login' && currentPath !== '/register') {
        localStorage.removeItem('hiremind_token');
        localStorage.removeItem('hiremind_refresh_token');
        localStorage.removeItem('hiremind_user');
        const returnUrl = encodeURIComponent(currentPath + window.location.search);
        window.location.href = `/login?redirect=${returnUrl}`;
      }
    }

    const detail = error.response?.data?.detail;
    let message = error.message;

    if (typeof detail === 'string') {
      message = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail.map((d) => (typeof d === 'string' ? d : d.msg || '')).join(', ');
    }

    // Attach human-readable parsed message
    (error as unknown as { parsedMessage: string }).parsedMessage = message;
    return Promise.reject(error);
  }
);

// ============================================================================
// CANDIDATES API
// ============================================================================
export const candidatesAPI = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
  }): Promise<PaginatedResponse<Candidate>> => {
    const response = await apiClient.get<PaginatedResponse<Candidate>>('/api/candidates', {
      params,
    });
    return response.data;
  },

  get: async (id: number): Promise<Candidate> => {
    const response = await apiClient.get<Candidate>(`/api/candidates/${id}`);
    return response.data;
  },

  create: async (data: CandidateCreate): Promise<Candidate> => {
    const response = await apiClient.post<Candidate>('/api/candidates', data);
    return response.data;
  },

  update: async (id: number, data: CandidateUpdate): Promise<Candidate> => {
    const response = await apiClient.put<Candidate>(`/api/candidates/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ detail: string }> => {
    const response = await apiClient.delete<{ detail: string }>(`/api/candidates/${id}`);
    return response.data;
  },

  uploadResume: async (
    candidateId: number,
    file: File
  ): Promise<{
    success: boolean;
    id: number;
    file_name: string;
    storage_path: string;
    signed_url?: string;
    message: string;
  }> => {
    const formData = new FormData();
    formData.append('candidate_id', candidateId.toString());
    formData.append('file', file);

    const response = await apiClient.post('/api/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getResumes: async (candidateId: number): Promise<{ resumes: ResumeAnalysisRecord[] }> => {
    const response = await apiClient.get<{ resumes: ResumeAnalysisRecord[] }>(
      `/api/resumes/candidate/${candidateId}`
    );
    return response.data;
  },
};

// ============================================================================
// JOBS API
// ============================================================================
export const jobsAPI = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    status?: string;
    location?: string;
  }): Promise<PaginatedResponse<Job>> => {
    const response = await apiClient.get<PaginatedResponse<Job>>('/api/jobs', {
      params,
    });
    return response.data;
  },

  get: async (id: number): Promise<Job> => {
    const response = await apiClient.get<Job>(`/api/jobs/${id}`);
    return response.data;
  },

  create: async (data: JobCreate): Promise<Job> => {
    const response = await apiClient.post<Job>('/api/jobs', data);
    return response.data;
  },

  update: async (id: number, data: JobUpdate): Promise<Job> => {
    const response = await apiClient.put<Job>(`/api/jobs/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ detail: string }> => {
    const response = await apiClient.delete<{ detail: string }>(`/api/jobs/${id}`);
    return response.data;
  },
};

// ============================================================================
// APPLICATIONS API
// ============================================================================
export const applicationsAPI = {
  list: async (params?: {
    page?: number;
    page_size?: number;
    stage?: string;
    job_id?: number;
  }): Promise<PaginatedResponse<Application>> => {
    const response = await apiClient.get<PaginatedResponse<Application>>('/api/applications', {
      params,
    });
    return response.data;
  },

  get: async (id: number): Promise<Application> => {
    const response = await apiClient.get<Application>(`/api/applications/${id}`);
    return response.data;
  },

  create: async (data: ApplicationCreate): Promise<Application> => {
    const response = await apiClient.post<Application>('/api/applications', data);
    return response.data;
  },

  updateStatus: async (id: number, data: ApplicationStatusUpdate): Promise<Application> => {
    const response = await apiClient.put<Application>(`/api/applications/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ success: boolean; detail: string }> => {
    const response = await apiClient.delete<{ success: boolean; detail: string }>(
      `/api/applications/${id}`
    );
    return response.data;
  },
};

// ============================================================================
// AUTH & SYSTEM API
// ============================================================================
export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
    phone_number?: string;
  }): Promise<{ user: User; access_token?: string }> => {
    const response = await apiClient.post('/api/auth/register', data);
    return response.data;
  },

  login: async (credentials: {
    email: string;
    password: string;
  }): Promise<{ access_token: string; refresh_token?: string; token_type: string; user: User }> => {
    const response = await apiClient.post('/api/auth/login', credentials);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<{
    success: boolean;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
  }> => {
    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
      refresh_token: refreshToken,
    });
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },
};

export const resumesAPI = {
  list: async (params?: { page?: number; page_size?: number }): Promise<PaginatedResponse<ResumeItem>> => {
    const response = await apiClient.get<PaginatedResponse<ResumeItem>>('/api/resumes', { params });
    return response.data;
  },

  getByCandidate: async (candidateId: number): Promise<{ resumes: ResumeAnalysisRecord[] }> => {
    const response = await apiClient.get<{ resumes: ResumeAnalysisRecord[] }>(
      `/api/resumes/candidate/${candidateId}`
    );
    return response.data;
  },

  upload: async (
    candidateId: number,
    file: File
  ): Promise<{
    success: boolean;
    id: number;
    file_name: string;
    storage_path: string;
    signed_url?: string;
    message: string;
  }> => {
    const formData = new FormData();
    formData.append('candidate_id', candidateId.toString());
    formData.append('file', file);

    const response = await apiClient.post('/api/resumes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// ============================================================================
// AI RECRUITMENT ASSISTANT & INTELLIGENCE API
// ============================================================================
export const aiAPI = {
  chat: async (
    message: string,
    history?: { role: 'user' | 'assistant' | 'system'; content: string }[],
    candidateId?: number,
    jobId?: number
  ): Promise<{ success: boolean; reply: string; model: string }> => {
    const response = await apiClient.post('/api/ai/chat', {
      message,
      conversation_history: history || [],
      candidate_id: candidateId,
      job_id: jobId,
    });
    return response.data;
  },

  match: async (candidateId: number, jobId: number): Promise<AIMatchResponse> => {
    const response = await apiClient.post<AIMatchResponse>('/api/ai/match', {
      candidate_id: candidateId,
      job_id: jobId,
    });
    return response.data;
  },

  getStatus: async (): Promise<{
    success: boolean;
    ai_service: {
      configured: boolean;
      status: string;
      model?: string;
      masked_key?: string;
      latency_ms?: number;
    };
  }> => {
    const response = await apiClient.get('/api/ai/status');
    return response.data;
  },
};

export const systemAPI = {
  getHealth: async (): Promise<{
    database?: { status: string; engine: string };
    storage?: { status: string };
  }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  getDatabaseHealth: async (): Promise<{
    database?: { status: string; engine: string; host: string };
  }> => {
    const response = await apiClient.get('/api/health/database');
    return response.data;
  },

  getAiHealth: async (): Promise<{
    success: boolean;
    ai_service?: { status: string; model: string; masked_key: string };
  }> => {
    const response = await apiClient.get('/api/health/ai');
    return response.data;
  },
};

// ============================================================================
// PUBLIC CAREERS API (No Login Required)
// ============================================================================
export const publicCareersAPI = {
  listJobs: async (params?: {
    page?: number;
    page_size?: number;
    q?: string;
    department?: string;
    location?: string;
    employment_type?: string;
  }): Promise<PublicJobListResponse> => {
    const response = await apiClient.get<PublicJobListResponse>('/api/public/jobs', {
      params,
    });
    return response.data;
  },

  getJob: async (jobId: number): Promise<PublicJobDetail> => {
    const response = await apiClient.get<PublicJobDetail>(`/api/public/jobs/${jobId}`);
    return response.data;
  },

  submitApplication: async (formData: FormData): Promise<PublicApplicationResponse> => {
    const response = await apiClient.post<PublicApplicationResponse>(
      '/api/public/applications',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};

// ============================================================================
// HR ADMIN PORTAL API (Authenticated HR/Recruiter/Admin)
// ============================================================================
export const hrPortalAPI = {
  getStats: async (): Promise<HRDashboardStats> => {
    const response = await apiClient.get<HRDashboardStats>('/api/hr/dashboard/stats');
    return response.data;
  },

  listApplications: async (params?: {
    page?: number;
    page_size?: number;
    stage?: string;
    job_id?: number;
    q?: string;
  }): Promise<HRApplicationListResponse> => {
    const response = await apiClient.get<HRApplicationListResponse>('/api/hr/applications', {
      params,
    });
    return response.data;
  },

  getApplication: async (applicationId: number): Promise<{
    success: boolean;
    application: any;
    candidate: any;
    job: any;
    resume: any;
  }> => {
    const response = await apiClient.get(`/api/hr/applications/${applicationId}`);
    return response.data;
  },

  updateStatus: async (
    applicationId: number,
    data: HRStatusUpdateRequest
  ): Promise<{
    success: boolean;
    message: string;
    application_id: number;
    stage: string;
    human_decision?: string;
    human_feedback?: string;
  }> => {
    const response = await apiClient.patch(
      `/api/hr/applications/${applicationId}/status`,
      data
    );
    return response.data;
  },

  listCandidates: async (params?: {
    page?: number;
    page_size?: number;
    q?: string;
  }): Promise<{
    success: boolean;
    items: any[];
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
  }> => {
    const response = await apiClient.get('/api/hr/candidates', { params });
    return response.data;
  },
};
