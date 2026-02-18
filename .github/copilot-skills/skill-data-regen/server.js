#!/usr/bin/env node

/**
 * Skill Data Regeneration MCP Server
 *
 * Provides tools for regenerating ESO skill line TypeScript data files
 * by scraping ESO-Hub.com and cross-referencing with abilities.json.
 *
 * Tools:
 *   - list_skill_lines: List all ESO skill lines with their ESO-Hub URLs
 *   - lookup_ability: Search abilities.json for a skill by name or ID
 *   - validate_skill_module: Validate a generated skill line module against abilities.json
 *   - generate_validation_report: Generate a comprehensive validation report for all skill modules
 *   - get_regen_instructions: Get the full regeneration workflow instructions
 *
 * @module eso-log-aggregator-skill-data-regen
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';

const PROJECT_ROOT = process.cwd();
const ABILITIES_JSON_PATH = resolve(PROJECT_ROOT, 'data/abilities.json');
const SKILL_LINES_DIR = resolve(PROJECT_ROOT, 'src/data/skill-lines');
const VALIDATION_REPORTS_DIR = resolve(PROJECT_ROOT, 'validation-reports');

// Debug logging
const DEBUG = process.env.DEBUG === 'true';
function log(...args) {
  if (DEBUG) console.error('[SkillDataRegen]', new Date().toISOString(), ...args);
}

// ── Skill line registry ───────────────────────────────────────────────

const SKILL_LINES = {
  class: {
    arcanist: [
      { name: 'Herald of the Tome', slug: 'herald-of-the-tome', url: 'https://eso-hub.com/en/skills/arcanist/herald-of-the-tome' },
      { name: 'Soldier of Apocrypha', slug: 'soldier-of-apocrypha', url: 'https://eso-hub.com/en/skills/arcanist/soldier-of-apocrypha' },
      { name: 'Curative Runeforms', slug: 'curative-runeforms', url: 'https://eso-hub.com/en/skills/arcanist/curative-runeforms' },
    ],
    dragonknight: [
      { name: 'Ardent Flame', slug: 'ardent-flame', url: 'https://eso-hub.com/en/skills/dragonknight/ardent-flame' },
      { name: 'Draconic Power', slug: 'draconic-power', url: 'https://eso-hub.com/en/skills/dragonknight/draconic-power' },
      { name: 'Earthen Heart', slug: 'earthen-heart', url: 'https://eso-hub.com/en/skills/dragonknight/earthen-heart' },
    ],
    necromancer: [
      { name: 'Grave Lord', slug: 'grave-lord', url: 'https://eso-hub.com/en/skills/necromancer/grave-lord' },
      { name: 'Bone Tyrant', slug: 'bone-tyrant', url: 'https://eso-hub.com/en/skills/necromancer/bone-tyrant' },
      { name: 'Living Death', slug: 'living-death', url: 'https://eso-hub.com/en/skills/necromancer/living-death' },
    ],
    nightblade: [
      { name: 'Assassination', slug: 'assassination', url: 'https://eso-hub.com/en/skills/nightblade/assassination' },
      { name: 'Shadow', slug: 'shadow', url: 'https://eso-hub.com/en/skills/nightblade/shadow' },
      { name: 'Siphoning', slug: 'siphoning', url: 'https://eso-hub.com/en/skills/nightblade/siphoning' },
    ],
    sorcerer: [
      { name: 'Dark Magic', slug: 'dark-magic', url: 'https://eso-hub.com/en/skills/sorcerer/dark-magic' },
      { name: 'Daedric Summoning', slug: 'daedric-summoning', url: 'https://eso-hub.com/en/skills/sorcerer/daedric-summoning' },
      { name: 'Storm Calling', slug: 'storm-calling', url: 'https://eso-hub.com/en/skills/sorcerer/storm-calling' },
    ],
    templar: [
      { name: 'Aedric Spear', slug: 'aedric-spear', url: 'https://eso-hub.com/en/skills/templar/aedric-spear' },
      { name: "Dawn's Wrath", slug: 'dawns-wrath', url: 'https://eso-hub.com/en/skills/templar/dawns-wrath' },
      { name: 'Restoring Light', slug: 'restoring-light', url: 'https://eso-hub.com/en/skills/templar/restoring-light' },
    ],
    warden: [
      { name: 'Animal Companions', slug: 'animal-companions', url: 'https://eso-hub.com/en/skills/warden/animal-companions' },
      { name: 'Green Balance', slug: 'green-balance', url: 'https://eso-hub.com/en/skills/warden/green-balance' },
      { name: "Winter's Embrace", slug: 'winters-embrace', url: 'https://eso-hub.com/en/skills/warden/winters-embrace' },
    ],
  },
  weapon: [
    { name: 'Two Handed', slug: 'two-handed', url: 'https://eso-hub.com/en/skills/weapon/two-handed' },
    { name: 'One Hand and Shield', slug: 'one-hand-and-shield', url: 'https://eso-hub.com/en/skills/weapon/one-hand-and-shield' },
    { name: 'Dual Wield', slug: 'dual-wield', url: 'https://eso-hub.com/en/skills/weapon/dual-wield' },
    { name: 'Bow', slug: 'bow', url: 'https://eso-hub.com/en/skills/weapon/bow' },
    { name: 'Destruction Staff', slug: 'destruction-staff', url: 'https://eso-hub.com/en/skills/weapon/destruction-staff' },
    { name: 'Restoration Staff', slug: 'restoration-staff', url: 'https://eso-hub.com/en/skills/weapon/restoration-staff' },
  ],
  armor: [
    { name: 'Light Armor', slug: 'light-armor', url: 'https://eso-hub.com/en/skills/armor/light-armor' },
    { name: 'Medium Armor', slug: 'medium-armor', url: 'https://eso-hub.com/en/skills/armor/medium-armor' },
    { name: 'Heavy Armor', slug: 'heavy-armor', url: 'https://eso-hub.com/en/skills/armor/heavy-armor' },
  ],
  guild: [
    { name: "Mages Guild", slug: 'mages-guild', url: 'https://eso-hub.com/en/skills/guild/mages-guild' },
    { name: "Fighters Guild", slug: 'fighters-guild', url: 'https://eso-hub.com/en/skills/guild/fighters-guild' },
    { name: 'Undaunted', slug: 'undaunted', url: 'https://eso-hub.com/en/skills/guild/undaunted' },
    { name: "Thieves Guild", slug: 'thieves-guild', url: 'https://eso-hub.com/en/skills/guild/thieves-guild' },
    { name: 'Dark Brotherhood', slug: 'dark-brotherhood', url: 'https://eso-hub.com/en/skills/guild/dark-brotherhood' },
    { name: 'Psijic Order', slug: 'psijic-order', url: 'https://eso-hub.com/en/skills/guild/psijic-order' },
  ],
  'alliance-war': [
    { name: 'Assault', slug: 'assault', url: 'https://eso-hub.com/en/skills/alliance-war/assault' },
    { name: 'Support', slug: 'support', url: 'https://eso-hub.com/en/skills/alliance-war/support' },
    { name: 'Emperor', slug: 'emperor', url: 'https://eso-hub.com/en/skills/alliance-war/emperor' },
  ],
  world: [
    { name: 'Soul Magic', slug: 'soul-magic', url: 'https://eso-hub.com/en/skills/world/soul-magic' },
    { name: 'Werewolf', slug: 'werewolf', url: 'https://eso-hub.com/en/skills/world/werewolf' },
    { name: 'Vampire', slug: 'vampire', url: 'https://eso-hub.com/en/skills/world/vampire' },
    { name: 'Scrying', slug: 'scrying', url: 'https://eso-hub.com/en/skills/world/scrying' },
    { name: 'Excavation', slug: 'excavation', url: 'https://eso-hub.com/en/skills/world/excavation' },
    { name: 'Legerdemain', slug: 'legerdemain', url: 'https://eso-hub.com/en/skills/world/legerdemain' },
  ],
  racial: [
    { name: 'Racial', slug: 'racial', url: 'https://eso-hub.com/en/skills/racial' },
  ],
  craft: [
    { name: 'Alchemy', slug: 'alchemy', url: 'https://eso-hub.com/en/skills/craft/alchemy' },
    { name: 'Blacksmithing', slug: 'blacksmithing', url: 'https://eso-hub.com/en/skills/craft/blacksmithing' },
    { name: 'Clothing', slug: 'clothing', url: 'https://eso-hub.com/en/skills/craft/clothing' },
    { name: 'Enchanting', slug: 'enchanting', url: 'https://eso-hub.com/en/skills/craft/enchanting' },
    { name: 'Jewelry Crafting', slug: 'jewelry-crafting', url: 'https://eso-hub.com/en/skills/craft/jewelry-crafting' },
    { name: 'Provisioning', slug: 'provisioning', url: 'https://eso-hub.com/en/skills/craft/provisioning' },
    { name: 'Woodworking', slug: 'woodworking', url: 'https://eso-hub.com/en/skills/craft/woodworking' },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────

let abilitiesCache = null;

function loadAbilities() {
  if (abilitiesCache) return abilitiesCache;
  if (!existsSync(ABILITIES_JSON_PATH)) {
    return null;
  }
  abilitiesCache = JSON.parse(readFileSync(ABILITIES_JSON_PATH, 'utf8'));
  return abilitiesCache;
}

function searchAbilitiesByName(name) {
  const abilities = loadAbilities();
  if (!abilities) return [];

  const normalizedName = name.toLowerCase().trim();
  const results = [];

  for (const [id, entry] of Object.entries(abilities)) {
    if (typeof entry === 'object' && entry.name) {
      const entryName = entry.name.toLowerCase().trim();
      if (entryName === normalizedName) {
        results.push({ id: parseInt(id, 10), ...entry, matchType: 'exact' });
      } else if (entryName.includes(normalizedName)) {
        results.push({ id: parseInt(id, 10), ...entry, matchType: 'partial' });
      }
    }
  }

  // Sort: exact matches first, then partial
  results.sort((a, b) => {
    if (a.matchType === 'exact' && b.matchType !== 'exact') return -1;
    if (a.matchType !== 'exact' && b.matchType === 'exact') return 1;
    return a.id - b.id;
  });

  return results;
}

function searchAbilitiesById(id) {
  const abilities = loadAbilities();
  if (!abilities) return null;

  const entry = abilities[String(id)];
  if (entry && typeof entry === 'object') {
    return { id: parseInt(id, 10), ...entry };
  }
  return null;
}

function findSkillModuleFiles() {
  const results = [];
  
  function walk(dir) {
    if (!existsSync(dir)) return;
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
        results.push(fullPath);
      }
    }
  }

  walk(SKILL_LINES_DIR);
  return results;
}

function validateSkillModuleFile(filePath) {
  if (!existsSync(filePath)) {
    return { error: `File not found: ${filePath}` };
  }

  const content = readFileSync(filePath, 'utf8');
  const abilities = loadAbilities();
  if (!abilities) {
    return { error: 'abilities.json not found. Cannot validate.' };
  }

  const issues = [];
  const stats = { total: 0, actives: 0, passives: 0, ultimates: 0, resolved: 0, unresolved: 0 };

  // Extract skill names using regex
  const nameMatches = [...content.matchAll(/name:\s*['"]([^'"]+)['"]/g)];
  const idMatches = [...content.matchAll(/id:\s*(\d+|[A-Za-z_.]+)/g)];
  const typeMatches = [...content.matchAll(/type:\s*['"]([^'"]+)['"]/g)];
  const isPassiveMatches = [...content.matchAll(/isPassive:\s*(true|false)/g)];
  const isUltimateMatches = [...content.matchAll(/isUltimate:\s*(true|false)/g)];

  for (let i = 0; i < nameMatches.length; i++) {
    const skillName = nameMatches[i][1];
    stats.total++;

    // Determine type
    const type = typeMatches[i]?.[1] || 'unknown';
    const isPassive = isPassiveMatches[i]?.[1] === 'true' || type === 'passive';
    const isUltimate = isUltimateMatches[i]?.[1] === 'true' || type === 'ultimate';

    if (isPassive) stats.passives++;
    else if (isUltimate) stats.ultimates++;
    else stats.actives++;

    // Check if ID is resolved (not 0 and not a placeholder)
    const idStr = idMatches[i]?.[1];
    const isResolved = idStr && idStr !== '0' && idStr !== 'undefined';

    if (isResolved) {
      stats.resolved++;
    } else {
      stats.unresolved++;
      if (!isPassive) {
        // Active/ultimate skills MUST have resolved IDs
        const searchResults = searchAbilitiesByName(skillName);
        const exactMatches = searchResults.filter(r => r.matchType === 'exact');
        
        if (exactMatches.length > 0) {
          issues.push({
            severity: 'error',
            skill: skillName,
            message: `Active skill has unresolved ID but exists in abilities.json`,
            suggestion: `Use ID ${exactMatches[0].id} (icon: ${exactMatches[0].icon || 'none'})`,
            candidates: exactMatches.slice(0, 3).map(m => ({ id: m.id, name: m.name, icon: m.icon })),
          });
        } else if (searchResults.length > 0) {
          issues.push({
            severity: 'warning',
            skill: skillName,
            message: `Active skill has unresolved ID. Partial matches found in abilities.json.`,
            candidates: searchResults.slice(0, 5).map(m => ({ id: m.id, name: m.name, icon: m.icon })),
          });
        } else {
          issues.push({
            severity: 'error',
            skill: skillName,
            message: `Active skill not found in abilities.json at all`,
          });
        }
      }
    }
  }

  // Check for header comment with source URL
  if (!content.includes('eso-hub.com')) {
    issues.push({
      severity: 'warning',
      skill: '(file-level)',
      message: 'Missing ESO-Hub source URL in file header',
    });
  }

  // Check for SkillLineData import
  if (!content.includes('SkillLineData')) {
    issues.push({
      severity: 'warning',
      skill: '(file-level)',
      message: 'Missing import of SkillLineData type',
    });
  }

  return {
    file: relative(PROJECT_ROOT, filePath),
    stats,
    issues,
    valid: issues.filter(i => i.severity === 'error').length === 0,
  };
}

// ── Tool implementations ──────────────────────────────────────────────

function listSkillLines(category) {
  if (category) {
    const cat = category.toLowerCase();
    if (cat === 'class') {
      // Class lines are nested by class name
      const result = {};
      for (const [className, lines] of Object.entries(SKILL_LINES.class)) {
        result[className] = lines;
      }
      return {
        category: 'class',
        classes: result,
        totalLines: Object.values(result).reduce((sum, lines) => sum + lines.length, 0),
        note: 'Class skill lines have 22 skills each (1 ult + 2 morphs, 5 actives + 10 morphs, 4 passives)',
      };
    }
    
    const lines = SKILL_LINES[cat];
    if (!lines) {
      return {
        error: `Unknown category: ${category}`,
        validCategories: Object.keys(SKILL_LINES),
      };
    }
    return { category: cat, lines, totalLines: lines.length };
  }

  // List all categories with counts
  const summary = {};
  let total = 0;
  for (const [cat, data] of Object.entries(SKILL_LINES)) {
    if (cat === 'class') {
      const classTotal = Object.values(data).reduce((sum, lines) => sum + lines.length, 0);
      summary[cat] = { count: classTotal, classes: Object.keys(data) };
      total += classTotal;
    } else {
      summary[cat] = { count: data.length };
      total += data.length;
    }
  }

  return {
    categories: summary,
    totalSkillLines: total,
    targetDir: relative(PROJECT_ROOT, SKILL_LINES_DIR),
    abilitiesJsonPath: relative(PROJECT_ROOT, ABILITIES_JSON_PATH),
  };
}

function lookupAbility({ name, id }) {
  if (id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) {
      return { error: 'Invalid ID. Must be a number.' };
    }
    const result = searchAbilitiesById(numId);
    if (!result) {
      return { found: false, id: numId, message: `No ability found with ID ${numId}` };
    }
    return { found: true, ...result };
  }

  if (name) {
    const results = searchAbilitiesByName(name);
    if (results.length === 0) {
      return { found: false, name, message: `No abilities found matching "${name}"` };
    }
    return {
      found: true,
      query: name,
      totalMatches: results.length,
      exactMatches: results.filter(r => r.matchType === 'exact').length,
      results: results.slice(0, 20), // Limit to 20 results
    };
  }

  return { error: 'Provide either name or id to search.' };
}

function validateModule(filePath) {
  const resolvedPath = filePath.startsWith('/')
    ? filePath
    : resolve(PROJECT_ROOT, filePath);
  
  return validateSkillModuleFile(resolvedPath);
}

function generateReport() {
  const moduleFiles = findSkillModuleFiles();
  
  if (moduleFiles.length === 0) {
    return {
      message: 'No skill line modules found.',
      expectedDir: relative(PROJECT_ROOT, SKILL_LINES_DIR),
      recommendation: 'Use the regeneration workflow to create skill line modules. Start with class skill lines.',
    };
  }

  const results = moduleFiles.map(f => validateSkillModuleFile(f));
  
  const summary = {
    totalModules: results.length,
    validModules: results.filter(r => r.valid).length,
    invalidModules: results.filter(r => !r.valid).length,
    totalSkills: results.reduce((sum, r) => sum + (r.stats?.total || 0), 0),
    totalResolved: results.reduce((sum, r) => sum + (r.stats?.resolved || 0), 0),
    totalUnresolved: results.reduce((sum, r) => sum + (r.stats?.unresolved || 0), 0),
    totalErrors: results.reduce((sum, r) => sum + (r.issues?.filter(i => i.severity === 'error').length || 0), 0),
    totalWarnings: results.reduce((sum, r) => sum + (r.issues?.filter(i => i.severity === 'warning').length || 0), 0),
  };

  // Save report to file
  if (!existsSync(VALIDATION_REPORTS_DIR)) {
    mkdirSync(VALIDATION_REPORTS_DIR, { recursive: true });
  }
  
  const reportPath = join(VALIDATION_REPORTS_DIR, 'skill-line-regeneration.json');
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    modules: results,
  };
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  return {
    summary,
    reportSavedTo: relative(PROJECT_ROOT, reportPath),
    modules: results.map(r => ({
      file: r.file,
      valid: r.valid,
      stats: r.stats,
      errorCount: r.issues?.filter(i => i.severity === 'error').length || 0,
      warningCount: r.issues?.filter(i => i.severity === 'warning').length || 0,
    })),
  };
}

function getRegenInstructions() {
  return {
    overview: 'Regenerate all TypeScript skill line data files by scraping ESO-Hub.com and cross-referencing with abilities.json.',
    
    targetDir: 'src/data/skill-lines/{category}/{skill-line}.ts',
    abilitiesJson: 'data/abilities.json',
    typeDef: 'src/data/types/skill-line-types.ts',
    enumFile: 'src/features/loadout-manager/data/classSkillIds.ts',

    workflow: [
      {
        step: 1,
        title: 'Navigate ESO-Hub page',
        description: 'Use MCP Playwright browser to navigate to the skill line page and take a snapshot.',
        example: "mcp_microsoft_pla_browser_navigate({ url: 'https://eso-hub.com/en/skills/arcanist/herald-of-the-tome' })",
      },
      {
        step: 2,
        title: 'Extract skill table data',
        description: 'From the snapshot, identify ultimates, actives, and passives. Pay attention to arrows (→) showing base→morph hierarchy.',
      },
      {
        step: 3,
        title: 'Create unified module',
        description: 'Create/overwrite the skill line .ts file with SkillLineData export. Include header comment with ESO-Hub URL and regeneration timestamp.',
      },
      {
        step: 4,
        title: 'Resolve IDs and icons',
        description: 'Use the lookup_ability tool to find numeric IDs and icon names for every active/ultimate skill. Update baseSkillId for morphs.',
      },
      {
        step: 5,
        title: 'Validate',
        description: 'Use the validate_skill_module tool to verify skill count, hierarchy, and ID resolution.',
      },
    ],

    criticalRules: [
      'Active and ultimate skills MUST have resolved IDs from abilities.json',
      'Passive skills may use id: 0 as a placeholder',
      'Base skills: baseSkillId === their own ID',
      'Morphs: baseSkillId references the parent base skill ID',
      'Use EXACT names from ESO-Hub (watch apostrophes)',
      'Class skill lines have 22 skills (1 ult + 2 morphs, 5 actives + 10 morphs, 4 passives)',
      'Other lines vary — always verify count from ESO-Hub page',
      'Do NOT use abilities.json for skill hierarchy — only ESO-Hub defines base→morph relationships',
    ],

    executionOrder: [
      '1. Class skill lines (7 classes × 3 lines = 21 files)',
      '2. Weapon skill lines (6 files)',
      '3. Armor skill lines (3 files)',
      '4. Guild skill lines (6 files)',
      '5. Alliance War skill lines (3 files)',
      '6. World skill lines (6 files)',
      '7. Racial skill lines (10 files)',
      '8. Craft skill lines (7 files)',
    ],

    commonPitfalls: [
      'Do NOT assume all skill lines have 22 skills — they vary from 8 to 25',
      'Do NOT use abilities.json for hierarchy — only for ID validation',
      'Do NOT forget apostrophe escaping in TypeScript strings',
      'Do NOT mix up similar skill names (e.g., "Escalating Rune" vs "Escalating Runeblades")',
      'Do NOT skip the file header with source URL and timestamp',
    ],
  };
}

// ── MCP Server setup ──────────────────────────────────────────────────

const server = new Server(
  { name: 'eso-log-aggregator-skill-data-regen', version: '1.0.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'list_skill_lines',
      description:
        'List all ESO skill lines with their ESO-Hub URLs, organized by category. ' +
        'Use this to see what needs regeneration and get the correct URLs for scraping.',
      inputSchema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Optional category to filter (class, weapon, armor, guild, alliance-war, world, racial, craft). Omit for all.',
          },
        },
        required: [],
      },
    },
    {
      name: 'lookup_ability',
      description:
        'Search abilities.json for skills by name or ID. Use this during regeneration to ' +
        'resolve numeric ability IDs and icon names for active/ultimate skills. ' +
        'Returns exact and partial matches.',
      inputSchema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Skill name to search for (case-insensitive). Use exact name from ESO-Hub.',
          },
          id: {
            type: 'string',
            description: 'Numeric ability ID to look up directly.',
          },
        },
        required: [],
      },
    },
    {
      name: 'validate_skill_module',
      description:
        'Validate a generated skill line TypeScript module against abilities.json. ' +
        'Checks that active/ultimate skills have resolved IDs, verifies file structure, ' +
        'and reports any issues.',
      inputSchema: {
        type: 'object',
        properties: {
          filePath: {
            type: 'string',
            description: 'Path to the .ts module to validate (relative to project root or absolute).',
          },
        },
        required: ['filePath'],
      },
    },
    {
      name: 'generate_validation_report',
      description:
        'Generate a comprehensive validation report for all skill line modules. ' +
        'Scans all .ts files under src/data/skill-lines/, validates each against ' +
        'abilities.json, and saves a JSON report to validation-reports/.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_regen_instructions',
      description:
        'Get the full regeneration workflow instructions including step-by-step process, ' +
        'critical rules, execution order, common pitfalls, and file conventions.',
      inputSchema: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case 'list_skill_lines':
        result = listSkillLines(args?.category);
        break;
      case 'lookup_ability':
        result = lookupAbility({ name: args?.name, id: args?.id });
        break;
      case 'validate_skill_module':
        result = validateModule(args?.filePath);
        break;
      case 'generate_validation_report':
        result = generateReport();
        break;
      case 'get_regen_instructions':
        result = getRegenInstructions();
        break;
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [
        { type: 'text', text: `Error: ${error.message}\n\n${error.stack || ''}` },
      ],
      isError: true,
    };
  }
});

// ── Start server ──────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
