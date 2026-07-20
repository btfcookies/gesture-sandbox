export interface OneEuroFilterOptions {
  /** Baseline cutoff frequency (Hz). Lower = smoother but laggier at rest. */
  minCutoff?: number
  /** How much cutoff rises with speed. Higher = less lag on fast motion, more jitter. */
  beta?: number
  /** Cutoff frequency (Hz) for the derivative low-pass. */
  dCutoff?: number
}

const DEFAULT_MIN_CUTOFF = 1.0
const DEFAULT_BETA = 0.02
const DEFAULT_D_CUTOFF = 1.0
const MIN_DELTA_SECONDS = 1e-6

/**
 * The 1€ Filter (Casiez, Roussel, Vogel 2012): an adaptive low-pass filter
 * that suppresses jitter when a signal is nearly still and reduces lag when
 * it moves quickly. Used here to stabilize per-frame hand landmark noise.
 */
export class OneEuroFilter {
  private readonly minCutoff: number
  private readonly beta: number
  private readonly dCutoff: number

  private previousValue: number | null = null
  private previousDerivative = 0
  private previousTimestampMs: number | null = null

  constructor(options: OneEuroFilterOptions = {}) {
    this.minCutoff = options.minCutoff ?? DEFAULT_MIN_CUTOFF
    this.beta = options.beta ?? DEFAULT_BETA
    this.dCutoff = options.dCutoff ?? DEFAULT_D_CUTOFF
  }

  filter(value: number, timestampMs: number): number {
    if (this.previousTimestampMs === null || this.previousValue === null) {
      this.previousTimestampMs = timestampMs
      this.previousValue = value
      return value
    }

    const dt = Math.max((timestampMs - this.previousTimestampMs) / 1000, MIN_DELTA_SECONDS)
    this.previousTimestampMs = timestampMs

    const derivative = (value - this.previousValue) / dt
    const smoothedDerivative = lowPass(derivative, this.previousDerivative, computeAlpha(this.dCutoff, dt))
    this.previousDerivative = smoothedDerivative

    const cutoff = this.minCutoff + this.beta * Math.abs(smoothedDerivative)
    const smoothedValue = lowPass(value, this.previousValue, computeAlpha(cutoff, dt))
    this.previousValue = smoothedValue

    return smoothedValue
  }

  reset(): void {
    this.previousValue = null
    this.previousDerivative = 0
    this.previousTimestampMs = null
  }
}

function computeAlpha(cutoffHz: number, dt: number): number {
  const timeConstant = 1 / (2 * Math.PI * cutoffHz)
  return 1 / (1 + timeConstant / dt)
}

function lowPass(value: number, previous: number, alpha: number): number {
  return alpha * value + (1 - alpha) * previous
}
