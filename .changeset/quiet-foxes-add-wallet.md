---
"@openzeppelin/ui-cli": minor
---

Add `oz-ui add wallet` — installs OpenZeppelin UI wallet wiring (providers, runtime adapter, app config, optional RainbowKit kit config) into an existing project, patches the entry file to wrap the render tree with `<OzProviders>`, and installs required dependencies. Idempotent on re-run; supports `--ecosystem`, `--kit`, `--skip-install`, `--force`, and `--json`.
