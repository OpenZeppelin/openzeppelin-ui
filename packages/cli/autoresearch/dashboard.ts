/**
 * Autoresearch real-time dashboard server.
 *
 * Route-based layout:
 *   GET /                      -> overview scorecard (all capabilities)
 *   GET /capability/:name      -> detail page for a single capability
 *   GET /api/results/:name     -> results TSV for a capability
 *   GET /api/evaluate/:name    -> live evaluation for a capability
 *   GET /api/capabilities      -> list of all capabilities with latest scores
 *   POST /api/regenerate-frozen/:fixture   -> regenerate planning frozen report
 *   POST /api/regenerate-scaffold/:fixture -> regenerate detection scaffold
 *   POST /api/regenerate-adversarial/:cap  -> regenerate adversarial fixtures
 *   POST /api/fixture                      -> add a new fixture (register + fetch + scaffold)
 *   POST /api/execution-fixture            -> add execution triple (before.tsx, task.json, after.tsx)
 *   DELETE /api/execution-fixture          -> remove execution triple (?relativePath=tier3/foo)
 *   POST /api/verification-fixture         -> add verification scenario (json + project/)
 *   DELETE /api/verification-fixture       -> remove verification scenario (?relativePath=broken/foo)
 *   POST /api/orchestration-fixture        -> add orchestration scenario JSON
 *   DELETE /api/orchestration-fixture      -> remove scenario (?name=slug)
 *   DELETE /api/fixture/:name              -> remove fixture and all its artifacts
 *   GET /api/fixtures/status               -> artifact status for all known fixtures
 *   GET /api/stream            -> SSE (watches all results-*.tsv)
 *
 * Usage:  npx tsx autoresearch/dashboard.ts [--port 4200]
 */

import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { resolveFixturePath } from './capabilities/fixture-resolver.js';
import { analyzeProject } from '../src/analysis/index.js';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 4200;
const EXTERNAL_MANIFEST_PATH = path.join(__dirname, 'fixtures', '_external.json');
const EXECUTION_EXPECTED_DIR = path.join(__dirname, 'expected', 'execution');
const VERIFICATION_EXPECTED_DIR = path.join(__dirname, 'expected', 'verification');
const ORCHESTRATION_EXPECTED_DIR = path.join(__dirname, 'expected', 'orchestration');
const ORCHESTRATION_SKILL_PATH = path.resolve(
  __dirname,
  '..',
  'src',
  'templates',
  'skills',
  'migrate-to-oz-uikit',
  'SKILL.md'
);

function isOrchestrationScenarioSlug(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(slug);
}

