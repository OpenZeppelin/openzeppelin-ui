import { Command } from 'commander';

import { registerAnalyzeCommand } from './migrate/analyze';
import { registerCompleteCommand } from './migrate/complete';
import { registerDoctorCommand } from './migrate/doctor';
import { registerExecuteCommand } from './migrate/execute';
import { registerFailCommand } from './migrate/fail';
import { registerInitCommand } from './migrate/init';
import { registerPlanCommand } from './migrate/plan';
import { registerStatusCommand } from './migrate/status';

/**
 *
 */
export function registerMigrateCommand(program: Command): void {
  const migrate = program
    .command('migrate')
    .description('Migrate an existing React app to the OpenZeppelin UI Kit.');

  registerInitCommand(migrate);
  registerAnalyzeCommand(migrate);
  registerPlanCommand(migrate);
  registerExecuteCommand(migrate);
  registerCompleteCommand(migrate);
  registerFailCommand(migrate);
  registerDoctorCommand(migrate);
  registerStatusCommand(migrate);
}
