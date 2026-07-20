import type { SceneObject } from './SceneObject.ts'

/** Owns which objects are currently selected. Purely bookkeeping — interaction controllers decide when selection changes. */
export class SelectionManager {
  private readonly selectedObjects = new Set<SceneObject>()

  get all(): SceneObject[] {
    return [...this.selectedObjects]
  }

  get isEmpty(): boolean {
    return this.selectedObjects.size === 0
  }

  has(object: SceneObject): boolean {
    return this.selectedObjects.has(object)
  }

  /** Replaces the whole selection with just this object. */
  selectOnly(object: SceneObject): void {
    this.clear()
    this.add(object)
  }

  /** Replaces the whole selection with this set (used by box multi-select). */
  setSelection(objects: SceneObject[]): void {
    this.clear()
    for (const object of objects) this.add(object)
  }

  add(object: SceneObject): void {
    object.selected = true
    this.selectedObjects.add(object)
  }

  remove(object: SceneObject): void {
    object.selected = false
    this.selectedObjects.delete(object)
  }

  clear(): void {
    for (const object of this.selectedObjects) object.selected = false
    this.selectedObjects.clear()
  }
}
