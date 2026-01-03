---
"@openzeppelin/ui-components": patch
"@openzeppelin/ui-renderer": patch
---

Separate CodeEditorField into dedicated entry point to prevent CSS import issues in test environments.

**Breaking Change for CodeEditorField users:**

The `CodeEditorField` component is no longer exported from the main package entry point. Import it from the new dedicated entry point:

```typescript
// Before
import { CodeEditorField } from '@openzeppelin/ui-components';

// After
import { CodeEditorField } from '@openzeppelin/ui-components/code-editor';
```

This change prevents the `@uiw/react-textarea-code-editor` CSS import from causing "Unknown file extension .css" errors in Node.js test environments.
