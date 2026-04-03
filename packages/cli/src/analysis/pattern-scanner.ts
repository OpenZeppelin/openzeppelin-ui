import type { ScannedFile } from './scanner';

export interface PatternMatch {
  pattern: string;
  category: 'wallet' | 'storage' | 'tailwind' | 'oz-existing';
  files: string[];
  count: number;
  description: string;
}

interface PatternDefinition {
  name: string;
  category: PatternMatch['category'];
  regex: RegExp;
  description: string;
}

const PATTERNS: PatternDefinition[] = [
  // Wallet patterns
  {
    name: 'wagmi',
    category: 'wallet',
    regex: /from\s+['"]wagmi['"]/,
    description: 'wagmi wallet library',
  },
  {
    name: 'viem',
    category: 'wallet',
    regex: /from\s+['"]viem['"]/,
    description: 'viem Ethereum library',
  },
  {
    name: 'rainbowkit',
    category: 'wallet',
    regex: /from\s+['"]@rainbow-me\/rainbowkit['"]/,
    description: 'RainbowKit wallet UI',
  },
  {
    name: 'ethers',
    category: 'wallet',
    regex: /from\s+['"]ethers['"]/,
    description: 'ethers.js library',
  },
  {
    name: 'web3modal',
    category: 'wallet',
    regex: /from\s+['"]@web3modal\//,
    description: 'Web3Modal',
  },
  {
    name: 'connectkit',
    category: 'wallet',
    regex: /from\s+['"]connectkit['"]/,
    description: 'ConnectKit',
  },

  // Storage patterns
  {
    name: 'localStorage',
    category: 'storage',
    regex: /localStorage\.(getItem|setItem|removeItem)/,
    description: 'Browser localStorage usage',
  },
  {
    name: 'sessionStorage',
    category: 'storage',
    regex: /sessionStorage\.(getItem|setItem|removeItem)/,
    description: 'Browser sessionStorage usage',
  },
  {
    name: 'indexedDB',
    category: 'storage',
    regex: /indexedDB\.open/,
    description: 'IndexedDB direct usage',
  },
  {
    name: 'dexie',
    category: 'storage',
    regex: /from\s+['"]dexie['"]/,
    description: 'Dexie.js IndexedDB wrapper',
  },

  // Existing OZ packages
  {
    name: 'oz-ui-components',
    category: 'oz-existing',
    regex: /from\s+['"]@openzeppelin\/ui-components['"]/,
    description: 'OZ UI Components already installed',
  },
  {
    name: 'oz-ui-react',
    category: 'oz-existing',
    regex: /from\s+['"]@openzeppelin\/ui-react['"]/,
    description: 'OZ UI React already installed',
  },
  {
    name: 'oz-adapter',
    category: 'oz-existing',
    regex: /from\s+['"]@openzeppelin\/adapter-/,
    description: 'OZ Adapter already installed',
  },
];

export function scanPatterns(files: ScannedFile[]): PatternMatch[] {
  const results = new Map<string, PatternMatch>();

  for (const pattern of PATTERNS) {
    results.set(pattern.name, {
      pattern: pattern.name,
      category: pattern.category,
      files: [],
      count: 0,
      description: pattern.description,
    });
  }

  for (const file of files) {
    for (const pattern of PATTERNS) {
      const matches = [...file.content.matchAll(new RegExp(pattern.regex, 'g'))];
      if (matches.length === 0) continue;

      const result = results.get(pattern.name)!;
      result.count += matches.length;
      if (!result.files.includes(file.relativePath)) {
        result.files.push(file.relativePath);
      }
    }
  }

  return [...results.values()].filter((r) => r.count > 0);
}
