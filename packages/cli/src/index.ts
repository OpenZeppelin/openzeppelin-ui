#!/usr/bin/env node
import { Command } from 'commander';

import { registerMigrateCommand } from './commands/migrate';

const program = new Command();

program
  .name('oz-ui')
  .description('OpenZeppelin UI CLI — scaffold, migrate, and manage OZ UI applications.')
  .version('0.1.0');

registerMigrateCommand(program);

program.parse();
