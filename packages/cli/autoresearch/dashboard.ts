/**
 * Autoresearch real-time dashboard server.
 *
 * Route-based layout:
 *   GET /                      -> overview scorecard (all capabilities)
 *   GET /capability/:name      -> detail page for a single capability
 *   GET /api/results/:name     -> results TSV for a capability
 *   GET /api/evaluate/:name    -> live evaluation for a capability
 *   GET /api/capabilities      -> list of all capabilities with latest scores
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

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PORT = 4200;

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
  description: string;
}

function parseResults(capability: string): ResultRow[] {
  const resultsPath = path.join(__dirname, `results-${capability}.tsv`);
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
    const parsed = JSON.parse(stdout.trim());
    return { capability, ...parsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { capability, fixtures: [], meanF1: 0, error: message };
  }
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
        serveJson(res, evalResult);
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
    console.log(`    /api/stream               SSE updates\n`);
    console.log(`  Watching results-*.tsv for changes...\n`);
  });
}

main();
