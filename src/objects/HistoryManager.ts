import type { Command } from './commands/Command.ts'

const MAX_HISTORY = 50

/** Simple undo/redo command stack. Pushing a new command clears the redo stack (standard editor behavior). */
export class HistoryManager {
  private readonly undoStack: Command[] = []
  private readonly redoStack: Command[] = []

  get canUndo(): boolean {
    return this.undoStack.length > 0
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0
  }

  push(command: Command): void {
    this.undoStack.push(command)
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift()
    this.redoStack.length = 0
  }

  undo(): void {
    const command = this.undoStack.pop()
    if (!command) return
    command.undo()
    this.redoStack.push(command)
  }

  redo(): void {
    const command = this.redoStack.pop()
    if (!command) return
    command.redo()
    this.undoStack.push(command)
  }

  /** Hard reset — clears history without undoing anything, since Reset itself is not meant to be undoable. */
  clear(): void {
    this.undoStack.length = 0
    this.redoStack.length = 0
  }
}
