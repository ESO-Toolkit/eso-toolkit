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
  if (DEBUG) console.error('[Workflow Skill]', new Date().toISOString(), ...args);
}

/**
 * Execute git command
 */
function executeGit(command) {
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
    const errorMessage = error.stderr || error.message;
    log('Git command failed:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Check if twig is available
 */
function hasTwig() {
  try {
    execSync('twig --version', { encoding: 'utf-8', stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 */
function getCurrentBranch() {
  return executeGit('rev-parse --abbrev-ref HEAD');
}

/**
 * Check if branch is protected (master/main)
 */
function isProtectedBranch(branchName) {
  return branchName === 'master' || branchName === 'main';
}

/**
 * Check if branch exists
 */
function branchExists(branchName) {
  try {
    executeGit(`rev-parse --verify ${branchName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Create feature branch
 */
function createBranch(branchName, parentBranch = 'master') {
  log('Creating branch:', branchName, 'from', parentBranch);
  
  // Ensure we're on parent branch
  executeGit(`checkout ${parentBranch}`);
  
  // Create and checkout new branch
  executeGit(`checkout -b ${branchName}`);
  
  // Set up twig parent if available
  if (hasTwig()) {
    try {
      execSync(`twig branch ${branchName} --parent ${parentBranch}`, {
        cwd: PROJECT_ROOT,
        encoding: 'utf-8',
      });
      log('Twig parent set:', parentBranch);
    } catch (error) {
      log('Twig setup failed (non-critical):', error.message);
    }
  }
  
  return branchName;
}

/**
 * Validate branch name format
 */
function validateBranchName(branchName) {
  if (!branchName || typeof branchName !== 'string') {
    return { valid: false, error: 'Branch name is required' };
  }
  
  // Check for invalid characters
  const invalidChars = /[\s~^:?*\[\\]/;
  if (invalidChars.test(branchName)) {
    return {
      valid: false,
      error: `Invalid branch name: cannot contain spaces or special characters: ~ ^ : ? * [ \\`,
      suggestion: 'Use format: ESO-XXX/description-here'
    };
  }
  
  // Check if it looks like a feature branch
  const hasPrefix = /^[A-Z]+-\d+/.test(branchName); // ESO-123
  const hasDescription = branchName.includes('/');
  
  if (!hasPrefix || !hasDescription) {
    return {
      valid: false,
      error: 'Branch name should follow format: ESO-XXX/description',
      suggestion: `Example: ESO-372/add-dashboard`
    };
  }
  
  return { valid: true };
}

/**
 * Check current branch status
 */
function checkCurrentBranchTool() {
  const currentBranch = getCurrentBranch();
  const protected = isProtectedBranch(currentBranch);
  const isFeatureBranch = !protected && currentBranch.includes('/');
  
  let recommendation;
  if (protected) {
    recommendation = '🚨 CREATE A FEATURE BRANCH BEFORE MAKING CHANGES';
  } else if (isFeatureBranch) {
    recommendation = '✅ Safe to work on this branch';
  } else {
    recommendation = '⚠️ Unusual branch name - consider using ESO-XXX/description format';
  }
  
  return {
    branch: currentBranch,
    is_protected: protected,
    is_feature_branch: isFeatureBranch,
    recommendation: recommendation,
    pattern: 'ESO-XXX/description',
  };
}

/**
 * Ensure feature branch exists and is checked out
 */
function ensureFeatureBranchTool(args) {
  const currentBranch = getCurrentBranch();
  const ticketId = args.ticket_id;
  const description = args.description;
  const parentBranch = args.parent_branch || 'master';
  
  // If already on a feature branch, we're good
  if (!isProtectedBranch(currentBranch) && currentBranch.includes('/')) {
    log('Already on feature branch:', currentBranch);
    return {
      branch: currentBranch,
      action: 'already_on_feature_branch',
      ready: true,
      message: `✅ Already on feature branch: ${currentBranch}`
    };
  }
  
  // If on protected branch, need to create feature branch
  if (isProtectedBranch(currentBranch)) {
    if (!ticketId) {
      return {
        error: true,
        message: '🚨 Cannot work on master branch without a ticket ID',
        required: 'ticket_id',
        example: 'ESO-372',
        recommendation: 'Provide ticket_id parameter to create feature branch'
      };
    }
    
    if (!description) {
      return {
        error: true,
        message: '🚨 Cannot create branch without description',
        required: 'description',
        example: 'add-dashboard',
        recommendation: 'Provide description parameter for branch name'
      };
    }
    
    // Format branch name
    const branchName = `${ticketId}/${description}`;
    
    // Validate branch name
    const validation = validateBranchName(branchName);
    if (!validation.valid) {
      return {
        error: true,
        message: validation.error,
        suggestion: validation.suggestion,
      };
    }
    
    // Check if branch already exists
    if (branchExists(branchName)) {
      log('Branch exists, checking out:', branchName);
      executeGit(`checkout ${branchName}`);
      return {
        branch: branchName,
        action: 'switched_to_existing',
        ready: true,
        message: `✅ Switched to existing branch: ${branchName}`
      };
    }
    
    // Create new branch
    log('Creating new branch:', branchName);
    createBranch(branchName, parentBranch);
    
    return {
      branch: branchName,
      action: 'created',
      parent: parentBranch,
      ready: true,
      message: `✅ Created and switched to: ${branchName}`,
      twig_parent: hasTwig() ? parentBranch : 'not_configured'
    };
  }
  
  // On some other branch
  return {
    branch: currentBranch,
    action: 'none',
    ready: false,
    warning: '⚠️ On non-standard branch - consider switching to feature branch',
    recommendation: 'Use format: ESO-XXX/description'
  };
}

/**
 * Provide recovery steps if changes were made on master
 */
function recoverFromMasterCommitsTool() {
  const currentBranch = getCurrentBranch();
  
  if (!isProtectedBranch(currentBranch)) {
    return {
      error: false,
      message: `ℹ️ Not on master/main branch (current: ${currentBranch})`,
      recommendation: 'No recovery needed - already on a feature branch'
    };
  }
  
  return {
    branch: currentBranch,
    recovery_needed: true,
    steps: [
      {
        step: 1,
        action: 'Create branch from current state',
        command: 'git checkout -b ESO-XXX/description',
        description: 'Replace ESO-XXX with your ticket number and description'
      },
      {
        step: 2,
        action: 'Commit your changes',
        command: 'git add . && git commit -m "ESO-XXX: Description"',
        description: 'Save all changes to the feature branch'
      },
      {
        step: 3,
        action: 'Reset master to origin',
        command: 'git checkout master && git reset --hard origin/master',
        description: 'Clean up master branch'
      },
      {
        step: 4,
        action: 'Return to feature branch',
        command: 'git checkout ESO-XXX/description',
        description: 'Continue work on your feature'
      }
    ],
    warning: '🚨 This will reset master to match origin - ensure changes are committed to feature branch first',
    twig_note: hasTwig() ? 'After recovery, run: twig branch ESO-XXX/description --parent master' : null
  };
}

/**
 * Main server setup
 */
const server = new Server(
  {
    name: 'eso-log-aggregator-workflow',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  log('Listing available tools');
  
  return {
    tools: [
      {
        name: 'check_current_branch',
        description: 'Check if current branch is safe to commit to. Returns branch name, protection status, and recommendations.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'ensure_feature_branch',
        description: 'Ensure a feature branch exists and is checked out before starting work. Creates branch if needed, or switches to existing branch. MUST be called before implementing any Jira ticket.',
        inputSchema: {
          type: 'object',
          properties: {
            ticket_id: {
              type: 'string',
              description: 'Jira ticket ID (e.g., "ESO-372"). Required when on master/main branch.',
              pattern: '^[A-Z]+-\\d+$',
            },
            description: {
              type: 'string',
              description: 'Branch description (e.g., "add-dashboard"). Required when creating new branch.',
              pattern: '^[a-z0-9-]+$',
            },
            parent_branch: {
              type: 'string',
              description: 'Parent branch name (default: "master"). Used when creating new branch.',
              default: 'master',
            },
          },
          required: [],
        },
      },
      {
        name: 'recover_from_master_commits',
        description: 'Provide step-by-step instructions to recover when changes were accidentally made on master/main. Returns commands to save work to feature branch and reset master.',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
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
  
  log('Tool called:', name, 'with args:', args);
  
  try {
    let result;
    
    switch (name) {
      case 'check_current_branch':
        result = checkCurrentBranchTool();
        break;
        
      case 'ensure_feature_branch':
        result = ensureFeatureBranchTool(args || {});
        break;
        
      case 'recover_from_master_commits':
        result = recoverFromMasterCommitsTool();
        break;
        
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    
    log('Tool result:', result);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    log('Tool error:', error);
    
    const errorResponse = {
      error: true,
      tool: name,
      message: error.message,
      timestamp: new Date().toISOString(),
    };
    
    // Add recovery suggestions
    if (error.message.includes('not a git repository')) {
      errorResponse.suggestion = 'Ensure you are in the eso-log-aggregator project directory';
    } else if (error.message.includes('uncommitted changes')) {
      errorResponse.suggestion = 'Commit or stash changes before switching branches';
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(errorResponse, null, 2),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start server
 */
async function main() {
  log('Starting Git Workflow Enforcement Skill server');
  log('Project root:', PROJECT_ROOT);
  log('Twig available:', hasTwig());
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  log('Server started and listening');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
