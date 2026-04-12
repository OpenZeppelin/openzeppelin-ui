export const MANIFEST_FILENAME = 'migration-manifest.json';
export const CURRENT_SCHEMA_VERSION = '1.0.0';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export type TaskType =
  | 'install-packages'
  | 'wire-providers'
  | 'activate-providers'
  | 'tailwind-normalize'
  | 'component-replacement'
  | 'form-field-replacement'
  | 'schema-driven-form'
  | 'wallet-replacement'
  | 'storage-migration'
  | 'copy-agents'
  | 'copy-skill'
  | 'remove-stale-deps'
  | 'cleanup-scaffolding';

export type MigrationPhase =
  | 'setup'
  | 'ui-components'
  | 'form-fields'
  | 'schema-forms'
  | 'wallet-adapter'
  | 'storage'
  | 'cleanup';

export type MigrationPhaseDetail =
  | 'foundation'
  | 'ui-primitives'
  | 'composite-components'
  | 'form-fields'
  | 'schema-driven-forms'
  | 'wallet-and-adapters'
  | 'storage'
  | 'cleanup';

export interface TaskValidation {
  command: string;
  doctorCheck?: string;
}

export interface MigrationTask {
  id: string;
  phase: MigrationPhase;
  phaseDetail?: MigrationPhaseDetail;
  type: TaskType;
  status: TaskStatus;
  description: string;
  file?: string;
  files?: string[];
  sourceComponent?: string;
  targetComponent?: string;
  capability?: string;
  dependsOn?: string[];
  validation?: TaskValidation;
  notes?: string[];
  manualReview?: boolean;
  error?: string;
  completedAt?: string;
}

export interface PhaseProgress {
  phase: MigrationPhase;
  total: number;
  completed: number;
  failed: number;
  skipped: number;
  pending: number;
  inProgress: number;
}

export interface UserDecision {
  key: string;
  choice: string;
  reason?: string;
}

export interface MigrationManifest {
  schemaVersion: string;
  catalogVersion: string;
  targetOzVersion: string;
  initVersion?: string;
  projectRoot: string;
  framework: 'vite' | 'next' | 'cra' | 'unknown';
  sourceLibrary: string | null;
  profile: 'viewer' | 'transactor' | 'operator' | null;
  scope: {
    directory?: string;
    componentFilter?: string[];
  };
  decisions: UserDecision[];
  phases: MigrationPhase[];
  phaseDescriptions?: Partial<Record<MigrationPhase, string>>;
  tasks: MigrationTask[];
  createdAt: string;
  updatedAt: string;
}
