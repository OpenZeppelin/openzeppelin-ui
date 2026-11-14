/**
 * SF-32 · Tests for the Radix layering guard's report builder on fixture trees.
 *
 * INV-9: fails loudly on a real duplicate, skips unresolvable edges, ignores
 * stateless and out-of-closure duplicates, walks primitives added later, and
 * never passes on an empty walk. INV-6 (type side): the report has one slot per
 * layering package. INV-19: filesystem only, deterministic, fast.
 *
 * Each test builds its own tree of fake `package.json` files in a fresh temp
 * directory, so nothing here depends on the real install.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PACKAGE_ROOT } from './distArtifact';
import {
  findLayeringProblems,
  LAYERING_PACKAGES,
  walkRadixClosure,
  type LayeringWalk,
} from './radixLayering';

const KIT = '@openzeppelin/ui-components';
const DL = '@radix-ui/react-dismissable-layer';
const FS = '@radix-ui/react-focus-scope';
const FG = '@radix-ui/react-focus-guards';
const RRS = 'react-remove-scroll';
const AH = 'aria-hidden';

/** The six primitives the real guard requires (mirrors `LAYERING_PRIMITIVES`). */
const REQUIRED = [
  '@radix-ui/react-dialog',
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-popover',
  '@radix-ui/react-select',
  '@radix-ui/react-tooltip',
  '@radix-ui/react-toast',
] as const;

type Deps = Record<string, string>;

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'sf32-guard-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write `<dir>/package.json` (creating `dir`) and return `dir`. */
function writePkg(dir: string, name: string, version: string, dependencies: Deps = {}): string {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, version, dependencies }));
  return dir;
}

/** `<base>/node_modules/<name>` */
function nm(base: string, name: string): string {
  return join(base, 'node_modules', name);
}

/** Every layering package as a dependency of one primitive, at the shared version. */
const ALL_LAYERING: Deps = { [DL]: '^1', [FS]: '^1', [FG]: '^1', [RRS]: '^2', [AH]: '^1' };

/** The kit root plus the six primitives, each declaring all five layering packages. */
function soundTree(extraRootDeps: Deps = {}): string {
  const kit = join(root, 'kit');
  const rootDeps: Deps = { react: '^19', ...extraRootDeps };
  for (const name of REQUIRED) rootDeps[name] = '^1';
  writePkg(kit, KIT, '3.13.0', rootDeps);
  const versions: Record<string, string> = {
    '@radix-ui/react-dialog': '1.1.19',
    '@radix-ui/react-dropdown-menu': '2.1.20',
    '@radix-ui/react-popover': '1.1.19',
    '@radix-ui/react-select': '2.3.3',
    '@radix-ui/react-tooltip': '1.2.12',
    '@radix-ui/react-toast': '1.2.19',
  };
  for (const name of REQUIRED)
    writePkg(nm(kit, name), name, versions[name] ?? '1.0.0', ALL_LAYERING);
  writePkg(nm(kit, DL), DL, '1.1.15');
  writePkg(nm(kit, FS), FS, '1.1.12');
  writePkg(nm(kit, FG), FG, '1.1.4');
  writePkg(nm(kit, RRS), RRS, '2.7.2');
  writePkg(nm(kit, AH), AH, '1.2.6');
  return kit;
}

function problemsOf(kit: string): string[] {
  return findLayeringProblems(walkRadixClosure(kit), REQUIRED);
}

