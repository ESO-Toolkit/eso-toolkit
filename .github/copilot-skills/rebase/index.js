#!/usr/bin/env node

/**
 * Post-Squash Rebase MCP Server
 * 
 * Automates the process of rebasing a branch tree after a squashed merge into master.
 * This handles the tedious process of recreating branches and cherry-picking unique commits.
 * 
 * @module eso-log-aggregator-rebase-skill
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { exec as execCallback } from 'child_process';

const exec = promisify(execCallback);

const PROJECT_ROOT = process.cwd();

/**
 * Execute a git command
 */
async function executeGit(command, cwd = PROJECT_ROOT) {
  try {
    const { stdout, stderr } = await exec(`git ${command}`, { cwd, shell: 'powershell.exe' });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return { 
      success: false, 
      stdout: error.stdout?.trim() || '', 
      stderr: error.stderr?.trim() || error.message 
    };
  }
}

/**
 * Execute a twig command
 */
async function executeTwig(command, cwd = PROJECT_ROOT) {
  try {
    const { stdout, stderr } = await exec(`twig ${command}`, { cwd, shell: 'powershell.exe' });
    return { success: true, stdout: stdout.trim(), stderr: stderr.trim() };
  } catch (error) {
    return { 
      success: false, 
      stdout: error.stdout?.trim() || '', 
      stderr: error.stderr?.trim() || error.message 
    };
  }
}

/**
 * Get the list of child branches from twig tree
 */
async function getChildBranches(parentBranch) {
  const result = await executeTwig('tree');
  if (!result.success) {
    return [];
  }

  const lines = result.stdout.split('\n');
  const children = [];
  let foundParent = false;
  let parentIndent = 0;

  for (const line of lines) {
    if (line.includes(parentBranch)) {
      foundParent = true;
      parentIndent = line.search(/[└├│]/);
      continue;
    }

    if (foundParent) {
      const currentIndent = line.search(/[└├│]/);
      if (currentIndent <= parentIndent && !line.includes('└') && !line.includes('├')) {
        // We've moved past this parent's children
        break;
      }

      if (currentIndent === parentIndent + 4 || currentIndent === parentIndent + 2) {
        // This is a direct child
        const match = line.match(/[└├]── ([^\s]+)/);
        if (match) {
          children.push(match[1]);
        }
      }
    }
  }

  return children;
}

/**
 * Get unique commits in a branch that aren't in master
 */
async function getUniqueCommits(branchName, baseBranch = 'main') {
  const result = await executeGit(`log --oneline ${baseBranch}..origin/${branchName}`);
  if (!result.success) {
    return [];
  }

  return result.stdout
    .split('\n')
    .filter(line => line.trim())
    .reverse() // Oldest first for cherry-picking
    .map(line => {
      const match = line.match(/^([a-f0-9]+)\s+(.+)$/);
      return match ? { hash: match[1], message: match[2] } : null;
    })
    .filter(Boolean);
}

/**
 * Tool: rebase_after_squash
 * Automates rebasing branch tree after a squashed merge
 */
