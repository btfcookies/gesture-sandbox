/**
 * Draws the current video frame onto an internal canvas, flipped
 * horizontally. MediaPipe's handedness classification assumes a mirrored
 * (selfie-view) input; feeding it a mirrored frame keeps "left hand" meaning
 * the user's actual left hand, matching the mirrored preview they see.
 */
export class MirroredFrameSource {
  private readonly canvas = document.createElement('canvas')
  private readonly ctx: CanvasRenderingContext2D

  constructor() {
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: false })!
  }

  update(video: HTMLVideoElement): HTMLCanvasElement | null {
    const width = video.videoWidth
    const height = video.videoHeight
    if (width === 0 || height === 0) return null

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width
      this.canvas.height = height
    }

    this.ctx.save()
    this.ctx.translate(width, 0)
    this.ctx.scale(-1, 1)
    this.ctx.drawImage(video, 0, 0, width, height)
    this.ctx.restore()

    return this.canvas
  }
}
