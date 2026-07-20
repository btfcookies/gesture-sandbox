import { PRIMITIVE_TYPES, type PrimitiveType } from '../objects/types.ts'
import { PRIMITIVE_COLORS } from '../objects/palette.ts'

const ITEM_RADIUS_PX = 90
const DEAD_ZONE_PX = 24
const CLOSE = 'close' as const

/** Everything the radial menu can resolve a pinch to: a primitive to spawn, or the dedicated close wedge. */
export type RadialMenuSelection = PrimitiveType | typeof CLOSE

const WEDGES: readonly RadialMenuSelection[] = [...PRIMITIVE_TYPES, CLOSE]

/**
 * Floating circular menu of primitive types plus a dedicated close wedge.
 * Purely presentational — ObjectSpawnController decides when it opens/closes
 * and what counts as a confirmed selection; this only renders and reports
 * the angularly-closest wedge to a given pointer position.
 */
export class RadialMenu {
  private readonly root: HTMLDivElement
  private readonly items = new Map<RadialMenuSelection, HTMLButtonElement>()
  private highlighted: RadialMenuSelection | null = null
  private visible = false

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.id = 'radial-menu'
    this.root.style.display = 'none'

    const angleStep = (Math.PI * 2) / WEDGES.length
    WEDGES.forEach((wedge, index) => {
      const button = document.createElement('button')
      button.type = 'button'

      const angle = angleStep * index - Math.PI / 2
      button.style.left = `${Math.cos(angle) * ITEM_RADIUS_PX}px`
      button.style.top = `${Math.sin(angle) * ITEM_RADIUS_PX}px`

      if (wedge === CLOSE) {
        button.className = 'radial-menu-item radial-menu-close'
        button.textContent = '✕'
        button.setAttribute('aria-label', 'Close menu')
      } else {
        button.className = 'radial-menu-item'
        button.textContent = wedge
        button.style.setProperty('--accent', colorToCss(PRIMITIVE_COLORS[wedge]))
      }

      this.root.appendChild(button)
      this.items.set(wedge, button)
    })

    container.appendChild(this.root)
  }

  get isOpen(): boolean {
    return this.visible
  }

  /** The currently highlighted wedge, or null if the pointer is still in the dead zone. */
  get selection(): RadialMenuSelection | null {
    return this.highlighted
  }

  open(screenX: number, screenY: number): void {
    this.visible = true
    this.root.style.left = `${screenX}px`
    this.root.style.top = `${screenY}px`
    this.root.style.display = 'block'
    this.setHighlight(null)
  }

  close(): void {
    this.visible = false
    this.root.style.display = 'none'
  }

  /** Highlights whichever wedge is angularly closest to the given screen point (e.g. the index fingertip). */
  updatePointer(screenX: number, screenY: number): void {
    if (!this.visible) return
    const rect = this.root.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const dx = screenX - centerX
    const dy = screenY - centerY

    if (Math.hypot(dx, dy) < DEAD_ZONE_PX) {
      this.setHighlight(null)
      return
    }

    const pointerAngle = Math.atan2(dy, dx)
    const angleStep = (Math.PI * 2) / WEDGES.length
    let closest: RadialMenuSelection = WEDGES[0]!
    let smallestDelta = Infinity
    WEDGES.forEach((wedge, index) => {
      const itemAngle = angleStep * index - Math.PI / 2
      const delta = Math.abs(angularDifference(pointerAngle, itemAngle))
      if (delta < smallestDelta) {
        smallestDelta = delta
        closest = wedge
      }
    })
    this.setHighlight(closest)
  }

  dispose(): void {
    this.root.remove()
  }

  private setHighlight(wedge: RadialMenuSelection | null): void {
    if (this.highlighted === wedge) return
    if (this.highlighted) this.items.get(this.highlighted)?.classList.remove('active')
    this.highlighted = wedge
    if (wedge) this.items.get(wedge)?.classList.add('active')
  }
}

function angularDifference(a: number, b: number): number {
  const diff = ((a - b + Math.PI) % (Math.PI * 2)) - Math.PI
  return diff < -Math.PI ? diff + Math.PI * 2 : diff
}

function colorToCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`
}
