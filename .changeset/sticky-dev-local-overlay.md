---
"@openzeppelin/ui-dev-cli": minor
---

Keep the `dev:local` ui-types overlay sticky across routine pnpm scripts. The generated `.pnpmfile.cjs` now activates in a packed-only mode when the local-dev env flag is unset (as long as a packed manifest is present), so an incidental `pnpm install` triggered by a bare `pnpm <script>` re-applies the packed tarball overlay instead of reverting linked packages to the registry version. Explicit opt-out (`use remote`) and full `use local` behavior are unchanged; machines that never ran `dev:local` are unaffected.
