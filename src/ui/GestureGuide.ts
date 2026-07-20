interface GestureInfo {
  emoji: string
  name: string
  description: string
}

// Kept honest to what's actually wired up: Closed Fist and Release are
// detected by the gesture system (see gestures/poses.ts) but have no bound
// action yet.
const GESTURES: readonly GestureInfo[] = [
  { emoji: '✋', name: 'Open Palm', description: 'Hold for 1 second to open the radial menu and spawn an object.' },
  { emoji: '🤏', name: 'Pinch', description: 'Select and drag an object. Also confirms a radial menu choice.' },
  { emoji: '👆', name: 'Point', description: 'Aim with your index finger to hover and highlight an object.' },
  { emoji: '🤛', name: 'Grab', description: 'Select an object, then twist your wrist to rotate it.' },
  { emoji: '✊', name: 'Closed Fist', description: 'Recognized — not yet bound to an action.' },
  { emoji: '✌️', name: 'Peace Sign', description: 'Drag to draw a box — everything inside becomes selected.' },
  { emoji: '👍', name: 'Thumbs Up', description: 'Duplicate the current selection.' },
  { emoji: '🙌', name: 'Two-Hand Pinch', description: 'Pinch with both hands and move them apart or together to scale the selection.' },
  { emoji: '👌', name: 'OK Sign', description: 'Hold for 1 second while something is selected to delete it.' },
  { emoji: '🖐️', name: 'Release', description: 'Fires the instant a Grab ends — not yet bound to an action.' },
]

/** Toggleable modal listing every gesture the app recognizes and what it currently does. */
export class GestureGuide {
  private readonly root: HTMLDivElement
  private visible = false

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.id = 'gesture-guide'

    const panel = document.createElement('div')
    panel.className = 'panel gesture-guide-panel'

    const header = document.createElement('div')
    header.className = 'gesture-guide-header'
    const title = document.createElement('h2')
    title.textContent = 'Hand Gestures'
    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'gesture-guide-close'
    closeButton.textContent = '×'
    closeButton.setAttribute('aria-label', 'Close')
    closeButton.addEventListener('click', () => this.close())
    header.append(title, closeButton)

    const grid = document.createElement('div')
    grid.className = 'gesture-guide-grid'
    for (const gesture of GESTURES) grid.appendChild(buildCard(gesture))

    panel.append(header, grid)
    this.root.appendChild(panel)

    this.root.addEventListener('click', (event) => {
      if (event.target === this.root) this.close()
    })
    window.addEventListener('keydown', this.handleKeyDown)

    container.appendChild(this.root)
  }

  get isOpen(): boolean {
    return this.visible
  }

  open(): void {
    this.visible = true
    this.root.classList.add('open')
  }

  close(): void {
    this.visible = false
    this.root.classList.remove('open')
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
    this.root.remove()
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.visible) this.close()
  }
}

function buildCard(gesture: GestureInfo): HTMLDivElement {
  const card = document.createElement('div')
  card.className = 'gesture-card'

  const icon = document.createElement('div')
  icon.className = 'gesture-card-icon'
  icon.textContent = gesture.emoji

  const name = document.createElement('div')
  name.className = 'gesture-card-name'
  name.textContent = gesture.name

  const description = document.createElement('div')
  description.className = 'gesture-card-description'
  description.textContent = gesture.description

  card.append(icon, name, description)
  return card
}
