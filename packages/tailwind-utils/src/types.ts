export type TailwindIssueSeverity = 'error' | 'warning' | 'info';

export interface TailwindDoctorIssue {
  scope: 'tailwind';
  code: string;
  severity: TailwindIssueSeverity;
  message: string;
  file?: string;
  fixable: boolean;
  suggestedCommand?: string;
}

export interface TailwindProjectContext {
  projectRoot: string;
  appRoot: string;
  appPackagePath: string;
  cssPath: string;
  generatedCssPath: string;
  managedImportPath: string;
  dependencies: string[];
  workspacePackages: Record<string, string>;
}

export interface TailwindSourcePlan {
  packages: string[];
  appSources: string[];
  workspaceSources: string[];
  packageSources: string[];
  imports: string[];
  sources: string[];
}

export interface TailwindDoctorResult {
  ok: boolean;
  projectRoot: string;
  appRoot: string | null;
  cssPath: string | null;
  generatedCssPath: string | null;
  sourcePlan: TailwindSourcePlan | null;
  issues: TailwindDoctorIssue[];
}

export interface TailwindFileChange {
  path: string;
  action: 'create' | 'update' | 'noop';
  summary: string;
}

export interface TailwindFixResult {
  ok: boolean;
  projectRoot: string;
  appRoot: string | null;
  cssPath: string | null;
  generatedCssPath: string | null;
  sourcePlan: TailwindSourcePlan | null;
  issuesBefore: TailwindDoctorIssue[];
  changes: TailwindFileChange[];
  changed: boolean;
  wrote: boolean;
}

export interface TailwindPrintResult {
  ok: boolean;
  projectRoot: string;
  appRoot: string | null;
  cssPath: string | null;
  generatedCssPath: string | null;
  sourcePlan: TailwindSourcePlan | null;
}

/**
 * Configurable branding for CLI-specific strings.
 * Each CLI provides its own values so the shared logic stays generic.
 */
export interface TailwindBrandingOptions {
  managedComment: string;
  suggestedFixCommand: string;
}

/**
 * Known OZ package families for Tailwind source resolution.
 * Replaces the hard dependency on dev-cli's STANDARD_FAMILIES.
 */
export interface PackageFamilyMap {
  [familyKey: string]: {
    packageMap: Record<string, string>;
  };
}
