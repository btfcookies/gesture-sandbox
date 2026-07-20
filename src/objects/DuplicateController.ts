import * as THREE from 'three'
import type { GestureRecognizer } from '../gestures/GestureRecognizer.ts'
import { GestureHoldTracker } from '../gestures/GestureHoldTracker.ts'
import type { SelectionManager } from './SelectionManager.ts'
import type { ObjectStore } from './ObjectStore.ts'
import type { HistoryManager } from './HistoryManager.ts'
import { SpawnCommand } from './commands/SpawnCommand.ts'
import { CompositeCommand } from './commands/CompositeCommand.ts'

const DUPLICATE_OFFSET = new THREE.Vector3(0.35, 0, 0.35)
// Requires the pose to be held, not just glimpsed for a single frame — same
// reasoning as DeleteController's hold-to-confirm: a single noisy frame from
// landmark jitter (or a hand passing through a thumbsUp-adjacent shape while
// transitioning between other gestures) shouldn't be enough to spawn copies.
const THUMBS_UP_HOLD_MS = 400

/** Thumbs Up, held briefly, while something is selected duplicates the whole selection, offset slightly, and selects the copies. */
export class DuplicateController {
  private readonly selection: SelectionManager
  private readonly objectStore: ObjectStore
  private readonly history: HistoryManager
  private readonly holdTracker: GestureHoldTracker

  constructor(recognizer: GestureRecognizer, selection: SelectionManager, objectStore: ObjectStore, history: HistoryManager) {
    this.selection = selection
    this.objectStore = objectStore
    this.history = history
    this.holdTracker = new GestureHoldTracker(recognizer, 'thumbsUp', THUMBS_UP_HOLD_MS, () => this.handleHeld())
  }

  dispose(): void {
    this.holdTracker.dispose()
  }

  private handleHeld(): void {
    if (this.selection.isEmpty) return
    const duplicates = this.selection.all.map((object) =>
      this.objectStore.spawn(object.type, object.position.clone().add(DUPLICATE_OFFSET)),
    )
    this.selection.setSelection(duplicates)
    this.history.push(new CompositeCommand(duplicates.map((object) => new SpawnCommand(this.objectStore, object))))
  }
}
