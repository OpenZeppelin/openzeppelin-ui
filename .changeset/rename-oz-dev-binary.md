---
"@openzeppelin/ui-dev-cli": minor
---

Rename CLI binary from `oz-dev` to `oz-ui-dev` to scope the tool under the UI ecosystem namespace and avoid usurping the broader OpenZeppelin CLI namespace.

Consumer apps must update their `package.json` scripts to reference `oz-ui-dev` instead of `oz-dev`.
