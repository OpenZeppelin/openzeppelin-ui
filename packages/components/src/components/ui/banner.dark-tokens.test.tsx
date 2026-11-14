/**
 * @vitest-environment jsdom
 *
 * Colour Banner variants keep their light fills and add dark-aware container /
 * border / text classes. Neutral is unchanged.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Banner } from './banner';

const COLOUR = [
  {
    variant: 'info' as const,
    light: 'bg-blue-50',
    darkBg: 'dark:bg-blue-950/20',
    darkBorder: 'dark:border-blue-500/50',
  },
  {
    variant: 'success' as const,
    light: 'bg-green-50',
    darkBg: 'dark:bg-green-950/20',
    darkBorder: 'dark:border-green-500/50',
  },
  {
    variant: 'warning' as const,
    light: 'bg-amber-50',
    darkBg: 'dark:bg-amber-950/20',
    darkBorder: 'dark:border-amber-500/50',
  },
  {
    variant: 'error' as const,
    light: 'bg-red-50',
    darkBg: 'dark:bg-red-950/20',
    darkBorder: 'dark:border-red-500/50',
  },
];

describe('Banner dark-aware colour variants', () => {
  for (const row of COLOUR) {
    it(`happy: ${row.variant} keeps the light fill and adds dark container tokens`, () => {
      const { container } = render(
        <Banner variant={row.variant} title={`${row.variant} title`} dismissible={false}>
          Body
        </Banner>
      );
      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain(row.light);
      expect(root.className).toContain(row.darkBg);
      expect(root.className).toContain(row.darkBorder);
    });
  }

  it('boundary: neutral stays on muted/border with no dark colour wash classes', () => {
    const { container } = render(
      <Banner variant="neutral" title="Neutral" dismissible={false}>
        Body
      </Banner>
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('bg-muted/30');
    expect(root.className).toContain('border-border');
    expect(root.className).not.toMatch(/dark:bg-(blue|green|amber|red)-/);
  });

  it('failure: omitting a colour dark fill class would leave only the light wash', () => {
    const { container } = render(
      <Banner variant="warning" title="Warn" dismissible={false}>
        Body
      </Banner>
    );
    const root = container.firstElementChild as HTMLElement;
    // Guard: light-only warning would be bg-amber-50 without a dark:bg-* pair.
    expect(root.className).toMatch(/bg-amber-50/);
    expect(root.className).toMatch(/dark:bg-amber-950\/20/);
  });
});
