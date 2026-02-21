import { ChampionPointAbilityId } from '@/types/champion-points';

export interface ParseSavedVariablesOptions {
  tableName?: string;
}

export interface SerializeSavedVariablesOptions {
  tableName?: string;
  indent?: string;
  newline?: string;
}

export type LuaPrimitive = string | number | boolean | null;
export type LuaValue = LuaPrimitive | LuaValue[] | { [key: string]: LuaValue };

export interface WizardWardrobeSavedVariablesCharacter {
  setups?: Record<string, unknown>;
  pages?: Record<string, unknown>;
  prebuffs?: Record<string, unknown>;
  autoEquipSetups?: boolean;
  selectedZoneTag?: Record<string, string>;
  selectedCharacterId?: string;
  version?: number;
  $LastCharacterName?: string;
  [key: string]: unknown;
}

export interface WizardWardrobeSavedVariablesAccount {
  $AccountWide?: WizardWardrobeSavedVariablesCharacter;
  [characterId: string]: WizardWardrobeSavedVariablesCharacter | undefined;
}

export interface WizardWardrobeSavedVariables {
  Default?: Record<string, WizardWardrobeSavedVariablesAccount>;
  [key: string]: unknown;
}

const DEFAULT_TABLE_NAME = 'WizardsWardrobeSV';

export function parseWizardsWardrobeSavedVariables(
  luaSource: string,
  options: ParseSavedVariablesOptions = {},
): WizardWardrobeSavedVariables {
  const tableName = options.tableName ?? DEFAULT_TABLE_NAME;
  const assignments = parseLuaAssignments(luaSource);
  if (!(tableName in assignments)) {
    throw new Error(`Unable to find a top-level assignment to ${tableName}.`);
  }
  const parsed = assignments[tableName];
  return coerceEnums(parsed) as WizardWardrobeSavedVariables;
}

export function serializeWizardsWardrobeSavedVariables(
  data: WizardWardrobeSavedVariables,
  options: SerializeSavedVariablesOptions = {},
): string {
  const tableName = options.tableName ?? DEFAULT_TABLE_NAME;
  const indent = options.indent ?? '  ';
  const newline = options.newline ?? '\n';
  const tableValue = serializeLuaValue(data as LuaValue, 0, indent, newline);
  return `${tableName} = ${tableValue}${newline}`;
}

const CHAMPION_POINT_IDS = new Set<number>(
  Object.values(ChampionPointAbilityId).filter(
    (value): value is number => typeof value === 'number',
  ),
);

export function parseLuaAssignments(luaSource: string): Record<string, LuaValue> {
  const parser = new LuaTableParser(luaSource);
  return parser.parseChunk();
}

function coerceEnums(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => coerceEnums(entry));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    if (key === 'cp') {
      output[key] = coerceChampionPointValues(entry);
      continue;
    }

    output[key] = coerceEnums(entry);
  }

  return output;
}

function coerceChampionPointValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    const mapped: Record<string, unknown> = {};
    value.forEach((entry, index) => {
      mapped[String(index + 1)] = coerceChampionPointValue(entry);
    });
    return mapped;
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, entry] of Object.entries(record)) {
    output[key] = coerceChampionPointValue(entry);
  }

  return output;
}

function coerceChampionPointValue(value: unknown): unknown {
  if (typeof value === 'number' && CHAMPION_POINT_IDS.has(value)) {
    return value as ChampionPointAbilityId;
  }

  return value;
}

type LuaTokenType =
  | 'braceL'
  | 'braceR'
  | 'bracketL'
  | 'bracketR'
  | 'equals'
  | 'comma'
  | 'identifier'
  | 'string'
  | 'number'
  | 'boolean'
  | 'nil'
  | 'eof';

interface LuaToken {
  type: LuaTokenType;
  value?: string | number | boolean;
  position: number;
}

class LuaTableParser {
  private readonly tokens: LuaToken[];
  private index = 0;

  constructor(luaSource: string) {
    this.tokens = tokenizeLua(luaSource);
  }

  parseChunk(): Record<string, LuaValue> {
    const result: Record<string, LuaValue> = {};

    while (!this.is('eof')) {
      const nameToken = this.consume('identifier');
      this.consume('equals');
      const value = this.parseExpression();
      result[nameToken.value as string] = value;
      this.optional('comma');
    }

    return result;
  }

