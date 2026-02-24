---
name: commit
description: Creates commits following the monorepo's Conventional Commits standard with proper GPG signing, scope selection, and pre-commit validation. Reminds about changesets for package changes. Use when creating commits, writing commit messages, or when the user asks to commit changes.
---

# Commit Skill for OpenZeppelin UI Monorepo

This skill guides committing changes following the project's Conventional Commits standard.

## Critical Requirements

1. **Never commit directly to `main`** - Always check the current branch before committing. If on `main`, create a new branch first (see Commit Workflow below).
2. **Always run commits outside sandbox** - Full shell permissions required for GPG signing and pre-commit hooks
3. **Never use `--no-gpg-sign`** - All commits must be GPG-signed
4. **Never use `--no-verify`** - Pre-commit hooks must run

## Commit Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Rules

| Rule               | Requirement                                                          |
| ------------------ | -------------------------------------------------------------------- |
| Header max length  | 100 characters                                                       |
| Subject case       | lowercase (never sentence-case, start-case, pascal-case, upper-case) |
| Subject ending     | No period                                                            |
| Scope              | **Required** (scope-empty is enforced)                               |
| Body line length   | Max 100 characters                                                   |
| Body leading blank | Required if body present                                             |

## Commit Types

| Type       | Description                                             |
| ---------- | ------------------------------------------------------- |
| `feat`     | New feature                                             |
| `fix`      | Bug fix                                                 |
| `docs`     | Documentation only                                      |
| `style`    | Formatting, whitespace (no code change)                 |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `test`     | Adding or correcting tests                              |
| `build`    | Build system or external dependencies                   |
| `ci`       | CI configuration changes                                |
| `chore`    | Other changes (not src or test)                         |
| `revert`   | Reverts a previous commit                               |
| `wip`      | Work in progress (avoid if possible)                    |

## Allowed Scopes

The commitlint config enforces these scopes:

| Scope        | Description               |
| ------------ | ------------------------- |
| `types`      | Type definitions package  |
| `utils`      | Utility functions package |
| `styles`     | Styles package            |
| `components` | Components package        |
| `renderer`   | Renderer package          |
| `react`      | React integration package |
| `storage`    | Storage package           |
| `deps`       | Dependencies              |
| `config`     | Configuration files       |
| `ci`         | CI/CD configuration       |
| `docs`       | Documentation             |
| `tests`      | Test-related changes      |
| `release`    | Release automation        |
| `examples`   | Example applications      |
| `common`     | Common/shared code        |
| `spec`       | Specification documents   |

## Commit Workflow

```bash
# 1. Stage changes
git add <files>

# 2. Commit with HEREDOC (recommended for multi-line messages)
git commit -m "$(cat <<'EOF'
feat(components): add new contract widget

Implements a reusable widget component for displaying
contract state with real-time updates.
EOF
)"
```

## Changeset Reminder

**Before committing changes to `packages/` directory, check if a changeset is needed.**

A changeset is required when:

- Adding features to published packages
- Fixing bugs in published packages
- Making breaking changes

Check for existing changesets:

```bash
ls .changeset/*.md
```

If no changeset exists for your changes, create one:

```bash
pnpm changeset
```

Published packages in this monorepo:

- `@openzeppelin/ui-types`
- `@openzeppelin/ui-utils`
- `@openzeppelin/ui-styles`
- `@openzeppelin/ui-components`
- `@openzeppelin/ui-renderer`
- `@openzeppelin/ui-react`
- `@openzeppelin/ui-storage`

## Pre-commit Hooks

The following checks run automatically on commit:

1. **Formatting check**: Runs `pnpm format:check`
2. **Commit message validation**: Runs commitlint

If pre-commit fails, fix the issues and commit again.

## Pre-push Hooks

Before pushing, these checks run:

1. **Formatting and linting**: Runs `pnpm fix-all`
2. **Type checking**: Runs `pnpm typecheck`
3. **Tests**: Runs `pnpm test`

If pre-push fails, fix the issues and push again.

## Breaking Changes

Indicate breaking changes with `!` after type/scope:

```bash
feat(types)!: change network config interface
```

Or with a footer:

```
feat(types): change network config interface

BREAKING CHANGE: NetworkConfig interface now requires chainId property.
All consumers must update their configuration.
```

## Common Pitfalls

### Sandbox Mode Errors

**Symptom**: Commit fails with permission errors, GPG signing fails, or hooks don't run.

**Fix**: Run commit commands with full shell permissions (outside sandbox).

### Invalid Scope

**Symptom**: `scope-enum` error from commitlint.

**Fix**: Use one of the allowed scopes above. If a new scope is justified, update `commitlint.config.js`.

### Subject Case Error

**Symptom**: `subject-case` error.

**Fix**: Use lowercase for the entire subject:

- Bad: `Add new feature`
- Good: `add new feature`

### Missing Scope

**Symptom**: `scope-empty` error from commitlint.

**Fix**: Always include a scope. Choose the most relevant package or category.

## Examples

```bash
# Feature with package scope
feat(components): add network badge component

# Fix with package scope
fix(utils): correct address validation for checksums

# Refactor with package scope
refactor(renderer): simplify form field rendering logic

# Specification documents
docs(spec): add data model for extend example apps feature

# Documentation
docs(examples): add wallet connection tutorial

# Test changes
test(react): add unit tests for useWalletComponents hook

# Dependencies update
chore(deps): update vitest to v3.2.4

# CI changes
ci(config): add coverage threshold checks

# Release automation (auto-generated, usually ignored by commitlint)
chore(release): version packages
```

## Quick Reference

```bash
# Stage and commit
git add . && git commit -m "feat(components): add feature"

# Check commit format is valid
echo "feat(components): add feature" | npx commitlint

# View recent commit formats for reference
git log --oneline -10

# Amend last commit (only if not pushed!)
git commit --amend

# Create changeset for package changes
pnpm changeset
```
