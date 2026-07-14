// Public config for the optional third-party auth widgets. When a key is empty
// the corresponding feature stays off, so local dev works without them and
// production enables each feature just by setting its Vite env var.
export const GOOGLE_CLIENT_ID =
  ((import.meta as ImportMeta).env?.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ''

export const TURNSTILE_SITE_KEY =
  ((import.meta as ImportMeta).env?.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? ''

export const isGoogleEnabled = GOOGLE_CLIENT_ID.length > 0
export const isTurnstileEnabled = TURNSTILE_SITE_KEY.length > 0
