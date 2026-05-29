import { CLI_VERSION } from './branding';

/**
 * Published package versions used by generated projects and additive commands.
 */
export const UI_VERSIONS = {
  cli: CLI_VERSION === '0.0.0' ? 'latest' : `^${CLI_VERSION}`,
  components: '^2.3.1',
  react: '^2.0.1',
  renderer: '^2.0.1',
  styles: '^1.1.0',
  types: '^2.0.0',
  utils: '^2.0.0',
};
