import type { PrimitiveType } from './types.ts'

/** One accent color per primitive, so objects are distinguishable at a glance and the radial menu can reuse the same swatches. */
export const PRIMITIVE_COLORS: Record<PrimitiveType, number> = {
  cube: 0x6ee7ff,
  sphere: 0xc084fc,
  cylinder: 0xffb454,
  cone: 0x6ee7a3,
  torus: 0xff6e9f,
  capsule: 0xffe66e,
  plane: 0xd8d8e2,
}
