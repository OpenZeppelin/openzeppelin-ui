#!/usr/bin/env node
/**
 * Generates the "Version compatibility" section of the root README from the package
 * manifests, and with `--check` fails if the committed section is out of date.
 *
 * The section is generated rather than written because a hand-maintained matrix drifts
 * from the packages it describes on the first release that does not think to update it,
 * and a matrix that is subtly wrong is worse than none. Everything rendered below is
 * read out of each package manifest under `packages/`: versions, dependency edges, whether
 * those edges are `dependencies` or `peerDependencies`, and which packages form the
 * set. Prose that depends on a fact is emitted only while the manifests still support
 * it, so the claims cannot outlive their evidence.
 *
 * Deliberately dependency-free and offline: it reads the working tree only, so it runs
 * in CI beside the other guards without an install.
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const packagesDir = path.join(repoRoot, 'packages');
const readmePath = path.join(repoRoot, 'README.md');

const SCOPE_PREFIX = '@openzeppelin/ui-';
const BEGIN_MARKER = '<!-- BEGIN GENERATED: version-compatibility -->';
const END_MARKER = '<!-- END GENERATED: version-compatibility -->';
const GENERATOR = 'scripts/generate-compatibility-matrix.cjs';

/** Reads every publishable package manifest with its intra-kit edges. */
function readPackages() {
  return fs
    .readdirSync(packagesDir)
    .map((dir) => path.join(packagesDir, dir, 'package.json'))
    .filter((file) => fs.existsSync(file))
    .map((file) => {
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      const intraKit = (field) =>
        Object.keys(manifest[field] ?? {})
          .filter((name) => name.startsWith(SCOPE_PREFIX))
          .sort();

      return {
        name: manifest.name,
        version: manifest.version,
        dir: path.relative(repoRoot, path.dirname(file)),
        private: manifest.private === true,
        dependsOn: intraKit('dependencies'),
        peersOn: intraKit('peerDependencies'),
      };
    })
    .filter((pkg) => !pkg.private && pkg.name.startsWith(SCOPE_PREFIX))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * The packages that must be installed as a set: the connected component of the
 * intra-kit dependency graph containing `@openzeppelin/ui-components`, which is the
 * entry point a consumer reaches first. Isolated packages (`ui-styles`, `ui-cli`) carry
 * no intra-kit edges and so cannot be split by a version mismatch; they are left out
 * rather than listed with nothing to say about them.
 */
function coherentSet(packages) {
  const byName = new Map(packages.map((pkg) => [pkg.name, pkg]));
  const seen = new Set();
  const queue = [`${SCOPE_PREFIX}components`];

  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name) || !byName.has(name)) {
      continue;
    }
    seen.add(name);

    queue.push(...byName.get(name).dependsOn);
    for (const pkg of packages) {
      if (pkg.dependsOn.includes(name)) {
        queue.push(pkg.name);
      }
    }
  }

  // Dependencies before dependents, so the table reads bottom-up like the stack does.
  return packages
    .filter((pkg) => seen.has(pkg.name))
    .sort((a, b) => a.dependsOn.length - b.dependsOn.length || a.name.localeCompare(b.name));
}

const majorOf = (version) => Number(version.split('.')[0]);

/**
 * Greedy wrap at 92 columns, applied after interpolation so a version number or package
 * name cannot leave a paragraph wrapped mid-sentence in the committed markdown.
 */
function wrap(paragraph) {
  const out = [];
  let line = '';

  for (const word of paragraph.split(/\s+/).filter(Boolean)) {
    if (line === '') {
      line = word;
    } else if (`${line} ${word}`.length <= 92) {
      line += ` ${word}`;
    } else {
      out.push(line);
      line = word;
    }
  }

  if (line !== '') {
    out.push(line);
  }

  return out;
}

/**
 * Markdown table with columns padded to the widest cell, which is what Prettier does to
 * the tables already in the README. Matching it keeps the generated block consistent with
 * its neighbours and stops a stray `prettier --write` from fighting the generator.
 */
function table(header, rows) {
  const widths = header.map((_, column) =>
    Math.max(header[column].length, ...rows.map((row) => row[column].length))
  );
  const line = (cells) =>
    `| ${cells.map((cell, column) => cell.padEnd(widths[column])).join(' | ')} |`;

  return [line(header), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)];
}

