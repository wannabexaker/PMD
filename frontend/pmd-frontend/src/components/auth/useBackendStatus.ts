import { useCallback, useEffect, useState } from 'react'
import { getBackendStatus, recheckBackendStatus, type BackendStatus } from '../../api/backendStatus'

/** Backend reachability for the auth screens, plus a way to probe again. */
export function useBackendStatus(): { status: BackendStatus; recheck: () => void } {
  const [status, setStatus] = useState<BackendStatus>('checking')

  useEffect(() => {
    let active = true
    void getBackendStatus().then((result) => {
      if (active) {
        setStatus(result)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const recheck = useCallback(() => {
    setStatus('checking')
    void recheckBackendStatus().then(setStatus)
  }, [])

  return { status, recheck }
}
