---
"@openzeppelin/ui-react": minor
---

Add name-resolution hooks and runtime wiring (SF-2 + SF-3 bridge).

`@openzeppelin/ui-react` exports the SF-2 name-resolution engine: `useResolveName`, `useResolveAddress`, `NameResolutionProvider`, `NameResolutionContext`, `useNameResolutionContext`, and the shared `NameResolutionStatus` / result types. These hooks own debounce, cache, dedupe, retries, and the closed error union — the capability-facing layer apps mount once per runtime.

Also exports `useRuntimeNameResolver`, which maps the active `EcosystemRuntime`'s `nameResolution` capability into the dumb `NameResolver` shape consumed by `@openzeppelin/ui-components`' `NameResolverProvider`. Apps and the renderer use this to wire inline forward resolution without hand-rolling capability plumbing.
