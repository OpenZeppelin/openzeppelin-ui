import { Command } from 'commander';

import { registerAnalyzeCommand } from './migrate/analyze';
import { registerDoctorCommand } from './migrate/doctor';
import { registerInitCommand } from './migrate/init';
import { registerPlanCommand } from './migrate/plan';
import { registerStatusCommand } from './migrate/status';

export function registerMigrateCommand(program: Command): void {
  const migrate = program
    .command('migrate')
    .description('Migrate an existing React app to the OpenZeppelin UI Kit.');

  registerInitCommand(migrate);
  registerAnalyzeCommand(migrate);
  registerPlanCommand(migrate);
  registerDoctorCommand(migrate);
  registerStatusCommand(migrate);
}
