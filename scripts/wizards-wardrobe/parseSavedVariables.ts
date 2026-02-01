import fs from 'node:fs';
import path from 'node:path';

import {
  parseWizardsWardrobeSavedVariables,
  serializeWizardsWardrobeSavedVariables,
  type ParseSavedVariablesOptions,
  type SerializeSavedVariablesOptions,
  type WizardWardrobeSavedVariables,
} from '@/features/loadout-manager/utils/wizardsWardrobeSavedVariables';

export { parseWizardsWardrobeSavedVariables, serializeWizardsWardrobeSavedVariables };
export type {
  ParseSavedVariablesOptions,
  SerializeSavedVariablesOptions,
  WizardWardrobeSavedVariables,
} from '@/features/loadout-manager/utils/wizardsWardrobeSavedVariables';

export function parseWizardsWardrobeSavedVariablesFile(
  filePath: string,
  options: ParseSavedVariablesOptions = {},
): WizardWardrobeSavedVariables {
  const luaSource = fs.readFileSync(filePath, 'utf8');
  return parseWizardsWardrobeSavedVariables(luaSource, options);
}

export function writeWizardsWardrobeSavedVariablesJson(
  inputFilePath: string,
  outputFilePath: string,
  options: ParseSavedVariablesOptions = {},
): void {
  const parsed = parseWizardsWardrobeSavedVariablesFile(inputFilePath, options);
  const outputDirectory = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  fs.writeFileSync(outputFilePath, JSON.stringify(parsed, null, 2), 'utf8');
}

export function writeWizardsWardrobeSavedVariablesLua(
  data: WizardWardrobeSavedVariables,
  outputFilePath: string,
  options: SerializeSavedVariablesOptions = {},
): void {
  const luaSource = serializeWizardsWardrobeSavedVariables(data, options);
  const outputDirectory = path.dirname(outputFilePath);
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory, { recursive: true });
  }
  fs.writeFileSync(outputFilePath, luaSource, 'utf8');
}
