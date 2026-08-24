import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ADDON_DIRECTORY = resolve(__dirname, '../addon/ESOTKCompanion');

describe('ESOTK Companion release metadata', () => {
  const manifest = readFileSync(resolve(ADDON_DIRECTORY, 'ESOTKCompanion.txt'), 'utf8');
  const source = readFileSync(resolve(ADDON_DIRECTORY, 'ESOTKCompanion.lua'), 'utf8');
  const readme = readFileSync(resolve(ADDON_DIRECTORY, 'README.md'), 'utf8');

  it('targets the current Update 50 API and one prior API', () => {
    const apiLine = manifest.match(/^## APIVersion:\s+(.+)$/m);

    expect(apiLine?.[1].trim().split(/\s+/)).toEqual(['101049', '101050']);
  });

  it('keeps its payload season aligned with the manifest release', () => {
    expect(source).toMatch(/\bseason\s*=\s*["']U50["']/);
  });

  it('keeps the add-on version and slash command isolated from official ESOtk', () => {
    expect(manifest).toMatch(/^## Version:\s+0\.1\.0$/m);
    expect(source).toMatch(/\bversion\s*=\s*["']0\.1\.0["']/);
    expect(source).toMatch(/SLASH_COMMANDS\[["']\/esotkcompanion["']\]/);
    expect(source).not.toMatch(/SLASH_COMMANDS\[["']\/esotk["']\]/);
    expect(readme).toContain('`/esotkcompanion`');
    expect(readme).toContain('schemaVersion = 1');
  });

  it('ships the declared SavedVariables file and Lua entry point', () => {
    expect(manifest).toMatch(/^## SavedVariables:\s+ESOTKCompanionSV$/m);
    expect(manifest).toMatch(/^ESOTKCompanion\.lua$/m);
  });
});
