import type { CodeViewLanguage } from '../../types';

export const LANGUAGE_SAMPLES: Record<Exclude<CodeViewLanguage, 'plaintext'>, string> = {
  rust: '#![no_std]\npub fn transfer(from: &Address, amount: u128) -> Result<(), Error> {\n    Ok(())\n}\n',
  toml: '[package]\nname = "rwa-token"\nversion = "0.1.0"\n',
  shell: '#!/usr/bin/env bash\nset -euo pipefail\necho "deploy"\n',
  json: '{\n  "admin": "GCEXAMPLEOWNER",\n  "network": "testnet"\n}\n',
  markdown: '# RWA Token\n\nRun `./scripts/deploy.sh` after **build**.\n',
};

export const RUST_KEYWORD_FIXTURE = 'fn main() { let x: u32 = 1; }';

/** Representative token class per highlighted language (not snapshot-only). */
export const EXPECTED_TOKEN_CLASS: Record<Exclude<CodeViewLanguage, 'plaintext'>, string> = {
  rust: 'hljs-keyword',
  toml: 'hljs-attr',
  shell: 'hljs-built_in',
  json: 'hljs-attr',
  markdown: 'hljs-section',
};

export const SOURCE_FIDELITY_FIXTURES: ReadonlyArray<{
  label: string;
  source: string;
  language: CodeViewLanguage;
}> = [
  { label: 'empty', source: '', language: 'plaintext' },
  { label: 'spaces and tabs', source: '  \t indented', language: 'plaintext' },
  { label: 'trailing newline', source: 'line one\nline two\n', language: 'plaintext' },
  { label: 'unicode', source: 'let emoji = "🛡️";\n', language: 'rust' },
  {
    label: 'html-like script',
    source: '<script>alert("x")</script>\n',
    language: 'plaintext',
  },
];
