import { HAND_CONNECTIONS } from '../tracking/handLandmarks.ts'
import type { HandTrackingFrame, TrackedHand, Handedness } from '../tracking/types.ts'
import type { GestureName } from '../gestures/types.ts'

const LANDMARK_RADIUS = 3
const LINE_WIDTH = 2
const HAND_COLORS: Record<Handedness, string> = {
  left: '#6ee7ff',
  right: '#ff9f6e',
}

/**
 * Toggleable ('D' key) full-viewport debug canvas: hand skeleton, per-hand
 * confidence, and active gesture names. Later phases extend render() with
 * bounding boxes, raycasts, and object IDs.
 */
export class DebugOverlay {
  private enabled = false
  private readonly canvas = document.createElement('canvas')
  private readonly ctx: CanvasRenderingContext2D
  private latestFrame: HandTrackingFrame | null = null
  private handGestureNames = new Map<Handedness, GestureName[]>()
  private frameGestureNames: GestureName[] = []
  private readonly container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
    this.canvas.id = 'debug-overlay'
    this.canvas.style.display = 'none'
    this.ctx = this.canvas.getContext('2d')!
    container.appendChild(this.canvas)

    this.resize()
    window.addEventListener('resize', this.resize)
    window.addEventListener('keydown', this.handleKeyDown)
  }

  /** Call once per render tick with the latest tracking + gesture state. */
  update(
    frame: HandTrackingFrame,
    handGestureNames: Map<Handedness, GestureName[]>,
    frameGestureNames: GestureName[],
  ): void {
    this.latestFrame = frame
    this.handGestureNames = handGestureNames
    this.frameGestureNames = frameGestureNames
    if (this.enabled) this.render()
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize)
    window.removeEventListener('keydown', this.handleKeyDown)
    this.canvas.remove()
  }

  private resize = (): void => {
    const rect = this.container.getBoundingClientRect()
    this.canvas.width = rect.width
    this.canvas.height = rect.height
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key.toLowerCase() !== 'd' || isTypingTarget(event.target)) return
    this.enabled = !this.enabled
    this.canvas.style.display = this.enabled ? 'block' : 'none'
    if (this.enabled) this.render()
  }

  private render(): void {
    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
    if (!this.latestFrame) return
    for (const hand of this.latestFrame.hands) {
      this.drawSkeleton(hand, width, height)
      this.drawLabel(hand, width, height)
    }
    this.drawFrameGestureNames(width)
  }

  private drawSkeleton(hand: TrackedHand, width: number, height: number): void {
    const color = HAND_COLORS[hand.handedness]
    this.ctx.strokeStyle = color
    this.ctx.fillStyle = color
    this.ctx.lineWidth = LINE_WIDTH

    this.ctx.beginPath()
    for (const [a, b] of HAND_CONNECTIONS) {
      const pointA = hand.landmarks[a]!
      const pointB = hand.landmarks[b]!
      this.ctx.moveTo(pointA.x * width, pointA.y * height)
      this.ctx.lineTo(pointB.x * width, pointB.y * height)
    }
    this.ctx.stroke()

    for (const point of hand.landmarks) {
      this.ctx.beginPath()
      this.ctx.arc(point.x * width, point.y * height, LANDMARK_RADIUS, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  private drawLabel(hand: TrackedHand, width: number, height: number): void {
    const wrist = hand.landmarks[0]!
    const openness = (hand.palmOpenness * 100).toFixed(0)
    const confidence = (hand.confidence * 100).toFixed(0)
    const gestures = this.handGestureNames.get(hand.handedness) ?? []
    const gestureText = gestures.length > 0 ? ` · ${gestures.join(', ')}` : ''
    const x = wrist.x * width + 10
    const y = wrist.y * height

    this.ctx.font = '12px ui-monospace, monospace'
    this.ctx.fillStyle = HAND_COLORS[hand.handedness]
    this.ctx.fillText(`${hand.handedness} · ${confidence}% conf · ${openness}% open${gestureText}`, x, y)

    // Raw numbers behind the pose thresholds (see gestures/poses.ts) — for
    // calibrating those constants against your own hand/camera/lighting.
    const curl = hand.fingers
    const curlText = `curl T:${curl.thumb.curl.toFixed(2)} I:${curl.index.curl.toFixed(2)} M:${curl.middle.curl.toFixed(2)} R:${curl.ring.curl.toFixed(2)} P:${curl.pinky.curl.toFixed(2)}`
    this.ctx.font = '11px ui-monospace, monospace'
    this.ctx.fillText(`pinch: ${hand.pinchDistance.toFixed(2)} · ${curlText}`, x, y + 16)
  }

  private drawFrameGestureNames(width: number): void {
    if (this.frameGestureNames.length === 0) return
    this.ctx.font = '14px ui-monospace, monospace'
    this.ctx.fillStyle = '#ffffff'
    this.ctx.textAlign = 'center'
    this.ctx.fillText(this.frameGestureNames.join(', '), width / 2, 28)
    this.ctx.textAlign = 'left'
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
}
