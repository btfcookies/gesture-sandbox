import type { Command } from './Command.ts'

/** Groups several commands into one undo/redo step, undoing in reverse order. */
export class CompositeCommand implements Command {
  private readonly commands: Command[]

  constructor(commands: Command[]) {
    this.commands = commands
  }

  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) this.commands[i]!.undo()
  }

  redo(): void {
    for (const command of this.commands) command.redo()
  }
}
