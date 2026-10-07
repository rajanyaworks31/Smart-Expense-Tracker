import { apiRequest } from './api'
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '../types/api'

export function login(data: LoginRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function register(data: RegisterRequest): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function logout(): Promise<void> {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

export function getCurrentUser(): Promise<User> {
  return apiRequest<User>('/auth/me')
}
