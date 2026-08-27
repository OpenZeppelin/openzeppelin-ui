/** Flat probe-equivalent paths used across FileTree tests. */
export const SAMPLE_PATHS = ['README.md', 'src/index.ts', 'src/contract.rs'] as const;

export const MARKED_PATH = 'src/contract.rs';

export const UNMARKED_PATH = 'README.md';

/** Nested paths for hierarchy and expansion tests. */
export const NESTED_PATHS = [
  'README.md',
  'src/index.ts',
  'src/contract.rs',
  'src/lib/util.rs',
  'src/lib/deep/nested.rs',
] as const;

export const FOLDER_PATH = 'src/lib';

export const NESTED_FILE = 'src/lib/util.rs';

/** Generates `count` unique flat paths under synthetic folders. */
export function syntheticPaths(count: number): string[] {
  const paths: string[] = [];
  for (let i = 0; i < count; i += 1) {
    paths.push(`generated/folder-${Math.floor(i / 100)}/file-${i}.rs`);
  }
  return paths;
}
