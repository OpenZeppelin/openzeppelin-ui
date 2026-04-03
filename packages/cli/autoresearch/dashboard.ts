/**
 * Autoresearch real-time dashboard server.
 *
 * Serves a live HTML dashboard that polls for results.tsv changes and
 * displays experiment progress with charts and tables.
 *
 * Usage:  npx tsx autoresearch/dashboard.ts [--port 4200]
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { analyzeProject } from '../src/analysis/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 4200;

interface ResultRow {
  experiment: number;
  status: string;
  meanF1: number;
  description: string;
}

interface ExpectedComponent {
  name: string;
  ozTarget: string;
  sourceLibrary: string;
}

interface ExpectedResult {
  fixture: string;
  description?: string;
  components: ExpectedComponent[];
}

interface FixtureScore {
  fixture: string;
  precision: number;
  recall: number;
  f1: number;
  tp: number;
  fp: number;
  fn: number;
  matched: string[];
  missed: string[];
  extra: string[];
}

function parseResults(): ResultRow[] {
  const resultsPath = path.join(__dirname, 'results.tsv');
  if (!fs.existsSync(resultsPath)) return [];

  const content = fs.readFileSync(resultsPath, 'utf8').trim();
  if (!content) return [];

  return content.split('\n').map((line) => {
    const [exp, status, f1, ...descParts] = line.split('\t');
    return {
      experiment: parseInt(exp, 10),
      status,
      meanF1: parseFloat(f1),
      description: descParts.join('\t'),
    };
  });
}

function runLiveEvaluation(): { fixtures: FixtureScore[]; meanF1: number } {
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) return { fixtures: [], meanF1: 0 };

  const fixtureDirs = fs
    .readdirSync(fixturesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  const scores: FixtureScore[] = [];

  for (const name of fixtureDirs) {
    const expectedPath = path.join(__dirname, 'expected', `${name}.json`);
    if (!fs.existsSync(expectedPath)) continue;

    const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8')) as ExpectedResult;
    const report = analyzeProject(path.join(fixturesDir, name));

    const expectedSet = new Set(expected.components.map((c) => `${c.name}::${c.ozTarget}`));
    const actualSet = new Set(
      report.components.filter((c) => c.ozTarget !== null).map((c) => `${c.name}::${c.ozTarget}`)
    );

    const matched: string[] = [];
    const missed: string[] = [];
    const extra: string[] = [];

    for (const key of expectedSet) {
      if (actualSet.has(key)) matched.push(key);
      else missed.push(key);
    }
    for (const key of actualSet) {
      if (!expectedSet.has(key)) extra.push(key);
    }

    const tp = matched.length;
    const fp = extra.length;
    const fn = missed.length;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    scores.push({ fixture: name, precision, recall, f1, tp, fp, fn, matched, missed, extra });
  }

  const meanF1 = scores.length > 0 ? scores.reduce((s, x) => s + x.f1, 0) / scores.length : 0;
  return { fixtures: scores, meanF1 };
}

function getResultsMtime(): number {
  const resultsPath = path.join(__dirname, 'results.tsv');
  if (!fs.existsSync(resultsPath)) return 0;
  return fs.statSync(resultsPath).mtimeMs;
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
  const resultsPath = path.join(__dirname, 'results.tsv');
  let lastMtime = getResultsMtime();

  setInterval(() => {
    const currentMtime = getResultsMtime();
    if (currentMtime !== lastMtime) {
      lastMtime = currentMtime;
      broadcastUpdate();
    }
  }, 1000);

  if (!fs.existsSync(resultsPath)) {
    const dir = path.dirname(resultsPath);
    fs.watch(dir, (_, filename) => {
      if (filename === 'results.tsv') broadcastUpdate();
    });
  }
}

function main(): void {
  const portArg = process.argv.indexOf('--port');
  const port = portArg >= 0 ? parseInt(process.argv[portArg + 1], 10) : DEFAULT_PORT;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    switch (url.pathname) {
      case '/':
        serveHtml(req, res);
        break;
      case '/api/results':
        serveJson(res, { rows: parseResults(), mtime: getResultsMtime() });
        break;
      case '/api/evaluate':
        serveJson(res, runLiveEvaluation());
        break;
      case '/api/stream':
        serveSSE(req, res);
        break;
      default:
        res.writeHead(404);
        res.end('Not found');
    }
  });

  startFileWatcher();

  server.listen(port, () => {
    console.log(`\n  Autoresearch Dashboard`);
    console.log(`  http://localhost:${port}\n`);
    console.log(`  Watching results.tsv for changes...\n`);
  });
}

main();
