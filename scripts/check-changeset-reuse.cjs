#!/usr/bin/env node
/**
 * Fails if a pending changeset describes a change that has already been released.
 *
 * `changeset version` consumes every file in `.changeset/` and then deletes it. A
 * branch cut before the release PR lands still carries that file, so merging the
 * branch puts it back and the next release consumes it a second time -- bumping the
 * same packages again with byte-identical release notes.
 *
 * This has happened twice, and neither time was noticed:
 *
 * - #113 was squash-merged as 52f2823 and released by #115 (2026-04-02) as
 *   components/react/utils/types 2.0.0. Its original branch was then merged as well,
 *   and a `Merge branch 'main' into feat/...` kept the branch's copies of the three
 *   changeset files main had just deleted. `changeset version` consumed them again in
 *   0c01a4a (2026-04-26), published as 3.0.0 when #139 merged on 2026-05-12: one
 *   breaking change, two majors, identical notes bar the commit SHA they cite.
 *   Consumers that pinned the first round -- the `openzeppelin-adapters` packages, on
 *   `ui-components ^2.0.0` / `ui-react ^2.0.1` / `ui-utils ^2.0.0` -- then sat a full
 *   major behind an API that had not changed again, with nothing to tell them so.
 *   That is the whole of the half-migration.
 * - `address-field-resolved-preview.md` was added by #193, released by #194 as
 *   components 3.7.0, reintroduced by #195, and released again by #196 as 3.8.0.
 *
 * Run across all 87 pre-release states in this repository's history, this flags those
 * two episodes and nothing else.
 *
 * The fingerprint is the opening prose of the changeset body, normalised for
 * whitespace. `changeset version` copies that prose into CHANGELOG.md verbatim after
 * its `Thanks ...! - ` preamble, so finding it in a published entry means this exact
 * summary already shipped.
 *
 * Deliberately dependency-free: it reads the working tree only, and needs no install.
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const changesetDir = path.join(repoRoot, '.changeset');
const packagesDir = path.join(repoRoot, 'packages');

/** Shortest fingerprint worth matching: below this, prose is too generic to trust. */
const MIN_FINGERPRINT_LENGTH = 40;
/** Lines of opening prose to join before giving up on reaching the minimum length. */
const MAX_FINGERPRINT_LINES = 4;

function normalise(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/** Body of a changeset, with the `--- ... ---` frontmatter removed. */
function bodyOf(source) {
  const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/.exec(source);
  return match ? match[1] : source;
}

/**
 * Opening prose of a changeset body, normalised, or `null` when there is too little
 * of it to identify the change. Markdown bullets and heading markers are stripped so
 * the fingerprint matches the prose `changeset version` copies into the changelog.
 */
function fingerprintOf(source) {
  const lines = bodyOf(source)
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*+]|#{1,6})\s+/, '').trim())
    .filter((line) => line !== '');

  let fingerprint = '';
  for (const line of lines.slice(0, MAX_FINGERPRINT_LINES)) {
    fingerprint = normalise(`${fingerprint} ${line}`);
    if (fingerprint.length >= MIN_FINGERPRINT_LENGTH) {
      return fingerprint;
    }
  }

  return fingerprint.length >= MIN_FINGERPRINT_LENGTH ? fingerprint : null;
}

function readChangelogs() {
  if (!fs.existsSync(packagesDir)) {
    return [];
  }

  return fs
    .readdirSync(packagesDir)
    .map((name) => ({ name, file: path.join(packagesDir, name, 'CHANGELOG.md') }))
    .filter((entry) => fs.existsSync(entry.file))
    .map((entry) => ({ ...entry, normalised: normalise(fs.readFileSync(entry.file, 'utf8')) }));
}

function pendingChangesets() {
  if (!fs.existsSync(changesetDir)) {
    return [];
  }

  return fs
    .readdirSync(changesetDir)
    .filter((name) => name.endsWith('.md') && name !== 'README.md')
    .sort();
}

const changelogs = readChangelogs();
const problems = [];
const skipped = [];

for (const name of pendingChangesets()) {
  const fingerprint = fingerprintOf(fs.readFileSync(path.join(changesetDir, name), 'utf8'));

  if (!fingerprint) {
    skipped.push(name);
    continue;
  }

  const released = changelogs.filter((entry) => entry.normalised.includes(fingerprint));
  if (released.length > 0) {
    problems.push(
      `.changeset/${name} describes a change already published in ` +
        `${released.map((entry) => `packages/${entry.name}/CHANGELOG.md`).join(', ')}.`
    );
  }
}

if (problems.length > 0) {
  console.error('\n✖ Changeset reuse check failed\n');
  for (const problem of problems) {
    console.error(`  - ${problem}\n`);
  }
  console.error(
    'A released changeset that comes back gets consumed again, bumping the same packages\n' +
      'a second time with identical notes. Consumers pinned to the first bump are then a\n' +
      'version behind an API that never changed, which is how the adapters ended up\n' +
      'half-migrated across two majors.\n\n' +
      'To fix: delete the reintroduced file. It was almost certainly restored by rebasing\n' +
      'or merging a branch that was cut before the release PR landed -- rebase onto the\n' +
      'released main instead. If the change genuinely needs another bump, write a new\n' +
      'changeset saying what changed this time.\n'
  );
  process.exit(1);
}

const summary = `✓ Changeset reuse check passed (${pendingChangesets().length} pending changeset(s))`;
console.log(
  skipped.length > 0 ? `${summary}; too short to fingerprint: ${skipped.join(', ')}` : summary
);
