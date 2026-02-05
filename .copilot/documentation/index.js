#!/usr/bin/env node

/**
 * Documentation Skill - MCP Server
 * 
 * Helps create and organize documentation in the correct project locations.
 * Provides intelligent recommendations based on documentation type and content.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root is two levels up from this skill
const PROJECT_ROOT = join(__dirname, '../..');

/**
 * Documentation structure rules
 */
const DOC_STRUCTURE = {
  'ai-agents': {
    path: 'documentation/ai-agents',
    description: 'AI agent instructions and quick references',
    patterns: [
      /AI_.*_INSTRUCTIONS\.md$/i,
      /AI_.*_QUICK_REFERENCE\.md$/i,
      /AI_.*_SETUP_SUMMARY\.md$/i,
    ],
    examples: [
      'AI_FEATURE_INSTRUCTIONS.md',
      'AI_FEATURE_QUICK_REFERENCE.md',
    ],
    subdirs: ['scribing', 'playwright', 'preloading', 'jira'],
  },
  'features': {
    path: 'documentation/features',
    description: 'Feature-specific implementation documentation',
    patterns: [
      /FEATURE.*\.md$/i,
      /.*_FEATURE\.md$/i,
    ],
    examples: [
      'FEATURE_NAME.md',
      'IMPLEMENTATION.md',
    ],
    subdirs: ['markers', 'scribing', 'grimoire', 'logger', 'performance', 'calculations'],
  },
  'architecture': {
    path: 'documentation/architecture',
    description: 'System design and architectural patterns',
    patterns: [
      /ARCHITECTURE\.md$/i,
      /.*-architecture\.md$/i,
      /DESIGN\.md$/i,
    ],
    examples: [
      'system-architecture.md',
      'data-flow.md',
      'component-hierarchy.md',
    ],
  },
  'implementation': {
    path: 'documentation/implementation',
    description: 'Implementation summaries for tickets/epics',
    patterns: [
      /ESO-\d+.*IMPLEMENTATION.*\.md$/i,
      /ESO-\d+.*SUMMARY\.md$/i,
      /EPIC.*\.md$/i,
    ],
    examples: [
      'ESO-XXX_IMPLEMENTATION_SUMMARY.md',
      'EPIC_ESO-XXX_COMPLETION_SUMMARY.md',
    ],
  },
  'fixes': {
    path: 'documentation/fixes',
    description: 'Bug fixes and issue resolutions',
    patterns: [
      /FIX.*\.md$/i,
      /.*_FIX\.md$/i,
      /RESOLUTION.*\.md$/i,
    ],
    examples: [
      'BUG_FIX_SUMMARY.md',
      'ISSUE_RESOLUTION.md',
    ],
  },
  'testing': {
    path: 'documentation/testing',
    description: 'Testing guides and strategies',
    patterns: [
      /.*TEST.*\.md$/i,
      /PLAYWRIGHT.*\.md$/i,
      /SMOKE.*\.md$/i,
    ],
    examples: [
      'SMOKE_TESTS.md',
      'SCREEN_SIZE_TESTING.md',
      'PLAYWRIGHT_WORKER_OPTIMIZATION.md',
    ],
  },
  'scripts': {
    path: 'scripts',
    description: 'Script documentation (README alongside script file)',
    patterns: [
      /README-.*\.md$/i,
    ],
    examples: [
      'README-sync-jira-status.md',
      'README-analyze-bundle.md',
    ],
  },
  'root-reference': {
    path: 'documentation',
    description: 'High-level documentation and quick references',
    patterns: [
      /.*_QUICKSTART\.md$/i,
      /DEPLOYMENT\.md$/i,
      /COVERAGE.*\.md$/i,
    ],
    examples: [
      'JIRA_SYNC_QUICKSTART.md',
      'DEPLOYMENT.md',
      'COVERAGE.md',
    ],
  },
  'sessions': {
    path: 'documentation/sessions',
    description: 'Session summaries and handoff documentation',
    patterns: [
      /SESSION.*\.md$/i,
      /HANDOFF.*\.md$/i,
      /\d{4}-\d{2}-\d{2}.*\.md$/i,
    ],
    examples: [
      'SESSION_2026-02-05.md',
      'HANDOFF_COMMANDS.md',
    ],
  },
};

/**
 * Analyze filename and content to determine best location
 */
