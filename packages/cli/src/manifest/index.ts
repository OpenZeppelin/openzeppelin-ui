export {
  MANIFEST_FILENAME,
  CURRENT_SCHEMA_VERSION,
  type TaskStatus,
  type TaskType,
  type MigrationPhase,
  type MigrationTask,
  type PhaseProgress,
  type UserDecision,
  type MigrationManifest,
} from './schema';

export {
  getManifestPath,
  manifestExists,
  readManifest,
  writeManifest,
  updateTaskStatus,
  computePhaseProgress,
  createEmptyManifest,
} from './io';

export { isValidTransition, getValidNextStatuses, assertValidTransition } from './transitions';
