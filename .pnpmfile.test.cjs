const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const test = require('node:test');

const temporaryDirectories = [];

function createTemporaryDirectory(prefix) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

test.after(() => {
  for (const directory of temporaryDirectories) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function withEnv(overrides, fn) {
  const previous = new Map();

  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function createAdaptersRepo(name) {
  const repoRoot = createTemporaryDirectory(`${name}-`);
  const packages = [
    ['adapter-evm', '@openzeppelin/adapter-evm', '1.0.0'],
    ['adapters-vite', '@openzeppelin/adapters-vite', '1.1.0'],
  ];

  for (const [directoryName, packageName, version] of packages) {
    const packageRoot = path.join(repoRoot, 'packages', directoryName);
    fs.mkdirSync(packageRoot, { recursive: true });
    fs.writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name: packageName, version }, null, 2)
    );
  }

  return repoRoot;
}

function loadHook() {
  const hookPath = require.resolve('./.pnpmfile.cjs');
  delete require.cache[hookPath];
  return require(hookPath);
}

function createPackage() {
  return {
    dependencies: {
      '@openzeppelin/adapter-evm': '^1.0.0',
    },
    devDependencies: {
      '@openzeppelin/adapters-vite': '^1.1.0',
    },
  };
}

function getPackedManifestPath(familyKey) {
  return path.join(__dirname, '.packed-packages', 'local-dev', `${familyKey}.json`);
}

function withPackedManifest(familyKey, packages, fn) {
  const manifestPath = getPackedManifestPath(familyKey);
  const manifestDir = path.dirname(manifestPath);
  const hadManifest = fs.existsSync(manifestPath);
  const previous = hadManifest ? fs.readFileSync(manifestPath, 'utf8') : null;

  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        repoRoot: '/tmp/local-dev-test',
        packages,
      },
      null,
      2
    )
  );

  try {
    return fn();
  } finally {
    if (hadManifest) {
      fs.writeFileSync(manifestPath, previous);
    } else if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath);
    }
  }
}

function withoutPackedManifest(familyKey, fn) {
  const manifestPath = getPackedManifestPath(familyKey);
  const hadManifest = fs.existsSync(manifestPath);
  const previous = hadManifest ? fs.readFileSync(manifestPath, 'utf8') : null;

  if (hadManifest) {
    fs.unlinkSync(manifestPath);
  }

  try {
    return fn();
  } finally {
    if (hadManifest) {
      fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
      fs.writeFileSync(manifestPath, previous);
    }
  }
}

test('rewrites adapter dependencies when LOCAL_ADAPTERS_PATH is set', () => {
  withoutPackedManifest('adapters', () => {
    const preferredRepo = createAdaptersRepo('adapters-preferred');
    const logs = [];
    const { hooks } = loadHook();

    const pkg = withEnv(
      {
        LOCAL_ADAPTERS: 'true',
        LOCAL_ADAPTERS_PATH: preferredRepo,
      },
      () =>
        hooks.readPackage(createPackage(), {
          dir: process.cwd(),
          log: (message) => logs.push(message),
        })
    );

    const canonicalPackageRoot = fs.realpathSync(path.join(preferredRepo, 'packages', 'adapter-evm'));
    const canonicalVitePackageRoot = fs.realpathSync(
      path.join(preferredRepo, 'packages', 'adapters-vite')
    );
    assert.equal(
      pkg.dependencies['@openzeppelin/adapter-evm'],
      `file:${canonicalPackageRoot}`
    );
    assert.equal(pkg.devDependencies['@openzeppelin/adapters-vite'], `file:${canonicalVitePackageRoot}`);
    assert.ok(logs.some((entry) => /@openzeppelin\/adapter-evm/.test(entry)));
    assert.ok(logs.some((entry) => /@openzeppelin\/adapters-vite/.test(entry)));
  });
});

