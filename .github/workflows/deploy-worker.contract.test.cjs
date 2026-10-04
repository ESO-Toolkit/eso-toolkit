const { readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');
const { resolve } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');

const workflowPath = resolve(__dirname, 'deploy-worker.yml');

const getEdgeRouterBuildStep = (workflow) =>
  workflow.jobs.deploy.steps.find((step) => step.name === 'Build edge-router assets');

test('production asset builds install development build tools before invoking the build', () => {
  const workflow = yaml.load(readFileSync(workflowPath, 'utf8'));
  const buildStep = getEdgeRouterBuildStep(workflow);
  const commands = buildStep.run.trim().split('\n');
  const installIndex = commands.findIndex((command) => /\bnpm\s+ci\b/.test(command));
  const buildIndex = commands.findIndex((command) => /\bnpm\s+run\s+build\b/.test(command));

  assert.ok(installIndex >= 0 && installIndex < buildIndex, 'install locked tools before building');
  // NODE_ENV=production normally omits Vite and the other development tools.
  assert.match(commands[installIndex], /--include(?:=|\s+)dev\b/);
});

test('worker deployment uses the Wrangler version validated in the API lockfile', () => {
  const workflow = yaml.load(readFileSync(workflowPath, 'utf8'));
  const deployStep = workflow.jobs.deploy.steps.find((step) =>
    step.uses?.startsWith('cloudflare/wrangler-action@'),
  );
  const lockfile = JSON.parse(
    readFileSync(resolve(__dirname, '../../roster-hub-api/package-lock.json'), 'utf8'),
  );

  assert.ok(deployStep, 'expected the worker deployment action');
  assert.equal(deployStep.with.wranglerVersion, lockfile.packages['node_modules/wrangler'].version);
});

test('deploy-worker edge-router build has the production Vite environment contract', () => {
  const workflow = yaml.load(readFileSync(workflowPath, 'utf8'));
  const buildStep = getEdgeRouterBuildStep(workflow);

  assert.ok(buildStep, 'expected the edge-router asset build step');
  assert.deepEqual(buildStep.env, {
    NODE_ENV: 'production',
    GENERATE_SOURCEMAP: 'true',
    VITE_BASE_URL: '/',
    VITE_RELEASE_VERSION: '${{ github.sha }}',
    REACT_APP_VERSION: '${{ github.sha }}',
    VITE_GA_MEASUREMENT_ID: '${{ secrets.VITE_GA_MEASUREMENT_ID }}',
    VITE_DISCORD_CLIENT_ID: '${{ vars.VITE_DISCORD_CLIENT_ID }}',
    VITE_ROSTER_HUB_API_URL: 'https://roster-hub-api.eso-toolkit.workers.dev',
    VITE_HIRES_MAP_BASE: 'https://pub-87ec3d93bfd4456faec17c57e05093d9.r2.dev',
  });
});

test('production Vite embeds the same Rollbar release SHA used for sourcemap uploads', () => {
  const workflow = yaml.load(readFileSync(workflowPath, 'utf8'));
  const buildStep = getEdgeRouterBuildStep(workflow);
  const uploadStep = workflow.jobs.deploy.steps.find(
    (step) => step.uses === './.github/actions/rollbar-sourcemaps',
  );
  const release = '0123456789abcdef0123456789abcdef01234567';
  const resolveRelease = (value) => value.replaceAll('${{ github.sha }}', release);
  const buildEnv = Object.fromEntries(
    Object.entries(buildStep.env).map(([key, value]) => [key, resolveRelease(value)]),
  );
  const embeddedRelease = execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import configure from './vite.config.mjs';
       const config = configure({ command: 'build', mode: 'production' });
       process.stdout.write(config.define['process.env.REACT_APP_VERSION']);`,
    ],
    {
      cwd: resolve(__dirname, '../..'),
      // Clear inherited release values so a local developer setting cannot mask
      // an absent deployment variable.
      env: { ...process.env, REACT_APP_VERSION: '', VITE_RELEASE_VERSION: '', ...buildEnv },
      encoding: 'utf8',
    },
  );

  assert.equal(JSON.parse(embeddedRelease), resolveRelease(uploadStep.with.release_version));
  assert.equal(JSON.parse(embeddedRelease), release);
});

test('edge-router uploads the deployed release maps and removes them before publishing', () => {
  const workflow = yaml.load(readFileSync(workflowPath, 'utf8'));
  const steps = workflow.jobs.deploy.steps;
  const buildIndex = steps.indexOf(getEdgeRouterBuildStep(workflow));
  const uploadIndex = steps.findIndex(
    (step) => step.uses === './.github/actions/rollbar-sourcemaps',
  );
  const cleanupIndex = steps.findIndex(
    (step) => step.name === 'Remove sourcemaps from public edge-router assets',
  );
  const deployIndex = steps.findIndex((step) => step.name === 'Deploy Worker');

  assert.ok(buildIndex >= 0 && buildIndex < uploadIndex);
  assert.ok(uploadIndex < cleanupIndex && cleanupIndex < deployIndex);
  assert.equal(steps[uploadIndex].if, "inputs.worker == 'edge-router'");
  assert.equal(steps[uploadIndex]['continue-on-error'], true);
  assert.deepEqual(steps[uploadIndex].with, {
    access_token: '${{ secrets.ROLLBAR_SERVER_TOKEN }}',
    release_version: steps[buildIndex].env.VITE_RELEASE_VERSION,
    deployment_url: 'https://esotk.com',
    build_dir: './build',
  });
  assert.equal(steps[cleanupIndex].if, "inputs.worker == 'edge-router'");
  assert.equal(steps[cleanupIndex].run, "find build -type f -name '*.map' -delete");
  assert.equal(steps[cleanupIndex]['continue-on-error'], undefined);
  // A second build after upload would publish assets whose maps were not uploaded.
  assert.ok(steps.slice(uploadIndex + 1).every((step) => !step.run?.includes('npm run build')));
});
