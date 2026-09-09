---
'@openzeppelin/ui-dev-cli': minor
---

`check-peers` now warns when an adapter's declared `@openzeppelin/ui-*` range does not admit
the version installed beside it.

The check compared the *minimum* a range admits against the installed version, mirroring
`validatePeerVersions` in `@openzeppelin/ui-utils`. That is right for the failure it was
built for — an installed peer that is too old — but it left the opposite drift invisible: an
adapter declaring `^2.0.0` against an installed `4.0.1` satisfies its own runtime check and
still cannot be installed by a consumer app, because a package manager reads the declared
range and not the baked minimum. Nothing anywhere reported it, which is how the
`openzeppelin-adapters` packages carried v2 ranges for `ui-components`, `ui-react` and
`ui-utils` across two majors of the kit.

Such pairs are now reported as a `warning` with code `outdated-range`, naming the bump that
fixes each one. `AdapterPeerPair` gains `range` (the range as declared) and `rangeSatisfied`
(whether the range itself admits the installed version, or `null` for range syntax this check
does not model, which is left unreported rather than guessed at). `ok` and the exit code
remain driven by errors alone, so adding this to an existing pipeline does not change its
result; `printAdapterPeerResult` prints warnings on the passing path, where they would
otherwise be invisible.
