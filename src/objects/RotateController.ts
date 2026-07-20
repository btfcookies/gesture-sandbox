import * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import type { HandTrackingFrame, Handedness, TrackedHand } from '../tracking/types.ts'
import type { HoverController } from './HoverController.ts'
import type { SelectionManager } from './SelectionManager.ts'
import type { SceneObject } from './SceneObject.ts'

interface RotateTarget {
  object: SceneObject
  startObjectRotation: THREE.Quaternion
}

interface RotateState {
  startHandRotation: THREE.Quaternion
  targets: RotateTarget[]
}

/**
 * Grab with one hand, rotate the wrist, the whole selection rotates to
 * match — a direct per-frame quaternion-delta mapping, so there's no
 * snapping. Driven by update() rather than gesture events: it needs the
 * hand's live rotation every frame, which GestureEvent doesn't carry.
 */
export class RotateController {
  private readonly recognizer: GestureRecognizer
  private readonly selection: SelectionManager
  private readonly hover: HoverController
  private readonly active = new Map<Handedness, RotateState>()

  constructor(recognizer: GestureRecognizer, selection: SelectionManager, hover: HoverController) {
    this.recognizer = recognizer
    this.selection = selection
    this.hover = hover
  }

  update(frame: HandTrackingFrame): void {
    for (const hand of frame.hands) {
      const isGrabbing = this.recognizer.getActiveGestureNames(hand.handedness).includes('grab')
      const state = this.active.get(hand.handedness)

      if (isGrabbing && !state) {
        this.beginRotate(hand)
      } else if (isGrabbing && state) {
        this.applyRotate(hand, state)
      } else if (!isGrabbing && state) {
        for (const { object } of state.targets) object.beingManipulated = false
        this.active.delete(hand.handedness)
      }
    }
  }

  private beginRotate(hand: TrackedHand): void {
    if (this.selection.isEmpty) {
      const target = this.hover.current
      if (!target) return
      this.selection.selectOnly(target)
    }

    const targets = this.selection.all.map((object) => ({ object, startObjectRotation: object.mesh.quaternion.clone() }))
    for (const { object } of targets) object.beingManipulated = true

    this.active.set(hand.handedness, { startHandRotation: hand.rotation.clone(), targets })
  }

  private applyRotate(hand: TrackedHand, state: RotateState): void {
    const delta = hand.rotation.clone().multiply(state.startHandRotation.clone().invert())
    for (const { object, startObjectRotation } of state.targets) {
      object.mesh.quaternion.copy(delta.clone().multiply(startObjectRotation))
    }
  }
}
