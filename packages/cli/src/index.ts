#!/usr/bin/env node
import { Command } from 'commander';

import { registerCreateCommand } from './commands/create';
import { registerMigrateCommand } from './commands/migrate';

import { CLI_VERSION } from './branding';

const program = new Command();

program
  .name('oz-ui')
  .description('OpenZeppelin UI CLI — scaffold, migrate, and manage OZ UI applications.')
  .version(CLI_VERSION);

registerCreateCommand(program);
registerMigrateCommand(program);

program.parse();