describe('INV-9 happy path: one copy of each layering package passes', () => {
  it('reports one copy per package, reached by every primitive, and no problems', () => {
    const kit = soundTree();
    const walk = walkRadixClosure(kit);

    expect(findLayeringProblems(walk, REQUIRED)).toEqual([]);
    expect(walk.root).toBe(`${KIT}@3.13.0`);
    for (const name of LAYERING_PACKAGES) {
      expect(walk.report[name], name).toHaveLength(1);
      expect(walk.report[name][0]?.dependents, name).toEqual([
        '@radix-ui/react-dialog@1.1.19',
        '@radix-ui/react-dropdown-menu@2.1.20',
        '@radix-ui/react-popover@1.1.19',
        '@radix-ui/react-select@2.3.3',
        '@radix-ui/react-toast@1.2.19',
        '@radix-ui/react-tooltip@1.2.12',
      ]);
    }
    // The Radix-scoped layering packages are walked too (a layering dep below them would count).
    expect(walk.visitedRadix).toEqual([...REQUIRED, DL, FS, FG].sort());
    expect(walk.unresolved).toEqual([]);
  });

  it('INV-6: the report has exactly one slot per layering package', () => {
    const walk = walkRadixClosure(soundTree());
    expect(Object.keys(walk.report).sort()).toEqual([...LAYERING_PACKAGES].sort());
  });

  it('follows pnpm-style symlinks and resolves a dependency from its parent’s real directory', () => {
    // .pnpm/<pkg>/node_modules/<pkg> is the real dir; its deps are siblings there.
    const kit = writePkg(
      join(root, 'kit'),
      KIT,
      '3.13.0',
      Object.fromEntries(REQUIRED.map((n) => [n, '^1']))
    );
    const store = join(root, '.pnpm');
    for (const name of REQUIRED) {
      const slot = join(store, `${name.replace('/', '+')}@1.0.0`, 'node_modules');
      writePkg(join(slot, name), name, '1.0.0', ALL_LAYERING);
      // Layering packages are siblings of the primitive inside its slot, via symlinks into one store dir.
      for (const [dep, version] of [
        [DL, '1.1.15'],
        [FS, '1.1.12'],
        [FG, '1.1.4'],
        [RRS, '2.7.2'],
        [AH, '1.2.6'],
      ] as const) {
        const real = join(store, `${dep.replace('/', '+')}@${version}`, 'node_modules', dep);
        writePkg(real, dep, version);
        const link = join(slot, dep);
        mkdirSync(dirname(link), { recursive: true });
        symlinkSync(real, link, 'dir');
      }
      const top = nm(kit, name);
      mkdirSync(dirname(top), { recursive: true });
      symlinkSync(join(slot, name), top, 'dir');
    }
    // Nothing at kit/node_modules/<layering>: resolution only works from the real dir.
    const walk = walkRadixClosure(kit);
    expect(findLayeringProblems(walk, REQUIRED)).toEqual([]);
    expect(walk.report[DL][0]?.realPath).toContain(
      join('.pnpm', '@radix-ui+react-dismissable-layer@1.1.15')
    );
  });
});

describe('INV-9 failure: a duplicate fails with the Design § Error Handling message', () => {
  it('two versions of dismissable-layer → one problem naming package, count, versions ← dependents, remedy', () => {
    const kit = soundTree();
    const popover = nm(kit, '@radix-ui/react-popover');
    writePkg(nm(popover, DL), DL, '1.1.11');

    expect(problemsOf(kit)).toEqual([
      [
        `radix-layering: ${DL} resolves 2 copies in the kit's Radix closure`,
        '  1.1.11  ← @radix-ui/react-popover@1.1.19',
        '  1.1.15  ← @radix-ui/react-dialog@1.1.19, @radix-ui/react-dropdown-menu@2.1.20, @radix-ui/react-select@2.3.3, @radix-ui/react-toast@1.2.19, @radix-ui/react-tooltip@1.2.12',
        `Bump every @radix-ui/* dependency of ${KIT} to the same release (see SF-32).`,
      ].join('\n'),
    ]);
  });

  it('versions sort numerically (1.1.7 before 1.1.12) and labels pad to one column', () => {
    const kit = soundTree();
    writePkg(nm(nm(kit, '@radix-ui/react-dialog'), FS), FS, '1.1.7');

    const [problem] = problemsOf(kit);
    expect(problem?.split('\n').slice(1, 3)).toEqual([
      '  1.1.7   ← @radix-ui/react-dialog@1.1.19',
      '  1.1.12  ← @radix-ui/react-dropdown-menu@2.1.20, @radix-ui/react-popover@1.1.19, @radix-ui/react-select@2.3.3, @radix-ui/react-toast@1.2.19, @radix-ui/react-tooltip@1.2.12',
    ]);
  });

  it('each duplicated package is its own problem, in LAYERING_PACKAGES order', () => {
    const kit = soundTree();
    const select = nm(kit, '@radix-ui/react-select');
    writePkg(nm(select, AH), AH, '1.2.4');
    writePkg(nm(select, FG), FG, '1.1.3');

    const problems = problemsOf(kit);
    expect(problems.map((p) => p.split(' ')[1])).toEqual([FG, AH]);
  });

  it('two directories at one version (peer variants) count as two copies and show their paths', () => {
    const kit = soundTree();
    const tooltip = nm(kit, '@radix-ui/react-tooltip');
    writePkg(nm(tooltip, RRS), RRS, '2.7.2');

    const [problem] = problemsOf(kit);
    expect(problem).toContain(`${RRS} resolves 2 copies`);
    const lines = problem?.split('\n') ?? [];
    // Both labels carry their real path, because the version alone can't tell them apart.
    const paths = walkRadixClosure(kit).report[RRS].map((c) => c.realPath);
    expect(paths).toHaveLength(2);
    expect(lines[1]).toMatch(/^ {2}2\.7\.2 \(.+react-remove-scroll\) +← /);
    expect(lines[2]).toMatch(/^ {2}2\.7\.2 \(.+react-remove-scroll\) +← /);
    for (const p of paths) expect(problem).toContain(`2.7.2 (${p})`);
  });

  it('a layering package the kit itself declares counts toward the closure', () => {
    const kit = soundTree({ [AH]: '^1' }); // resolves to the same shared copy
    expect(problemsOf(kit)).toEqual([]);
    expect(walkRadixClosure(kit).report[AH][0]?.dependents).toContain(`${KIT}@3.13.0`);
  });
});

