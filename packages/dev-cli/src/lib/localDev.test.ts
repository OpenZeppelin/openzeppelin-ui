import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { resolvePackedFilename } from './localDev';

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
