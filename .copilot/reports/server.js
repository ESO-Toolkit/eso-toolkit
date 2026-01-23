import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const PROJECT_ROOT = path.resolve('..');
const DATA_DOWNLOADS_DIR = path.join(PROJECT_ROOT, 'data-downloads');

// Debug logging
const DEBUG = process.env.DEBUG === 'true';
function log(...args) {
  if (DEBUG) console.error('[Reports Skill]', new Date().toISOString(), ...args);
}

/**
 * Validation helpers
 */
function validateReportCode(code) {
  // ESO Logs report codes are typically 16 alphanumeric characters
  const codePattern = /^[A-Za-z0-9]{10,20}$/;
  if (!code || typeof code !== 'string') {
    return { valid: false, error: 'Report code is required and must be a string' };
  }
  if (!codePattern.test(code)) {
    return { 
      valid: false, 
      error: `Invalid report code format: "${code}". Expected 10-20 alphanumeric characters (e.g., 3gjVGWB2dxCL8XAw)`,
      suggestion: 'Extract report code from ESO Logs URL: https://www.esologs.com/reports/<code>'
    };
  }
  return { valid: true };
}

function validateFightId(fightId) {
  if (typeof fightId !== 'number' || fightId < 1 || fightId > 1000) {
    return { 
      valid: false, 
      error: `Invalid fight ID: ${fightId}. Must be a positive number between 1 and 1000`,
      suggestion: 'Fight IDs typically range from 1 to 50 for most reports'
    };
  }
  return { valid: true };
}

function validateEventType(eventType) {
  const validTypes = [
    'all', 'damage', 'healing', 'buffs', 'debuffs', 'casts', 'resources', 'deaths', 'combatant-info'
  ];
  if (!eventType || typeof eventType !== 'string') {
    return { valid: false, error: 'Event type is required' };
  }
  if (!validTypes.includes(eventType)) {
    return {
      valid: false,
      error: `Invalid event type: "${eventType}"`,
      suggestion: `Valid types: ${validTypes.join(', ')}`
    };
  }
  return { valid: true };
}

/**
 * Create error response with context and recovery suggestions
 */
function createErrorResponse(error, tool, args = {}) {
  const errorInfo = {
    error: true,
    tool: tool,
    message: error.message,
    timestamp: new Date().toISOString(),
  };

  // Add recovery suggestions based on error type
  if (error.message.includes('not found') || error.message.includes('does not exist')) {
    errorInfo.recoverable = false;
    errorInfo.suggestion = `Report or fight may not exist. Check report code and fight ID.`;
  } else if (error.message.includes('ENOENT')) {
    errorInfo.recoverable = true;
    errorInfo.suggestion = 'Data not downloaded yet. Use download_report_data tool first.';
  } else if (error.message.includes('npm run script')) {
    errorInfo.recoverable = true;
    errorInfo.suggestion = 'Ensure you are in the project root directory and npm is available';
  } else {
    errorInfo.recoverable = true;
    errorInfo.suggestion = 'Check error message and retry the operation';
  }

  log('Error:', errorInfo);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(errorInfo, null, 2),
      },
    ],
    isError: true,
  };
}

/**
 * Execute npm script command
 */
function executeNpmScript(scriptPath, args, description) {
  log('Executing npm script:', scriptPath, args);
  
  try {
    const command = `npm run script -- ${scriptPath} ${args.join(' ')}`;
    const result = execSync(command, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
    });
    
    log('Script completed successfully');
    return result.trim();
  } catch (error) {
    const errorMessage = `Script execution failed: ${error.message}`;
    const stderr = error.stderr ? `\nStderr: ${error.stderr}` : '';
    log('Script failed:', errorMessage + stderr);
    throw new Error(errorMessage + stderr);
  }
}

/**
 * Read and parse JSON file safely
 */
