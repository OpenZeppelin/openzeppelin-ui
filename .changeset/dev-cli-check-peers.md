---
'@openzeppelin/ui-dev-cli': minor
---

Add `oz-ui-dev check-peers`, a static guard for stale `@openzeppelin/ui-*` pins.

`@openzeppelin/adapter-*` packages declare peerDependencies on `@openzeppelin/ui-*` but
enforce them only at runtime, inside `validatePeerVersions()`. A repository that bumps the
adapters to a new major without moving its `ui-*` pins passes typecheck, tests, build and
lint, and then fails in the browser with the network runtime stuck in a failed state. There
was nothing to catch it before the app was loaded.

```bash
pnpm exec oz-ui-dev check-peers --project "$PWD"
```

The command follows the same contract as `doctor`: `-p, --project` defaults to the current
working directory, `--json` emits a machine-readable result with an `ok` boolean and an
`issues` array, and the process exits `1` on failure.

Workspace resolution reuses `collectWorkspacePackageDirs`, so it scans
`node_modules/@openzeppelin` at the repository root **and** next to every workspace package
declared in `pnpm-workspace.yaml`. That covers repositories whose dependencies are hoisted to
the root as well as those that install under an app, and it means an app resolving an older
peer than its siblings is reported rather than hidden behind a hoisted copy.

Comparison semantics mirror `validatePeerVersions`: each adapter bakes its peer minimums at
build time as `range.replace(/^\^/, '')`, so the check compares the installed version against
the *minimum* the range admits, not the range itself. `ui-utils` 4.0.0 against a declared
`^2.0.0` passes, because the adapter only asks for `>=2.0.0`.

Failure output names the workspace `package.json` files that declare the ranges, keeps the
warning that a caret alone may not move the install (`^3.3.0` already permits 3.5.1, so a
stale lockfile entry stays stale until re-resolved), and mentions `pnpm-workspace.yaml`
overrides only when the repository actually pins `@openzeppelin/ui-*` there.

Nothing-to-check states — no `@openzeppelin` packages, no adapters installed, no peers
resolved — are failures rather than a silent pass, since in CI they mean the install did not
run or `--project` points at the wrong root.

This is a separate command from `doctor` by design. `doctor` validates the local-development
workflow (families, repo roots, packed manifests) and is expected to report issues in CI,
where local development is off; this guard has to pass there.
