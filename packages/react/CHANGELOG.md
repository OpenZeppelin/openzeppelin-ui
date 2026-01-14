# @openzeppelin/ui-react

## 1.0.1

### Patch Changes

- [#19](https://github.com/OpenZeppelin/openzeppelin-ui/pull/19) [`1ffc0ac`](https://github.com/OpenZeppelin/openzeppelin-ui/commit/1ffc0ac13b5a904ce49a393047075c6a7e17aa71) Thanks [@pasevin](https://github.com/pasevin)! - Fix React context mismatch when adapters bundle their own copy of ui-react

  Implements the Shared Global Context Pattern for WalletStateContext, storing the React context on globalThis to ensure a single instance is shared across all module loads. This prevents "useWalletState must be used within a WalletStateProvider" errors when bundlers (like Vite's optimizeDeps) inline transitive dependencies.
