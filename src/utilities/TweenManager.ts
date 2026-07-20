import type { Tween } from './Tween.ts'

/** Owns every active tween and advances them once per render tick. */
export class TweenManager {
  private readonly tweens = new Set<Tween>()

  add(tween: Tween): void {
    this.tweens.add(tween)
  }

  update(deltaMs: number): void {
    for (const tween of this.tweens) {
      tween.step(deltaMs)
      if (tween.finished) this.tweens.delete(tween)
    }
  }
}
