import { Easings, type EasingFn } from './easing.ts'

export interface TweenOptions {
  durationMs: number
  easing?: EasingFn
  onUpdate: (progress: number) => void
  onComplete?: () => void
}

/** A single time-based interpolation, advanced externally by TweenManager. */
export class Tween {
  finished = false

  private elapsedMs = 0
  private readonly durationMs: number
  private readonly easing: EasingFn
  private readonly onUpdate: (progress: number) => void
  private readonly onComplete: (() => void) | undefined

  constructor(options: TweenOptions) {
    this.durationMs = options.durationMs
    this.easing = options.easing ?? Easings.linear!
    this.onUpdate = options.onUpdate
    this.onComplete = options.onComplete
  }

  step(deltaMs: number): void {
    if (this.finished) return
    this.elapsedMs = Math.min(this.elapsedMs + deltaMs, this.durationMs)
    const rawProgress = this.durationMs === 0 ? 1 : this.elapsedMs / this.durationMs
    this.onUpdate(this.easing(rawProgress))
    if (this.elapsedMs >= this.durationMs) {
      this.finished = true
      this.onComplete?.()
    }
  }
}
