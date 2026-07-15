import { requestJson, setAuthToken, clearAuthToken, registerAuthRefreshHandler } from './http'
import type {
  AuthResponse,
  ConfirmEmailResponse,
  LoginPayload,
  PeoplePageWidgets,
  RegisterPayload,
  RegisterResponse,
  UpdateProfilePayload,
  User,
} from '../types'

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await requestJson<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: payload.username,
      password: payload.password,
      remember: Boolean(payload.remember),
      turnstileToken: payload.turnstileToken,
    }),
  })
  if (response?.token) {
    setAuthToken(response.token, Boolean(payload.remember))
  }
  return response
}

// acceptedTerms only matters when this sign-in creates the account; the backend ignores it
// for an existing user rather than re-asking them.
export async function googleLogin(
  credential: string,
  remember: boolean,
  acceptedTerms = false,
): Promise<AuthResponse> {
  const response = await requestJson<AuthResponse>('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ credential, remember: Boolean(remember), acceptedTerms }),
  })
  if (response?.token) {
    setAuthToken(response.token, Boolean(remember))
  }
  return response
}

export async function refreshSession(): Promise<AuthResponse | null> {
  try {
    const response = await requestJson<AuthResponse>('/api/auth/refresh', { method: 'POST' })
    if (response?.token) {
      setAuthToken(response.token, true)
    }
    return response
  } catch {
    clearAuthToken()
    return null
  }
}

export async function logoutSession() {
  try {
    await requestJson<void>('/api/auth/logout', { method: 'POST' })
  } catch {
    // Best effort logout.
  } finally {
    clearAuthToken()
  }
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

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  return requestJson<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      password: payload.password,
      confirmPassword: payload.confirmPassword,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      bio: payload.bio || '',
      turnstileToken: payload.turnstileToken,
      acceptedTerms: Boolean(payload.acceptedTerms),
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

/** GDPR Art. 20 — downloads everything the service holds about the signed-in user. */
export async function exportMyData(): Promise<Blob> {
  const data = await requestJson<unknown>('/api/auth/me/export')
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

/** GDPR Art. 17 — erases the account. Irreversible. */
export async function deleteMyAccount(): Promise<void> {
  await requestJson<void>('/api/auth/me', { method: 'DELETE' })
  clearAuthToken()
}

export async function updatePeoplePageWidgets(payload: PeoplePageWidgets): Promise<PeoplePageWidgets> {
  return requestJson<PeoplePageWidgets>('/api/auth/me/people-page-widgets', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

registerAuthRefreshHandler(async () => {
  const response = await refreshSession()
  return response?.token ?? null
})
