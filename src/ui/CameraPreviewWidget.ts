import { CameraManager, type CameraStatus } from '../camera/CameraManager.ts'
import { HAND_CONNECTIONS } from '../tracking/handLandmarks.ts'
import type { Handedness, TrackedHand } from '../tracking/types.ts'

const STATUS_MESSAGES: Partial<Record<CameraStatus, string>> = {
  requesting: 'Requesting camera access…',
}

const LANDMARK_RADIUS = 3.5
const LINE_WIDTH = 2
const HAND_COLORS: Record<Handedness, string> = {
  left: '#6ee7ff',
  right: '#ff9f6e',
}

/**
 * Full-viewport mirrored webcam feed that hosts the 3D scene canvas and hand
 * skeleton overlay directly on top of it, plus a device-switch button and a
 * status overlay for permission/error states.
 */
export class CameraPreviewWidget {
  private readonly camera: CameraManager
  private readonly statusEl: HTMLDivElement
  private readonly switchButton: HTMLButtonElement
  private readonly video: HTMLVideoElement
  private readonly landmarkCanvas: HTMLCanvasElement
  private readonly landmarkCtx: CanvasRenderingContext2D
  private readonly container: HTMLElement

  constructor(container: HTMLElement, sceneCanvas: HTMLCanvasElement) {
    const root = document.createElement('div')
    root.id = 'camera-preview'

    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    root.appendChild(video)
    this.video = video

    // The 3D canvas is composited directly above the video feed (transparent
    // clear color) so scene objects render as if they're floating in the
    // camera preview, which now fills the whole viewport.
    root.appendChild(sceneCanvas)

    const landmarkCanvas = document.createElement('canvas')
    landmarkCanvas.className = 'camera-landmarks'
    root.appendChild(landmarkCanvas)
    this.landmarkCanvas = landmarkCanvas
    this.landmarkCtx = landmarkCanvas.getContext('2d')!

    this.statusEl = document.createElement('div')
    this.statusEl.className = 'camera-status'
    root.appendChild(this.statusEl)

    this.switchButton = document.createElement('button')
    this.switchButton.id = 'camera-switch'
    this.switchButton.type = 'button'
    this.switchButton.title = 'Switch camera'
    this.switchButton.textContent = '⟳'
    this.switchButton.disabled = true
    this.switchButton.addEventListener('click', () => void this.camera.switchCamera())
    root.appendChild(this.switchButton)

    container.appendChild(root)
    this.container = root

    this.camera = new CameraManager(video)
    this.camera.onStatusChange = (status, message) => this.handleStatus(status, message)

    this.resizeCanvas()
    window.addEventListener('resize', this.resizeCanvas)
  }

  get videoElement(): HTMLVideoElement {
    return this.video
  }

  async start(): Promise<void> {
    await this.camera.start()
  }

  /** Call once per render tick with the latest tracked hands to draw their skeletons over the feed. */
  updateHands(hands: readonly TrackedHand[]): void {
    const { width, height } = this.landmarkCanvas
    this.landmarkCtx.clearRect(0, 0, width, height)
    if (width === 0 || height === 0) return

    const videoWidth = this.video.videoWidth
    const videoHeight = this.video.videoHeight
    if (videoWidth === 0 || videoHeight === 0) return

    // The video is displayed with object-fit: cover, so normalized landmark
    // coordinates (relative to the full mirrored source frame) need the same
    // centered-crop math applied before they'll line up with the visible pixels.
    const scale = Math.max(width / videoWidth, height / videoHeight)
    const offsetX = (width - videoWidth * scale) / 2
    const offsetY = (height - videoHeight * scale) / 2
    const project = (x: number, y: number): [number, number] => [x * videoWidth * scale + offsetX, y * videoHeight * scale + offsetY]

    for (const hand of hands) {
      this.drawSkeleton(hand, project)
    }
  }

  private drawSkeleton(hand: TrackedHand, project: (x: number, y: number) => [number, number]): void {
    const ctx = this.landmarkCtx
    const color = HAND_COLORS[hand.handedness]
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = LINE_WIDTH

    ctx.beginPath()
    for (const [a, b] of HAND_CONNECTIONS) {
      const pointA = hand.landmarks[a]!
      const pointB = hand.landmarks[b]!
      const [ax, ay] = project(pointA.x, pointA.y)
      const [bx, by] = project(pointB.x, pointB.y)
      ctx.moveTo(ax, ay)
      ctx.lineTo(bx, by)
    }
    ctx.stroke()

    for (const point of hand.landmarks) {
      const [x, y] = project(point.x, point.y)
      ctx.beginPath()
      ctx.arc(x, y, LANDMARK_RADIUS, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private resizeCanvas = (): void => {
    const rect = this.container.getBoundingClientRect()
    this.landmarkCanvas.width = rect.width
    this.landmarkCanvas.height = rect.height
  }

  private handleStatus(status: CameraStatus, message?: string): void {
    const isProblem = status === 'denied' || status === 'unavailable' || status === 'error'
    this.statusEl.classList.toggle('error', isProblem)
    this.statusEl.textContent = message ?? STATUS_MESSAGES[status] ?? ''
    this.statusEl.style.display = status === 'ready' ? 'none' : 'flex'
    this.switchButton.disabled = status !== 'ready' || this.camera.deviceCount < 2
  }
}
