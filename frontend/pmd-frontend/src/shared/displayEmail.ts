// Demo workspaces seed their people as `name+<workspaceId>@pmd.local` (see DemoWorkspaceSeeder), so the
// same person can exist in many demo workspaces. The `+tag` is internal; show `name@pmd.local`.
const INTERNAL_ALIAS_DOMAIN = 'pmd.local'

/**
 * The e-mail as it should be shown in the UI: internal demo aliases lose their `+tag`.
 * Real addresses (including real `+tag` addresses on other domains) are returned unchanged.
 */
export function displayEmail(value?: string | null): string {
  const email = value?.trim() ?? ''
  const at = email.lastIndexOf('@')
  if (at <= 0) return email
  const domain = email.slice(at + 1)
  if (domain.toLowerCase() !== INTERNAL_ALIAS_DOMAIN) return email
  const local = email.slice(0, at)
  const plus = local.indexOf('+')
  if (plus <= 0) return email
  return `${local.slice(0, plus)}@${domain}`
}
