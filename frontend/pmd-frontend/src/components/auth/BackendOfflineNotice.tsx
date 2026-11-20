import type { BackendStatus } from '../../api/backendStatus'

type BackendOfflineNoticeProps = {
  status: BackendStatus
  onRecheck: () => void
}

/**
 * Shown on the auth screens when the backend does not answer. PMD is a demo whose backend is
 * sometimes switched off on purpose, so this says that plainly rather than letting a sign-in
 * fail with a server error.
 */
export function BackendOfflineNotice({ status, onRecheck }: BackendOfflineNoticeProps) {
  if (status !== 'offline') {
    return null
  }
  return (
    <div className="banner info backend-offline" role="status">
      <strong>PMD is a demo, and its backend is offline right now.</strong>
      <div className="muted">
        You can look around the public pages, but signing in and creating an account are
        unavailable until the demo server is started again.
      </div>
      <div className="banner-actions">
        <button type="button" className="btn btn-secondary" onClick={onRecheck}>
          Check again
        </button>
      </div>
    </div>
  )
}
