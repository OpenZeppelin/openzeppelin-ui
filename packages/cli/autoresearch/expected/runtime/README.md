# Runtime Fixture Expectations

Each `.json` file in this directory defines a **runtime health-check fixture** for the `runtime` capability evaluator.

## Schema

```json
{
  "fixture": "my-app",
  "description": "Brief description of what this fixture validates",
  "projectDir": "/absolute/path/to/migrated/project",
  "install": "pnpm install",
  "build": "pnpm build",
  "serve": "pnpm dev --port 5199",
  "port": 5199,
  "readyTimeout": 30000,
  "healthChecks": [
    {
      "path": "/",
      "assertions": [
        {
          "type": "status-ok",
          "description": "root returns 2xx"
        },
        {
          "type": "body-contains",
          "value": "<div id=\"root\">",
          "description": "SPA mount point present"
        },
        {
          "type": "no-error-strings",
          "description": "no fatal runtime errors in HTML"
        }
      ]
    }
  ],
  "tags": ["external", "wallet", "rainbowkit"]
}
```

## Fields

| Field          | Required | Description |
|----------------|----------|-------------|
| `fixture`      | yes      | Unique slug matching the filename (without `.json`) |
| `description`  | no       | Human-readable purpose |
| `projectDir`   | yes*     | Absolute or relative path to the migrated project |
| `fixtureSource`| yes*     | Alternative: fixture name resolved via `fixture-resolver` |
| `install`      | no       | Shell command to install deps (run in `projectDir`) |
| `build`        | no       | Shell command to build the project |
| `serve`        | yes      | Shell command to start the dev/preview server |
| `port`         | yes      | Port the server listens on |
| `readyTimeout` | no       | Milliseconds to wait for server readiness (default: 30000) |
| `healthChecks` | yes      | Array of endpoint + assertion pairs |
| `tags`         | no       | Metadata tags for filtering/grouping |

*One of `projectDir` or `fixtureSource` is required.

**Important:** Runtime fixtures should be self-contained within the autoresearch framework. Use `fixtureSource` to resolve fixtures through the standard fixture-resolver (which uses `resolved-fixtures/` snapshots). Do NOT use absolute `projectDir` paths to live projects outside the repo — this breaks reproducibility. The snapshot represents the source state; the CLI migration pipeline is expected to produce a bootable app from it. When it can't, the runtime score drops — that's the signal.

## Assertion Types

| Type                | Value field | Behavior |
|---------------------|-------------|----------|
| `status-ok`         | —           | HTTP response status is 2xx or 3xx |
| `body-contains`     | required    | Response body includes the string |
| `body-not-contains` | required    | Response body does NOT include the string |
| `no-error-strings`  | —           | Body is free of known fatal error patterns |

Known error strings checked by `no-error-strings`:
- `WagmiProviderNotFoundError`
- `Uncaught Error`
- `Unhandled Runtime Error`
- `Cannot read properties of undefined`
- `Cannot read properties of null`
- `is not a function`
- `is not defined`
- `Module not found`
- `Failed to resolve import`

## Scoring

Score = (assertions that pass) / (total assertions) across all health checks.

A fixture with 0 passing assertions scores 0.0.
A fixture where all assertions pass scores 1.0.

## Adding a New Fixture

1. Create `expected/runtime/<fixture-name>.json` following the schema above.
2. Ensure the `projectDir` points to a real migrated project on disk.
3. Run `npx tsx autoresearch/evaluate.ts --capability runtime` to verify.
4. The fixture should reflect the *actual* state of the migration — if it's broken, it should score 0.