async function rebaseAfterSquash(args) {
  const { mergedBranch, targetBranch = 'main', dryRun = false } = args;
  
  const steps = [];
  const errors = [];

  try {
    // Step 1: Switch to target branch and pull
    steps.push(`Switching to ${targetBranch}...`);
    if (!dryRun) {
      await executeGit(`checkout ${targetBranch}`);
      await executeGit(`pull origin ${targetBranch}`);
    }

    // Step 2: Get child branches of the merged branch
    steps.push(`Finding child branches of ${mergedBranch}...`);
    const children = await getChildBranches(mergedBranch);
    steps.push(`Found ${children.length} child branches: ${children.join(', ')}`);

    // Step 3: Delete the merged branch locally
    steps.push(`Deleting merged branch ${mergedBranch}...`);
    if (!dryRun) {
      await executeGit(`branch -D ${mergedBranch}`);
    }

    // Step 4: Process each child branch
    const branchMap = new Map();
    
    for (const childBranch of children) {
      steps.push(`\nProcessing ${childBranch}...`);
      
      // Get unique commits
      const commits = await getUniqueCommits(childBranch, targetBranch);
      steps.push(`  Found ${commits.length} unique commits`);
      
      if (commits.length === 0) {
        steps.push(`  ⚠️ No unique commits found, branch may be up-to-date`);
        continue;
      }

      if (!dryRun) {
        // Delete local branch
        await executeGit(`branch -D ${childBranch}`);
        
        // Determine parent branch (either target or previous child)
        const parentBranch = branchMap.get(childBranch) || targetBranch;
        await executeGit(`checkout ${parentBranch}`);
        
        // Create new branch
        await executeGit(`checkout -b ${childBranch}`);
        
        // Cherry-pick commits
        for (const commit of commits) {
          steps.push(`  Cherry-picking: ${commit.message}`);
          const result = await executeGit(`cherry-pick ${commit.hash}`);
          
          if (!result.success) {
            if (result.stderr.includes('empty') || result.stdout.includes('empty')) {
              steps.push(`    Skipping empty commit`);
              await executeGit('cherry-pick --skip');
            } else {
              errors.push(`Failed to cherry-pick ${commit.hash}: ${result.stderr}`);
              await executeGit('cherry-pick --abort');
              break;
            }
          }
        }
        
        // Set twig dependency (ignore if already exists)
        await executeTwig(`branch depend ${childBranch} ${parentBranch}`);
        
        // Force push
        const pushResult = await executeGit(`push origin ${childBranch} --force`);
        if (pushResult.success) {
          steps.push(`  ✅ Successfully rebased and pushed ${childBranch}`);
        } else {
          errors.push(`Failed to push ${childBranch}: ${pushResult.stderr}`);
        }
      }
    }

    // Step 5: Return to target branch
    if (!dryRun) {
      await executeGit(`checkout ${targetBranch}`);
    }

    // Step 6: Run twig cascade for any remaining branches
    steps.push(`\nRunning twig cascade to update remaining branches...`);
    if (!dryRun) {
      const cascadeResult = await executeTwig('cascade --no-interactive --force-push');
      if (cascadeResult.success) {
        steps.push(`✅ Cascade completed successfully`);
      } else {
        if (cascadeResult.stderr.includes('Conflicts detected')) {
          steps.push(`⚠️ Some branches have conflicts that need manual resolution`);
        } else {
          errors.push(`Cascade failed: ${cascadeResult.stderr}`);
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `# Post-Squash Rebase ${dryRun ? '(Dry Run)' : 'Complete'}\n\n` +
                `## Steps Executed:\n${steps.join('\n')}\n\n` +
                (errors.length > 0 ? `## Errors:\n${errors.join('\n')}\n\n` : '') +
                `## Summary\n` +
                `- Merged branch: ${mergedBranch}\n` +
                `- Target branch: ${targetBranch}\n` +
                `- Child branches processed: ${children.length}\n` +
                `- Errors encountered: ${errors.length}`
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error during rebase process: ${error.message}\n\nSteps completed:\n${steps.join('\n')}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Tool: identify_squash_conflicts
 * Identifies which branches need attention after a squash merge
 */
async function identifySquashConflicts(args) {
  const { mergedBranch, targetBranch = 'main' } = args;
  
  const analysis = {
    mergedBranch,
    targetBranch,
    childBranches: [],
    recommendations: []
  };

  try {
    // Get child branches
    const children = await getChildBranches(mergedBranch);
    
    for (const childBranch of children) {
      const commits = await getUniqueCommits(childBranch, targetBranch);
      
      const branchInfo = {
        name: childBranch,
        uniqueCommits: commits.length,
        commits: commits.map(c => c.message),
        needsRebase: commits.length > 0
      };
      
      analysis.childBranches.push(branchInfo);
      
      if (commits.length === 0) {
        analysis.recommendations.push(
          `✅ ${childBranch}: Already up-to-date, may just need parent update`
        );
      } else {
        analysis.recommendations.push(
          `⚠️ ${childBranch}: Has ${commits.length} unique commits, needs rebase`
        );
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `# Squash Conflict Analysis\n\n` +
                `**Merged Branch:** ${mergedBranch}\n` +
                `**Target Branch:** ${targetBranch}\n` +
                `**Child Branches Found:** ${children.length}\n\n` +
                `## Branch Analysis:\n` +
                analysis.childBranches.map(b => 
                  `### ${b.name}\n` +
                  `- Unique commits: ${b.uniqueCommits}\n` +
                  `- Needs rebase: ${b.needsRebase ? 'Yes' : 'No'}\n` +
                  (b.commits.length > 0 ? `- Commits:\n${b.commits.map(c => `  - ${c}`).join('\n')}\n` : '')
                ).join('\n') +
                `\n## Recommendations:\n` +
                analysis.recommendations.join('\n')
        }
      ]
    };

  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error analyzing squash conflicts: ${error.message}`
        }
      ],
      isError: true
    };
  }
}

// Create and configure the MCP server
const server = new Server(
  {
    name: 'eso-log-aggregator-rebase-skill',
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
        name: 'rebase_after_squash',
        description: 
          'Automates the process of rebasing a branch tree after a squashed merge into main. ' +
          'This handles: 1) Deleting the merged branch, 2) Identifying child branches, ' +
          '3) Recreating each child with only unique commits, 4) Setting twig dependencies, ' +
          '5) Force pushing, 6) Running cascade for remaining branches. ' +
          'Use this after a PR is merged with squash.',
        inputSchema: {
          type: 'object',
          properties: {
            mergedBranch: {
              type: 'string',
              description: 'The branch name that was squashed and merged (e.g., "ESO-449/structure-redux-state")'
            },
            targetBranch: {
              type: 'string',
              description: 'The target branch that received the merge (default: "main")',
              default: 'main'
            },
            dryRun: {
              type: 'boolean',
              description: 'If true, only shows what would be done without making changes',
              default: false
            }
          },
          required: ['mergedBranch']
        }
      },
      {
        name: 'identify_squash_conflicts',
        description:
          'Analyzes a branch tree after a squash merge to identify which child branches ' +
          'have conflicts and need rebasing. Shows unique commits in each branch. ' +
          'Use this before rebase_after_squash to understand what needs to be done.',
        inputSchema: {
          type: 'object',
          properties: {
            mergedBranch: {
              type: 'string',
              description: 'The branch name that was squashed and merged'
            },
            targetBranch: {
              type: 'string',
              description: 'The target branch that received the merge (default: "main")',
              default: 'main'
            }
          },
          required: ['mergedBranch']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'rebase_after_squash':
        return await rebaseAfterSquash(args);
      
      case 'identify_squash_conflicts':
        return await identifySquashConflicts(args);

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`
            }
          ],
          isError: true
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error executing ${name}: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Post-Squash Rebase MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
