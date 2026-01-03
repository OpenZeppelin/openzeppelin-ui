# Migration Guide

This guide helps you migrate from `@openzeppelin/ui-builder-*` packages to the new `@openzeppelin/ui-*` namespace.

## Overview

The OpenZeppelin UI packages have been extracted from the UI Builder monorepo into a standalone repository with a cleaner namespace. The packages retain full API compatibility, so migration only requires updating import paths and dependencies.

## Package Name Mapping

| Old Package Name                      | New Package Name              |
| ------------------------------------- | ----------------------------- |
| `@openzeppelin/ui-builder-types`      | `@openzeppelin/ui-types`      |
| `@openzeppelin/ui-builder-utils`      | `@openzeppelin/ui-utils`      |
| `@openzeppelin/ui-builder-styles`     | `@openzeppelin/ui-styles`     |
| `@openzeppelin/ui-builder-ui`         | `@openzeppelin/ui-components` |
| `@openzeppelin/ui-builder-renderer`   | `@openzeppelin/ui-renderer`   |
| `@openzeppelin/ui-builder-react-core` | `@openzeppelin/ui-react`      |
| `@openzeppelin/ui-builder-storage`    | `@openzeppelin/ui-storage`    |

## Migration Steps

### Step 1: Update Dependencies

Remove old packages and install new ones:

```bash
# Remove old packages
pnpm remove @openzeppelin/ui-builder-types @openzeppelin/ui-builder-utils @openzeppelin/ui-builder-styles @openzeppelin/ui-builder-ui @openzeppelin/ui-builder-renderer @openzeppelin/ui-builder-react-core @openzeppelin/ui-builder-storage

# Install new packages (only the ones you need)
pnpm add @openzeppelin/ui-types @openzeppelin/ui-utils @openzeppelin/ui-styles @openzeppelin/ui-components @openzeppelin/ui-renderer @openzeppelin/ui-react @openzeppelin/ui-storage
```

Or update your `package.json` manually:

```diff
{
  "dependencies": {
-   "@openzeppelin/ui-builder-types": "^0.x.x",
-   "@openzeppelin/ui-builder-utils": "^0.x.x",
-   "@openzeppelin/ui-builder-styles": "^0.x.x",
-   "@openzeppelin/ui-builder-ui": "^0.x.x",
-   "@openzeppelin/ui-builder-renderer": "^0.x.x",
-   "@openzeppelin/ui-builder-react-core": "^0.x.x",
-   "@openzeppelin/ui-builder-storage": "^0.x.x"
+   "@openzeppelin/ui-types": "^1.0.0",
+   "@openzeppelin/ui-utils": "^1.0.0",
+   "@openzeppelin/ui-styles": "^1.0.0",
+   "@openzeppelin/ui-components": "^1.0.0",
+   "@openzeppelin/ui-renderer": "^1.0.0",
+   "@openzeppelin/ui-react": "^1.0.0",
+   "@openzeppelin/ui-storage": "^1.0.0"
  }
}
```

Then run:

```bash
pnpm install
```

### Step 2: Update Import Paths

Use find-and-replace to update all imports in your codebase.

#### Using sed (macOS/Linux)

```bash
# Types
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/@openzeppelin\/ui-builder-types/@openzeppelin\/ui-types/g' {} +

# Utils
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/@openzeppelin\/ui-builder-utils/@openzeppelin\/ui-utils/g' {} +

# Styles
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/@openzeppelin\/ui-builder-styles/@openzeppelin\/ui-styles/g' {} +

# UI Components (note: package renamed from ui-builder-ui to ui-components)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/@openzeppelin\/ui-builder-ui/@openzeppelin\/ui-components/g' {} +

# Renderer
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/@openzeppelin\/ui-builder-renderer/@openzeppelin\/ui-renderer/g' {} +

# React Core (note: package renamed from ui-builder-react-core to ui-react)
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/@openzeppelin\/ui-builder-react-core/@openzeppelin\/ui-react/g' {} +

# Storage
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i '' 's/@openzeppelin\/ui-builder-storage/@openzeppelin\/ui-storage/g' {} +
```

#### Using sed (Linux GNU)

On Linux systems, the `-i` flag works differently. Use:

```bash
# Types
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "./node_modules/*" \
  -exec sed -i 's/@openzeppelin\/ui-builder-types/@openzeppelin\/ui-types/g' {} +

# (repeat for other packages with same pattern change: -i '' → -i)
```

#### Using ripgrep with sed

For faster processing on large codebases:

