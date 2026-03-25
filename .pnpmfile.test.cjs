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
  fs.mkdirSync(path.join(repoRoot, 'packages', 'adapter-evm'), { recursive: true });
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

test('rewrites adapter dependencies when LOCAL_ADAPTERS_PATH is set', () => {
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

  assert.equal(
    pkg.dependencies['@openzeppelin/adapter-evm'],
    `file:${path.join(preferredRepo, 'packages', 'adapter-evm')}`
  );
  assert.match(logs[0], /@openzeppelin\/adapter-evm/);
});

test('throws a clear error when the configured adapters path does not exist', () => {
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
  };

  const updated = withPackedManifest('adapters', { '@openzeppelin/adapter-evm': tarballPath }, () =>
    withEnv(
      {
        LOCAL_ADAPTERS: 'true',
        LOCAL_ADAPTERS_PATH: adaptersRepo,
      },
      () => hooks.readPackage(pkg, { dir: process.cwd(), log: () => {} })
    )
  );

  assert.equal(updated.dependencies['@openzeppelin/adapter-evm'], `file:${tarballPath}`);
});

test('resolves default family paths from the workspace root instead of context.dir', () => {
  const containerRoot = createTemporaryDirectory('pnpmfile-fixture-');
  const workspaceRoot = path.join(containerRoot, 'consumer-app');
  const adaptersRepo = path.join(containerRoot, 'openzeppelin-adapters');
  const nestedContextDir = path.join(workspaceRoot, 'packages', 'consumer-app');
  fs.mkdirSync(workspaceRoot, { recursive: true });
  fs.mkdirSync(path.join(adaptersRepo, 'packages', 'adapter-evm'), { recursive: true });
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
});
