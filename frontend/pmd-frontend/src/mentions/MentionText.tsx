import type { ReactNode } from 'react'

export type MentionClickPayload = {
  type: MentionType
  label: string
  id?: string
}

type MentionTextProps = {
  text?: string | null
  className?: string
  onMentionClick?: (payload: MentionClickPayload) => void
}

type MentionType = 'user' | 'team' | 'role' | 'everyone' | 'keyword'

const TOKEN_MENTION_RE = /@([^\r\n{}]+)\{(user|team|role):([^}\s]+)\}/g
const PLAIN_MENTION_RE = /@(everyone|teammention|team|[A-Za-z][A-Za-z0-9._-]*(?:\s+[A-Za-z][A-Za-z0-9._-]*)?)/gi

function mentionTitle(type: MentionType, rawValue: string) {
  switch (type) {
    case 'user':
      return `User mention: ${rawValue}`
    case 'team':
      return `Team mention: ${rawValue}`
    case 'role':
      return `Role mention: ${rawValue}`
    case 'everyone':
      return 'Mention all workspace members'
    default:
      return `Mention: ${rawValue}`
  }
}

function pushPlainMentions(nodes: ReactNode[], segment: string, seed: string, onMentionClick?: MentionTextProps['onMentionClick']) {
  if (!segment) return
  let cursor = 0
  let match: RegExpExecArray | null
  const plainMentionRe = new RegExp(PLAIN_MENTION_RE.source, PLAIN_MENTION_RE.flags)
  while ((match = plainMentionRe.exec(segment)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (start > cursor) {
      nodes.push(segment.slice(cursor, start))
    }
    const mention = match[0]
    const normalized = mention.toLowerCase()
    const type: MentionType =
      normalized === '@everyone' ? 'everyone' : normalized === '@teammention' || normalized === '@team' ? 'team' : 'keyword'
    const className = `mention-highlight mention-${type}`
    const title = mentionTitle(type, mention)
    if (onMentionClick) {
      nodes.push(
        <button
          key={`${seed}-plain-${start}`}
          type="button"
          className={className}
          title={title}
          onClick={() => onMentionClick({ type, label: mention.replace(/^@/, '') })}
        >
          {mention}
        </button>
      )
    } else {
      nodes.push(
        <span key={`${seed}-plain-${start}`} className={className} title={title}>
          {mention}
        </span>
      )
    }
    cursor = end
  }
  if (cursor < segment.length) {
    nodes.push(segment.slice(cursor))
  }
}

export function MentionText({ text, className, onMentionClick }: MentionTextProps) {
  const value = text ?? ''
  if (!value) {
    return <span className={className} />
  }
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  const tokenMentionRe = new RegExp(TOKEN_MENTION_RE.source, TOKEN_MENTION_RE.flags)
  while ((match = tokenMentionRe.exec(value)) !== null) {
    const start = match.index
    const end = start + match[0].length
    if (start > cursor) {
      pushPlainMentions(nodes, value.slice(cursor, start), `seg-${cursor}`, onMentionClick)
    }
    const label = (match[1] ?? '').trim()
    const type = (match[2] as MentionType) ?? 'keyword'
    const id = match[3] ?? ''
    const mentionText = `@${label}`
    const className = `mention-highlight mention-${type}`
    const title = `${mentionTitle(type, mentionText)}${id ? ` (id: ${id})` : ''}`
    if (onMentionClick) {
      nodes.push(
        <button
          key={`token-${start}`}
          type="button"
          className={className}
          title={title}
          onClick={() => onMentionClick({ type, label, id })}
        >
          {mentionText}
        </button>
      )
    } else {
      nodes.push(
        <span key={`token-${start}`} className={className} title={title}>
          {mentionText}
        </span>
      )
    }
    cursor = end
  }
  if (cursor < value.length) {
    pushPlainMentions(nodes, value.slice(cursor), `tail-${cursor}`, onMentionClick)
  }
  return <span className={className}>{nodes}</span>
}
