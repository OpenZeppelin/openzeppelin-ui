/**
 * Theme Toggle
 *
 * Header control for the app's `next-themes` provider (mounted in `main.tsx`).
 * Toggles the provider's `dark` class on the root; the choice is persisted by
 * the provider and restored on reload. Exposed as a pressed-state button so
 * assistive tech and scripted checks can read the current theme.
 */

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Button } from '@openzeppelin/ui-components';

export function ThemeToggle(): React.ReactElement {
  const { resolvedTheme, setTheme } = useTheme();
  // The resolved theme is unknown until mounted; render a stable light state first
  // so server/client markup agree and the pressed state is never wrong.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Dark mode"
      aria-pressed={isDark}
      data-testid="theme-toggle"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </Button>
  );
}
