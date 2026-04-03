/**
 * Autoresearch real-time dashboard server.
 *
 * Serves a live HTML dashboard that polls for results.tsv changes and
 * displays experiment progress with charts and tables.
 *
 * Live evaluation spawns evaluate.ts as a child process on each request,
 * so it always picks up the latest code changes from the agent.
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

interface ResultRow {
  experiment: number;
  status: string;
  meanF1: number;
  description: string;
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

async function runLiveEvaluation(): Promise<{ fixtures: unknown[]; meanF1: number; error?: string }> {
  const tsxBin = path.join(__dirname, '..', 'node_modules', '.bin', 'tsx');
  const evalScript = path.join(__dirname, 'evaluate.ts');

  try {
    const { stdout } = await execFileAsync(tsxBin, [evalScript, '--json'], {
      cwd: path.join(__dirname, '..'),
      timeout: 30_000,
    });
    return JSON.parse(stdout.trim());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { fixtures: [], meanF1: 0, error: message };
  }
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

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);

    switch (url.pathname) {
      case '/':
        serveHtml(req, res);
        break;
      case '/api/results':
        serveJson(res, { rows: parseResults(), mtime: getResultsMtime() });
        break;
      case '/api/evaluate': {
        const evalResult = await runLiveEvaluation();
        serveJson(res, evalResult);
        break;
      }
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
    console.log(`  Live evaluation spawns fresh process on each request.`);
    console.log(`  Watching results.tsv for changes...\n`);
  });
}

main();
