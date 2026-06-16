export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'validator' | 'contributor';
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
  is_google_user: boolean;
}

export interface LeaderboardRow {
  user_id: string;
  name: string;
  avatar_url?: string;
  approved_count: number;
}
