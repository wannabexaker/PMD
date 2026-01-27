import { useEffect, useRef } from 'react'

type ImageModalProps = {
  src: string
  alt?: string
  onClose: () => void
}

export function ImageModal({ src, alt = 'Image preview', onClose }: ImageModalProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div className="image-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="image-modal" onClick={(event) => event.stopPropagation()}>
        <button
          ref={closeRef}
          type="button"
          className="image-modal-close"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
        <img className="image-modal-img" src={src} alt={alt} />
      </div>
    </div>
  )
}
