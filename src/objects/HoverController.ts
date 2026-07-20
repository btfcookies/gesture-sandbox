import * as THREE from 'three'
import type { ObjectStore } from './ObjectStore.ts'
import type { SceneObject } from './SceneObject.ts'
import type { HandTrackingFrame } from '../tracking/types.ts'

const ndc = new THREE.Vector2()

// Curling the index finger in to touch the thumb (pinch) or into a fist
// (grab) drags the fingertip's screen position away from wherever it was
// pointing a moment ago — right as PinchDragController/RotateController read
// hover.current to decide *what* to grab. Without this grace window, closing
// the gesture reliably knocks the raycast off the target object just before
// it's needed, so a perfectly steady pinch on an object silently selects
// nothing. Keeping the last real hit "warm" for a short window survives that
// curl without making stale hovers linger noticeably.
const HOVER_GRACE_MS = 250

/** Raycasts from each hand's index fingertip into the scene each frame to decide what's hovered. */
export class HoverController {
  private readonly objectStore: ObjectStore
  private readonly camera: THREE.Camera
  private readonly raycaster = new THREE.Raycaster()
  private hovered: SceneObject | null = null
  private lastHitObject: SceneObject | null = null
  private lastHitAtMs = -Infinity

  constructor(objectStore: ObjectStore, camera: THREE.Camera) {
    this.objectStore = objectStore
    this.camera = camera
  }

  get current(): SceneObject | null {
    return this.hovered
  }

  update(frame: HandTrackingFrame): void {
    let hit: SceneObject | null = null
    for (const hand of frame.hands) {
      const tip = hand.fingers.index.joints[hand.fingers.index.joints.length - 1]!
      hit = this.pick(tip.x, tip.y)
      if (hit) break
    }

    if (hit) {
      this.lastHitObject = hit
      this.lastHitAtMs = frame.timestampMs
    }

    const withinGrace = frame.timestampMs - this.lastHitAtMs <= HOVER_GRACE_MS
    // Only fall back to the stale hit while it's still in the live scene —
    // guards against a grace window spanning a delete/undo.
    const graceHit = withinGrace && this.lastHitObject && this.objectStore.get(this.lastHitObject.uuid) ? this.lastHitObject : null

    this.setHovered(hit ?? graceHit)
  }

  private pick(normalizedX: number, normalizedY: number): SceneObject | null {
    // Raycast directly against the live group children (no per-frame array
    // copy), then resolve the hit mesh's SceneObject via its userData
    // back-reference (no scan) instead of objectStore.all.find(...).
    if (this.objectStore.group.children.length === 0) return null

    ndc.set(normalizedX * 2 - 1, -(normalizedY * 2 - 1))
    this.raycaster.setFromCamera(ndc, this.camera)
    const hits = this.raycaster.intersectObjects(this.objectStore.group.children, false)
    if (hits.length === 0) return null
    return (hits[0]!.object.userData.sceneObject as SceneObject | undefined) ?? null
  }

  private setHovered(object: SceneObject | null): void {
    if (this.hovered === object) return
    if (this.hovered) this.hovered.hovered = false
    this.hovered = object
    if (object) object.hovered = true
  }
}
