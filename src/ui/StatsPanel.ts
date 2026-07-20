const FPS_SMOOTHING = 0.9

/** Top-left HUD: FPS, active gesture(s), detected hand count, tracking confidence. */
export class StatsPanel {
  private readonly root: HTMLDivElement
  private readonly fpsEl: HTMLDivElement
  private readonly gestureEl: HTMLDivElement
  private readonly handsEl: HTMLDivElement
  private readonly confidenceEl: HTMLDivElement
  private smoothedFps = 60

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.id = 'stats-panel'
    this.root.className = 'panel'

    this.fpsEl = document.createElement('div')
    this.gestureEl = document.createElement('div')
    this.handsEl = document.createElement('div')
    this.confidenceEl = document.createElement('div')
    this.root.append(this.fpsEl, this.gestureEl, this.handsEl, this.confidenceEl)

    container.appendChild(this.root)
  }

  update(deltaSeconds: number, handCount: number, averageConfidence: number, activeGestures: string[]): void {
    const instantFps = deltaSeconds > 0 ? 1 / deltaSeconds : this.smoothedFps
    this.smoothedFps = this.smoothedFps * FPS_SMOOTHING + instantFps * (1 - FPS_SMOOTHING)

    this.fpsEl.textContent = `FPS: ${Math.round(this.smoothedFps)}`
    this.gestureEl.textContent = `Gesture: ${activeGestures.length > 0 ? activeGestures.join(', ') : '—'}`
    this.handsEl.textContent = `Hands: ${handCount}`
    this.confidenceEl.textContent = `Confidence: ${handCount > 0 ? `${Math.round(averageConfidence * 100)}%` : '—'}`
  }

  dispose(): void {
    this.root.remove()
  }
}