function analyzeDocumentation(filename, content = '') {
  const recommendations = [];
  
  for (const [category, config] of Object.entries(DOC_STRUCTURE)) {
    let score = 0;
    const reasons = [];
    
    // Check filename patterns
    for (const pattern of config.patterns || []) {
      if (pattern.test(filename)) {
        score += 10;
        reasons.push(`Filename matches ${category} pattern`);
        break;
      }
    }
    
    // Check content keywords
    const contentLower = content.toLowerCase();
    if (category === 'ai-agents' && contentLower.includes('ai agent')) {
      score += 5;
      reasons.push('Contains AI agent references');
    }
    if (category === 'implementation' && /eso-\d+/i.test(content)) {
      score += 5;
      reasons.push('References Jira ticket');
    }
    if (category === 'architecture' && contentLower.includes('architecture')) {
      score += 5;
      reasons.push('Discusses architecture');
    }
    if (category === 'testing' && contentLower.includes('test')) {
      score += 3;
      reasons.push('Testing-related content');
    }
    
    if (score > 0) {
      recommendations.push({
        category,
        path: config.path,
        score,
        reasons,
        description: config.description,
        examples: config.examples,
        subdirs: config.subdirs,
      });
    }
  }
  
  // Sort by score
  recommendations.sort((a, b) => b.score - a.score);
  
  return recommendations;
}

/**
 * Get subdirectory recommendations
 */
function getSubdirRecommendations(category, filename, content) {
  const config = DOC_STRUCTURE[category];
  if (!config?.subdirs) return null;
  
  const recommendations = [];
  const contentLower = content.toLowerCase();
  
  for (const subdir of config.subdirs) {
    let score = 0;
    const reasons = [];
    
    // Check if filename or content mentions the subdirectory
    if (filename.toLowerCase().includes(subdir)) {
      score += 10;
      reasons.push(`Filename contains "${subdir}"`);
    }
    if (contentLower.includes(subdir)) {
      score += 5;
      reasons.push(`Content mentions "${subdir}"`);
    }
    
    if (score > 0) {
      recommendations.push({ subdir, score, reasons });
    }
  }
  
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.length > 0 ? recommendations : null;
}

/**
 * Create documentation file
 */
function createDocFile(targetPath, filename, content) {
  const fullPath = join(PROJECT_ROOT, targetPath, filename);
  const dirPath = dirname(fullPath);
  
  // Create directory if it doesn't exist
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
  
  // Check if file already exists
  if (existsSync(fullPath)) {
    return {
      success: false,
      message: `File already exists: ${fullPath}`,
      path: fullPath,
    };
  }
  
  // Write file
  writeFileSync(fullPath, content, 'utf-8');
  
  return {
    success: true,
    message: `Created: ${fullPath}`,
    path: fullPath,
    relativePath: join(targetPath, filename),
  };
}

/**
 * Check if documentation index needs updating
 */
function checkIndexUpdate(filePath) {
  const indexPath = join(PROJECT_ROOT, 'documentation', 'INDEX.md');
  
  if (!existsSync(indexPath)) {
    return {
      needsUpdate: false,
      message: 'INDEX.md not found',
    };
  }
  
  const indexContent = readFileSync(indexPath, 'utf-8');
  const relativeLink = filePath.replace(/\\/g, '/');
  
  if (indexContent.includes(relativeLink) || indexContent.includes(basename(filePath))) {
    return {
      needsUpdate: false,
      message: 'Already referenced in INDEX.md',
    };
  }
  
  return {
    needsUpdate: true,
    message: 'Consider adding to documentation/INDEX.md',
    indexPath,
  };
}

// ============================================================================
// MCP Server Setup
// ============================================================================