describe('INV-9 boundary: what does not fail the guard', () => {
  it('an unresolvable edge is recorded in `unresolved` and skipped', () => {
    const kit = soundTree({ '@radix-ui/react-hover-card': '^1' }); // declared, not installed
    const walk = walkRadixClosure(kit);

    expect(walk.unresolved).toEqual([`@radix-ui/react-hover-card (from ${KIT}@3.13.0)`]);
    expect(findLayeringProblems(walk, REQUIRED)).toEqual([]);
  });

  it('an unresolvable layering edge is skipped too', () => {
    const kit = soundTree();
    // toast declares a layering package that only toast would see, and it is missing.
    writePkg(nm(kit, '@radix-ui/react-toast'), '@radix-ui/react-toast', '1.2.19', {
      ...ALL_LAYERING,
      '@radix-ui/react-not-installed': '^1',
    });
    const walk = walkRadixClosure(kit);
    expect(walk.unresolved).toEqual([
      '@radix-ui/react-not-installed (from @radix-ui/react-toast@1.2.19)',
    ]);
    expect(findLayeringProblems(walk, REQUIRED)).toEqual([]);
  });

  it('duplicate stateless Radix internals (portal, presence, primitive, popper, context) pass', () => {
    const kit = soundTree();
    const stateless = [
      '@radix-ui/react-portal',
      '@radix-ui/react-presence',
      '@radix-ui/react-primitive',
      '@radix-ui/react-popper',
      '@radix-ui/react-context',
    ];
    // dialog reaches one copy of each, popover a different one.
    const dialog = nm(kit, '@radix-ui/react-dialog');
    const popover = nm(kit, '@radix-ui/react-popover');
    writePkg(dialog, '@radix-ui/react-dialog', '1.1.19', {
      ...ALL_LAYERING,
      ...Object.fromEntries(stateless.map((n) => [n, '^1'])),
    });
    writePkg(popover, '@radix-ui/react-popover', '1.1.19', {
      ...ALL_LAYERING,
      ...Object.fromEntries(stateless.map((n) => [n, '^1'])),
    });
    for (const name of stateless) {
      writePkg(nm(kit, name), name, '1.1.0');
      writePkg(nm(popover, name), name, '1.1.9');
    }

    const walk = walkRadixClosure(kit);
    expect(findLayeringProblems(walk, REQUIRED)).toEqual([]);
    // They were walked (so a layering dep below them would count), just not counted themselves.
    expect(walk.visitedRadix).toEqual(expect.arrayContaining(stateless));
  });

  it('a second copy outside the kit Radix closure (a wallet stack’s react-remove-scroll) passes', () => {
    const kit = soundTree({ '@rainbow-me/rainbowkit': '^2' });
    const rk = writePkg(nm(kit, '@rainbow-me/rainbowkit'), '@rainbow-me/rainbowkit', '2.2.0', {
      [RRS]: '2.6.2',
      '@radix-ui/react-dialog': '^1', // a Radix dep below a non-Radix package is outside the closure
    });
    writePkg(nm(rk, RRS), RRS, '2.6.2');
    writePkg(nm(rk, '@radix-ui/react-dialog'), '@radix-ui/react-dialog', '1.0.0', { [DL]: '^1' });
    writePkg(nm(nm(rk, '@radix-ui/react-dialog'), DL), DL, '1.0.0');

    const walk = walkRadixClosure(kit);
    expect(findLayeringProblems(walk, REQUIRED)).toEqual([]);
    expect(walk.report[RRS].map((c) => c.version)).toEqual(['2.7.2']);
  });

  it('a non-Radix dependency of a Radix package is not followed', () => {
    const kit = soundTree();
    const select = nm(kit, '@radix-ui/react-select');
    writePkg(select, '@radix-ui/react-select', '2.3.3', {
      ...ALL_LAYERING,
      '@floating-ui/react-dom': '^2',
    });
    const fl = writePkg(nm(kit, '@floating-ui/react-dom'), '@floating-ui/react-dom', '2.1.0', {
      [AH]: '^1',
    });
    writePkg(nm(fl, AH), AH, '1.0.0');

    expect(problemsOf(kit)).toEqual([]);
  });

  it('a dependency cycle between Radix packages terminates', () => {
    const kit = soundTree();
    const dialog = nm(kit, '@radix-ui/react-dialog');
    writePkg(dialog, '@radix-ui/react-dialog', '1.1.19', {
      ...ALL_LAYERING,
      '@radix-ui/react-a': '^1',
    });
    writePkg(nm(kit, '@radix-ui/react-a'), '@radix-ui/react-a', '1.0.0', {
      '@radix-ui/react-b': '^1',
    });
    writePkg(nm(kit, '@radix-ui/react-b'), '@radix-ui/react-b', '1.0.0', {
      '@radix-ui/react-a': '^1',
      '@radix-ui/react-dialog': '^1',
    });

    const walk = walkRadixClosure(kit);
    expect(walk.visitedRadix).toEqual(
      expect.arrayContaining(['@radix-ui/react-a', '@radix-ui/react-b'])
    );
    expect(findLayeringProblems(walk, REQUIRED)).toEqual([]);
  });
});

