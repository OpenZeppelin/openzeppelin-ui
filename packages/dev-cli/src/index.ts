import { Command } from 'commander';

import { registerDoctorCommand } from './commands/doctor';
import { registerInitCommand } from './commands/init';
import { registerStatusCommand } from './commands/status';
import { registerTailwindCommand } from './commands/tailwind';
import { registerUseCommand } from './commands/use';
import { getCliPackageVersion } from './lib/packageInfo';

const program = new Command();

program
  .name('oz-dev')
  .description('Shared local development tooling for OpenZeppelin consumer apps')
  .version(getCliPackageVersion());

registerInitCommand(program);
registerUseCommand(program);
registerStatusCommand(program);
registerDoctorCommand(program);
registerTailwindCommand(program);

program.parse();
