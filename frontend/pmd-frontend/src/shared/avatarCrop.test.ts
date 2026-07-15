import { describe, it, expect } from 'vitest'
import { computeCropRect } from './avatarCrop'

describe('computeCropRect', () => {
  it('selects the full short side, centred, at zoom 100', () => {
    const rect = computeCropRect(1000, 500)
    expect(rect.sourceSize).toBe(500)
    expect(rect.offsetX).toBe(250)
    expect(rect.offsetY).toBe(0)
  })

  it('maps x=0 and x=100 to the image edges at zoom 100', () => {
    expect(computeCropRect(1000, 500, { xPercent: 0 }).offsetX).toBe(0)
    expect(computeCropRect(1000, 500, { xPercent: 100 }).offsetX).toBe(500)
  })

  it('zooms about the framed centre, matching the preview transform', () => {
    // The preview scales about the box centre, so at x=0 the visible square must stay
    // centred on the point object-position picked (250) rather than jumping to the image's
    // left edge (the old top-left mapping returned 0 here, disagreeing with the preview).
    const rect = computeCropRect(1000, 500, { xPercent: 0, zoomPercent: 200 })
    expect(rect.sourceSize).toBe(250)
    expect(rect.offsetX).toBe(125)
  })

  it('keeps a centred zoom centred', () => {
    const rect = computeCropRect(600, 600, { xPercent: 50, yPercent: 50, zoomPercent: 200 })
    expect(rect.sourceSize).toBe(300)
    expect(rect.offsetX).toBe(150)
    expect(rect.offsetY).toBe(150)
  })

  it('clamps out-of-range input and never leaves the image bounds', () => {
    const rect = computeCropRect(800, 400, { xPercent: -50, yPercent: 999, zoomPercent: 9999 })
    expect(rect.sourceSize).toBeCloseTo(400 / 2.2)
    expect(rect.offsetX).toBeGreaterThanOrEqual(0)
    expect(rect.offsetY).toBeGreaterThanOrEqual(0)
    expect(rect.offsetX + rect.sourceSize).toBeLessThanOrEqual(800)
    expect(rect.offsetY + rect.sourceSize).toBeLessThanOrEqual(400)
  })
})
