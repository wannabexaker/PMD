export function formatMentionText(text?: string | null): string {
  if (!text) return ''
  return text
    .replace(/@([^\r\n{}]+)\{user:[^}\s]+}/g, '@$1')
    .replace(/@([^\r\n{}]+)\{team:[^}\s]+}/g, '@$1')
    .replace(/@([^\r\n{}]+)\{role:[^}\s]+}/g, '@$1')
}
