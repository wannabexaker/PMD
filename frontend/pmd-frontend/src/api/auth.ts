import { requestJson, setAuthToken, clearAuthToken } from './http'
import type {
  AuthResponse,
  ConfirmEmailResponse,
  LoginPayload,
  PeoplePageWidgets,
  RegisterPayload,
  UpdateProfilePayload,
  User,
} from '../types'

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: payload.username, password: payload.password }),
  })
  if (response?.token) {
    setAuthToken(response.token, Boolean(payload.remember))
  }
  return response
}

export async function fetchMe(): Promise<User | null> {
  try {
    const user = await requestJson<User>('/api/auth/me')
    return user ?? null
  } catch {
    clearAuthToken()
    return null
  }
}

export async function register(payload: RegisterPayload): Promise<void> {
  await requestJson<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      password: payload.password,
      confirmPassword: payload.confirmPassword,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      bio: payload.bio || '',
    }),
  })
}

export async function confirmEmail(token: string): Promise<ConfirmEmailResponse> {
  return requestJson<ConfirmEmailResponse>('/api/auth/confirm?token=' + encodeURIComponent(token))
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return requestJson<User>('/api/auth/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function updatePeoplePageWidgets(payload: PeoplePageWidgets): Promise<PeoplePageWidgets> {
  return requestJson<PeoplePageWidgets>('/api/auth/me/people-page-widgets', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}
