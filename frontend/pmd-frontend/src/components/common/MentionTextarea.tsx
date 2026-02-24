import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, TextareaHTMLAttributes } from 'react'
import type { MentionOption } from '../../mentions/useMentionOptions'

type MentionTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> & {
  value: string
  onChange: (next: string) => void
  options: MentionOption[]
}

type ActiveMention = {
  start: number
  end: number
  query: string
}

function isTokenChar(char: string) {
  return !/\s/.test(char)
}

function readActiveMention(value: string, cursor: number | null): ActiveMention | null {
  if (cursor == null) return null
  if (cursor < 1) return null
  let start = cursor - 1
  while (start >= 0 && isTokenChar(value[start])) {
    start -= 1
  }
  start += 1
  if (start >= cursor) return null
  const token = value.slice(start, cursor)
  if (!token.startsWith('@')) return null
  if (token.includes('{')) return null
  const query = token.slice(1)
  if (query.includes('@')) return null
  return {
    start,
    end: cursor,
    query: query.toLowerCase(),
  }
}

function typeLabel(type: MentionOption['type']) {
  if (type === 'everyone') return 'All'
  if (type === 'team') return 'Team'
  if (type === 'role') return 'Role'
  return 'User'
}

export function MentionTextarea({ value, onChange, options, ...textareaProps }: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const [activeMention, setActiveMention] = useState<ActiveMention | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const filtered = useMemo(() => {
    if (!activeMention) return []
    const query = activeMention.query.trim()
    const source = options
    if (!query) return source.slice(0, 12)
    return source
      .filter((option) => {
        const label = option.label.toLowerCase()
        return label.includes(query) || option.searchable.includes(query)
      })
      .slice(0, 12)
  }, [activeMention, options])
  const safeActiveIndex = filtered.length === 0 ? 0 : Math.min(activeIndex, filtered.length - 1)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current != null) {
        window.clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  const updateMentionFromCursor = () => {
    const input = textareaRef.current
    const next = readActiveMention(value, input?.selectionStart ?? null)
    setActiveMention(next)
  }

  const applyMention = (option: MentionOption) => {
    const input = textareaRef.current
    if (!input || !activeMention) return
    const before = value.slice(0, activeMention.start)
    const after = value.slice(activeMention.end)
    const spacer = after.startsWith(' ') || after.startsWith('\n') || after.length === 0 ? '' : ' '
    const nextValue = `${before}${option.insertText}${spacer}${after}`
    onChange(nextValue)
    const caret = before.length + option.insertText.length + spacer.length
    requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(caret, caret)
      setActiveMention(null)
      setActiveIndex(0)
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activeMention || filtered.length === 0) {
      textareaProps.onKeyDown?.(event)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % filtered.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      const selected = filtered[safeActiveIndex]
      if (selected) {
        applyMention(selected)
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setActiveMention(null)
      return
    }
    textareaProps.onKeyDown?.(event)
  }

  return (
    <div className="mention-textarea-wrap">
      <textarea
        {...textareaProps}
        ref={textareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          requestAnimationFrame(updateMentionFromCursor)
        }}
        onClick={(event) => {
          textareaProps.onClick?.(event)
          updateMentionFromCursor()
        }}
        onKeyUp={(event) => {
          textareaProps.onKeyUp?.(event)
          updateMentionFromCursor()
        }}
        onKeyDown={handleKeyDown}
        onBlur={(event) => {
          textareaProps.onBlur?.(event)
          closeTimerRef.current = window.setTimeout(() => {
            setActiveMention(null)
          }, 120)
        }}
        onFocus={(event) => {
          textareaProps.onFocus?.(event)
          updateMentionFromCursor()
        }}
      />
      {activeMention && filtered.length > 0 ? (
        <div className="mention-menu" role="listbox" aria-label="Mention suggestions">
          {filtered.map((option, index) => (
            <button
              key={option.key}
              type="button"
              className={`mention-option${index === safeActiveIndex ? ' active' : ''}`}
              role="option"
              aria-selected={index === safeActiveIndex}
              onMouseDown={(event) => {
                event.preventDefault()
                applyMention(option)
              }}
            >
              <span className="mention-option-main">
                <span
                  className={`mention-option-type mention-${option.type}`}
                  style={
                    option.accentColor
                      ? ({ '--mention-accent': option.accentColor } as CSSProperties)
                      : undefined
                  }
                >
                  {typeLabel(option.type)}
                </span>
                <strong className="truncate">{option.label}</strong>
              </span>
              <span className="mention-option-hint truncate">{option.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
