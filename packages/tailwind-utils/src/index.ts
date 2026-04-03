export type {
  TailwindIssueSeverity,
  TailwindDoctorIssue,
  TailwindProjectContext,
  TailwindSourcePlan,
  TailwindDoctorResult,
  TailwindFileChange,
  TailwindFixResult,
  TailwindPrintResult,
  TailwindBrandingOptions,
  PackageFamilyMap,
} from './types';

export { resolveTailwindProject } from './project';
export { buildTailwindSourcePlan } from './resolver';
export {
  createManagedImportLine,
  createManagedTailwindCss,
  hasManagedImport,
  hasRecognizedInlineSetup,
  normalizeEntryStylesheet,
  readIfExists,
} from './managed';
export { doctorTailwindProject } from './doctor';
export { fixTailwindProject, printTailwindProject } from './fix';
export type { TailwindFixOptions } from './fix';
