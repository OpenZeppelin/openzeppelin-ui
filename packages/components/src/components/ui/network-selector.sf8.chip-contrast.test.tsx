/**
 * 006 SF-8: the NetworkSelector type chip (and disabled pill) meet WCAG AA text contrast, checked
 * without a browser. Measured contrast in the running app is in the example app's
 * `e2e/network-chip-contrast.sf8.spec.ts`.
 *
 * - Token side: the chip is `muted-foreground` on `muted`. That pair is ≥ 4.5:1 in light and dark,
 *   so the chip needs no colour of its own. The 005 light value (0.556) fails the same check, so the
 *   check can tell old from new.
 * - Class side: the trigger chip, the list chip and the disabled pill all draw their text from
 *   `text-muted-foreground` on `bg-muted`, with no opacity modifier and no other colour class
 *   that would drop the pair below the measured one.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { icon, isOff, netType, offLabel, setup, Single } from './network-selector.sf17.helpers';

const globalCss = readFileSync(resolve(process.cwd(), '../styles/global.css'), 'utf8');

type Rgb = [number, number, number];

function block(header: RegExp): Record<string, string> {
  const at = globalCss.search(header);
  expect(at, `global.css has a block matching ${header}`).toBeGreaterThanOrEqual(0);
  const open = globalCss.indexOf('{', at);
  const close = globalCss.indexOf('\n}', open);
  const body = globalCss.slice(open + 1, close).replace(/\/\*[\s\S]*?\*\//g, '');
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

function oklchToSrgb(value: string): Rgb {
  const m = value.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/);
  expect(m, `parsable oklch: ${value}`).not.toBeNull();
  const L = Number(m![1]) / (m![2] ? 100 : 1);
  const h = (Number(m![4]) * Math.PI) / 180;
  const a = Number(m![3]) * Math.cos(h);
  const b = Number(m![3]) * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const mm = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s,
  ];
  const enc = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  };
  return [enc(lin[0]), enc(lin[1]), enc(lin[2])];
}

function contrast(x: Rgb, y: Rgb): number {
  const lum = (c: Rgb) => {
    const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

const chipRatio = (tokens: Record<string, string>, fgOverride?: string): number =>
  contrast(
    oklchToSrgb(fgOverride ?? tokens['--muted-foreground']!),
    oklchToSrgb(tokens['--muted']!)
  );

const light = () => block(/^:root\s*\{/m);
const dark = () => block(/^\.dark\s*\{/m);

describe('SF-8 type chip: token contrast', () => {
  it('light: muted-foreground on muted is at least 4.5:1', () => {
    expect(chipRatio(light())).toBeGreaterThanOrEqual(4.5);
  });

  it('dark: muted-foreground on muted is at least 4.5:1', () => {
    expect(chipRatio(dark())).toBeGreaterThanOrEqual(4.5);
  });

  it('boundary: the 005 light value (0.556) fails on muted, so the check discriminates', () => {
    expect(chipRatio(light(), 'oklch(0.556 0 0)')).toBeLessThan(4.5);
  });
});

describe('SF-8 type chip: classes', () => {
  const CHIP = 'bg-muted';
  const colourClasses = (el: Element) =>
    el.className.split(/\s+/).filter((c) => /^(dark:)?(text-(?!\[|xs|sm|base)|bg-)/.test(c));

  it('trigger chip and list chip are bg-muted + text-muted-foreground, nothing else coloured', async () => {
    const user = setup();
    const { container } = render(
      <Single initial={null} getNetworkIcon={icon} getNetworkType={netType} />
    );
    // Trigger chip: select a network first via the list, then read the trigger.
    await user.click(container.querySelector('[data-slot="network-selector-trigger"]')!);
    const list = document.querySelector('[role="listbox"]') as HTMLElement;
    const chips = Array.from(list.querySelectorAll('span')).filter((s) =>
      s.className.includes('uppercase')
    );
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      expect(colourClasses(chip).sort()).toEqual([CHIP, 'text-muted-foreground'].sort());
      expect(chip.className).not.toMatch(/(?:bg|text)-muted(?:-foreground)?\/\d+/);
    }
    await user.click(within(list).getByText('Ethereum Sepolia'));
    const trig = container.querySelector('[data-slot="network-selector-trigger"]')!;
    const tChip = Array.from(trig.querySelectorAll('span')).find((s) =>
      s.className.includes('uppercase')
    )!;
    expect(colourClasses(tChip).sort()).toEqual([CHIP, 'text-muted-foreground'].sort());
  });

  it('disabled pill uses the same pair', async () => {
    const user = setup();
    const { container } = render(
      <Single
        initial={null}
        getNetworkType={netType}
        isNetworkDisabled={isOff}
        getNetworkDisabledLabel={offLabel}
      />
    );
    await user.click(container.querySelector('[data-slot="network-selector-trigger"]')!);
    const pill = within(document.querySelector('[role="listbox"]') as HTMLElement).getByText(
      'Self-host required'
    );
    expect(colourClasses(pill).sort()).toEqual([CHIP, 'text-muted-foreground'].sort());
  });
});