  private parseExpression(): LuaValue {
    const token = this.peek();
    switch (token.type) {
      case 'braceL':
        return this.parseTable();
      case 'string':
        this.advance();
        return token.value as string;
      case 'number':
        this.advance();
        return token.value as number;
      case 'boolean':
        this.advance();
        return token.value as boolean;
      case 'nil':
        this.advance();
        return null;
      case 'identifier':
        this.advance();
        return token.value as string;
      default:
        throw new Error(`Unexpected token ${token.type} at ${token.position}`);
    }
  }

  private parseTable(): LuaValue {
    this.consume('braceL');

    const obj: Record<string, LuaValue> = {};
    const arr: LuaValue[] = [];
    let hasStringKeys = false;
    let hasImplicitValues = false;
    const numericKeys: number[] = [];

    while (!this.is('braceR')) {
      if (this.is('bracketL')) {
        this.consume('bracketL');
        const keyValue = this.parseExpression();
        this.consume('bracketR');
        this.consume('equals');
        const value = this.parseExpression();
        this.optional('comma');

        if (typeof keyValue === 'string') {
          hasStringKeys = true;
        } else if (typeof keyValue === 'number' && Number.isInteger(keyValue)) {
          numericKeys.push(keyValue);
        }
        obj[String(keyValue)] = value;
        continue;
      }

      if (this.is('identifier') && this.peekNext().type === 'equals') {
        const keyToken = this.consume('identifier');
        this.consume('equals');
        const value = this.parseExpression();
        this.optional('comma');
        hasStringKeys = true;
        obj[keyToken.value as string] = value;
        continue;
      }

      const value = this.parseExpression();
      arr.push(value);
      hasImplicitValues = true;
      this.optional('comma');
    }

    this.consume('braceR');

    if (hasImplicitValues && !hasStringKeys && numericKeys.length === 0) {
      return arr;
    }

    if (!hasStringKeys && numericKeys.length > 0 && !hasImplicitValues) {
      const sortedKeys = [...numericKeys].sort((a, b) => a - b);
      const isConsecutiveFromOne =
        sortedKeys[0] === 1 && sortedKeys.every((key, idx) => key === idx + 1);

      if (isConsecutiveFromOne) {
        const result: LuaValue[] = [];
        for (const key of numericKeys) {
          result[key - 1] = obj[String(key)];
        }
        return result;
      }
    }

    return obj;
  }

  private peek(): LuaToken {
    return this.tokens[this.index];
  }

  private peekNext(): LuaToken {
    return this.tokens[this.index + 1] ?? this.tokens[this.tokens.length - 1];
  }

  private is(type: LuaTokenType): boolean {
    return this.peek().type === type;
  }

  private advance(): LuaToken {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  private consume(type: LuaTokenType): LuaToken {
    const token = this.peek();
    if (token.type !== type) {
      throw new Error(`Expected ${type} but found ${token.type} at ${token.position}`);
    }
    return this.advance();
  }

  private optional(type: LuaTokenType): void {
    if (this.is(type)) {
      this.advance();
    }
  }
}

function tokenizeLua(source: string): LuaToken[] {
  const tokens: LuaToken[] = [];
  const length = source.length;
  let index = 0;

  const push = (type: LuaTokenType, value?: LuaToken['value'], position?: number): void => {
    tokens.push({ type, value, position: position ?? index });
  };

  while (index < length) {
    const char = source[index];

    if (isWhitespace(char)) {
      index += 1;
      continue;
    }

    if (char === '-' && source[index + 1] === '-') {
      if (source[index + 2] === '[' && source[index + 3] === '[') {
        index += 4;
        while (index < length && !(source[index] === ']' && source[index + 1] === ']')) {
          index += 1;
        }
        index += 2;
        continue;
      }
      while (index < length && source[index] !== '\n') {
        index += 1;
      }
      continue;
    }

    if (char === '{') {
      push('braceL');
      index += 1;
      continue;
    }
    if (char === '}') {
      push('braceR');
      index += 1;
      continue;
    }
    if (char === '[') {
      push('bracketL');
      index += 1;
      continue;
    }
    if (char === ']') {
      push('bracketR');
      index += 1;
      continue;
    }
    if (char === '=') {
      push('equals');
      index += 1;
      continue;
    }
    if (char === ',') {
      push('comma');
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const { value, nextIndex } = readLuaString(source, index);
      push('string', value, index);
      index = nextIndex;
      continue;
    }

    if (isDigit(char) || (char === '-' && isDigit(source[index + 1]))) {
      const { value, nextIndex } = readLuaNumber(source, index);
      push('number', value, index);
      index = nextIndex;
      continue;
    }

    if (isIdentifierStart(char)) {
      const { value, nextIndex } = readLuaIdentifier(source, index);
      if (value === 'true' || value === 'false') {
        push('boolean', value === 'true', index);
      } else if (value === 'nil') {
        push('nil', undefined, index);
      } else {
        push('identifier', value, index);
      }
      index = nextIndex;
      continue;
    }

    throw new Error(`Unexpected character '${char}' at ${index}`);
  }

  tokens.push({ type: 'eof', position: index });
  return tokens;
}

function isWhitespace(char: string): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}

