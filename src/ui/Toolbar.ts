export interface ToolbarCallbacks {
  onUndo(): void
  onRedo(): void
  onReset(): void
  onTogglePhysics(): void
  onExport(): void
  onImport(file: File): void
  onHelp(): void
}

/** Bottom floating toolbar: Undo, Redo, Reset, Physics, Export, Import, Help. */
export class Toolbar {
  private readonly root: HTMLDivElement
  private readonly fileInput: HTMLInputElement
  private readonly undoButton: HTMLButtonElement
  private readonly redoButton: HTMLButtonElement
  private readonly physicsButton: HTMLButtonElement

  constructor(container: HTMLElement, callbacks: ToolbarCallbacks) {
    this.root = document.createElement('div')
    this.root.id = 'toolbar'
    this.root.className = 'panel'

    this.undoButton = this.addButton('Undo', () => callbacks.onUndo())
    this.redoButton = this.addButton('Redo', () => callbacks.onRedo())
    this.addButton('Reset', () => callbacks.onReset())
    this.physicsButton = this.addButton('Physics', () => callbacks.onTogglePhysics())
    this.addButton('Export', () => callbacks.onExport())
    this.addButton('Import', () => this.fileInput.click())
    this.addButton('?', () => callbacks.onHelp()).title = 'Gesture guide'

    this.fileInput = document.createElement('input')
    this.fileInput.type = 'file'
    this.fileInput.accept = 'application/json'
    this.fileInput.style.display = 'none'
    this.fileInput.addEventListener('change', () => {
      const file = this.fileInput.files?.[0]
      if (file) callbacks.onImport(file)
      this.fileInput.value = ''
    })
    this.root.appendChild(this.fileInput)

    container.appendChild(this.root)
  }

  setUndoEnabled(enabled: boolean): void {
    this.undoButton.disabled = !enabled
  }

  setRedoEnabled(enabled: boolean): void {
    this.redoButton.disabled = !enabled
  }

  setPhysicsActive(active: boolean): void {
    this.physicsButton.classList.toggle('active', active)
  }

  dispose(): void {
    this.root.remove()
  }

  private addButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'toolbar-button'
    button.textContent = label
    button.addEventListener('click', onClick)
    this.root.appendChild(button)
    return button
  }
}
