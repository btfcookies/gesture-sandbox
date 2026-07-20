/** Purely presentational dashed drag-rectangle for box multi-select. */
export class SelectionBoxOverlay {
  private readonly root: HTMLDivElement

  constructor(container: HTMLElement) {
    this.root = document.createElement('div')
    this.root.id = 'selection-box'
    this.root.style.display = 'none'
    container.appendChild(this.root)
  }

  show(x1: number, y1: number, x2: number, y2: number): void {
    this.root.style.left = `${Math.min(x1, x2)}px`
    this.root.style.top = `${Math.min(y1, y2)}px`
    this.root.style.width = `${Math.abs(x2 - x1)}px`
    this.root.style.height = `${Math.abs(y2 - y1)}px`
    this.root.style.display = 'block'
  }

  hide(): void {
    this.root.style.display = 'none'
  }

  dispose(): void {
    this.root.remove()
  }
}
