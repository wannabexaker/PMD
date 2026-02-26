export type AuthNotificationCategory = 'self-service' | 'security' | 'system'
export type AuthNotificationSeverity = 'info' | 'success' | 'warning' | 'error'

export type AuthNotificationEvent =
  | 'login_form_invalid'
  | 'login_invalid_credentials'
  | 'login_access_denied'
  | 'login_server_error'
  | 'login_network_error'
  | 'register_form_invalid'
  | 'register_conflict'
  | 'register_validation_error'
  | 'register_server_error'
  | 'register_network_error'
  | 'register_created_email_sent'
  | 'register_created_email_failed'
  | 'confirm_email_success'
  | 'confirm_email_already'
  | 'confirm_email_invalid'

type AuthNotificationSpec = {
  category: AuthNotificationCategory
  severity: AuthNotificationSeverity
  message: string
}

export const AUTH_NOTIFICATION_MATRIX: Record<AuthNotificationEvent, AuthNotificationSpec> = {
  login_form_invalid: {
    category: 'self-service',
    severity: 'error',
    message: 'Please fix highlighted fields.',
  },
  login_invalid_credentials: {
    category: 'security',
    severity: 'error',
    message: 'Wrong email or password.',
  },
  login_access_denied: {
    category: 'security',
    severity: 'error',
    message: 'Access denied. Your account may be disabled or not verified.',
  },
  login_server_error: {
    category: 'system',
    severity: 'error',
    message: 'Server error. Try again in a moment.',
  },
  login_network_error: {
    category: 'system',
    severity: 'error',
    message: 'Cannot reach server.',
  },
  register_form_invalid: {
    category: 'self-service',
    severity: 'error',
    message: 'Please fix highlighted fields.',
  },
  register_conflict: {
    category: 'self-service',
    severity: 'error',
    message: 'An account with this email already exists.',
  },
  register_validation_error: {
    category: 'self-service',
    severity: 'error',
    message: 'Please check the form fields.',
  },
  register_server_error: {
    category: 'system',
    severity: 'error',
    message: 'Server error. Try again in a moment.',
  },
  register_network_error: {
    category: 'system',
    severity: 'error',
    message: 'Cannot reach server.',
  },
  register_created_email_sent: {
    category: 'self-service',
    severity: 'success',
    message: 'Account created. Check your email to confirm.',
  },
  register_created_email_failed: {
    category: 'system',
    severity: 'warning',
    message: 'Account created, but verification email could not be sent yet.',
  },
  confirm_email_success: {
    category: 'self-service',
    severity: 'success',
    message: 'Your account has been successfully activated.',
  },
  confirm_email_already: {
    category: 'self-service',
    severity: 'info',
    message: 'Your account is already activated.',
  },
  confirm_email_invalid: {
    category: 'security',
    severity: 'error',
    message: 'This confirmation link is invalid or has expired.',
  },
}

export function getAuthNotification(event: AuthNotificationEvent): AuthNotificationSpec {
  return AUTH_NOTIFICATION_MATRIX[event]
}
