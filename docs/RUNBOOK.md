# Operations Runbook

This document provides procedures for common operational tasks in the `openzeppelin-ui` repository.

## Table of Contents

- [Release Rollback Procedure](#release-rollback-procedure)
- [Emergency Unpublish](#emergency-unpublish)
- [Republishing a Package](#republishing-a-package)
- [CI/CD Troubleshooting](#cicd-troubleshooting)

---

## Release Rollback Procedure

If a published package version has critical issues, follow this procedure to deprecate and release a patch.

### Prerequisites

- npm publish access to `@openzeppelin` organization
- GitHub write access to the repository

### Step 1: Deprecate the Problematic Version

```bash
# Deprecate a specific version with a message
npm deprecate @openzeppelin/ui-{package}@{version} "Critical issue - please use {new-version}"

# Example: Deprecate ui-types 1.0.0
npm deprecate @openzeppelin/ui-types@1.0.0 "Critical issue - please upgrade to 1.0.1"
```

This warns users when they install the deprecated version but does not prevent installation.

### Step 2: Create a Patch Release

1. **Create a fix branch**:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/{package}-{issue}
   ```

2. **Apply the fix** to the affected package(s)

3. **Create a changeset**:

   ```bash
   pnpm changeset
   # Select affected packages
   # Select "patch" for version bump
   # Describe the fix
   ```

4. **Commit and push**:

   ```bash
   git add .
   git commit -m "fix({package}): description of fix"
   git push origin fix/{package}-{issue}
   ```

5. **Create and merge PR**:
   - Create PR to `main`
   - Wait for CI to pass
   - Merge PR

6. **Version and publish**:
   - Changesets bot creates "Version Packages" PR
   - Review and merge the version PR
   - Packages automatically publish with provenance

### Step 3: Verify Fix

```bash
# Check the new version is available
npm info @openzeppelin/ui-{package}

# Verify deprecation message on old version
npm view @openzeppelin/ui-{package}@{old-version}
```

---

## Emergency Unpublish

npm allows unpublishing within 72 hours of publishing. Use only for severe issues (security vulnerabilities, accidental publish of sensitive data).

### Requirements

- Package must be published within the last 72 hours
- No other packages depend on this exact version

### Procedure

```bash
# Unpublish a specific version
npm unpublish @openzeppelin/ui-{package}@{version}

# Example
npm unpublish @openzeppelin/ui-types@1.0.1
```

**After unpublishing**: You cannot republish the same version number. Always publish as a new patch version.

---

## Republishing a Package

If a publish fails partway through, some packages may be published while others are not.

### Check Published State

```bash
# Check if a package version exists on npm (replace the version with the one you care about)
npm view @openzeppelin/ui-types@1.0.0

# Check all public library and CLI packages (@openzeppelin/ui-<name>)
for pkg in types utils styles components renderer react storage dev-cli cli; do
  npm view @openzeppelin/ui-${pkg}@1.0.0 version 2>/dev/null && echo "ui-${pkg}: published" || echo "ui-${pkg}: NOT published"
done
```

### Manual Publish (if needed)

If the automated publish fails, you can publish manually:

```bash
# Build all packages
pnpm build

# Publish a specific package
cd packages/{package}
npm publish --access public

# Or publish all packages
pnpm -r publish --access public
```

**Note**: Manual publishes will not have SLSA provenance. Prefer re-running the automated workflow.

---

## CI/CD Troubleshooting

### Build Failures

| Symptom              | Cause                    | Resolution                     |
| -------------------- | ------------------------ | ------------------------------ |
| TypeScript errors    | Type incompatibility     | Check `pnpm typecheck` locally |
| Missing dependencies | Package not in workspace | Run `pnpm install`             |
| Out of memory        | Large build              | Increase NODE_OPTIONS memory   |

### Publish Failures

| Symptom                  | Cause               | Resolution                          |
| ------------------------ | ------------------- | ----------------------------------- |
| 403 Forbidden            | Invalid npm token   | Regenerate NPM_TOKEN                |
| 401 Unauthorized         | Token expired       | Regenerate NPM_TOKEN                |
| Version already exists   | Duplicate publish   | Check npm, may already be published |
| SLSA verification failed | Provenance mismatch | Re-run workflow from clean state    |

### GitHub App Issues

| Symptom                 | Cause                    | Resolution                 |
| ----------------------- | ------------------------ | -------------------------- |
| Token generation failed | Missing GH_APP_ID        | Set as repository variable |
| Push permission denied  | App not installed        | Install app on repository  |
| Resource not accessible | Insufficient permissions | Update app permissions     |

### Rerunning Failed Workflows

1. Navigate to Actions tab in GitHub
2. Find the failed workflow run
3. Click "Re-run all jobs" or "Re-run failed jobs"

---

## Incident Response Template

When responding to a release incident, use this template:

```markdown
## Incident: {Package} v{Version} Issue

**Date**: YYYY-MM-DD
**Severity**: Critical/High/Medium/Low
**Status**: Active/Resolved

### Summary

Brief description of the issue.

### Impact

- Affected packages: @openzeppelin/ui-{package}
- Affected versions: x.y.z
- User impact: Description

### Timeline

- HH:MM - Issue discovered
- HH:MM - Version deprecated
- HH:MM - Fix released

### Resolution

Steps taken to resolve.

### Prevention

Changes to prevent recurrence.
```

---

## Contact Information

For urgent issues:

- **On-call rotation**: Check internal Slack channel
- **npm support**: support@npmjs.com (for registry issues)
- **GitHub support**: support.github.com (for Actions issues)
