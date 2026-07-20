import * as THREE from 'three'

/**
 * Procedurally draws a fine grid that dissolves into the base color toward
 * the circular edge. Fade is baked into RGB (not alpha) so the texture stays
 * fully opaque and behaves predictably across browsers on upload.
 */
export function createGridTexture(options: {
  size?: number
  divisions?: number
  baseColor?: string
  lineColor?: string
  fadeStart?: number
}): THREE.CanvasTexture {
  const {
    size = 1024,
    divisions = 40,
    baseColor = '#0d0e14',
    lineColor = 'rgba(140, 200, 255, 0.9)',
    fadeStart = 0.55,
  } = options

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const center = size / 2
  const radius = size / 2

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)

  const step = size / divisions
  ctx.strokeStyle = lineColor
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= divisions; i++) {
    const pos = i * step
    ctx.moveTo(pos, 0)
    ctx.lineTo(pos, size)
    ctx.moveTo(0, pos)
    ctx.lineTo(size, pos)
  }
  ctx.stroke()

  // Fade the grid into baseColor near the edge by painting baseColor back over it.
  const fade = ctx.createRadialGradient(center, center, radius * fadeStart, center, center, radius)
  fade.addColorStop(0, `${baseColor}00`)
  fade.addColorStop(1, `${baseColor}ff`)
  ctx.fillStyle = fade
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
