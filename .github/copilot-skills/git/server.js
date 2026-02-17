import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { execSync } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.resolve('..');

// Debug logging
const DEBUG = process.env.DEBUG === 'true';
function log(...args) {
  if (DEBUG) console.error('[Git Skill]', new Date().toISOString(), ...args);
}

/**
 * Validation helpers
 */
function validateBranchName(branchName) {
  if (!branchName || typeof branchName !== 'string') {
    return { valid: false, error: 'Branch name is required and must be a string' };
  }
  
  // Git branch name validation
  const invalidChars = /[\s~^:?*\[\\]/;
  if (invalidChars.test(branchName)) {
    return {
      valid: false,
      error: `Invalid branch name: "${branchName}". Cannot contain spaces or special characters: ~ ^ : ? * [ \\`,
      suggestion: 'Use kebab-case format: ESO-123/description-here'
    };
  }
  
  return { valid: true };
}

function validateRepoOwner(owner) {
  if (!owner || typeof owner !== 'string') {
    return { valid: false, error: 'Repository owner is required' };
  }
  if (!/^[a-zA-Z0-9-]+$/.test(owner)) {
    return { valid: false, error: 'Repository owner must contain only alphanumeric characters and hyphens' };
  }
  return { valid: true };
}

function validateRepoName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Repository name is required' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) {
    return { valid: false, error: 'Repository name must contain only alphanumeric characters, dots, underscores, and hyphens' };
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
  if (error.message.includes('not a git repository')) {
    errorInfo.recoverable = false;
    errorInfo.suggestion = 'Ensure you are in a Git repository';
  } else if (error.message.includes('twig') && error.message.includes('not found')) {
    errorInfo.recoverable = false;
    errorInfo.suggestion = 'Install twig: npm install -g @gittwig/twig';
  } else if (error.message.includes('does not exist') || error.message.includes('unknown revision')) {
    errorInfo.recoverable = false;
    errorInfo.suggestion = `Branch "${args.branchName || args.childBranch || 'unknown'}" does not exist. Check branch name spelling.`;
  } else if (error.message.includes('conflict') || error.message.includes('CONFLICT')) {
    errorInfo.recoverable = true;
    errorInfo.suggestion = 'Resolve conflicts manually, then run: git rebase --continue';
    errorInfo.conflictResolution = [
      '1. Edit conflicting files',
      '2. git add <resolved-files>',
      '3. git rebase --continue'
    ];
  } else if (error.message.includes('GitHub')) {
    errorInfo.recoverable = true;
    errorInfo.suggestion = 'Check GitHub CLI authentication: gh auth status';
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
 * Execute git command
 */
function executeGit(command, description) {
  log('Executing git:', command);
  
  try {
    const result = execSync(`git ${command}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    
    log('Git command succeeded');
    return result.trim();
  } catch (error) {
    const errorMessage = `Git command failed: ${error.message}`;
    const stderr = error.stderr ? `\n${error.stderr}` : '';
    log('Git command failed:', errorMessage + stderr);
    throw new Error(errorMessage + stderr);
  }
}

/**
 * Execute twig command
 */
function executeTwig(command, description) {
  log('Executing twig:', command);
  
  try {
    const result = execSync(`twig ${command}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    
    log('Twig command succeeded');
    return result.trim();
  } catch (error) {
    const errorMessage = `Twig command failed: ${error.message}`;
    const stderr = error.stderr ? `\n${error.stderr}` : '';
    log('Twig command failed:', errorMessage + stderr);
    throw new Error(errorMessage + stderr);
  }
}

/**
 * Execute GitHub CLI command
 */
function executeGh(command, description) {
  log('Executing gh:', command);
  
  try {
    const result = execSync(`gh ${command}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    
    log('GitHub CLI command succeeded');
    return result.trim();
  } catch (error) {
    const errorMessage = `GitHub CLI command failed: ${error.message}`;
    const stderr = error.stderr ? `\n${error.stderr}` : '';
    log('GitHub CLI command failed:', errorMessage + stderr);
    throw new Error(errorMessage + stderr);
  }
}

/**
 * Parse twig tree output into structured format
 */
function parseTwigTree(output) {
  const lines = output.split('\n');
  const branches = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Extract branch info from tree structure
    // Example: "  * ESO-449 (3 commits ahead)"
    const match = line.match(/([*\s│├└─]+)(\S+)(?:\s+\(([^)]+)\))?/);
    if (match) {
      const [, indent, name, info] = match;
      const level = indent.replace(/[*]/g, '').length / 2;
      
      branches.push({
        name: name.trim(),
        level: level,
        info: info || '',
        isCurrent: indent.includes('*'),
      });
    }
  }
  
  return branches;
}

/**
 * Create MCP Server
 */
const server = new Server(
  {
    name: 'eso-log-aggregator-git',
    version: '1.0.0',
    description: 'Extended Git workflow for ESO Log Aggregator. Provides 5 tools for branch management with twig, interactive rebasing, and GitHub PR status checking.',
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
        name: 'git_create_branch',
        description: 'Create a new Git branch using twig with automatic parent branch detection. If creating for a Jira ticket, include ticket ID in branch name (e.g., ESO-123/description). Automatically sets parent branch: if parentBranch is provided, uses it; otherwise defaults to main.',
        inputSchema: {
          type: 'object',
          properties: {
            branchName: {
              type: 'string',
              description: 'Name of the new branch. For Jira tickets, use format: ESO-123/description-here. Otherwise, use descriptive kebab-case name.',
            },
            parentBranch: {
              type: 'string',
              description: 'Parent branch name (optional). If not provided, defaults to "main". Use when creating a child branch that depends on another feature branch.',
            },
            switchToBranch: {
              type: 'boolean',
              description: 'Switch to the new branch after creation (default: true)',
            },
          },
          required: ['branchName'],
        },
      },
      {
        name: 'git_twig_tree',
        description: 'Show branch dependency tree using twig. Visualizes branch stacking and relationships. Useful for understanding feature branch hierarchies.',
        inputSchema: {
          type: 'object',
          properties: {
            compact: {
              type: 'boolean',
              description: 'Show compact view without commit info (default: false)',
            },
          },
        },
      },
      {
        name: 'git_twig_depend',
        description: 'Set parent branch dependency for a child branch. Used to establish branch stacking relationships (e.g., feature branch depends on another feature branch).',
        inputSchema: {
          type: 'object',
          properties: {
            childBranch: {
              type: 'string',
              description: 'Name of the child branch (the branch that depends on another)',
            },
            parentBranch: {
              type: 'string',
              description: 'Name of the parent branch (the branch that child depends on)',
            },
          },
          required: ['childBranch', 'parentBranch'],
        },
      },
      {
        name: 'git_rebase_interactive',
        description: 'Start an interactive rebase on a target branch. Allows squashing commits, reordering, editing commit messages. Use with caution on shared branches.',
        inputSchema: {
          type: 'object',
          properties: {
            targetBranch: {
              type: 'string',
              description: 'Branch to rebase onto (e.g., "master", "ESO-449/parent-branch")',
            },
            autoSquash: {
              type: 'boolean',
              description: 'Automatically squash fixup! and squash! commits (default: false)',
            },
          },
          required: ['targetBranch'],
        },
      },
      {
        name: 'git_check_pr_status',
        description: 'Check pull request status including review status, CI checks, and mergability. Requires GitHub CLI (gh) authentication.',
        inputSchema: {
          type: 'object',
          properties: {
            prNumber: {
              type: 'number',
              description: 'Pull request number (optional - defaults to PR for current branch)',
            },
            repo: {
              type: 'string',
              description: 'Repository in format "owner/repo" (optional - defaults to current repo)',
            },
          },
        },
      },
      {
        name: 'git_twig_cascade',
        description: 'Cascade branch changes through dependent branches using twig. Automatically rebases child branches onto updated parents. Use --force-push to push all updated branches.',
        inputSchema: {
          type: 'object',
          properties: {
            forcePush: {
              type: 'boolean',
              description: 'Force push all updated branches after cascade (default: false)',
            },
            dryRun: {
              type: 'boolean',
              description: 'Show what would be done without making changes (default: false)',
            },
          },
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
      case 'git_create_branch': {
        const { branchName, parentBranch = 'main', switchToBranch = true } = args;
        
        // Validate branch name
        const branchValidation = validateBranchName(branchName);
        if (!branchValidation.valid) {
          return createErrorResponse(
            new Error(`Invalid branch name: ${branchValidation.error}${branchValidation.suggestion ? '\nSuggestion: ' + branchValidation.suggestion : ''}`),
            name,
            args
          );
        }
        
        // Validate parent branch if provided
        const parentValidation = validateBranchName(parentBranch);
        if (!parentValidation.valid) {
          return createErrorResponse(
            new Error(`Invalid parent branch: ${parentValidation.error}`),
            name,
            args
          );
        }
        
        log('Creating branch:', branchName, 'with parent:', parentBranch, 'switch:', switchToBranch);
        
        // Check if branch already exists
        try {
          executeGit(`rev-parse --verify ${branchName}`, 'Check if branch exists');
          return createErrorResponse(
            new Error(`Branch "${branchName}" already exists. Use a different name or delete the existing branch first.`),
            name,
            args
          );
        } catch (e) {
          // Branch doesn't exist, which is what we want
          log('Branch does not exist (good), proceeding with creation');
        }
        
        // Check if parent branch exists
        try {
          executeGit(`rev-parse --verify ${parentBranch}`, 'Check if parent branch exists');
        } catch (e) {
          return createErrorResponse(
            new Error(`Parent branch "${parentBranch}" does not exist. Create it first or use a different parent branch.`),
            name,
            args
          );
        }
        
        // Create the branch using twig
        const createOutput = executeTwig(
          `branch create ${branchName} ${parentBranch}`,
          'Create branch with twig'
        );
        
        // Switch to the branch if requested
        let switchOutput = '';
        if (switchToBranch) {
          switchOutput = executeGit(`checkout ${branchName}`, 'Switch to new branch');
        }
        
        // Verify the branch was created and parent was set
        const treeOutput = executeTwig('tree', 'Verify branch creation');
        const currentBranch = executeGit('branch --show-current', 'Get current branch');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                branchName: branchName,
                parentBranch: parentBranch,
                currentBranch: currentBranch,
                switched: switchToBranch,
                message: `Branch ${branchName} created successfully${switchToBranch ? ' and checked out' : ''}`,
                createOutput: createOutput,
                nextSteps: [
                  'Make your changes and commit them',
                  `Push the branch: git push -u origin ${branchName}`,
                  'Create a pull request when ready',
                ],
              }, null, 2),
            },
          ],
        };
      }

      case 'git_twig_tree': {
        const { compact = false } = args;
        
        log('Getting twig tree, compact:', compact);
        
        // Execute twig tree command
        const output = executeTwig('tree', 'Get branch dependency tree');
        
        // Parse tree structure
        const branches = parseTwigTree(output);
        
        // Get current branch
        const currentBranch = executeGit('branch --show-current', 'Get current branch');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                currentBranch: currentBranch,
                branchCount: branches.length,
                tree: compact ? branches.map(b => ({ name: b.name, level: b.level, isCurrent: b.isCurrent })) : branches,
                rawOutput: output,
              }, null, 2),
            },
          ],
        };
      }

      case 'git_twig_depend': {
        const { childBranch, parentBranch } = args;
        
        // Validate inputs
        const childValidation = validateBranchName(childBranch);
        if (!childValidation.valid) {
          return createErrorResponse(new Error(`Invalid child branch: ${childValidation.error}`), name, args);
        }
        
        const parentValidation = validateBranchName(parentBranch);
        if (!parentValidation.valid) {
          return createErrorResponse(new Error(`Invalid parent branch: ${parentValidation.error}`), name, args);
        }
        
        log('Setting branch dependency:', childBranch, '->', parentBranch);
        
        // Set branch dependency using twig
        const output = executeTwig(
          `branch depend ${childBranch} ${parentBranch}`,
          'Set branch dependency'
        );
        
        // Verify the dependency was set
        const treeOutput = executeTwig('tree', 'Verify dependency');
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                childBranch: childBranch,
                parentBranch: parentBranch,
                message: `Branch ${childBranch} now depends on ${parentBranch}`,
                output: output,
                verification: 'Run git_twig_tree to see updated branch structure',
              }, null, 2),
            },
          ],
        };
      }

      case 'git_rebase_interactive': {
        const { targetBranch, autoSquash = false } = args;
        
        // Validate input
        const validation = validateBranchName(targetBranch);
        if (!validation.valid) {
          return createErrorResponse(new Error(validation.error), name, args);
        }
        
        log('Starting interactive rebase onto:', targetBranch, 'autoSquash:', autoSquash);
        
        // Check if there are uncommitted changes
        const status = executeGit('status --porcelain', 'Check git status');
        if (status) {
          return createErrorResponse(
            new Error('Cannot rebase with uncommitted changes. Commit or stash your changes first.'),
            name,
            args
          );
        }
        
        // Note: Interactive rebase requires terminal interaction, so we provide instructions
        // rather than executing it directly
        const currentBranch = executeGit('branch --show-current', 'Get current branch');
        
        // Get commit count to rebase
        const commitCount = executeGit(
          `rev-list --count ${targetBranch}..${currentBranch}`,
          'Count commits to rebase'
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                interactive: true,
                currentBranch: currentBranch,
                targetBranch: targetBranch,
                commitsToRebase: parseInt(commitCount),
                command: autoSquash 
                  ? `git rebase -i --autosquash ${targetBranch}`
                  : `git rebase -i ${targetBranch}`,
                instructions: [
                  `Run the command in terminal to start interactive rebase`,
                  `In the editor that opens:`,
                  `  - "pick" keeps a commit as-is`,
                  `  - "squash" combines with previous commit`,
                  `  - "reword" edits commit message`,
                  `  - "drop" removes commit`,
                  `Save and close the editor to apply changes`,
                  `If conflicts occur, resolve them and run: git rebase --continue`,
                ],
                note: 'Interactive rebase requires terminal interaction and cannot be fully automated',
              }, null, 2),
            },
          ],
        };
      }

      case 'git_twig_cascade': {
        const { forcePush = false, dryRun = false } = args;
        
        log('Running twig cascade, forcePush:', forcePush, 'dryRun:', dryRun);
        
        // Check if there are uncommitted changes
        const status = executeGit('status --porcelain', 'Check git status');
        if (status && !dryRun) {
          return createErrorResponse(
            new Error('Cannot cascade with uncommitted changes. Commit or stash your changes first.'),
            name,
            args
          );
        }
        
        // Get current branch before cascade
        const currentBranch = executeGit('branch --show-current', 'Get current branch');
        
        // Build cascade command with non-interactive option
        let command = 'cascade --non-interactive';
        if (forcePush) {
          command += ' --force-push';
        }
        if (dryRun) {
          command += ' --dry-run';
        }
        
        // Execute cascade
        const output = executeTwig(command, 'Cascade branch changes');
        
        // Parse output to extract affected branches
        const affectedBranches = [];
        const lines = output.split('\n');
        for (const line of lines) {
          // Look for branch names in output
          if (line.includes('Rebasing') || line.includes('Updated')) {
            const match = line.match(/['"]?([^'"\s]+)['"]?/);
            if (match && match[1]) {
              affectedBranches.push(match[1]);
            }
          }
        }
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                currentBranch: currentBranch,
                forcePush: forcePush,
                dryRun: dryRun,
                affectedBranches: affectedBranches.length > 0 ? affectedBranches : 'See raw output',
                message: dryRun 
                  ? 'Dry run completed - no changes made'
                  : `Cascade completed${forcePush ? ' and force-pushed' : ''}`,
                rawOutput: output,
                nextSteps: dryRun 
                  ? ['Review the dry run output', 'Run again without --dry-run to apply changes']
                  : forcePush
                  ? ['Branches have been cascaded and force-pushed', 'Verify PR status if needed']
                  : ['Branches have been cascaded locally', 'Run with --force-push to push changes'],
              }, null, 2),
            },
          ],
        };
      }

      case 'git_check_pr_status': {
        const { prNumber, repo } = args;
        
        log('Checking PR status, number:', prNumber, 'repo:', repo);
        
        // Build gh command
        let command = 'pr view';
        if (prNumber) {
          command += ` ${prNumber}`;
        }
        if (repo) {
          // Validate repo format
          const parts = repo.split('/');
          if (parts.length !== 2) {
            return createErrorResponse(
              new Error('Repository must be in format "owner/repo"'),
              name,
              args
            );
          }
          
          const [owner, repoName] = parts;
          const ownerValidation = validateRepoOwner(owner);
          if (!ownerValidation.valid) {
            return createErrorResponse(new Error(ownerValidation.error), name, args);
          }
          
          const repoValidation = validateRepoName(repoName);
          if (!repoValidation.valid) {
            return createErrorResponse(new Error(repoValidation.error), name, args);
          }
          
          command += ` --repo ${repo}`;
        }
        command += ' --json number,title,state,reviewDecision,statusCheckRollup,mergeable,mergedAt,closedAt,url,headRefName,baseRefName,author,createdAt,updatedAt';
        
        // Execute gh command
        const output = executeGh(command, 'Get PR status');
        
        // Parse JSON output
        let prData;
        try {
          prData = JSON.parse(output);
        } catch (e) {
          throw new Error(`Failed to parse PR data: ${e.message}`);
        }
        
        // Extract CI check statuses
        const checks = prData.statusCheckRollup || [];
        const checkSummary = {
          total: checks.length,
          passed: checks.filter(c => c.conclusion === 'SUCCESS').length,
          failed: checks.filter(c => c.conclusion === 'FAILURE').length,
          pending: checks.filter(c => c.status === 'IN_PROGRESS' || c.status === 'PENDING').length,
        };
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                number: prData.number,
                title: prData.title,
                state: prData.state,
                author: prData.author?.login,
                branch: {
                  head: prData.headRefName,
                  base: prData.baseRefName,
                },
                review: {
                  decision: prData.reviewDecision || 'PENDING',
                  approved: prData.reviewDecision === 'APPROVED',
                },
                checks: checkSummary,
                mergeable: prData.mergeable,
                merged: !!prData.mergedAt,
                closed: !!prData.closedAt,
                url: prData.url,
                timestamps: {
                  created: prData.createdAt,
                  updated: prData.updatedAt,
                  merged: prData.mergedAt,
                  closed: prData.closedAt,
                },
                readyToMerge: prData.reviewDecision === 'APPROVED' && 
                             prData.mergeable === 'MERGEABLE' &&
                             checkSummary.failed === 0 &&
                             checkSummary.pending === 0,
              }, null, 2),
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
