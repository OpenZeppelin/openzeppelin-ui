# Research: Extend Example Apps

**Feature**: 001-extend-example-apps  
**Date**: 2026-01-06

## Research Tasks

### 1. EVM Wallet Integration Pattern

**Decision**: Use wagmi + RainbowKit + viem stack, following ui-builder adapter-evm pattern.

**Rationale**:

- ui-builder already uses this stack successfully
- RainbowKit provides polished wallet connection UI out of the box
- wagmi v2 + viem provides type-safe EVM interactions
- Compatible with the AdapterProvider/WalletStateProvider architecture in @openzeppelin/ui-react

**Alternatives Considered**:

- Web3Modal: Less customizable than RainbowKit, fewer built-in wallets
- ConnectKit: Good but less widely adopted than RainbowKit
- Custom implementation: Too much effort for a demo app

**Implementation Pattern**:

```typescript
// From ui-builder/packages/adapter-evm/src/wallet/
// The adapter creates wagmi config and wraps with WagmiProvider + QueryClientProvider
// The example app will follow this same pattern directly
```

### 2. Demo Component Structure Pattern

**Decision**: Use a consistent `DemoSection` wrapper component for all demos.

**Rationale**:

- Ensures consistent visual structure across all component demos
- Reduces code duplication
- Makes it easy to add new demos following the same pattern

**Pattern**:

```typescript
interface DemoSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
  codeExample?: string;
}

function DemoSection({ title, description, children, codeExample }: DemoSectionProps) {
  return (
    <section className="space-y-8">
      <div>
        <h2 className="mb-4 text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
      </div>
      {children}
      {codeExample && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Usage</h3>
          <pre className="bg-muted overflow-x-auto rounded-lg p-4 text-sm">
            <code>{codeExample}</code>
          </pre>
        </div>
      )}
    </section>
  );
}
```

### 3. Navigation Category Grouping

**Decision**: Group navigation items by category using collapsible sections in the sidebar.

**Rationale**:

- With 25+ demo components, a flat list becomes unwieldy
- Categories align with FR-015 requirement
- SidebarSection component already supports this pattern

**Pattern**:

```typescript
// Extend existing pattern in App.tsx
<SidebarSection title="Inputs">
  <SidebarButton ...>Button</SidebarButton>
  <SidebarButton ...>Input</SidebarButton>
  // etc.
</SidebarSection>
<SidebarSection title="Feedback">
  // etc.
</SidebarSection>
```

### 4. Form Field Demo Strategy

**Decision**: Create a single comprehensive `FormFieldsDemo.tsx` that showcases all specialized field types with a tabbed interface.

**Rationale**:

- 18 specialized field types would create too many individual demo files
- Grouping related fields together shows usage patterns
- Tabbed interface allows focusing on one field type at a time

**Pattern**:

```typescript
// FormFieldsDemo.tsx with tabs for:
// - Text Fields (TextField, TextAreaField, PasswordField, UrlField)
// - Number Fields (NumberField, AmountField, BigIntField)
// - Selection Fields (SelectField, SelectGroupedField, RadioField, EnumField, BooleanField)
// - Data Fields (AddressField, BytesField, DateTimeField, FileUploadField)
// - Complex Fields (ArrayField, ArrayObjectField, ObjectField, MapField)
```

### 5. Network Configuration for Demos

**Decision**: Use Ethereum mainnet and Sepolia testnet for network component demos.

**Rationale**:

- Most commonly recognized blockchain networks
- No API keys required for basic network display
- NetworkIcon already has built-in support for these networks

**Configuration**:

```typescript
// config/networks.ts
export const demoNetworks = [
  { id: '1', name: 'Ethereum', chainId: 1 },
  { id: '11155111', name: 'Sepolia', chainId: 11155111 },
  { id: '137', name: 'Polygon', chainId: 137 },
  { id: '42161', name: 'Arbitrum One', chainId: 42161 },
];
```

### 6. Code Example Display

**Decision**: Use static template strings for code examples rather than extracting from source files.

**Rationale**:

- Simpler implementation for a demo app
- Allows curating the most relevant code snippets
- Avoids build-time complexity

**Alternatives Considered**:

- Source file extraction: Requires build tooling complexity
- Sandpack/CodeSandbox: Too heavy for this use case
- react-live: Could be added later but not essential for MVP

### 7. Wallet Demo Network Setup

**Decision**: Configure wagmi with Sepolia as the default network for the wallet demo, with mainnet available for switching.

**Rationale**:

- Sepolia is a free testnet - no real funds needed for demos
- Demonstrates network switching functionality
- Safe for users to experiment with connections

**Configuration**:

```typescript
// Wagmi config following adapter-evm pattern
const config = createConfig({
  chains: [sepolia, mainnet],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
  },
  connectors: [
    // RainbowKit handles connector setup
  ],
});
```

## Dependencies Research

### Required New Dependencies

| Package                | Version     | Purpose                          |
| ---------------------- | ----------- | -------------------------------- |
| @openzeppelin/ui-react | workspace:^ | Wallet state providers and hooks |
| wagmi                  | ^2.14.x     | EVM wallet connection            |
| viem                   | ^2.21.x     | EVM client library               |
| @rainbow-me/rainbowkit | ^2.2.x      | Wallet connection UI             |
| @tanstack/react-query  | ^5.x        | Required by wagmi                |

### Peer Dependency Alignment

These packages are already used in ui-builder and role-manager, ensuring compatibility:

- React 19.x
- TypeScript 5.8+
- Tailwind CSS v4

## Risk Assessment

| Risk                                   | Mitigation                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Wallet demo requires network access    | Clearly document that wallet demo needs internet; basic component demos work offline |
| RainbowKit styling conflicts           | RainbowKit theme will be customized to match OpenZeppelin design system              |
| Demo app bundle size increases         | Example app is private; bundle size is not a concern                                 |
| EVM dependency in openzeppelin-ui repo | Contained to example app only; does not affect library packages                      |

## Open Questions (Resolved)

1. ~~Should wallet demo require actual wallet connection?~~ → Yes, live integration per clarification
2. ~~Should we create new example apps or extend existing?~~ → Extend existing per clarification
3. ~~Which networks to support?~~ → Sepolia (default) + Mainnet for demos
