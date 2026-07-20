export type EasingFn = (t: number) => number

export const Easings: Record<string, EasingFn> = {
  linear: (t) => t,
  easeOutCubic: (t) => 1 - (1 - t) ** 3,
  /** Overshoots past 1 before settling — a small "pop" on arrival. */
  easeOutBack: (t) => {
    const overshoot = 1.70158
    const c3 = overshoot + 1
    return 1 + c3 * (t - 1) ** 3 + overshoot * (t - 1) ** 2
  },
}