```bash
# Types
rg -l '@openzeppelin/ui-builder-types' --glob '*.{ts,tsx,js,jsx}' | xargs sed -i '' 's/@openzeppelin\/ui-builder-types/@openzeppelin\/ui-types/g'

# Utils
rg -l '@openzeppelin/ui-builder-utils' --glob '*.{ts,tsx,js,jsx}' | xargs sed -i '' 's/@openzeppelin\/ui-builder-utils/@openzeppelin\/ui-utils/g'

# Styles
rg -l '@openzeppelin/ui-builder-styles' --glob '*.{ts,tsx,js,jsx,css}' | xargs sed -i '' 's/@openzeppelin\/ui-builder-styles/@openzeppelin\/ui-styles/g'

# UI Components
rg -l '@openzeppelin/ui-builder-ui' --glob '*.{ts,tsx,js,jsx}' | xargs sed -i '' 's/@openzeppelin\/ui-builder-ui/@openzeppelin\/ui-components/g'

# Renderer
rg -l '@openzeppelin/ui-builder-renderer' --glob '*.{ts,tsx,js,jsx}' | xargs sed -i '' 's/@openzeppelin\/ui-builder-renderer/@openzeppelin\/ui-renderer/g'

# React Core
rg -l '@openzeppelin/ui-builder-react-core' --glob '*.{ts,tsx,js,jsx}' | xargs sed -i '' 's/@openzeppelin\/ui-builder-react-core/@openzeppelin\/ui-react/g'

# Storage
rg -l '@openzeppelin/ui-builder-storage' --glob '*.{ts,tsx,js,jsx}' | xargs sed -i '' 's/@openzeppelin\/ui-builder-storage/@openzeppelin\/ui-storage/g'
```

#### Using VS Code Find and Replace

1. Open **Find and Replace** (`Cmd+Shift+H` / `Ctrl+Shift+H`)
2. Enable **Regex** mode (click `.*`)
3. Set **Files to include**: `*.ts, *.tsx, *.js, *.jsx, *.css`
4. Set **Files to exclude**: `node_modules`
5. Search and replace each pattern:

| Find                                  | Replace                       |
| ------------------------------------- | ----------------------------- |
| `@openzeppelin/ui-builder-types`      | `@openzeppelin/ui-types`      |
| `@openzeppelin/ui-builder-utils`      | `@openzeppelin/ui-utils`      |
| `@openzeppelin/ui-builder-styles`     | `@openzeppelin/ui-styles`     |
| `@openzeppelin/ui-builder-ui`         | `@openzeppelin/ui-components` |
| `@openzeppelin/ui-builder-renderer`   | `@openzeppelin/ui-renderer`   |
| `@openzeppelin/ui-builder-react-core` | `@openzeppelin/ui-react`      |
| `@openzeppelin/ui-builder-storage`    | `@openzeppelin/ui-storage`    |

### Step 3: Verify Build

After updating imports, verify your project builds correctly:

```bash
pnpm build
```

### Step 4: Run Tests

Ensure all tests pass:

```bash
pnpm test
```

## Automated Migration Script

For convenience, you can use this shell script to perform all replacements:

```bash
#!/bin/bash
# migrate-ui-packages.sh
# Run from your project root directory

set -e

echo "Migrating @openzeppelin/ui-builder-* to @openzeppelin/ui-*..."

# Define replacements
declare -A REPLACEMENTS=(
  ["@openzeppelin/ui-builder-types"]="@openzeppelin/ui-types"
  ["@openzeppelin/ui-builder-utils"]="@openzeppelin/ui-utils"
  ["@openzeppelin/ui-builder-styles"]="@openzeppelin/ui-styles"
  ["@openzeppelin/ui-builder-ui"]="@openzeppelin/ui-components"
  ["@openzeppelin/ui-builder-renderer"]="@openzeppelin/ui-renderer"
  ["@openzeppelin/ui-builder-react-core"]="@openzeppelin/ui-react"
  ["@openzeppelin/ui-builder-storage"]="@openzeppelin/ui-storage"
)

# Detect sed variant (BSD vs GNU)
if sed --version 2>/dev/null | grep -q GNU; then
  SED_INPLACE="sed -i"
else
  SED_INPLACE="sed -i ''"
fi

# Perform replacements
for old in "${!REPLACEMENTS[@]}"; do
  new="${REPLACEMENTS[$old]}"
  echo "  $old → $new"
  find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.json" \) \
    -not -path "./node_modules/*" \
    -not -path "./.git/*" \
    -exec $SED_INPLACE "s|$old|$new|g" {} + 2>/dev/null || true
done

echo "Migration complete! Run 'pnpm install && pnpm build' to verify."
```

Save this as `migrate-ui-packages.sh`, make it executable (`chmod +x migrate-ui-packages.sh`), and run it from your project root.

## Troubleshooting