function resolveOrchestrationScenarioJsonPath(slug: string): string | null {
  if (!isOrchestrationScenarioSlug(slug)) return null;
  const jsonPath = path.join(ORCHESTRATION_EXPECTED_DIR, `${slug}.json`);
  const base = path.resolve(ORCHESTRATION_EXPECTED_DIR);
  const resolved = path.resolve(jsonPath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return jsonPath;
}

function loadExternalRepoByName(): Record<string, string> {
  try {
    const raw = JSON.parse(fs.readFileSync(EXTERNAL_MANIFEST_PATH, 'utf8')) as {
      fixtures?: { name: string; repo: string }[];
    };
    const out: Record<string, string> = {};
    for (const f of raw.fixtures ?? []) {
      if (f?.name && f?.repo) out[f.name] = f.repo;
    }
    return out;
  } catch {
    return {};
  }
}

/** Relative Tailwind entry CSS from fixtures/_external.json (required for multi-package monorepo fixtures). */
function loadExternalTailwindCssByFixture(fixtureName: string): string | undefined {
  try {
    const raw = JSON.parse(fs.readFileSync(EXTERNAL_MANIFEST_PATH, 'utf8')) as {
      fixtures?: { name: string; tailwindCssPath?: string }[];
    };
    const p = (raw.fixtures ?? []).find((f) => f?.name === fixtureName)?.tailwindCssPath?.trim();
    return p || undefined;
  } catch {
    return undefined;
  }
}

const EXPECTED_INIT_DIR = path.join(__dirname, 'expected', 'init');

/**
 * Directory under expected/init/<name>/ used as the init benchmark input (mirrors init.ts discovery).
 * Prefer the bundle folder when present; otherwise the resolved projectDir from the spec JSON.
 */
function resolveInitFixtureLocalPath(fixtureName: string): string | null {
  const specPath = path.join(EXPECTED_INIT_DIR, `${fixtureName}.json`);
  if (!fs.existsSync(specPath)) return null;
  try {
    const raw = fs.readFileSync(specPath, 'utf8');
    const data = JSON.parse(raw) as { projectDir?: string };
    const bundleDir = path.join(EXPECTED_INIT_DIR, fixtureName);
    if (fs.existsSync(bundleDir) && fs.statSync(bundleDir).isDirectory()) {
      return bundleDir;
    }
    const projectDir = data.projectDir
      ? path.resolve(EXPECTED_INIT_DIR, data.projectDir)
      : path.join(EXPECTED_INIT_DIR, fixtureName, 'project');
    if (fs.existsSync(projectDir)) return projectDir;
    return EXPECTED_INIT_DIR;
  } catch {
    return EXPECTED_INIT_DIR;
  }
}

type EvalApiPayload = {
  capability: string;
  fixtures: Array<Record<string, unknown>>;
  meanF1: number;
  error?: string;
};

function enrichEvaluationForDashboard(payload: EvalApiPayload): EvalApiPayload {
  if (payload.error || !Array.isArray(payload.fixtures)) return payload;
  const repos = loadExternalRepoByName();
  const isInit = payload.capability === 'init';
  const isExecution = payload.capability === 'execution';
  const isVerification = payload.capability === 'verification';
  const isOrchestration = payload.capability === 'orchestration';
  const isRuntime = payload.capability === 'runtime';
  return {
    ...payload,
    fixtures: payload.fixtures.map((fx) => {
      const name = typeof fx.fixture === 'string' ? fx.fixture : '';
      let resolved: string | null = null;
      if (isInit) {
        resolved = resolveInitFixtureLocalPath(name);
      }
      if (!resolved) {
        resolved = resolveFixturePath(name);
      }
      if (isExecution && !resolved) {
        const execDir = path.join(EXECUTION_EXPECTED_DIR, ...name.split('/'));
        if (fs.existsSync(execDir)) resolved = execDir;
      }
      if (isVerification && !resolved) {
        const vPath = resolveVerificationJsonPath(name);
        if (vPath && fs.existsSync(vPath)) resolved = vPath;
      }
      if (isOrchestration && !resolved) {
        if (name === 'skill-checklist' && fs.existsSync(ORCHESTRATION_SKILL_PATH)) {
          resolved = ORCHESTRATION_SKILL_PATH;
        } else {
          const oPath = resolveOrchestrationScenarioJsonPath(name);
          if (oPath && fs.existsSync(oPath)) resolved = oPath;
        }
      }
      if (isRuntime && !resolved) {
        const rPath = path.join(__dirname, 'expected', 'runtime', `${name}.json`);
        if (fs.existsSync(rPath)) resolved = rPath;
      }
      return {
        ...fx,
        repoUrl: repos[name] ?? null,
        localPath: resolved ?? null,
      };
    }),
  };
}

const CAPABILITY_NAMES = [
  'detection',
  'patterns',
  'planning',
  'init',
  'execution',
  'verification',
  'orchestration',
  'runtime',
] as const;

interface ResultRow {
  experiment: number;
  status: string;
  meanF1: number;
  adversarialF1: number | null;
  why: string | null;
  description: string;
}

/**
 * Parses results TSV which may be in two formats:
 *   Default (4 cols): experiment \t status \t score \t description
 *   Detection (6 cols): experiment \t status \t mean_f1 \t adversarial_f1 \t why \t description
 *
 * Auto-detects by checking if column 4 parses as a number (adversarial_f1).
 */
function parseResults(capability: string): ResultRow[] {
  const resultsPath = path.join(__dirname, `results-${capability}.tsv`);
  if (!fs.existsSync(resultsPath)) return [];

  const content = fs.readFileSync(resultsPath, 'utf8').trim();
  if (!content) return [];

  const lines = content.split('\n');
  const rows: ResultRow[] = [];
  for (const line of lines) {
    const cols = line.split('\t');
    const experiment = parseInt(cols[0], 10);
    const status = cols[1] ?? '';
    const meanF1 = parseFloat(cols[2]);
    if (Number.isNaN(experiment) || Number.isNaN(meanF1)) continue;

    // Detect 6-column format: col[3] is adversarial_f1 (number or "n/a")
    const col3 = cols[3] ?? '';
    const col3AsNum = parseFloat(col3);
    const isSixCol = cols.length >= 6 && (!Number.isNaN(col3AsNum) || col3 === 'n/a');

    if (isSixCol) {
      rows.push({
        experiment,
        status,
        meanF1,
        adversarialF1: col3 === 'n/a' ? null : (Number.isNaN(col3AsNum) ? null : col3AsNum),
        why: cols[4] ?? null,
        description: cols.slice(5).join('\t'),
      });
    } else {
      rows.push({
        experiment,
        status,
        meanF1,
        adversarialF1: null,
        why: null,
        description: cols.slice(3).join('\t'),
      });
    }
  }
  return rows;
}

async function runLiveEvaluation(
  capability: string
): Promise<{ capability: string; fixtures: unknown[]; meanF1: number; error?: string }> {
  const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
  const evalScript = path.join(__dirname, 'evaluate.ts');
  const timeout = capability === 'runtime' ? 300_000 : 60_000;

  try {
    const { stdout } = await execFileAsync(
      tsxBin,
      [evalScript, '--capability', capability, '--json'],
      { cwd: path.join(__dirname, '..'), timeout }
    );
    const parsed = JSON.parse(stdout.trim()) as EvalApiPayload;
    return { capability, ...parsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { capability, fixtures: [], meanF1: 0, error: message };
  }
}

const FROZEN_REPORTS_DIR = path.join(__dirname, 'expected', 'planning', 'frozen-reports');

async function regenerateFrozenReport(
  fixtureName: string
): Promise<{ ok: boolean; outputPath: string; error?: string }> {
  const fixturePath = resolveFixturePath(fixtureName);
  if (!fixturePath) {
    return { ok: false, outputPath: '', error: `Fixture "${fixtureName}" could not be resolved on disk.` };
  }

  const outputPath = path.join(FROZEN_REPORTS_DIR, `${fixtureName}.json`);

  try {
    fs.mkdirSync(FROZEN_REPORTS_DIR, { recursive: true });
    const twCss = loadExternalTailwindCssByFixture(fixtureName);
    const report = analyzeProject(fixturePath, undefined, twCss);
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
    return { ok: true, outputPath };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, outputPath, error: message };
  }
}

async function regenerateScaffold(
  fixtureName: string
): Promise<{ ok: boolean; outputPath: string; error?: string }> {
  const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
  const scaffoldScript = path.join(__dirname, 'scaffold-expected.ts');
  const outputPath = path.join(__dirname, 'expected', `${fixtureName}.scaffold.json`);

  try {
    await execFileAsync(tsxBin, [scaffoldScript, fixtureName], {
      cwd: path.join(__dirname, '..'),
      timeout: 120_000,
    });
    return { ok: true, outputPath };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, outputPath, error: message };
  }
}

