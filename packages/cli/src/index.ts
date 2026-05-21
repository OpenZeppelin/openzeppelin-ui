#!/usr/bin/env node
import { Command } from 'commander';

import { registerMigrateCommand } from './commands/migrate';

import { CLI_VERSION } from './branding';

const program = new Command();

program
  .name('oz-ui')
  .description('OpenZeppelin UI CLI — scaffold, migrate, and manage OZ UI applications.')
  .version(CLI_VERSION);

registerMigrateCommand(program);

program.parse();
