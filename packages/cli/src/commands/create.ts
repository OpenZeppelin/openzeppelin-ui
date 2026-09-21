import { Command } from 'commander';

import { registerCreateInitCommand } from './create/init';
import { registerScaffoldAction } from './create/scaffold';

/**
 * Registers `oz-ui create` and its subcommands on the program.
 *
 * The bare command (`oz-ui create [project-name]`) scaffolds a runnable Vite
 * + React 19 + TypeScript dApp. The `init` subcommand (`oz-ui create init`)
 * installs the `scaffold-dapp` AI skill into a workspace without generating
 * any project files.
 *
 * Registration order matters: subcommands must be added BEFORE the bare
 * action that accepts a positional `[project-name]`. Otherwise commander
 * binds `init` to the optional positional and the scaffold action runs
 * with `projectName="init"`. With this order, `oz-ui create init` routes
 * to the subcommand and `oz-ui create my-dapp` continues to scaffold.
 */
export function registerCreateCommand(program: Command): void {
  const create = program.command('create');
  registerCreateInitCommand(create);
  registerScaffoldAction(create);
}