describe('INV-9 self-extending: a primitive added to the kit later is walked without editing the guard', () => {
  it('a new @radix-ui/* dependency with its own dismissable-layer copy fails the guard', () => {
    const kit = soundTree({ '@radix-ui/react-hover-card': '^1' });
    const hc = writePkg(
      nm(kit, '@radix-ui/react-hover-card'),
      '@radix-ui/react-hover-card',
      '1.1.0',
      {
        [DL]: '^1',
      }
    );
    writePkg(nm(hc, DL), DL, '1.1.10');

    const walk = walkRadixClosure(kit);
    expect(walk.visitedRadix).toContain('@radix-ui/react-hover-card');
    const problems = findLayeringProblems(walk, REQUIRED);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('  1.1.10  ← @radix-ui/react-hover-card@1.1.0');
  });

  it('a layering package reached only through a nested Radix internal is still found', () => {
    const kit = soundTree();
    const menu = writePkg(nm(kit, '@radix-ui/react-menu'), '@radix-ui/react-menu', '2.1.20', {
      [FS]: '^1',
    });
    writePkg(nm(menu, FS), FS, '1.1.7');
    writePkg(nm(kit, '@radix-ui/react-dropdown-menu'), '@radix-ui/react-dropdown-menu', '2.1.20', {
      '@radix-ui/react-menu': '^2',
    });

    const [problem] = problemsOf(kit);
    expect(problem).toContain('  1.1.7   ← @radix-ui/react-menu@2.1.20');
  });
});