function readJsonFile(filePath) {
  log('Reading file:', filePath);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to read/parse JSON: ${error.message}`);
  }
}

/**
 * Get report directory path
 */
function getReportDir(reportCode) {
  return path.join(DATA_DOWNLOADS_DIR, reportCode);
}

/**
 * Get fight directory path
 */
function getFightDir(reportCode, fightId) {
  return path.join(getReportDir(reportCode), `fight-${fightId}`);
}

/**
 * Check if report data exists
 */
function reportExists(reportCode) {
  const reportDir = getReportDir(reportCode);
  return fs.existsSync(reportDir) && fs.existsSync(path.join(reportDir, 'index.json'));
}

/**
 * Check if fight data exists
 */
function fightExists(reportCode, fightId) {
  const fightDir = getFightDir(reportCode, fightId);
  return fs.existsSync(fightDir) && fs.existsSync(path.join(fightDir, 'fight-info.json'));
}

/**
 * Create MCP Server
 */
const server = new Server(
  {
    name: 'eso-log-aggregator-reports',
    version: '1.0.0',
    description: 'Report data debugging for ESO Log Aggregator. Provides 5 tools for downloading, analyzing, and searching production report data to debug issues locally.',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

log('Server initialized:', server.server.name, server.server.version);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'download_report_data',
        description: 'Download complete report data (all fights) from ESO Logs for local analysis. Creates structured directory with all event types, metadata, and master data.',
        inputSchema: {
          type: 'object',
          properties: {
            reportCode: {
              type: 'string',
              description: 'ESO Logs report code (e.g., "3gjVGWB2dxCL8XAw" from https://www.esologs.com/reports/3gjVGWB2dxCL8XAw)',
            },
          },
          required: ['reportCode'],
        },
      },
      {
        name: 'download_fight_data',
        description: 'Download data for a specific fight only (faster than downloading entire report). Useful when debugging a single encounter.',
        inputSchema: {
          type: 'object',
          properties: {
            reportCode: {
              type: 'string',
              description: 'ESO Logs report code',
            },
            fightId: {
              type: 'number',
              description: 'Fight ID number (e.g., 32)',
            },
          },
          required: ['reportCode', 'fightId'],
        },
      },
      {
        name: 'analyze_report_structure',
        description: 'Get a summary of downloaded report data including available fights, event counts, and data structure. Use this to understand what data is available.',
        inputSchema: {
          type: 'object',
          properties: {
            reportCode: {
              type: 'string',
              description: 'ESO Logs report code',
            },
          },
          required: ['reportCode'],
        },
      },
      {
        name: 'search_events',
        description: 'Search for specific events in downloaded fight data. Can search by ability name/ID, actor name/ID, event type, or time range.',
        inputSchema: {
          type: 'object',
          properties: {
            reportCode: {
              type: 'string',
              description: 'ESO Logs report code',
            },
            fightId: {
              type: 'number',
              description: 'Fight ID to search in',
            },
            eventType: {
              type: 'string',
              description: 'Event type to search: "all", "damage", "healing", "buffs", "debuffs", "casts", "resources", "deaths", "combatant-info"',
            },
            searchTerm: {
              type: 'string',
              description: 'Term to search for (ability name, actor name, or ID). Case-insensitive.',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (default: 50, max: 1000)',
            },
          },
          required: ['reportCode', 'fightId', 'eventType', 'searchTerm'],
        },
      },
      {
        name: 'compare_fights',
        description: 'Compare two fights to identify differences in event patterns, ability usage, or buff/debuff uptimes. Useful for debugging inconsistencies.',
        inputSchema: {
          type: 'object',
          properties: {
            reportCode: {
              type: 'string',
              description: 'ESO Logs report code',
            },
            fightId1: {
              type: 'number',
              description: 'First fight ID',
            },
            fightId2: {
              type: 'number',
              description: 'Second fight ID',
            },
            comparisonType: {
              type: 'string',
              description: 'What to compare: "abilities" (ability usage), "buffs" (buff uptimes), "damage" (damage patterns), "summary" (high-level overview)',
            },
          },
          required: ['reportCode', 'fightId1', 'fightId2', 'comparisonType'],
        },
      },
    ],
  };
});

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'download_report_data': {
        const { reportCode } = args;
        
        // Validate input
        const validation = validateReportCode(reportCode);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Downloading report:', reportCode);
        
        // Execute download script
        const output = executeNpmScript(
          'scripts/download-report-data.ts',
          [reportCode],
          'Download complete report data'
        );
        
        // Check if download was successful
        if (!reportExists(reportCode)) {
          throw new Error('Download completed but report data not found. Check script output for errors.');
        }
        
        // Read index.json to get summary
        const indexPath = path.join(getReportDir(reportCode), 'index.json');
        const index = readJsonFile(indexPath);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                reportCode: reportCode,
                location: getReportDir(reportCode),
                summary: {
                  fights: index.fights?.length || 0,
                  files: Object.keys(index.files || {}).length,
                },
                message: 'Report data downloaded successfully. Use analyze_report_structure to explore the data.',
              }, null, 2),
            },
          ],
        };
      }

      case 'download_fight_data': {
        const { reportCode, fightId } = args;
        
        // Validate inputs
        const codeValidation = validateReportCode(reportCode);
        if (!codeValidation.valid) {
          return createErrorResponse(new Error(codeValidation.error), name, args);
        }
        
        const fightValidation = validateFightId(fightId);
        if (!fightValidation.valid) {
          return createErrorResponse(new Error(fightValidation.error), name, args);
        }
        
        log('Downloading fight:', reportCode, fightId);
        
        // Execute download script for specific fight
        const output = executeNpmScript(
          'scripts/download-report-data.ts',
          [reportCode, fightId.toString()],
          'Download specific fight data'
        );
        
        // Check if download was successful
        if (!fightExists(reportCode, fightId)) {
          throw new Error('Download completed but fight data not found. Check script output for errors.');
        }
        
        // Read fight-info.json to get summary
        const fightInfoPath = path.join(getFightDir(reportCode, fightId), 'fight-info.json');
        const fightInfo = readJsonFile(fightInfoPath);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                reportCode: reportCode,
                fightId: fightId,
                location: getFightDir(reportCode, fightId),
                fightInfo: {
                  name: fightInfo.name,
                  startTime: fightInfo.startTime,
                  endTime: fightInfo.endTime,
                  duration: fightInfo.duration,
                },
                message: 'Fight data downloaded successfully. Use search_events to analyze the data.',
              }, null, 2),
            },
          ],
        };
      }

      case 'analyze_report_structure': {
        const { reportCode } = args;
        
        // Validate input
        const validation = validateReportCode(reportCode);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        // Check if report exists
        if (!reportExists(reportCode)) {
          return createErrorResponse(
            new Error(`Report data not found for ${reportCode}. Use download_report_data first.`),
            name,
            args
          );
        }
        
        log('Analyzing report structure:', reportCode);
        
        const reportDir = getReportDir(reportCode);
        
        // Read key files
        const index = readJsonFile(path.join(reportDir, 'index.json'));
        const reportSummary = readJsonFile(path.join(reportDir, 'report-summary.json'));
        
        // Get fight information
        const fights = [];
        for (const fight of index.fights || []) {
          const fightDir = getFightDir(reportCode, fight.id);
          if (fs.existsSync(fightDir)) {
            const fightInfoPath = path.join(fightDir, 'fight-info.json');
            if (fs.existsSync(fightInfoPath)) {
              const fightInfo = readJsonFile(fightInfoPath);
              
              // Count event files
              const eventsDir = path.join(fightDir, 'events');
              let eventFiles = 0;
              if (fs.existsSync(eventsDir)) {
                eventFiles = fs.readdirSync(eventsDir).filter(f => f.endsWith('.json') && !f.includes('metadata')).length;
              }
              
              fights.push({
                id: fight.id,
                name: fightInfo.name || 'Unknown',
                duration: fightInfo.duration,
                eventFiles: eventFiles,
              });
            }
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                reportCode: reportCode,
                location: reportDir,
                reportSummary: {
                  title: reportSummary.title,
                  zone: reportSummary.zone,
                  totalFights: reportSummary.totalFights,
                  duration: reportSummary.duration,
                },
                fights: fights,
                files: {
                  masterData: fs.existsSync(path.join(reportDir, 'master-data.json')),
                  actorsByType: fs.existsSync(path.join(reportDir, 'actors-by-type.json')),
                  abilitiesByType: fs.existsSync(path.join(reportDir, 'abilities-by-type.json')),
                },
              }, null, 2),
            },
          ],
        };
      }

      case 'search_events': {
        const { reportCode, fightId, eventType, searchTerm, limit = 50 } = args;
        
        // Validate inputs
        const codeValidation = validateReportCode(reportCode);
        if (!codeValidation.valid) {
          return createErrorResponse(new Error(codeValidation.error), name, args);
        }
        
        const fightValidation = validateFightId(fightId);
        if (!fightValidation.valid) {
          return createErrorResponse(new Error(fightValidation.error), name, args);
        }
        
        const typeValidation = validateEventType(eventType);
        if (!typeValidation.valid) {
          return createErrorResponse(new Error(typeValidation.error), name, args);
        }
        
        if (!searchTerm || typeof searchTerm !== 'string') {
          return createErrorResponse(new Error('Search term is required'), name, args);
        }
        
        // Check if fight exists
        if (!fightExists(reportCode, fightId)) {
          return createErrorResponse(
            new Error(`Fight data not found for ${reportCode}/fight-${fightId}. Use download_fight_data first.`),
            name,
            args
          );
        }
        
        log('Searching events:', reportCode, fightId, eventType, searchTerm);
        
        const eventsDir = path.join(getFightDir(reportCode, fightId), 'events');
        const searchLower = searchTerm.toLowerCase();
        const maxResults = Math.min(limit, 1000);
        
        // Determine which files to search
        let filesToSearch = [];
        if (eventType === 'all') {
          filesToSearch = ['all-events.json'];
        } else if (eventType === 'buffs') {
          filesToSearch = ['buff-events.json'];
        } else if (eventType === 'debuffs') {
          filesToSearch = ['debuff-events.json'];
        } else {
          filesToSearch = [`${eventType}-events.json`];
        }
        
        // Search events
        const results = [];
        for (const filename of filesToSearch) {
          const filePath = path.join(eventsDir, filename);
          if (!fs.existsSync(filePath)) {
            continue;
          }
          
          const events = readJsonFile(filePath);
          if (!Array.isArray(events)) {
            continue;
          }
          
          for (const event of events) {
            if (results.length >= maxResults) {
              break;
            }
            
            // Search in various fields
            const matchFields = [
              event.abilityGameID?.toString(),
              event.ability?.name,
              event.sourceID?.toString(),
              event.targetID?.toString(),
              event.source?.name,
              event.target?.name,
              event.type,
            ];
            
            if (matchFields.some(field => field?.toLowerCase().includes(searchLower))) {
              results.push({
                timestamp: event.timestamp,
                type: event.type,
                ability: event.ability?.name || event.abilityGameID,
                source: event.source?.name || event.sourceID,
                target: event.target?.name || event.targetID,
                amount: event.amount || event.hitPoints,
                file: filename,
              });
            }
          }
          
          if (results.length >= maxResults) {
            break;
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                reportCode: reportCode,
                fightId: fightId,
                searchTerm: searchTerm,
                eventType: eventType,
                totalResults: results.length,
                results: results,
                truncated: results.length >= maxResults,
              }, null, 2),
            },
          ],
        };
      }

      case 'compare_fights': {
        const { reportCode, fightId1, fightId2, comparisonType } = args;
        
        // Validate inputs
        const codeValidation = validateReportCode(reportCode);
        if (!codeValidation.valid) {
          return createErrorResponse(new Error(codeValidation.error), name, args);
        }
        
        const fight1Validation = validateFightId(fightId1);
        if (!fight1Validation.valid) {
          return createErrorResponse(new Error(`Fight 1: ${fight1Validation.error}`), name, args);
        }
        
        const fight2Validation = validateFightId(fightId2);
        if (!fight2Validation.valid) {
          return createErrorResponse(new Error(`Fight 2: ${fight2Validation.error}`), name, args);
        }
        
        const validComparisons = ['abilities', 'buffs', 'damage', 'summary'];
        if (!validComparisons.includes(comparisonType)) {
          return createErrorResponse(
            new Error(`Invalid comparison type: "${comparisonType}". Valid types: ${validComparisons.join(', ')}`),
            name,
            args
          );
        }
        
        // Check if both fights exist
        if (!fightExists(reportCode, fightId1)) {
          return createErrorResponse(
            new Error(`Fight ${fightId1} data not found. Use download_fight_data first.`),
            name,
            args
          );
        }
        
        if (!fightExists(reportCode, fightId2)) {
          return createErrorResponse(
            new Error(`Fight ${fightId2} data not found. Use download_fight_data first.`),
            name,
            args
          );
        }
        
        log('Comparing fights:', reportCode, fightId1, 'vs', fightId2, comparisonType);
        
        // Read fight info for both
        const fight1Info = readJsonFile(path.join(getFightDir(reportCode, fightId1), 'fight-info.json'));
        const fight2Info = readJsonFile(path.join(getFightDir(reportCode, fightId2), 'fight-info.json'));
        
        let comparison = {
          reportCode: reportCode,
          fight1: { id: fightId1, name: fight1Info.name, duration: fight1Info.duration },
          fight2: { id: fightId2, name: fight2Info.name, duration: fight2Info.duration },
          comparisonType: comparisonType,
        };
        
        // Perform comparison based on type
        if (comparisonType === 'summary') {
          // High-level comparison
          const fight1Events = path.join(getFightDir(reportCode, fightId1), 'events');
          const fight2Events = path.join(getFightDir(reportCode, fightId2), 'events');
          
          const fight1Files = fs.existsSync(fight1Events) ? fs.readdirSync(fight1Events).filter(f => f.endsWith('.json') && !f.includes('metadata')) : [];
          const fight2Files = fs.existsSync(fight2Events) ? fs.readdirSync(fight2Events).filter(f => f.endsWith('.json') && !f.includes('metadata')) : [];
          
          comparison.summary = {
            fight1EventFiles: fight1Files.length,
            fight2EventFiles: fight2Files.length,
            durationDiff: fight2Info.duration - fight1Info.duration,
            missingInFight1: fight2Files.filter(f => !fight1Files.includes(f)),
            missingInFight2: fight1Files.filter(f => !fight2Files.includes(f)),
          };
        } else {
          // Detailed comparison requires reading and analyzing events
          comparison.note = 'Detailed comparison requires reading event files. Use search_events to analyze specific patterns in each fight.';
          comparison.suggestedWorkflow = [
            `1. Use search_events to find key abilities in fight ${fightId1}`,
            `2. Use search_events to find the same abilities in fight ${fightId2}`,
            `3. Compare event counts, timings, and patterns manually`,
          ];
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(comparison, null, 2),
            },
          ],
        };
      }

      default:
        return createErrorResponse(new Error(`Unknown tool: ${name}`), name, args);
    }
  } catch (error) {
    log('Uncaught error in tool handler:', error);
    return createErrorResponse(error, name, args);
  }
});

/**
 * Start the server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log('Server started and waiting for requests');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