function isDigit(char: string | undefined): boolean {
  return !!char && char >= '0' && char <= '9';
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

function readLuaIdentifier(source: string, start: number): { value: string; nextIndex: number } {
  let index = start;
  while (index < source.length && isIdentifierPart(source[index])) {
    index += 1;
  }
  return { value: source.slice(start, index), nextIndex: index };
}

function readLuaNumber(source: string, start: number): { value: number; nextIndex: number } {
  let index = start;
  if (source[index] === '-') {
    index += 1;
  }
  while (index < source.length && isDigit(source[index])) {
    index += 1;
  }
  if (source[index] === '.') {
    index += 1;
    while (index < source.length && isDigit(source[index])) {
      index += 1;
    }
  }
  const raw = source.slice(start, index);
  return { value: Number(raw), nextIndex: index };
}

function readLuaString(source: string, start: number): { value: string; nextIndex: number } {
  const quote = source[start];
  let index = start + 1;
  let value = '';

  while (index < source.length) {
    const char = source[index];
    if (char === quote) {
      return { value, nextIndex: index + 1 };
    }
    if (char === '\\') {
      const next = source[index + 1];
      switch (next) {
        case 'n':
          value += '\n';
          break;
        case 'r':
          value += '\r';
          break;
        case 't':
          value += '\t';
          break;
        case '"':
          value += '"';
          break;
        case "'":
          value += "'";
          break;
        case '\\':
          value += '\\';
          break;
        default:
          value += next ?? '';
          break;
      }
      index += 2;
      continue;
    }
    value += char;
    index += 1;
  }

  throw new Error(`Unterminated string starting at ${start}`);
}

function serializeLuaValue(
  value: LuaValue,
  depth: number,
  indent: string,
  newline: string,
): string {
  if (value === null || value === undefined) {
    return 'nil';
  }

  if (Array.isArray(value)) {
    return serializeLuaArray(value, depth, indent, newline);
  }

  switch (typeof value) {
    case 'string':
      return `"${escapeLuaString(value)}"`;
    case 'number':
      if (Number.isFinite(value)) {
        return String(value);
      }
      return 'nil';
    case 'boolean':
      return value ? 'true' : 'false';
    case 'object':
      return serializeLuaObject(value as Record<string, LuaValue>, depth, indent, newline);
    default:
      return 'nil';
  }
}

function serializeLuaArray(
  value: LuaValue[],
  depth: number,
  indent: string,
  newline: string,
): string {
  if (value.length === 0) {
    return '{}';
  }

  const nextDepth = depth + 1;
  const prefix = indent.repeat(nextDepth);
  const lines = value.map(
    (entry, index) =>
      `${prefix}[${index + 1}] = ${serializeLuaValue(entry, nextDepth, indent, newline)},`,
  );
  return `{${newline}${lines.join(newline)}${newline}${indent.repeat(depth)}}`;
}

function serializeLuaObject(
  value: Record<string, LuaValue>,
  depth: number,
  indent: string,
  newline: string,
): string {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return '{}';
  }

  const nextDepth = depth + 1;
  const prefix = indent.repeat(nextDepth);
  const lines = entries.map(([key, entry]) => {
    const normalizedKey = serializeLuaKey(key);
    const serializedValue = serializeLuaValue(entry, nextDepth, indent, newline);
    return `${prefix}${normalizedKey} = ${serializedValue},`;
  });

  return `{${newline}${lines.join(newline)}${newline}${indent.repeat(depth)}}`;
}

function serializeLuaKey(key: string): string {
  if (isNumericKey(key)) {
    return `[${key}]`;
  }

  if (isValidLuaIdentifier(key)) {
    return key;
  }

  return `["${escapeLuaString(key)}"]`;
}

function isNumericKey(key: string): boolean {
  if (key.trim() === '') {
    return false;
  }
  const numberValue = Number(key);
  return Number.isInteger(numberValue) && String(numberValue) === key;
}

function isValidLuaIdentifier(key: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(key);
}

function escapeLuaString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/"/g, '\\"');
}