describe('INV-9 not vacuous: an empty or partial walk fails instead of passing', () => {
  it('a kit with no Radix dependencies reports every missing primitive and every missing package', () => {
    const kit = writePkg(join(root, 'kit'), KIT, '3.13.0', { react: '^19' });

    expect(problemsOf(kit)).toEqual([
      `radix-layering: the walk from ${KIT}@3.13.0 did not reach ${REQUIRED.join(', ')}. ` +
        'Is the package installed, or did the layout change? Unresolved edges: none',
      ...LAYERING_PACKAGES.map(
        (name) => `radix-layering: ${name} was not found in the kit's Radix closure (empty walk?)`
      ),
    ]);
  });

  it('declared but uninstalled primitives are listed with their unresolved edges', () => {
    const kit = writePkg(
      join(root, 'kit'),
      KIT,
      '3.13.0',
      Object.fromEntries(REQUIRED.map((n) => [n, '^1']))
    );

    const [first] = problemsOf(kit);
    expect(first).toContain(`did not reach ${REQUIRED.join(', ')}`);
    expect(first).toContain(`Unresolved edges: @radix-ui/react-dialog (from ${KIT}@3.13.0); `);
  });

  it('one required primitive missing is one problem naming it, even when no copy is duplicated', () => {
    const kit = soundTree();
    rmSync(nm(kit, '@radix-ui/react-toast'), { recursive: true });

    const problems = problemsOf(kit);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('did not reach @radix-ui/react-toast.');
  });

  it('a layering package no primitive declares is reported as not found', () => {
    const kit = soundTree();
    const noAriaHidden: Deps = { [DL]: '^1', [FS]: '^1', [FG]: '^1', [RRS]: '^2' };
    for (const name of REQUIRED) writePkg(nm(kit, name), name, '1.0.0', noAriaHidden);

    expect(problemsOf(kit)).toEqual([
      `radix-layering: ${AH} was not found in the kit's Radix closure (empty walk?)`,
    ]);
  });

  it('a manifest with no name or version is a thrown, named error (not a silent pass)', () => {
    const kit = soundTree();
    writeFileSync(
      join(nm(kit, '@radix-ui/react-select'), 'package.json'),
      JSON.stringify({ name: 'x' })
    );

    expect(() => walkRadixClosure(kit)).toThrow(
      /^radix-layering: .*react-select\/package\.json has no name or version$/
    );
  });
});

describe('INV-19: the guard is deterministic, filesystem-only and fast', () => {
  it('two walks of the same tree give equal reports, sorted regardless of manifest key order', () => {
    const kit = soundTree();
    // Declare deps in reverse order in one primitive; output must not change.
    const reversed = Object.fromEntries(Object.entries(ALL_LAYERING).reverse());
    writePkg(nm(kit, '@radix-ui/react-tooltip'), '@radix-ui/react-tooltip', '1.2.12', reversed);
    writePkg(nm(nm(kit, '@radix-ui/react-tooltip'), DL), DL, '1.1.9');

    const a: LayeringWalk = walkRadixClosure(kit);
    const b: LayeringWalk = walkRadixClosure(kit);
    expect(b).toEqual(a);
    expect(findLayeringProblems(b, REQUIRED)).toEqual(findLayeringProblems(a, REQUIRED));
    expect(a.report[DL].map((c) => c.version)).toEqual(['1.1.9', '1.1.15']);
    expect(a.visitedRadix).toEqual([...a.visitedRadix].sort());
  });

  it('the builder imports only node:fs and node:path; the guard adds only vitest and the package-root helper', () => {
    const importsOf = (file: string): string[] =>
      [
        ...readFileSync(join(__dirname, file), 'utf-8').matchAll(/^import .* from '([^']+)';$/gm),
      ].map((m) => m[1] ?? '');
    expect(importsOf('radixLayering.ts')).toEqual(['node:fs', 'node:path']);
    expect(importsOf('radix-layering.sf32.test.ts')).toEqual([
      'vitest',
      './distArtifact',
      './radixLayering',
    ]);
  });

  it('the real walk finishes in under 2 s and is stable across runs', () => {
    const start = performance.now();
    const first = walkRadixClosure(PACKAGE_ROOT);
    const elapsed = performance.now() - start;
    const second = walkRadixClosure(PACKAGE_ROOT);

    expect(elapsed).toBeLessThan(2000);
    expect(second).toEqual(first);
  });
});
