import { Command } from 'commander';

import { registerAddWalletCommand } from './add/wallet';

/**
 * Registers additive project-management commands.
 */
export function registerAddCommand(program: Command): void {
  const add = program
    .command('add')
    .description('Add OpenZeppelin UI capabilities to an existing project.');

  registerAddWalletCommand(add);
}
