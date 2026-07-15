function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to read image.'))
    }
    image.src = objectUrl
  })
}

type CropOptions = {
  xPercent?: number
  yPercent?: number
  zoomPercent?: number
}

/** Shared so the file input, the drop target and the hint text can never disagree. */
export const AVATAR_ACCEPT = 'image/png,image/jpeg,image/webp'
export const AVATAR_MAX_MB = 2
export const AVATAR_MAX_BYTES = AVATAR_MAX_MB * 1024 * 1024
export const AVATAR_ZOOM_MIN = 100
export const AVATAR_ZOOM_MAX = 220

/** Returns an error message, or null when the file is an acceptable avatar source. */
export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ACCEPT.split(',').includes(file.type)) {
    return 'Use a PNG, JPG, or WEBP image.'
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return `That image is ${(file.size / 1024 / 1024).toFixed(1)}MB. Max size is ${AVATAR_MAX_MB}MB.`
  }
  return null
}

export type CropRect = { offsetX: number; offsetY: number; sourceSize: number }

/**
 * Geometry of the exported crop, kept pure so it can be unit-tested without a canvas.
 *
 * It mirrors the live preview exactly: there the <img> is object-fit:cover inside a square
 * box with object-position x%/y%, and zoom is a `transform: scale()` about the box centre.
 * So the visible source square is minSide/zoom, centred on the point object-position picked
 * at zoom 1 — NOT a top-left mapping across a zoom-adjusted range, which only agrees with
 * the preview at zoom=100 or x/y=50.
 */
export function computeCropRect(width: number, height: number, options?: CropOptions): CropRect {
  const minSide = Math.min(width, height)
  const safeZoom = Math.max(100, Math.min(220, options?.zoomPercent ?? 100))
  const zoom = safeZoom / 100
  const safeX = Math.max(0, Math.min(100, options?.xPercent ?? 50))
  const safeY = Math.max(0, Math.min(100, options?.yPercent ?? 50))
  const sourceSize = Math.max(1, minSide / zoom)
  const centerX = (safeX / 100) * (width - minSide) + minSide / 2
  const centerY = (safeY / 100) * (height - minSide) + minSide / 2
  return {
    sourceSize,
    offsetX: Math.max(0, Math.min(width - sourceSize, centerX - sourceSize / 2)),
    offsetY: Math.max(0, Math.min(height - sourceSize, centerY - sourceSize / 2)),
  }
}

export async function cropAvatarSquare(file: File, options?: CropOptions): Promise<File> {
  const image = await loadImageFromFile(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) {
    throw new Error('Invalid image dimensions.')
  }

  const { offsetX, offsetY, sourceSize } = computeCropRect(width, height, options)

  const outputSize = 512
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas is not available.')
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, offsetX, offsetY, sourceSize, sourceSize, 0, 0, outputSize, outputSize)

  const preferredType =
    file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/jpeg'
      ? file.type
      : 'image/jpeg'

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error('Failed to generate cropped image.'))
        return
      }
      resolve(nextBlob)
    }, preferredType, 0.92)
  })

  const extension = preferredType === 'image/png' ? 'png' : preferredType === 'image/webp' ? 'webp' : 'jpg'
  const baseName = file.name.replace(/\.[^/.]+$/, '')
  return new File([blob], `${baseName}-avatar.${extension}`, { type: preferredType })
}