const ADVERSARIAL_SCRIPTS: Record<string, string> = {
  detection: 'generate-adversarial-fixture.ts',
  execution: 'generate-adversarial-execution.ts',
  verification: 'generate-adversarial-verification.ts',
};

async function regenerateAdversarial(
  capability: string
): Promise<{ ok: boolean; error?: string }> {
  const script = ADVERSARIAL_SCRIPTS[capability];
  if (!script) {
    return { ok: false, error: `No adversarial generator for capability "${capability}".` };
  }

  const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
  const scriptPath = path.join(__dirname, script);

  try {
    await execFileAsync(tsxBin, [scriptPath], {
      cwd: path.join(__dirname, '..'),
      timeout: 120_000,
    });
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message };
  }
}

interface RemovalResult {
  ok: boolean;
  removed: string[];
  edited: string[];
  errors: string[];
}

function removeFixture(fixtureName: string): RemovalResult {
  const removed: string[] = [];
  const edited: string[] = [];
  const errors: string[] = [];

  const deleteIfExists = (filePath: string) => {
    try {
      if (fs.existsSync(filePath)) {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          fs.rmSync(filePath, { recursive: true, force: true });
        } else {
          fs.unlinkSync(filePath);
        }
        removed.push(path.relative(__dirname, filePath));
      }
    } catch (err: unknown) {
      errors.push(`${path.relative(__dirname, filePath)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  deleteIfExists(path.join(__dirname, 'fixtures', fixtureName));
  deleteIfExists(path.join(__dirname, 'resolved-fixtures', fixtureName));
  deleteIfExists(path.join(__dirname, 'expected', `${fixtureName}.json`));
  deleteIfExists(path.join(__dirname, 'expected', `${fixtureName}.scaffold.json`));
  deleteIfExists(path.join(__dirname, 'expected', 'planning', `${fixtureName}.json`));
  deleteIfExists(path.join(__dirname, 'expected', 'planning', 'frozen-reports', `${fixtureName}.json`));
  deleteIfExists(path.join(__dirname, 'expected', 'patterns', `${fixtureName}.json`));
  deleteIfExists(path.join(EXPECTED_INIT_DIR, `${fixtureName}.json`));
  deleteIfExists(path.join(EXPECTED_INIT_DIR, fixtureName));

  const removeFromJsonArray = (filePath: string, key: string) => {
    try {
      if (!fs.existsSync(filePath)) return;
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const arr = raw[key];
      if (!Array.isArray(arr)) return;
      const before = arr.length;
      raw[key] = arr.filter((entry: { name?: string }) => entry?.name !== fixtureName);
      if (raw[key].length < before) {
        fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n');
        edited.push(path.relative(__dirname, filePath));
      }
    } catch (err: unknown) {
      errors.push(`${path.relative(__dirname, filePath)}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  removeFromJsonArray(path.join(__dirname, 'fixtures', '_external.json'), 'fixtures');
  removeFromJsonArray(path.join(__dirname, 'config', 'detection-fixtures.json'), 'fixtures');
  removeFromJsonArray(path.join(__dirname, 'config', 'pattern-fixtures.json'), 'fixtures');

  const gitignorePath = path.join(__dirname, 'fixtures', '.gitignore');
  try {
    if (fs.existsSync(gitignorePath)) {
      const lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
      const filtered = lines.filter(
        (l) => l.trim() !== fixtureName && l.trim() !== `${fixtureName}/`
      );
      if (filtered.length < lines.length) {
        fs.writeFileSync(gitignorePath, filtered.join('\n'));
        edited.push(path.relative(__dirname, gitignorePath));
      }
    }
  } catch (err: unknown) {
    errors.push(`fixtures/.gitignore: ${err instanceof Error ? err.message : String(err)}`);
  }

  return { ok: errors.length === 0, removed, edited, errors };
}

/** Safe multi-segment path under expected/{execution|verification}/ (lowercase slug segments). */
function normalizeExpectedRelativePath(input: string): string | null {
  const s = input.trim().replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (!s || s.includes('..')) return null;
  const segments = s.split('/').filter(Boolean);
  if (segments.length === 0 || segments.length > 12) return null;
  for (const seg of segments) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(seg)) return null;
  }
  return segments.join('/');
}

function resolveVerificationJsonPath(normalizedRel: string): string | null {
  const normalized = normalizeExpectedRelativePath(normalizedRel);
  if (!normalized) return null;
  const parts = normalized.split('/');
  const jsonPath = path.join(VERIFICATION_EXPECTED_DIR, ...parts.slice(0, -1), `${parts[parts.length - 1]}.json`);
  const base = path.resolve(VERIFICATION_EXPECTED_DIR);
  const resolved = path.resolve(jsonPath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) return null;
  return jsonPath;
}

