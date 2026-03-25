import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { extractPackedFilename, resolvePackedFilename } from './localDev';

describe('resolvePackedFilename', () => {
  it('keeps absolute pnpm pack filenames unchanged', () => {
    const destinationDir = '/tmp/packed';
    const absoluteFilename = '/tmp/packed/openzeppelin-ui-components-1.4.0.tgz';

    expect(resolvePackedFilename(destinationDir, absoluteFilename)).toBe(absoluteFilename);
  });

  it('joins relative pnpm pack filenames to the destination directory', () => {
    const destinationDir = '/tmp/packed';
    const relativeFilename = 'openzeppelin-ui-components-1.4.0.tgz';

    expect(resolvePackedFilename(destinationDir, relativeFilename)).toBe(
      path.join(destinationDir, relativeFilename)
    );
  });
});

describe('extractPackedFilename', () => {
  it('reads the filename from object-shaped pnpm output', () => {
    expect(extractPackedFilename(JSON.stringify({ filename: 'package.tgz' }))).toBe('package.tgz');
  });

  it('reads the filename from array-shaped pnpm output', () => {
    expect(extractPackedFilename(JSON.stringify([{ filename: 'package.tgz' }]))).toBe(
      'package.tgz'
    );
  });

  it('returns null when no filename is present', () => {
    expect(extractPackedFilename(JSON.stringify([{ path: 'package.tgz' }]))).toBeNull();
  });
});