### TypeScript Cannot Find Module

**Error:**

```
Cannot find module '@openzeppelin/ui-types' or its corresponding type declarations.
```

**Solutions:**

1. Ensure you've installed the new packages: `pnpm add @openzeppelin/ui-types`
2. Delete `node_modules` and reinstall: `rm -rf node_modules && pnpm install`
3. Clear TypeScript cache: `rm -rf node_modules/.cache && pnpm typecheck`
4. Restart your IDE/editor to pick up new type definitions

### Peer Dependency Conflicts

**Error:**

```
ERR_PNPM_PEER_DEP_ISSUES  Unmet peer dependencies
```

**Solutions:**

1. Ensure you have React 19 installed: `pnpm add react@^19.0.0 react-dom@^19.0.0`
2. Check that you don't have both old and new packages installed
3. Review the peer dependency requirements in each package's README

### Both Old and New Packages Installed

**Error:**

```
Duplicate identifier errors or conflicting type definitions
```

**Solutions:**

1. Remove all old packages completely:
   ```bash
   pnpm remove @openzeppelin/ui-builder-types @openzeppelin/ui-builder-utils @openzeppelin/ui-builder-styles @openzeppelin/ui-builder-ui @openzeppelin/ui-builder-renderer @openzeppelin/ui-builder-react-core @openzeppelin/ui-builder-storage
   ```
2. Check your lockfile for any remaining references to old packages
3. Delete lockfile and reinstall: `rm pnpm-lock.yaml && pnpm install`

### CSS/Style Issues

**Error:**

```
Styles not applying correctly after migration
```

**Solutions:**

1. Update your CSS imports:
   ```diff
   - @import '@openzeppelin/ui-builder-styles/global.css';
   + @import '@openzeppelin/ui-styles/global.css';
   ```
2. Ensure Tailwind CSS 4 is properly configured
3. Clear any CSS caches or rebuild your styles

### Module Resolution in Monorepo

**Error:**

```
Cannot resolve workspace:^ protocol
```

**Solutions:**

1. If migrating within a monorepo, ensure you're using npm versions instead of workspace protocol:
   ```diff
   - "@openzeppelin/ui-types": "workspace:^"
   + "@openzeppelin/ui-types": "^1.0.0"
   ```
2. Run `pnpm install` after updating package.json

### Version Mismatch Between Packages

**Error:**

```
Type errors or runtime errors due to incompatible package versions
```

**Solutions:**

1. Ensure all `@openzeppelin/ui-*` packages are on compatible versions:
   ```bash
   pnpm why @openzeppelin/ui-types
   ```
2. Update all packages to the latest version:
   ```bash
   pnpm update @openzeppelin/ui-types @openzeppelin/ui-utils @openzeppelin/ui-styles @openzeppelin/ui-components @openzeppelin/ui-renderer @openzeppelin/ui-react @openzeppelin/ui-storage
   ```

### Import Path Not Found After Replacement

**Error:**

```
Some imports still reference old package names
```

**Solutions:**

1. Check for imports in less common file types (`.mjs`, `.cjs`, `.mts`, `.cts`)
2. Check configuration files like `jest.config.js`, `vite.config.ts`
3. Search your entire project: `grep -r "ui-builder-" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json"`

## API Compatibility

All packages maintain full API compatibility. There are no breaking changes to:

- Function signatures
- Type definitions
- Component props
- Hook interfaces
- Exported constants

The only change is the package namespace from `@openzeppelin/ui-builder-*` to `@openzeppelin/ui-*`.

## Getting Help

If you encounter issues not covered in this guide:

1. Check the package-specific README files for additional documentation
2. Review the [example app](../examples/basic-react-app/) for working implementation patterns
3. Open an issue on the [GitHub repository](https://github.com/OpenZeppelin/openzeppelin-ui/issues)

## Quick Reference

### Before Migration

```tsx
import { useUIBuilder } from '@openzeppelin/ui-builder-react-core';
import { TransactionForm } from '@openzeppelin/ui-builder-renderer';
import { createStorage } from '@openzeppelin/ui-builder-storage';
import type { ContractSchema } from '@openzeppelin/ui-builder-types';
import { Button } from '@openzeppelin/ui-builder-ui';
import { cn } from '@openzeppelin/ui-builder-utils';
```

### After Migration

```tsx
import { Button } from '@openzeppelin/ui-components';
import { useUIBuilder } from '@openzeppelin/ui-react';
import { TransactionForm } from '@openzeppelin/ui-renderer';
import { createStorage } from '@openzeppelin/ui-storage';
import type { ContractSchema } from '@openzeppelin/ui-types';
import { cn } from '@openzeppelin/ui-utils';
```
