import * as CANNON from 'cannon-es'

const GRAVITY = -9.82
const FIXED_TIMESTEP = 1 / 60
const MAX_SUBSTEPS = 5

/** Thin wrapper around a CANNON.World: fixed-timestep stepping plus a static floor collider. */
export class PhysicsWorld {
  readonly world: CANNON.World

  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) })
    this.world.broadphase = new CANNON.SAPBroadphase(this.world)
    this.world.allowSleep = true

    const floorBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
    floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.world.addBody(floorBody)
  }

  step(deltaSeconds: number): void {
    this.world.step(FIXED_TIMESTEP, deltaSeconds, MAX_SUBSTEPS)
  }
}