test('throws a clear error when the configured adapters path does not exist', () => {
  withoutPackedManifest('adapters', () => {
    const missingRepo = path.join(os.tmpdir(), 'missing-openzeppelin-adapters');
    const { hooks } = loadHook();

    assert.throws(
      () =>
        withEnv(
          {
            LOCAL_ADAPTERS: 'true',
            LOCAL_ADAPTERS_PATH: missingRepo,
          },
          () => hooks.readPackage(createPackage(), { dir: process.cwd(), log: () => {} })
        ),
      (error) => {
        assert.match(error.message, /openzeppelin-adapters checkout not found/);
        assert.match(error.message, /LOCAL_ADAPTERS_PATH/);
        assert.match(error.message, new RegExp(missingRepo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        return true;
      }
    );
  });
});

test('prefers packed local tarballs when a manifest is present', () => {
  const adaptersRepo = createAdaptersRepo('adapters-packed');
  const tarballDir = createTemporaryDirectory('openzeppelin-ui-packed-');
  const tarballPath = path.join(tarballDir, 'openzeppelin-adapter-evm-1.0.0.tgz');
  fs.writeFileSync(tarballPath, 'stub tarball');

  const { hooks } = loadHook();
  const pkg = {
    dependencies: {
      '@openzeppelin/adapter-evm': '^1.0.0',
    },
    devDependencies: {
      '@openzeppelin/adapters-vite': '^1.1.0',
    },
  };

  const updated = withPackedManifest(
    'adapters',
    {
      '@openzeppelin/adapter-evm': tarballPath,
      '@openzeppelin/adapters-vite': tarballPath,
    },
    () =>
      withEnv(
        {
          LOCAL_ADAPTERS: 'true',
          LOCAL_ADAPTERS_PATH: adaptersRepo,
        },
        () => hooks.readPackage(pkg, { dir: process.cwd(), log: () => {} })
      )
  );

  assert.equal(updated.dependencies['@openzeppelin/adapter-evm'], `file:${tarballPath}`);
  assert.equal(updated.devDependencies['@openzeppelin/adapters-vite'], `file:${tarballPath}`);
});

test('keeps the overlay sticky on a flag-less install when a packed manifest is present', () => {
  const tarballDir = createTemporaryDirectory('openzeppelin-ui-sticky-');
  const tarballPath = path.join(tarballDir, 'openzeppelin-adapter-evm-1.0.0.tgz');
  fs.writeFileSync(tarballPath, 'stub tarball');

  const { hooks } = loadHook();

  const updated = withPackedManifest(
    'adapters',
    {
      '@openzeppelin/adapter-evm': tarballPath,
      '@openzeppelin/adapters-vite': tarballPath,
    },
    () =>
      withEnv({ LOCAL_ADAPTERS: undefined, LOCAL_ADAPTERS_PATH: undefined }, () =>
        hooks.readPackage(createPackage(), { dir: process.cwd(), log: () => {} })
      )
  );

  assert.equal(updated.dependencies['@openzeppelin/adapter-evm'], `file:${tarballPath}`);
  assert.equal(updated.devDependencies['@openzeppelin/adapters-vite'], `file:${tarballPath}`);
});

test('honors an explicit LOCAL_ADAPTERS=false even when a packed manifest is present', () => {
  const tarballDir = createTemporaryDirectory('openzeppelin-ui-optout-');
  const tarballPath = path.join(tarballDir, 'openzeppelin-adapter-evm-1.0.0.tgz');
  fs.writeFileSync(tarballPath, 'stub tarball');

  const { hooks } = loadHook();

  const updated = withPackedManifest(
    'adapters',
    {
      '@openzeppelin/adapter-evm': tarballPath,
      '@openzeppelin/adapters-vite': tarballPath,
    },
    () =>
      withEnv({ LOCAL_ADAPTERS: 'false' }, () =>
        hooks.readPackage(createPackage(), { dir: process.cwd(), log: () => {} })
      )
  );

  // Overlay not applied (explicit opt-out). Opt-in widening is also off
  // (LOCAL_ADAPTERS=false / no ALLOW_ADAPTER_PRERELEASES) → caret ranges untouched.
  assert.equal(updated.dependencies['@openzeppelin/adapter-evm'], '^1.0.0');
  assert.equal(updated.devDependencies['@openzeppelin/adapters-vite'], '^1.1.0');
});

test('does not apply the overlay on a normal install with no manifest and no flags', () => {
  withoutPackedManifest('adapters', () => {
    const { hooks } = loadHook();

    const updated = withEnv(
      { LOCAL_ADAPTERS: undefined, LOCAL_ADAPTERS_PATH: undefined },
      () => hooks.readPackage(createPackage(), { dir: process.cwd(), log: () => {} })
    );

    // No file: overlay and no opt-in widening flag → original caret ranges unchanged.
    assert.equal(updated.dependencies['@openzeppelin/adapter-evm'], '^1.0.0');
    assert.equal(updated.devDependencies['@openzeppelin/adapters-vite'], '^1.1.0');
  });
});

test('a sticky install never links a repo path (or throws) when the packed tarball is missing', () => {
  const missingTarball = path.join(os.tmpdir(), 'openzeppelin-adapter-evm-missing.tgz');
  const { hooks } = loadHook();

  const updated = withPackedManifest(
    'adapters',
    {
      '@openzeppelin/adapter-evm': missingTarball,
      '@openzeppelin/adapters-vite': missingTarball,
    },
    () =>
      // A missing repo path would make the env-driven path throw "checkout not found";
      // the flag-less sticky path must stay packed-only and leave the deps on their ranges.
      withEnv({ LOCAL_ADAPTERS: undefined, LOCAL_ADAPTERS_PATH: '../does-not-exist' }, () =>
        hooks.readPackage(createPackage(), { dir: process.cwd(), log: () => {} })
      )
  );

  // No repo-path link, no throw, and no opt-in widening → original caret ranges unchanged.
  assert.equal(updated.dependencies['@openzeppelin/adapter-evm'], '^1.0.0');
  assert.equal(updated.devDependencies['@openzeppelin/adapters-vite'], '^1.1.0');
});

test('throws a clear error when a configured package directory is missing package.json', () => {
  withoutPackedManifest('adapters', () => {
    const adaptersRepo = createTemporaryDirectory('adapters-without-package-json-');
    fs.mkdirSync(path.join(adaptersRepo, 'packages', 'adapter-evm'), { recursive: true });
    const { hooks } = loadHook();

    assert.throws(
      () =>
        withEnv(
          {
            LOCAL_ADAPTERS: 'true',
            LOCAL_ADAPTERS_PATH: adaptersRepo,
          },
          () => hooks.readPackage(createPackage(), { dir: process.cwd(), log: () => {} })
        ),
      (error) => {
        assert.match(error.message, /package\.json/);
        assert.match(error.message, /@openzeppelin\/adapter-evm/);
        return true;
      }
    );
  });
});

test('resolves default family paths from the workspace root instead of context.dir', () => {
  const containerRoot = createTemporaryDirectory('pnpmfile-fixture-');
  const workspaceRoot = path.join(containerRoot, 'consumer-app');
  const adaptersRepo = path.join(containerRoot, 'openzeppelin-adapters');
  const nestedContextDir = path.join(workspaceRoot, 'packages', 'consumer-app');
  fs.mkdirSync(workspaceRoot, { recursive: true });
  const evmPackageRoot = path.join(adaptersRepo, 'packages', 'adapter-evm');
  const vitePackageRoot = path.join(adaptersRepo, 'packages', 'adapters-vite');
  fs.mkdirSync(evmPackageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(evmPackageRoot, 'package.json'),
    JSON.stringify({ name: '@openzeppelin/adapter-evm', version: '1.0.0' }, null, 2)
  );
  fs.mkdirSync(vitePackageRoot, { recursive: true });
  fs.writeFileSync(
    path.join(vitePackageRoot, 'package.json'),
    JSON.stringify({ name: '@openzeppelin/adapters-vite', version: '1.1.0' }, null, 2)
  );
  fs.mkdirSync(nestedContextDir, { recursive: true });

  fs.copyFileSync(path.join(__dirname, '.pnpmfile.cjs'), path.join(workspaceRoot, '.pnpmfile.cjs'));
  fs.writeFileSync(
    path.join(workspaceRoot, '.openzeppelin-dev.json'),
    JSON.stringify(
      {
        version: 1,
        families: {
          adapters: {},
        },
      },
      null,
      2
    )
  );

  const hookPath = path.join(workspaceRoot, '.pnpmfile.cjs');
  delete require.cache[hookPath];
  const { hooks } = require(hookPath);

  const pkg = withEnv(
    {
      LOCAL_ADAPTERS: 'true',
    },
    () =>
      hooks.readPackage(createPackage(), {
        dir: nestedContextDir,
        log: () => {},
      })
  );

  assert.equal(
    pkg.dependencies['@openzeppelin/adapter-evm'],
    `file:${fs.realpathSync(path.join(adaptersRepo, 'packages', 'adapter-evm'))}`
  );
  assert.equal(
    pkg.devDependencies['@openzeppelin/adapters-vite'],
    `file:${fs.realpathSync(path.join(adaptersRepo, 'packages', 'adapters-vite'))}`
  );
});

test('rejects inherited family keys from malformed config payloads', () => {
  const workspaceRoot = createTemporaryDirectory('pnpmfile-prototype-');
  const pnpmfilePath = path.join(workspaceRoot, '.pnpmfile.cjs');
  const configPath = path.join(workspaceRoot, '.openzeppelin-dev.json');

  fs.copyFileSync(path.join(__dirname, '.pnpmfile.cjs'), pnpmfilePath);
  fs.writeFileSync(
    configPath,
    '{\n  "version": 1,\n  "families": {\n    "__proto__": {}\n  }\n}\n'
  );

  delete require.cache[pnpmfilePath];
  const { hooks } = require(pnpmfilePath);

  assert.throws(
    () =>
      withEnv(
        {
          LOCAL_ADAPTERS: 'true',
        },
        () => hooks.readPackage(createPackage(), { dir: workspaceRoot, log: () => {} })
      ),
    /Unsupported family "__proto__"/
  );
});

test('rejects cache directories that escape the workspace root', () => {
  const workspaceRoot = createTemporaryDirectory('pnpmfile-cache-escape-');
  const pnpmfilePath = path.join(workspaceRoot, '.pnpmfile.cjs');
  const configPath = path.join(workspaceRoot, '.openzeppelin-dev.json');

  fs.copyFileSync(path.join(__dirname, '.pnpmfile.cjs'), pnpmfilePath);
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      {
        version: 1,
        cacheDir: '../outside-cache',
        families: {
          adapters: {},
        },
      },
      null,
      2
    )
  );

  delete require.cache[pnpmfilePath];
  const { hooks } = require(pnpmfilePath);

  assert.throws(
    () =>
      withEnv(
        {
          LOCAL_ADAPTERS: 'true',
        },
        () => hooks.readPackage(createPackage(), { dir: workspaceRoot, log: () => {} })
      ),
    /cacheDir".*subdirectory of the workspace root/i
  );
});