function resolveExecutionFixtureDir(rel: string): string | null {
  const normalized = normalizeExpectedRelativePath(rel);
  if (!normalized) return null;
  const full = path.resolve(EXECUTION_EXPECTED_DIR, ...normalized.split('/'));
  const base = path.resolve(EXECUTION_EXPECTED_DIR);
  if (full === base || !full.startsWith(base + path.sep)) return null;
  return full;
}

function isPlainObject(o: unknown): o is Record<string, unknown> {
  return typeof o === 'object' && o !== null && !Array.isArray(o);
}

function validateExecutionTask(task: unknown): string | null {
  if (!isPlainObject(task)) return 'task must be a JSON object';
  const need = ['id', 'phase', 'type', 'status', 'description'] as const;
  for (const k of need) {
    const v = task[k];
    if (typeof v !== 'string' || !v.trim()) return `task.${k} must be a non-empty string`;
  }
  return null;
}

function isExecutionTripleDir(dir: string): boolean {
  return (
    fs.existsSync(path.join(dir, 'before.tsx')) &&
    fs.existsSync(path.join(dir, 'task.json')) &&
    fs.existsSync(path.join(dir, 'after.tsx'))
  );
}

interface AddExecutionFixtureRequest {
  relativePath: string;
  before: string;
  task: unknown;
  after: string;
}

