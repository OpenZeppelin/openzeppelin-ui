/**
 * Capability 8: Runtime evaluator.
 *
 * Validates that migrated projects actually boot and function at runtime,
 * not just pass static analysis. Closes the gap where detection, patterns,
 * planning, and verification all score 1.0 but the migrated app fails with
 * a blank page due to provider wiring, config loading, or bootstrap issues.
 *
 * Fixture format: expected/runtime/<fixture>.json
 *
 * Metric: checklist score — fraction of health-check assertions that pass.
 */

import { execSync, spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

import {
  type CapabilityEvaluator,
  type EvaluationResult,
  type FixtureScore,
  EXPECTED_DIR,
  checklistScore,
  loadJsonFile,
} from './shared.js';
import { resolveFixturePath } from './fixture-resolver.js';

const RUNTIME_EXPECTED_DIR = path.join(EXPECTED_DIR, 'runtime');

export interface RuntimeAssertion {
  type: 'status-ok' | 'body-contains' | 'body-not-contains' | 'no-error-strings';
  value?: string;
  description: string;
}

export interface RuntimeHealthCheck {
  path: string;
  assertions: RuntimeAssertion[];
}

export interface RuntimeFixtureSpec {
  fixture: string;
  description?: string;
  /** Absolute or relative (to expected/runtime/) path to the migrated project. */
  projectDir?: string;
  /** Fixture name to resolve via fixture-resolver (for source fixtures, not migrated). */
  fixtureSource?: string;
  install?: string;
  build?: string;
  serve: string;
  port: number;
  readyTimeout?: number;
  healthChecks: RuntimeHealthCheck[];
  tags?: string[];
}

const KNOWN_ERROR_STRINGS = [
  'WagmiProviderNotFoundError',
  'Uncaught Error',
  'Unhandled Runtime Error',
  'Cannot read properties of undefined',
  'Cannot read properties of null',
  'is not a function',
  'is not defined',
  'Module not found',
  'Failed to resolve import',
];

function discoverRuntimeFixtures(): RuntimeFixtureSpec[] {
  if (!fs.existsSync(RUNTIME_EXPECTED_DIR)) return [];

  const fixtures: RuntimeFixtureSpec[] = [];
  for (const entry of fs.readdirSync(RUNTIME_EXPECTED_DIR, { withFileTypes: true })) {
    if (!entry.name.endsWith('.json')) continue;
    try {
      const spec = loadJsonFile<RuntimeFixtureSpec>(path.join(RUNTIME_EXPECTED_DIR, entry.name));
      if (spec.fixture && spec.serve && spec.healthChecks) {
        fixtures.push(spec);
      }
    } catch {
      // skip malformed specs
    }
  }
  return fixtures.sort((a, b) => a.fixture.localeCompare(b.fixture));
}

function resolveProjectDir(spec: RuntimeFixtureSpec): string | null {
  if (spec.projectDir) {
    const abs = path.isAbsolute(spec.projectDir)
      ? spec.projectDir
      : path.resolve(RUNTIME_EXPECTED_DIR, spec.projectDir);
    return fs.existsSync(abs) ? abs : null;
  }
  if (spec.fixtureSource) {
    // Runtime fixtures need the actual live project (not just snapshots)
    // to validate real-world migration state.
    return resolveFixturePath(spec.fixtureSource, { allowLiveFixtures: true }) ?? null;
  }
  return null;
}

function fetchUrl(url: string, timeoutMs: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function waitForServer(port: number, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  const interval = 500;
  while (Date.now() - start < timeoutMs) {
    try {
      const { status } = await fetchUrl(`http://localhost:${port}/`, 3000);
      if (status > 0) return true;
    } catch {
      // not ready yet
    }
    await new Promise<void>((r) => setTimeout(r, interval));
  }
  return false;
}

function runAssertion(
  assertion: RuntimeAssertion,
  status: number,
  body: string
): { passed: boolean; detail: string } {
  switch (assertion.type) {
    case 'status-ok':
      return {
        passed: status >= 200 && status < 400,
        detail: `HTTP ${status} ${status >= 200 && status < 400 ? '(ok)' : '(fail)'}`,
      };

    case 'body-contains':
      if (!assertion.value) return { passed: false, detail: 'no value specified' };
      return {
        passed: body.includes(assertion.value),
        detail: body.includes(assertion.value)
          ? `found "${assertion.value}"`
          : `missing "${assertion.value}"`,
      };

    case 'body-not-contains':
      if (!assertion.value) return { passed: true, detail: 'no value specified (vacuously true)' };
      return {
        passed: !body.includes(assertion.value),
        detail: body.includes(assertion.value)
          ? `unwanted "${assertion.value}" present`
          : `correctly absent "${assertion.value}"`,
      };

    case 'no-error-strings': {
      const found = KNOWN_ERROR_STRINGS.filter((err) => body.includes(err));
      return {
        passed: found.length === 0,
        detail: found.length === 0
          ? 'no known error strings'
          : `found error strings: ${found.join(', ')}`,
      };
    }

    default:
      return { passed: false, detail: `unknown assertion type: ${(assertion as RuntimeAssertion).type}` };
  }
}

function killExistingProcessOnPort(port: number): void {
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8', timeout: 5_000 }).trim();
    if (pids) {
      for (const pid of pids.split('\n').filter(Boolean)) {
        try { process.kill(Number(pid), 'SIGKILL'); } catch { /* already dead */ }
      }
    }
  } catch {
    // No process on port — nothing to kill.
  }
}

/**
 * Detect the CPU architecture that native addon packages (esbuild, rollup)
 * were installed for by inspecting the .pnpm store directory names.
 */
function detectInstalledNativeArch(projectDir: string): string | null {
  const pnpmDir = path.join(projectDir, 'node_modules', '.pnpm');
  if (!fs.existsSync(pnpmDir)) return null;
  for (const entry of fs.readdirSync(pnpmDir)) {
    const m = entry.match(/@(?:esbuild|rollup)\+.*?-(arm64|x64|ia32)@/);
    if (m) return m[1];
  }
  return null;
}

/**
 * Scan PATH for a `node` binary matching the given architecture.
 * Returns the directory containing the matching binary, or null.
 */
function findNodeDirForArch(desiredArch: string): string | null {
  const pathDirs = (process.env.PATH ?? '').split(path.delimiter);
  for (const dir of pathDirs) {
    const nodeBin = path.join(dir, 'node');
    if (!fs.existsSync(nodeBin)) continue;
    try {
      const arch = execSync(`"${nodeBin}" -e "process.stdout.write(process.arch)"`, {
        encoding: 'utf8',
        timeout: 5_000,
      });
      if (arch === desiredArch) return dir;
    } catch { continue; }
  }
  return null;
}

/**
 * Build a clean env for fixture subprocesses (install + serve).
 *
 * 1. Strips tsx/pnpm-injected NODE_PATH that points into the monorepo's
 *    .pnpm store (causes esbuild host/binary version mismatches).
 * 2. Ensures the node binary on PATH matches the architecture of native
 *    addons in the fixture's lockfile. If the current process is x64 but
 *    the lockfile has arm64 native deps, we prepend the arm64 node dir.
 */
function buildFixtureEnv(projectDir: string, extras: Record<string, string> = {}): NodeJS.ProcessEnv {
  let adjustedPath = process.env.PATH ?? '';

  const nativeArch = detectInstalledNativeArch(projectDir);
  if (nativeArch && nativeArch !== process.arch) {
    const nodeDir = findNodeDirForArch(nativeArch);
    if (nodeDir) {
      adjustedPath = `${nodeDir}${path.delimiter}${adjustedPath}`;
    }
  }

  return {
    ...process.env,
    NODE_PATH: '',
    PATH: adjustedPath,
    ...extras,
  };
}

function startServer(command: string, cwd: string, port: number): ChildProcess {
  killExistingProcessOnPort(port);
  const child = spawn(command, [], {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: buildFixtureEnv(cwd, { PORT: String(port), BROWSER: 'none' }),
    shell: true,
    detached: false,
  });
  return child;
}

function killServer(child: ChildProcess): void {
  try {
    child.kill('SIGTERM');
    setTimeout(() => {
      try { child.kill('SIGKILL'); } catch { /* already dead */ }
    }, 3000);
  } catch {
    /* already dead */
  }
}

function failScore(fixture: string, reason: string): FixtureScore {
  return {
    fixture,
    precision: 0, recall: 0, f1: 0,
    truePositives: 0, falsePositives: 0, falseNegatives: 1,
    details: { matched: [], missed: [reason], extra: [] },
  };
}

async function evaluateFixture(spec: RuntimeFixtureSpec): Promise<FixtureScore> {
  const projectDir = resolveProjectDir(spec);
  if (!projectDir) return failScore(spec.fixture, 'project-not-found');

  const fixtureEnv = buildFixtureEnv(projectDir);
  if (spec.install) {
    try {
      execSync(spec.install, { cwd: projectDir, stdio: 'pipe', timeout: 120_000, env: fixtureEnv });
    } catch {
      return failScore(spec.fixture, 'install-failed');
    }
  }

  if (spec.build) {
    try {
      execSync(spec.build, { cwd: projectDir, stdio: 'pipe', timeout: 120_000, env: fixtureEnv });
    } catch {
      return failScore(spec.fixture, 'build-failed');
    }
  }

  const child = startServer(spec.serve, projectDir, spec.port);
  const readyTimeout = spec.readyTimeout ?? 30_000;

  try {
    const ready = await waitForServer(spec.port, readyTimeout);
    if (!ready) return failScore(spec.fixture, 'server-not-ready');

    const matched: string[] = [];
    const missed: string[] = [];
    const allChecks: boolean[] = [];

    for (const healthCheck of spec.healthChecks) {
      const url = `http://localhost:${spec.port}${healthCheck.path}`;
      let status = 0;
      let body = '';

      try {
        const response = await fetchUrl(url, 10_000);
        status = response.status;
        body = response.body;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        for (const a of healthCheck.assertions) {
          allChecks.push(false);
          missed.push(`${healthCheck.path}:${a.description} — fetch error: ${msg}`);
        }
        continue;
      }

      for (const assertion of healthCheck.assertions) {
        const result = runAssertion(assertion, status, body);
        allChecks.push(result.passed);
        if (result.passed) {
          matched.push(`${healthCheck.path}:${assertion.description}`);
        } else {
          missed.push(`${healthCheck.path}:${assertion.description} — ${result.detail}`);
        }
      }
    }

    const score = checklistScore(allChecks);

    return {
      fixture: spec.fixture,
      precision: score, recall: score, f1: score,
      truePositives: matched.length,
      falsePositives: 0,
      falseNegatives: missed.length,
      details: { matched, missed, extra: [] },
      metadata: {
        projectDir,
        totalAssertions: allChecks.length,
        passedAssertions: allChecks.filter(Boolean).length,
      },
    };
  } finally {
    killServer(child);
  }
}

export const runtimeEvaluator: CapabilityEvaluator = {
  name: 'runtime',

  async evaluate(): Promise<EvaluationResult> {
    const fixtures = discoverRuntimeFixtures();

    if (fixtures.length === 0) {
      return {
        capability: 'runtime',
        scores: [],
        aggregate: 0,
        metadata: { note: 'No runtime fixtures found under expected/runtime/' },
      };
    }

    const results: FixtureScore[] = [];
    for (const spec of fixtures) {
      results.push(await evaluateFixture(spec));
    }

    const aggregate =
      results.length > 0
        ? results.reduce((sum, s) => sum + s.f1, 0) / results.length
        : 0;

    return {
      capability: 'runtime',
      scores: results,
      aggregate,
    };
  },
};
