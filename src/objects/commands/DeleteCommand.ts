import * as THREE from 'three'
import type { ObjectStore } from '../ObjectStore.ts'
import type { SceneObject } from '../SceneObject.ts'
import type { PrimitiveType } from '../types.ts'
import type { Command } from './Command.ts'

/**
 * Undo recreates the object at its pre-delete transform (instantly, no
 * pop-in tween). The transform must be captured at construction time —
 * before the dissolve animation starts mutating scale/opacity.
 */
export class DeleteCommand implements Command {
  private readonly objectStore: ObjectStore
  private readonly type: PrimitiveType
  private readonly position: THREE.Vector3
  private readonly quaternion: THREE.Quaternion
  private readonly scale: THREE.Vector3
  private object: SceneObject

  constructor(objectStore: ObjectStore, object: SceneObject) {
    this.objectStore = objectStore
    this.object = object
    this.type = object.type
    this.position = object.position.clone()
    this.quaternion = object.mesh.quaternion.clone()
    this.scale = object.scale.clone()
  }

  undo(): void {
    this.object = this.objectStore.spawnAt(this.type, this.position, this.quaternion, this.scale)
  }

  redo(): void {
    this.objectStore.remove(this.object)
  }
}