const server = new Server(
  {
    name: 'eso-documentation-skill',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'recommend_doc_location',
        description: 'Analyze documentation and recommend the best location based on project structure. Provides intelligent placement suggestions with reasoning.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The documentation filename (e.g., "AI_FEATURE_INSTRUCTIONS.md")',
            },
            content: {
              type: 'string',
              description: 'Optional: Documentation content for better analysis',
            },
          },
          required: ['filename'],
        },
      },
      {
        name: 'create_documentation',
        description: 'Create a documentation file in the recommended location. Automatically creates necessary directories and validates placement.',
        inputSchema: {
          type: 'object',
          properties: {
            filename: {
              type: 'string',
              description: 'The documentation filename',
            },
            content: {
              type: 'string',
              description: 'The documentation content',
            },
            targetPath: {
              type: 'string',
              description: 'Optional: Override automatic path detection (e.g., "documentation/features/scribing")',
            },
          },
          required: ['filename', 'content'],
        },
      },
      {
        name: 'show_doc_structure',
        description: 'Display the complete documentation structure and conventions for the ESO Log Aggregator project.',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Optional: Show details for specific category (ai-agents, features, architecture, etc.)',
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'recommend_doc_location': {
        const { filename, content = '' } = args;
        const recommendations = analyzeDocumentation(filename, content);
        
        if (recommendations.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No specific recommendations for "${filename}"\n\nDefault: documentation/\n\nRun "show_doc_structure" to see all categories.`,
              },
            ],
          };
        }
        
        const topRec = recommendations[0];
        const subdirRecs = getSubdirRecommendations(topRec.category, filename, content);
        
        let output = `📍 Recommended Location for "${filename}"\n\n`;
        output += `🎯 Primary: ${topRec.path}/\n`;
        output += `   Score: ${topRec.score}\n`;
        output += `   Reasons:\n`;
        for (const reason of topRec.reasons) {
          output += `   - ${reason}\n`;
        }
        
        if (subdirRecs) {
          output += `\n📁 Subdirectory Recommendations:\n`;
          for (const subdir of subdirRecs.slice(0, 3)) {
            output += `   - ${topRec.path}/${subdir.subdir}/ (score: ${subdir.score})\n`;
            for (const reason of subdir.reasons) {
              output += `     • ${reason}\n`;
            }
          }
        }
        
        if (recommendations.length > 1) {
          output += `\n🔀 Alternative Locations:\n`;
          for (const rec of recommendations.slice(1, 3)) {
            output += `   - ${rec.path}/ (score: ${rec.score})\n`;
          }
        }
        
        output += `\n📝 Examples:\n`;
        for (const example of topRec.examples) {
          output += `   - ${example}\n`;
        }
        
        output += `\n💡 Description: ${topRec.description}`;
        
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'create_documentation': {
        const { filename, content, targetPath } = args;
        
        let finalPath = targetPath;
        
        // Auto-detect if not specified
        if (!finalPath) {
          const recommendations = analyzeDocumentation(filename, content);
          if (recommendations.length > 0) {
            finalPath = recommendations[0].path;
          } else {
            finalPath = 'documentation';
          }
        }
        
        const result = createDocFile(finalPath, filename, content);
        
        let output = result.success ? '✅ ' : '❌ ';
        output += result.message + '\n\n';
        
        if (result.success) {
          output += `📁 Location: ${result.relativePath}\n`;
          
          // Check if INDEX.md needs updating
          const indexCheck = checkIndexUpdate(result.relativePath);
          if (indexCheck.needsUpdate) {
            output += `\n⚠️  ${indexCheck.message}\n`;
            output += `   Add link: [${basename(filename, extname(filename))}](${result.relativePath})\n`;
          }
        }
        
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      case 'show_doc_structure': {
        const { category } = args;
        
        if (category) {
          const config = DOC_STRUCTURE[category];
          if (!config) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Category "${category}" not found.\n\nAvailable: ${Object.keys(DOC_STRUCTURE).join(', ')}`,
                },
              ],
            };
          }
          
          let output = `📁 ${category}\n\n`;
          output += `Path: ${config.path}/\n`;
          output += `Description: ${config.description}\n\n`;
          output += `Examples:\n`;
          for (const example of config.examples) {
            output += `  - ${example}\n`;
          }
          
          if (config.subdirs) {
            output += `\nSubdirectories:\n`;
            for (const subdir of config.subdirs) {
              output += `  - ${subdir}/\n`;
            }
          }
          
          return {
            content: [{ type: 'text', text: output }],
          };
        }
        
        // Show full structure
        let output = '📚 ESO Log Aggregator Documentation Structure\n\n';
        
        for (const [name, config] of Object.entries(DOC_STRUCTURE)) {
          output += `📁 ${name}\n`;
          output += `   Path: ${config.path}/\n`;
          output += `   ${config.description}\n\n`;
        }
        
        output += `\n💡 Use "recommend_doc_location" to get specific placement recommendations.`;
        
        return {
          content: [{ type: 'text', text: output }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Documentation Skill MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
