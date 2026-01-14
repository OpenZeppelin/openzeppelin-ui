---
"@openzeppelin/ui-react": patch
---

Fix React context mismatch when adapters bundle their own copy of ui-react

Implements the Shared Global Context Pattern for WalletStateContext, storing the React context on globalThis to ensure a single instance is shared across all module loads. This prevents "useWalletState must be used within a WalletStateProvider" errors when bundlers (like Vite's optimizeDeps) inline transitive dependencies.
