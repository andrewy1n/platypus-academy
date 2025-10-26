import { apiClient } from '../lib/api';
import { CreateUserRequest, LoginRequest, LoginResponse, UserResponse } from '../types/user';

class UserService {
  async createUser(request: CreateUserRequest): Promise<UserResponse> {
    return apiClient.post<UserResponse>('/users/create', request);
  }

  async loginUser(request: LoginRequest): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/users/login', request);
  }

  async getUserById(userId: string): Promise<UserResponse> {
    return apiClient.get<UserResponse>(`/users/${userId}`);
  }

  async getUserSessions(userId: string): Promise<string[]> {
    return apiClient.get<string[]>(`/users/${userId}/sessions`);
  }
}

export const userService = new UserService();
