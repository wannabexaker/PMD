import { describe, expect, it } from 'vitest'
import { resolveAssetUrl } from './http'

const API = 'https://api.example.com'

describe('resolveAssetUrl', () => {
  it('sends stored uploads to the API host', () => {
    expect(resolveAssetUrl('/uploads/a.png', API)).toBe('https://api.example.com/uploads/a.png')
    expect(resolveAssetUrl('uploads/a.png', API)).toBe('https://api.example.com/uploads/a.png')
  })

  it('keeps the SPA\'s own files (preset avatars) on the SPA host', () => {
    expect(resolveAssetUrl('/profile-pictures/p.webp', API)).toBe('/profile-pictures/p.webp')
  })

  it('leaves absolute, blob and data URLs alone', () => {
    expect(resolveAssetUrl('https://cdn.example.com/x.png', API)).toBe('https://cdn.example.com/x.png')
    expect(resolveAssetUrl('blob:abc', API)).toBe('blob:abc')
    expect(resolveAssetUrl('data:image/png;base64,AA', API)).toBe('data:image/png;base64,AA')
  })

  it('is same-origin when no API host is configured', () => {
    expect(resolveAssetUrl('/uploads/a.png', '')).toBe('/uploads/a.png')
    expect(resolveAssetUrl(null, API)).toBe('')
  })
})
