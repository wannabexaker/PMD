// Where to send someone after they sign in: the page that bounced them to /login.
// The protected routes pass it as router state ({ from: location }).

const NOT_A_RETURN_TARGET = new Set(['/', '/login', '/register'])

type LocationLike = { pathname?: unknown; search?: unknown; hash?: unknown }

export function loginRedirectState(location: { pathname: string; search: string; hash: string }) {
  return { from: { pathname: location.pathname, search: location.search, hash: location.hash } }
}

/** Reads `state.from` and returns an in-app path, or null when there is nothing safe to return to. */
export function readReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object') return null
  const from = (state as { from?: LocationLike }).from
  if (!from || typeof from !== 'object' || typeof from.pathname !== 'string') return null
  const { pathname } = from
  // Same-origin paths only: "//host" would be protocol-relative.
  if (!pathname.startsWith('/') || pathname.startsWith('//') || pathname.includes('\\')) return null
  if (NOT_A_RETURN_TARGET.has(pathname)) return null
  const search = typeof from.search === 'string' && from.search.startsWith('?') ? from.search : ''
  const hash = typeof from.hash === 'string' && from.hash.startsWith('#') ? from.hash : ''
  return `${pathname}${search}${hash}`
}
