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

export async function cropAvatarSquare(file: File, options?: CropOptions): Promise<File> {
  const image = await loadImageFromFile(file)
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  if (!width || !height) {
    throw new Error('Invalid image dimensions.')
  }

  const minSide = Math.min(width, height)
  const safeZoom = Math.max(100, Math.min(220, options?.zoomPercent ?? 100))
  const sourceSize = Math.max(1, minSide * (100 / safeZoom))
  const safeX = Math.max(0, Math.min(100, options?.xPercent ?? 50))
  const safeY = Math.max(0, Math.min(100, options?.yPercent ?? 50))
  const maxOffsetX = Math.max(0, width - sourceSize)
  const maxOffsetY = Math.max(0, height - sourceSize)
  // Top-left normalized mapping: x/y sliders map directly to the available
  // crop range so preview and exported crop stay 1:1 aligned.
  const offsetX = Math.max(0, Math.min(maxOffsetX, (safeX / 100) * maxOffsetX))
  const offsetY = Math.max(0, Math.min(maxOffsetY, (safeY / 100) * maxOffsetY))

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
