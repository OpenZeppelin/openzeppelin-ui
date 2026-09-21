import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const badgeSource = readFileSync(resolve(process.cwd(), 'src/components/ui/badge.tsx'), 'utf8');
const stylesSource = readFileSync(resolve(process.cwd(), '../styles/global.css'), 'utf8');

function declarationsFor(selector: string): string {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = stylesSource.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`));
  expect(match, `INV-403: expected ${selector} theme declarations`).not.toBeNull();
  return match?.[1] ?? '';
}

describe('SF-14 Badge package and theme contracts', () => {
  it('INV-399/400/401: Badge stays a render-only leaf module', () => {
    const imports = [...badgeSource.matchAll(/^import .+ from ['"]([^'"]+)['"];$/gm)].map(
      (match) => match[1]
    );

    expect(imports).toEqual(['react', '@openzeppelin/ui-utils']);
    expect(badgeSource).not.toMatch(
      /useState|useReducer|useEffect|useLayoutEffect|addEventListener|ResizeObserver|MutationObserver|setTimeout/
    );
    expect(badgeSource).not.toMatch(/@radix-ui|lucide-react|RoleManager|<Slot|asChild/);
  });

  it('INV-402: solid classes use semantic foreground tokens without hardcoded white', () => {
    expect(badgeSource).toContain('bg-success text-success-foreground');
    expect(badgeSource).toContain('bg-warning text-warning-foreground');
    expect(badgeSource).toContain('bg-info text-info-foreground');
    expect(badgeSource).not.toMatch(/text-white|#fff|oklch\(/);
  });

  it('INV-403: light and dark themes define every new foreground token', () => {
    const light = declarationsFor(':root');
    const dark = declarationsFor('.dark');

    expect(light).toContain('--success-foreground: oklch(0.985 0 0)');
    expect(light).toContain('--warning-foreground: oklch(0.145 0 0)');
    expect(light).toContain('--info-foreground: oklch(0.985 0 0)');
    expect(dark).toContain('--success-foreground: oklch(0.985 0 0)');
    expect(dark).toContain('--warning-foreground: oklch(0.985 0 0)');
    expect(dark).toContain('--info-foreground: oklch(0.985 0 0)');
  });

  it('INV-403: Tailwind aliases expose each foreground token', () => {
    expect(stylesSource).toContain('--color-success-foreground: var(--success-foreground)');
    expect(stylesSource).toContain('--color-warning-foreground: var(--warning-foreground)');
    expect(stylesSource).toContain('--color-info-foreground: var(--info-foreground)');
  });
});