function renderSection(packages) {
  const set = coherentSet(packages);
  const names = new Set(set.map((pkg) => pkg.name));
  const short = (name) => name.slice('@openzeppelin/'.length);

  // The whole reason coherence is not the consumer's choice. Asserted from the
  // manifests rather than assumed: if these edges ever become peer ranges, the
  // paragraph below stops being true and this generator has to be revisited.
  const edgesAreDependencies = set.every((pkg) => pkg.peersOn.length === 0);

  // Illustrate with a package that depends on ui-utils, since a duplicated ui-utils is
  // the consequence worth explaining. Prefer ui-components: it is the entry point most
  // consumers install first.
  const dependents = set.filter((pkg) => pkg.dependsOn.includes(`${SCOPE_PREFIX}utils`));
  const carrier =
    dependents.find((pkg) => pkg.name === `${SCOPE_PREFIX}components`) ?? dependents[0];
  const utils = set.find((pkg) => pkg.name === `${SCOPE_PREFIX}utils`);
  const types = set.find((pkg) => pkg.name === `${SCOPE_PREFIX}types`);

  const lines = [
    BEGIN_MARKER,
    `<!-- Generated by ${GENERATOR}. Do not edit by hand; run \`pnpm generate:compatibility\`. -->`,
    '',
    '## Version compatibility',
    '',
    ...wrap(
      'These packages are released together from a single commit and are meant to be ' +
        'installed as one set. Install them at these versions:'
    ),
    '',
    ...table(
      ['Package', 'Version', 'Requires from this set'],
      set.map((pkg) => [
        `[\`${pkg.name}\`](./${pkg.dir})`,
        `\`${pkg.version}\``,
        pkg.dependsOn.length === 0
          ? '—'
          : pkg.dependsOn
              .filter((name) => names.has(name))
              .map((name) => `\`${short(name)}\``)
              .join(', '),
      ])
    ),
  ];

  lines.push(
    '',
    ...wrap(
      'Each is optional on its own — install only what you use — but whichever you install ' +
        'must come from this table, not from a mix of it and an older release.'
    ),
    ''
  );

  if (edgesAreDependencies && carrier) {
    lines.push(
      '### Why the set is not optional',
      '',
      ...wrap(
        'The packages in the table depend on each other through `dependencies`, not ' +
          '`peerDependencies` — there is not one intra-kit peer range anywhere in the kit. ' +
          'A peer range asks the consumer to supply a single shared copy; a dependency lets ' +
          'the package manager satisfy the requirement on its own. So a mismatched set does ' +
          `not fail loudly, it resolves: \`${carrier.name}\` quietly gets a second, nested ` +
          `copy of \`${utils.name}\` at the version it asked for, alongside the one you ` +
          'installed.'
      ),
      '',
      ...wrap(
        `Two copies of \`${utils.name}\` is the case that bites, because it holds ` +
          'module-level singletons: `appConfigService` is a single instance and `logger` is a ' +
          '`getInstance()`, and each copy gets its own. Whichever copy your application ' +
          'initialises, the other stays uninitialised and answers with defaults instead of ' +
          'your configuration — without throwing, so nothing points at the cause.' +
          (types
            ? ` Two copies of \`${types.name}\` instead produce TS2322 and TS2345 on ` +
              'structurally identical types.'
            : '')
      ),
      '',
      ...wrap('None of this has to be taken on trust — the edges are in the published manifests:'),
      '',
      '```bash',
      `npm view ${carrier.name}@${carrier.version} dependencies --json | grep '@openzeppelin'`,
      '```',
      ''
    );
  }

  const majors = [...new Set(set.map((pkg) => majorOf(pkg.version)))];
  const components = set.find((pkg) => pkg.name === `${SCOPE_PREFIX}components`);
  const utilsLeads = utils && components && majorOf(utils.version) > majorOf(components.version);

  if (majors.length > 1) {
    lines.push(
      '### Read the major numbers as independent',
      '',
      ...wrap(
        'The versions in the table do not share a major, and that is not a sign of a ' +
          'mismatch. Each package is versioned on its own API, so a breaking change in one ' +
          'moves that one alone; the others record it as a patch bump for an updated ' +
          'dependency. The set above is coherent whatever the majors happen to read.'
      ),
      ''
    );

    if (utilsLeads) {
      lines.push(
        ...wrap(
          `\`${utils.name}\` sits at ${majorOf(utils.version)}.x while ` +
            `\`${components.name}\` is at ${majorOf(components.version)}.x for exactly ` +
            'that reason: it removed WalletConnect support in ' +
            '[#210](https://github.com/OpenZeppelin/openzeppelin-ui/pull/210), which was ' +
            'breaking for its own consumers and nothing more than a dependency bump for ' +
            'everyone else. Do not try to line the majors up, and do not read the gap as one ' +
            'package lagging behind another.'
        ),
        ''
      );
    }
  }

  lines.push(
    '### Checking an installed tree',
    '',
    ...wrap(
      'The table tells you what to install. To verify what actually resolved — including in ' +
        'a project that also installs `@openzeppelin/adapter-*` packages, whose declared ' +
        'peer ranges have to admit these versions — run:'
    ),
    '',
    '```bash',
    'pnpm add -D @openzeppelin/ui-dev-cli',
    'pnpm exec oz-ui-dev check-peers --project "$PWD"',
    '```',
    '',
    ...wrap(
      'It reports an adapter whose peer is older than the installed kit as an error, and a ' +
        'declared range that no longer admits the installed version as a warning. Worth ' +
        'running in CI after install; the packages it names are the ones to move.'
    ),
    '',
    END_MARKER
  );

  return lines.join('\n');
}

function applyTo(readme, section) {
  const begin = readme.indexOf(BEGIN_MARKER);
  const end = readme.indexOf(END_MARKER);

  if (begin === -1 || end === -1) {
    throw new Error(
      `README.md is missing the ${BEGIN_MARKER} / ${END_MARKER} markers -- add them where ` +
        'the generated section should live.'
    );
  }

  return readme.slice(0, begin) + section + readme.slice(end + END_MARKER.length);
}

const readme = fs.readFileSync(readmePath, 'utf8');
const updated = applyTo(readme, renderSection(readPackages()));

if (process.argv.includes('--check')) {
  if (updated !== readme) {
    console.error('\n✖ Version compatibility check failed\n');
    console.error(
      "  README.md's generated compatibility section does not match the package manifests.\n" +
        '  A release changed a version and the section was not regenerated.\n\n' +
        '  Fix: pnpm generate:compatibility, then commit README.md.\n'
    );
    process.exit(1);
  }

  console.log('✓ Version compatibility check passed (README matches the package manifests)');
} else {
  fs.writeFileSync(readmePath, updated);
  console.log('✓ Wrote the version compatibility section to README.md');
}
