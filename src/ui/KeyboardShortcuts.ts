export interface KeyboardCallbacks {
  onReset(): void
  onDeleteSelected(): void
  onUndo(): void
  onRedo(): void
  onTogglePause(): void
}

/** R = reset, Delete/Backspace = delete selected, Ctrl+Z = undo, Ctrl+Y = redo, Space = pause tracking. */
export class KeyboardShortcuts {
  private readonly callbacks: KeyboardCallbacks

  constructor(callbacks: KeyboardCallbacks) {
    this.callbacks = callbacks
    window.addEventListener('keydown', this.handleKeyDown)
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown)
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      this.callbacks.onUndo()
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      this.callbacks.onRedo()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      this.callbacks.onDeleteSelected()
    } else if (event.key.toLowerCase() === 'r') {
      this.callbacks.onReset()
    } else if (event.code === 'Space') {
      event.preventDefault()
      this.callbacks.onTogglePause()
    }
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
}