test('canonicalizes symlinked repository roots before rewriting file dependencies', () => {
  withoutPackedManifest('adapters', () => {
    const containerRoot = createTemporaryDirectory('pnpmfile-symlink-');
    const actualRepo = createAdaptersRepo('adapters-realpath-target');
    const symlinkRepo = path.join(containerRoot, 'adapters-link');
    fs.symlinkSync(actualRepo, symlinkRepo);
    const logs = [];
    const { hooks } = loadHook();

    const pkg = withEnv(
      {
        LOCAL_ADAPTERS: 'true',
        LOCAL_ADAPTERS_PATH: symlinkRepo,
      },
      () =>
        hooks.readPackage(createPackage(), {
          dir: process.cwd(),
          log: (message) => logs.push(message),
        })
    );

    const canonicalPackageRoot = fs.realpathSync(path.join(actualRepo, 'packages', 'adapter-evm'));
    const canonicalVitePackageRoot = fs.realpathSync(
      path.join(actualRepo, 'packages', 'adapters-vite')
    );
    assert.equal(pkg.dependencies['@openzeppelin/adapter-evm'], `file:${canonicalPackageRoot}`);
    assert.equal(pkg.devDependencies['@openzeppelin/adapters-vite'], `file:${canonicalVitePackageRoot}`);
    assert.ok(
      logs.some((entry) =>
        new RegExp(canonicalPackageRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(entry)
      )
    );
    assert.ok(
      logs.some((entry) =>
        new RegExp(canonicalVitePackageRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(entry)
      )
    );
  });
});
