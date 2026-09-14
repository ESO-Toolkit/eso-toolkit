const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');

const workflowPath = resolve(__dirname, 'deploy-worker.yml');

const getEdgeRouterBuildStep = (workflow) =>
  workflow.jobs.deploy.steps.find((step) => step.name === 'Build edge-router assets');

test('deploy-worker edge-router build has the production Vite environment contract', () => {
  const workflow = yaml.load(readFileSync(workflowPath, 'utf8'));
  const buildStep = getEdgeRouterBuildStep(workflow);

  assert.ok(buildStep, 'expected the edge-router asset build step');
  assert.deepEqual(buildStep.env, {
    NODE_ENV: 'production',
    VITE_BASE_URL: '/',
    VITE_RELEASE_VERSION: '${{ github.sha }}',
    VITE_GA_MEASUREMENT_ID: '${{ secrets.VITE_GA_MEASUREMENT_ID }}',
    VITE_DISCORD_CLIENT_ID: '${{ vars.VITE_DISCORD_CLIENT_ID }}',
    VITE_ROSTER_HUB_API_URL: 'https://roster-hub-api.eso-toolkit.workers.dev',
    VITE_HIRES_MAP_BASE: 'https://pub-87ec3d93bfd4456faec17c57e05093d9.r2.dev',
  });
});