function addExecutionFixture(body: AddExecutionFixtureRequest): AddFixtureResult {
  const steps: string[] = [];
  const errors: string[] = [];
  if (typeof body.relativePath !== 'string' || !body.relativePath.trim()) {
    return { ok: false, steps, errors: ['relativePath is required'] };
  }
  if (typeof body.before !== 'string' || typeof body.after !== 'string') {
    return { ok: false, steps, errors: ['before and after must be strings'] };
  }
  const dir = resolveExecutionFixtureDir(body.relativePath);
  if (!dir) {
    return {
      ok: false,
      steps,
      errors: ['Invalid relative path — use lowercase path segments (e.g. tier3/my-case), no ..'],
    };
  }
  if (fs.existsSync(dir)) {
    return {
      ok: false,
      steps,
      errors: [`Execution fixture already exists: ${path.relative(__dirname, dir)}`],
    };
  }
  const taskErr = validateExecutionTask(body.task);
  if (taskErr) return { ok: false, steps, errors: [taskErr] };

  try {
    fs.mkdirSync(dir, { recursive: true });
    const taskJson = JSON.stringify(body.task, null, 2) + '\n';
    fs.writeFileSync(path.join(dir, 'before.tsx'), body.before, 'utf8');
    fs.writeFileSync(path.join(dir, 'task.json'), taskJson, 'utf8');
    fs.writeFileSync(path.join(dir, 'after.tsx'), body.after, 'utf8');
    steps.push(`Created ${path.relative(__dirname, dir)} with before.tsx, task.json, after.tsx`);
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
    try {
      if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  return { ok: errors.length === 0, steps, errors };
}

function removeExecutionFixture(relativePath: string): RemovalResult {
  const removed: string[] = [];
  const errors: string[] = [];
  const dir = resolveExecutionFixtureDir(relativePath);
  if (!dir) {
    return { ok: false, removed, edited: [], errors: ['Invalid execution fixture path'] };
  }
  if (!fs.existsSync(dir)) {
    return { ok: false, removed, edited: [], errors: ['Execution fixture directory not found'] };
  }
  if (!isExecutionTripleDir(dir)) {
    return {
      ok: false,
      removed,
      edited: [],
      errors: ['Refusing to remove: directory is not a single execution triple (before.tsx, task.json, after.tsx)'],
    };
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    removed.push(path.relative(__dirname, dir));
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  return { ok: errors.length === 0, removed, edited: [], errors };
}

interface AddVerificationFixtureRequest {
  relativePath: string;
  fixture: string;
  expectedStatus: 'pass' | 'fail';
  diagnosticKeywords: string[];
  task: unknown;
  appSource: string;
  packageJson?: string;
}

const DEFAULT_VERIFICATION_PACKAGE = {
  name: 'verification-fixture',
  private: true,
  dependencies: { react: '^19.0.0' },
};

function addVerificationFixture(body: AddVerificationFixtureRequest): AddFixtureResult {
  const steps: string[] = [];
  const errors: string[] = [];
  if (typeof body.relativePath !== 'string' || !body.relativePath.trim()) {
    return { ok: false, steps, errors: ['relativePath is required'] };
  }
  if (typeof body.fixture !== 'string' || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(body.fixture)) {
    return { ok: false, steps, errors: ['fixture must be a lowercase slug (e.g. my-scenario)'] };
  }
  if (body.expectedStatus !== 'pass' && body.expectedStatus !== 'fail') {
    return { ok: false, steps, errors: ['expectedStatus must be pass or fail'] };
  }
  if (typeof body.appSource !== 'string') {
    return { ok: false, steps, errors: ['appSource must be a string (contents of src/App.tsx)'] };
  }
  const normalized = normalizeExpectedRelativePath(body.relativePath);
  if (!normalized) {
    return {
      ok: false,
      steps,
      errors: ['Invalid relative path — use lowercase segments (e.g. broken/my-case), no ..'],
    };
  }
  const jsonPath = resolveVerificationJsonPath(normalized);
  if (!jsonPath) {
    return { ok: false, steps, errors: ['Invalid verification fixture path'] };
  }
  if (fs.existsSync(jsonPath)) {
    return {
      ok: false,
      steps,
      errors: [`Verification fixture already exists: ${path.relative(__dirname, jsonPath)}`],
    };
  }
  const taskErr = validateExecutionTask(body.task);
  if (taskErr) return { ok: false, steps, errors: [taskErr] };

  let pkg: Record<string, unknown> = { ...DEFAULT_VERIFICATION_PACKAGE };
  if (body.packageJson != null && String(body.packageJson).trim()) {
    try {
      const parsed = JSON.parse(String(body.packageJson)) as unknown;
      if (!isPlainObject(parsed)) {
        return { ok: false, steps, errors: ['packageJson must be a JSON object'] };
      }
      pkg = parsed;
    } catch {
      return { ok: false, steps, errors: ['packageJson must be valid JSON'] };
    }
  }

  const keywords = Array.isArray(body.diagnosticKeywords)
    ? body.diagnosticKeywords.filter((k) => typeof k === 'string' && k.trim())
    : [];

  const projectDirRel = `${normalized}/project`;
  const projectRoot = path.join(VERIFICATION_EXPECTED_DIR, ...normalized.split('/'), 'project');
  const spec = {
    fixture: body.fixture,
    expectedStatus: body.expectedStatus,
    diagnosticKeywords: keywords,
    task: body.task,
    projectDir: projectDirRel,
  };

  try {
    fs.mkdirSync(path.join(projectRoot, 'src'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'src', 'App.tsx'), body.appSource, 'utf8');
    fs.writeFileSync(path.join(projectRoot, 'package.json'), JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
    steps.push(`Created ${path.relative(__dirname, jsonPath)}`);
    steps.push(`Created ${path.relative(__dirname, projectRoot)}/`);
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
    try {
      if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
      const parent = path.join(VERIFICATION_EXPECTED_DIR, ...normalized.split('/'));
      if (fs.existsSync(parent)) fs.rmSync(parent, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  return { ok: errors.length === 0, steps, errors };
}

function removeVerificationFixture(relativePath: string): RemovalResult {
  const removed: string[] = [];
  const errors: string[] = [];
  const jsonPath = resolveVerificationJsonPath(relativePath);
  if (!jsonPath) {
    return { ok: false, removed, edited: [], errors: ['Invalid verification fixture path'] };
  }
  if (!fs.existsSync(jsonPath)) {
    return { ok: false, removed, edited: [], errors: ['Verification expectation JSON not found'] };
  }

  const base = path.resolve(VERIFICATION_EXPECTED_DIR);
  let projectAbs: string | null = null;
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as { projectDir?: string };
    if (typeof raw.projectDir === 'string' && raw.projectDir.trim()) {
      const candidate = path.resolve(VERIFICATION_EXPECTED_DIR, raw.projectDir);
      if (candidate.startsWith(base + path.sep) || candidate === base) {
        projectAbs = candidate;
      }
    }
  } catch {
    /* fall through */
  }

  try {
    fs.unlinkSync(jsonPath);
    removed.push(path.relative(__dirname, jsonPath));
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { ok: false, removed, edited: [], errors };
  }

  if (projectAbs && fs.existsSync(projectAbs)) {
    try {
      fs.rmSync(projectAbs, { recursive: true, force: true });
      removed.push(path.relative(__dirname, projectAbs));
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { ok: errors.length === 0, removed, edited: [], errors };
}

const RESERVED_ORCHESTRATION_SCENARIO = 'skill-checklist';

interface AddOrchestrationFixtureRequest {
  name: string;
  description: string;
  expectedCommands: string[];
  expectedGates: string[];
}

function addOrchestrationFixture(body: AddOrchestrationFixtureRequest): AddFixtureResult {
  const steps: string[] = [];
  const errors: string[] = [];
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || !isOrchestrationScenarioSlug(name)) {
    return { ok: false, steps, errors: ['name must be a lowercase slug (e.g. my-scenario)'] };
  }
  if (name === RESERVED_ORCHESTRATION_SCENARIO) {
    return { ok: false, steps, errors: [`"${RESERVED_ORCHESTRATION_SCENARIO}" is reserved for the SKILL.md checklist`] };
  }
  if (typeof body.description !== 'string' || !body.description.trim()) {
    return { ok: false, steps, errors: ['description is required'] };
  }
  const cmds = Array.isArray(body.expectedCommands)
    ? body.expectedCommands.filter((c) => typeof c === 'string' && c.trim())
    : [];
  const gates = Array.isArray(body.expectedGates)
    ? body.expectedGates.filter((g) => typeof g === 'string' && g.trim())
    : [];
  if (cmds.length === 0) {
    return { ok: false, steps, errors: ['expectedCommands must be a non-empty array of strings'] };
  }
  if (gates.length === 0) {
    return { ok: false, steps, errors: ['expectedGates must be a non-empty array of strings'] };
  }

  const jsonPath = resolveOrchestrationScenarioJsonPath(name);
  if (!jsonPath) {
    return { ok: false, steps, errors: ['Invalid orchestration scenario name'] };
  }
  if (fs.existsSync(jsonPath)) {
    return {
      ok: false,
      steps,
      errors: [`Scenario already exists: ${path.relative(__dirname, jsonPath)}`],
    };
  }

  const spec = {
    name,
    description: body.description.trim(),
    expectedCommands: cmds.map((c) => c.trim()),
    expectedGates: gates.map((g) => g.trim()),
  };

  try {
    fs.mkdirSync(ORCHESTRATION_EXPECTED_DIR, { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify(spec, null, 2) + '\n', 'utf8');
    steps.push(`Created ${path.relative(__dirname, jsonPath)}`);
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  return { ok: errors.length === 0, steps, errors };
}

function removeOrchestrationScenario(slug: string): RemovalResult {
  const removed: string[] = [];
  const errors: string[] = [];
  const trimmed = slug.trim();
  if (trimmed === RESERVED_ORCHESTRATION_SCENARIO) {
    return {
      ok: false,
      removed,
      edited: [],
      errors: ['Cannot remove the synthetic skill-checklist row — it is not a JSON scenario file'],
    };
  }
  const jsonPath = resolveOrchestrationScenarioJsonPath(trimmed);
  if (!jsonPath) {
    return { ok: false, removed, edited: [], errors: ['Invalid orchestration scenario name'] };
  }
  if (!fs.existsSync(jsonPath)) {
    return { ok: false, removed, edited: [], errors: ['Orchestration scenario JSON not found'] };
  }
  try {
    fs.unlinkSync(jsonPath);
    removed.push(path.relative(__dirname, jsonPath));
  } catch (err: unknown) {
    errors.push(err instanceof Error ? err.message : String(err));
  }
  return { ok: errors.length === 0, removed, edited: [], errors };
}

interface AddFixtureRequest {
  name: string;
  type: 'external' | 'synthetic';
  repo?: string;
  commit?: string;
  siblingRepo?: string;
  subPath?: string;
  sparsePaths?: string[];
  tailwindCssPath?: string;
  description?: string;
}

interface AddFixtureResult {
  ok: boolean;
  steps: string[];
  errors: string[];
}

async function addFixture(body: AddFixtureRequest): Promise<AddFixtureResult> {
  const steps: string[] = [];
  const errors: string[] = [];
  const name = body.name;

  if (!name || !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name)) {
    return { ok: false, steps, errors: ['Invalid fixture name — use lowercase slugs (e.g. my-app).'] };
  }

  const fixturesDir = path.join(__dirname, 'fixtures');
  const configDir = path.join(__dirname, 'config');

  if (body.type === 'external') {
    if (!body.repo) {
      return { ok: false, steps, errors: ['Git repository URL is required for external fixtures.'] };
    }

    try {
      const manifestPath = path.join(fixturesDir, '_external.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (!Array.isArray(manifest.fixtures)) manifest.fixtures = [];
      if (manifest.fixtures.some((f: { name?: string }) => f?.name === name)) {
        return { ok: false, steps, errors: [`Fixture "${name}" already exists in _external.json.`] };
      }
      const entry: Record<string, unknown> = {
        name,
        repo: body.repo,
        commit: body.commit || 'HEAD',
        siblingRepo: body.siblingRepo || name,
      };
      if (body.subPath) entry.subPath = body.subPath;
      if (body.sparsePaths?.length) entry.sparsePaths = body.sparsePaths;
      if (body.tailwindCssPath) entry.tailwindCssPath = body.tailwindCssPath;
      if (body.description) entry.description = body.description;
      manifest.fixtures.push(entry);
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      steps.push('Added entry to fixtures/_external.json');
    } catch (err: unknown) {
      errors.push(`_external.json: ${err instanceof Error ? err.message : String(err)}`);
    }

    const gitignorePath = path.join(fixturesDir, '.gitignore');
    try {
      const content = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf8') : '';
      const lines = content.split('\n').map((l) => l.trim());
      if (!lines.includes(name) && !lines.includes(`${name}/`)) {
        fs.appendFileSync(gitignorePath, `${name}/\n`);
        steps.push('Added to fixtures/.gitignore');
      }
    } catch (err: unknown) {
      errors.push(`.gitignore: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    const syntheticDir = path.join(fixturesDir, name);
    if (fs.existsSync(syntheticDir)) {
      return { ok: false, steps, errors: [`Directory fixtures/${name}/ already exists.`] };
    }
    const srcDir = path.join(syntheticDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(syntheticDir, 'package.json'),
      JSON.stringify({ name, private: true, dependencies: {} }, null, 2) + '\n'
    );
    fs.writeFileSync(path.join(srcDir, 'App.tsx'), 'export default function App() { return <div>TODO</div>; }\n');
    steps.push(`Created fixtures/${name}/ with minimal structure`);
  }

  const addToConfigIfMissing = (filePath: string, label: string) => {
    try {
      if (!fs.existsSync(filePath)) return;
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!Array.isArray(raw.fixtures)) return;
      if (raw.fixtures.some((f: { name?: string }) => f?.name === name)) return;
      raw.fixtures.push({ name, split: 'train', tags: [] });
      fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n');
      steps.push(`Added default entry to ${label}`);
    } catch (err: unknown) {
      errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  addToConfigIfMissing(path.join(configDir, 'detection-fixtures.json'), 'config/detection-fixtures.json');
  addToConfigIfMissing(path.join(configDir, 'pattern-fixtures.json'), 'config/pattern-fixtures.json');

  if (body.type === 'external') {
    try {
      const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
      const fetchScript = path.join(__dirname, 'fetch-fixtures.ts');
      await execFileAsync(tsxBin, [fetchScript], {
        cwd: path.join(__dirname, '..'),
        timeout: 120_000,
      });
      steps.push('Ran fetch-fixtures.ts to resolve source');
    } catch (err: unknown) {
      errors.push(`fetch-fixtures: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const fixturePath = resolveFixturePath(name);
  if (fixturePath) {
    try {
      const twCss =
        body.type === 'external' && body.tailwindCssPath?.trim()
          ? body.tailwindCssPath.trim()
          : loadExternalTailwindCssByFixture(name);
      const report = analyzeProject(fixturePath, undefined, twCss);
      fs.mkdirSync(FROZEN_REPORTS_DIR, { recursive: true });
      fs.writeFileSync(
        path.join(FROZEN_REPORTS_DIR, `${name}.json`),
        JSON.stringify(report, null, 2) + '\n'
      );
      steps.push('Generated planning frozen report');
    } catch (err: unknown) {
      errors.push(`frozen report: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
      const scaffoldScript = path.join(__dirname, 'scaffold-expected.ts');
      await execFileAsync(tsxBin, [scaffoldScript, name], {
        cwd: path.join(__dirname, '..'),
        timeout: 120_000,
      });
      steps.push('Generated detection scaffold');
    } catch (err: unknown) {
      errors.push(`scaffold: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { ok: errors.length === 0, steps, errors };
}

interface FixtureArtifacts {
  fixture: string;
  source: boolean;
  detection: boolean;
  detectionScaffold: boolean;
  patterns: boolean;
  planningExpected: boolean;
  planningFrozen: boolean;
  runtime: boolean;
}

function getFixtureArtifacts(fixtureName: string): FixtureArtifacts {
  const e = (rel: string) => fs.existsSync(path.join(__dirname, rel));
  return {
    fixture: fixtureName,
    source: !!resolveFixturePath(fixtureName),
    detection: e(`expected/${fixtureName}.json`),
    detectionScaffold: e(`expected/${fixtureName}.scaffold.json`),
    patterns: e(`expected/patterns/${fixtureName}.json`),
    planningExpected: e(`expected/planning/${fixtureName}.json`),
    planningFrozen: e(`expected/planning/frozen-reports/${fixtureName}.json`),
    runtime: e(`expected/runtime/${fixtureName}.json`),
  };
}

function getAllFixtureNames(): string[] {
  const names = new Set<string>();

  const fixturesDir = path.join(__dirname, 'fixtures');
  if (fs.existsSync(fixturesDir)) {
    for (const entry of fs.readdirSync(fixturesDir, { withFileTypes: true })) {
      if ((entry.isDirectory() || entry.isSymbolicLink()) && !entry.name.startsWith('_')) {
        names.add(entry.name);
      }
    }
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(EXTERNAL_MANIFEST_PATH, 'utf8'));
    for (const f of manifest.fixtures ?? []) {
      if (f?.name) names.add(f.name);
    }
  } catch { /* ignore */ }

  return [...names].sort();
}

function getResultsMtime(capability?: string): number {
  if (capability) {
    const p = path.join(__dirname, `results-${capability}.tsv`);
    return fs.existsSync(p) ? fs.statSync(p).mtimeMs : 0;
  }
  let latest = 0;
  for (const cap of CAPABILITY_NAMES) {
    const p = path.join(__dirname, `results-${cap}.tsv`);
    if (fs.existsSync(p)) {
      latest = Math.max(latest, fs.statSync(p).mtimeMs);
    }
  }
  return latest;
}

function serveHtml(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const htmlPath = path.join(__dirname, 'dashboard.html');
  const html = fs.readFileSync(htmlPath, 'utf8');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveJson(res: http.ServerResponse, data: unknown): void {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

const sseClients = new Set<http.ServerResponse>();

function serveSSE(_req: http.IncomingMessage, res: http.ServerResponse): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });
  res.write('data: connected\n\n');
  sseClients.add(res);
  res.on('close', () => sseClients.delete(res));
}

function broadcastUpdate(): void {
  for (const client of sseClients) {
    client.write('data: update\n\n');
  }
}

function startFileWatcher(): void {
  let lastMtime = getResultsMtime();

  setInterval(() => {
    const currentMtime = getResultsMtime();
    if (currentMtime !== lastMtime) {
      lastMtime = currentMtime;
      broadcastUpdate();
    }
  }, 1000);

  fs.watch(__dirname, (_, filename) => {
    if (filename && filename.startsWith('results-') && filename.endsWith('.tsv')) {
      broadcastUpdate();
    }
  });
}

function main(): void {
  const portArg = process.argv.indexOf('--port');
  const port = portArg >= 0 ? parseInt(process.argv[portArg + 1], 10) : DEFAULT_PORT;

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    const segments = url.pathname.split('/').filter(Boolean);

    if (url.pathname === '/' || (segments[0] === 'capability' && segments[1])) {
      serveHtml(req, res);
      return;
    }

    if (segments[0] === 'api') {
      if (segments[1] === 'stream') {
        serveSSE(req, res);
        return;
      }

      if (segments[1] === 'capabilities') {
        const summary = CAPABILITY_NAMES.map((cap) => {
          const rows = parseResults(cap);
          const lastKeep = [...rows].reverse().find((r) => r.status === 'keep');
          return {
            name: cap,
            experiments: rows.length,
            lastF1: lastKeep?.meanF1 ?? null,
            hasResults: rows.length > 0,
          };
        });
        serveJson(res, { capabilities: summary });
        return;
      }

      if (segments[1] === 'results' && segments[2]) {
        const cap = segments[2];
        serveJson(res, { rows: parseResults(cap), mtime: getResultsMtime(cap) });
        return;
      }

      if (segments[1] === 'evaluate' && segments[2]) {
        const cap = segments[2];
        const evalResult = await runLiveEvaluation(cap);
        serveJson(res, enrichEvaluationForDashboard(evalResult));
        return;
      }

      if (segments[1] === 'regenerate-frozen' && segments[2] && req.method === 'POST') {
        const fixture = segments[2];
        const result = await regenerateFrozenReport(fixture);
        serveJson(res, result);
        return;
      }

      if (segments[1] === 'regenerate-scaffold' && segments[2] && req.method === 'POST') {
        const fixture = segments[2];
        const result = await regenerateScaffold(fixture);
        serveJson(res, result);
        return;
      }

      if (segments[1] === 'regenerate-adversarial' && segments[2] && req.method === 'POST') {
        const cap = segments[2];
        const result = await regenerateAdversarial(cap);
        serveJson(res, result);
        return;
      }

      if (segments[1] === 'fixture' && segments[2] && req.method === 'DELETE') {
        const fixture = segments[2];
        const result = removeFixture(fixture);
        serveJson(res, result);
        return;
      }

      if (segments[1] === 'fixture' && !segments[2] && req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as AddFixtureRequest;
          const result = await addFixture(body);
          serveJson(res, result);
        } catch (err: unknown) {
          serveJson(res, { ok: false, steps: [], errors: [`Bad request: ${err instanceof Error ? err.message : String(err)}`] });
        }
        return;
      }

      if (segments[1] === 'execution-fixture' && !segments[2] && req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as AddExecutionFixtureRequest;
          const result = addExecutionFixture(body);
          serveJson(res, result);
        } catch (err: unknown) {
          serveJson(res, { ok: false, steps: [], errors: [`Bad request: ${err instanceof Error ? err.message : String(err)}`] });
        }
        return;
      }

      if (segments[1] === 'execution-fixture' && !segments[2] && req.method === 'DELETE') {
        const rel = url.searchParams.get('relativePath')?.trim() ?? '';
        const result = removeExecutionFixture(rel);
        serveJson(res, result);
        return;
      }

      if (segments[1] === 'verification-fixture' && !segments[2] && req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as AddVerificationFixtureRequest;
          const result = addVerificationFixture(body);
          serveJson(res, result);
        } catch (err: unknown) {
          serveJson(res, { ok: false, steps: [], errors: [`Bad request: ${err instanceof Error ? err.message : String(err)}`] });
        }
        return;
      }

      if (segments[1] === 'verification-fixture' && !segments[2] && req.method === 'DELETE') {
        const rel = url.searchParams.get('relativePath')?.trim() ?? '';
        const result = removeVerificationFixture(rel);
        serveJson(res, result);
        return;
      }

      if (segments[1] === 'orchestration-fixture' && !segments[2] && req.method === 'POST') {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as AddOrchestrationFixtureRequest;
          const result = addOrchestrationFixture(body);
          serveJson(res, result);
        } catch (err: unknown) {
          serveJson(res, { ok: false, steps: [], errors: [`Bad request: ${err instanceof Error ? err.message : String(err)}`] });
        }
        return;
      }

      if (segments[1] === 'orchestration-fixture' && !segments[2] && req.method === 'DELETE') {
        const slug = url.searchParams.get('name')?.trim() ?? '';
        const result = removeOrchestrationScenario(slug);
        serveJson(res, result);
        return;
      }

      if (segments[1] === 'fixtures' && segments[2] === 'status' && req.method === 'GET') {
        const all = getAllFixtureNames();
        serveJson(res, { fixtures: all.map(getFixtureArtifacts) });
        return;
      }
    }

    res.writeHead(404);
    res.end('Not found');
  });

  startFileWatcher();

  server.listen(port, () => {
    console.log(`\n  Autoresearch Dashboard`);
    console.log(`  http://localhost:${port}\n`);
    console.log(`  Routes:`);
    console.log(`    /                         Overview scorecard`);
    console.log(`    /capability/:name         Detail page`);
    console.log(`    /api/capabilities         Summary JSON`);
    console.log(`    /api/results/:name        Results TSV as JSON`);
    console.log(`    /api/evaluate/:name       Live evaluation`);
    console.log(`    /api/regenerate-frozen/:f  Regenerate frozen analysis report (POST)`);
    console.log(`    /api/regenerate-scaffold/:f  Regenerate detection scaffold (POST)`);
    console.log(`    /api/regenerate-adversarial/:cap  Regenerate adversarial fixtures (POST)`);
    console.log(`    /api/fixture               Add new fixture (POST)`);
    console.log(`    /api/execution-fixture     Add execution triple (POST JSON)`);
    console.log(`    /api/execution-fixture     Remove execution triple (DELETE ?relativePath=)`);
    console.log(`    /api/verification-fixture  Add verification scenario (POST JSON)`);
    console.log(`    /api/verification-fixture  Remove verification scenario (DELETE ?relativePath=)`);
    console.log(`    /api/orchestration-fixture Add orchestration scenario (POST JSON)`);
    console.log(`    /api/orchestration-fixture Remove scenario (DELETE ?name=slug)`);
    console.log(`    /api/fixture/:name        Remove fixture and all artifacts (DELETE)`);
    console.log(`    /api/fixtures/status       Artifact status for all fixtures (GET)`);
    console.log(`    /api/stream               SSE updates\n`);
    console.log(`  Watching results-*.tsv for changes...\n`);
  });
}

main();
