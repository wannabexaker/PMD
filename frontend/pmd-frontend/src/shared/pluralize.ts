/**
 * "1 member", "3 members", "1 person", "2 people".
 * Pass `plural` for irregular words; the default adds an "s".
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
