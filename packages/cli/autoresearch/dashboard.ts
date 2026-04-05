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

type EvalApiPayload = {
  capability: string;
  fixtures: Array<Record<string, unknown>>;
  meanF1: number;
  error?: string;
};

function enrichEvaluationForDashboard(payload: EvalApiPayload): EvalApiPayload {
  if (payload.error || !Array.isArray(payload.fixtures)) return payload;
  const repos = loadExternalRepoByName();
  return {
    ...payload,
    fixtures: payload.fixtures.map((fx) => {
      const name = typeof fx.fixture === 'string' ? fx.fixture : '';
      const resolved = resolveFixturePath(name);
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

  try {
    const { stdout } = await execFileAsync(
      tsxBin,
      [evalScript, '--capability', capability, '--json'],
      { cwd: path.join(__dirname, '..'), timeout: 60_000 }
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
    const report = analyzeProject(fixturePath);
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
  deleteIfExists(path.join(__dirname, 'expected', `${fixtureName}.json`));
  deleteIfExists(path.join(__dirname, 'expected', `${fixtureName}.scaffold.json`));
  deleteIfExists(path.join(__dirname, 'expected', 'planning', `${fixtureName}.json`));
  deleteIfExists(path.join(__dirname, 'expected', 'planning', 'frozen-reports', `${fixtureName}.json`));
  deleteIfExists(path.join(__dirname, 'expected', 'patterns', `${fixtureName}.json`));

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
      const report = analyzeProject(fixturePath);
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
    console.log(`    /api/fixture/:name        Remove fixture and all artifacts (DELETE)`);
    console.log(`    /api/fixtures/status       Artifact status for all fixtures (GET)`);
    console.log(`    /api/stream               SSE updates\n`);
    console.log(`  Watching results-*.tsv for changes...\n`);
  });
}

main();
