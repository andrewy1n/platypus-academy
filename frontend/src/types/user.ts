export interface CreateUserRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user_id: string;
  email: string;
  message: string;
}

export interface UserResponse {
  id: string;
  email: string;
  session_ids: string[];
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  session_ids: string[];
  created_at: Date;
}
