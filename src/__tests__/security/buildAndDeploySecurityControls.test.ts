import { readFileSync } from 'node:fs';
import path from 'node:path';

const actionFile = readFileSync(
  path.resolve(__dirname, '../../../.github/actions/build-and-deploy/action.yml'),
  'utf8',
);
const actionLines = actionFile.split(/\r?\n/);

const findStep = (name: string): { index: number; content: string } => {
  const index = actionLines.findIndex((line) => line.trim() === `- name: ${name}`);
  const nextStepIndex = actionLines.findIndex(
    (line, lineIndex) => lineIndex > index && /^ {4}- /.test(line),
  );

  return {
    index,
    content: actionLines
      .slice(index, nextStepIndex === -1 ? actionLines.length : nextStepIndex)
      .join('\n'),
  };
};

describe('build and deploy sourcemap handling', () => {
  it('removes sourcemaps only after Rollbar receives them and before Pages upload', () => {
    const rollbarUpload = findStep('Upload sourcemaps to Rollbar');
    const sourcemapRemoval = findStep('Remove sourcemaps from public artifact');
    const pagesUpload = findStep('Upload Pages artifact');

    expect(rollbarUpload.index).toBeGreaterThanOrEqual(0);
    expect(sourcemapRemoval.index).toBeGreaterThan(rollbarUpload.index);
    expect(pagesUpload.index).toBeGreaterThan(sourcemapRemoval.index);
    expect(sourcemapRemoval.content).toMatch(/find build -type f -name ['"]\*\.map['"] -delete/);
    expect(pagesUpload.content).toContain('actions/upload-pages-artifact');
  });
});
