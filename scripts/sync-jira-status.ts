#!/usr/bin/env node

/**
 * Jira Branch Status Sync Script
 * 
 * Automatically synchronizes Jira ticket statuses based on Git branch states.
 * 
 * Logic:
 * - Branch exists on remote → "In Progress" (if currently "To Do")
 * - Branch merged to master → "Done" (if not already done)
 * - Branch deleted → No action (ticket stays in current state)
 * - Multiple branches for same ticket → Use most recent branch
 * 
 * Usage:
 *   npm run sync-jira              # Dry run (shows what would change)
 *   npm run sync-jira -- --apply   # Apply changes to Jira
 *   npm run sync-jira -- --verbose # Show detailed logging
 * 
 * Requirements:
 * - acli (Atlassian CLI) must be installed and authenticated
 * - Git repository with remote access
 * - Jira access permissions for ESO project
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Configuration
const PROJECT_KEY = 'ESO';
const JIRA_BOARD_URL = 'https://bkrupa.atlassian.net';
const DEFAULT_BRANCH = 'master';

// Status transitions
const STATUS_TRANSITIONS = {
  TO_DO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
} as const;

interface BranchInfo {
  name: string;
  ticketId: string;
  isRemote: boolean;
  isMerged: boolean;
  lastCommitDate: Date;
  lastCommitHash: string;
}

interface JiraTicket {
  key: string;
  status: string;
  summary: string;
  assignee: string | null;
  type: string;
}

interface StatusChange {
  ticketId: string;
  currentStatus: string;
  newStatus: string;
  reason: string;
  branchName: string;
}

// CLI flags
const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const VERBOSE = args.includes('--verbose');

// Logging utilities
function log(message: string, ...data: any[]): void {
  console.log(`[SYNC] ${message}`, ...data);
}

function verbose(message: string, ...data: any[]): void {
  if (VERBOSE) {
    console.log(`[DEBUG] ${message}`, ...data);
  }
}

function error(message: string, ...data: any[]): void {
  console.error(`[ERROR] ${message}`, ...data);
}

function success(message: string, ...data: any[]): void {
  console.log(`[✓] ${message}`, ...data);
}

function warning(message: string, ...data: any[]): void {
  console.log(`[!] ${message}`, ...data);
}

/**
 * Execute shell command and return output
 */
function exec(command: string, options: { silent?: boolean } = {}): string {
  try {
    const result = execSync(command, {
      encoding: 'utf-8',
      stdio: options.silent ? 'pipe' : 'pipe',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    return result.trim();
  } catch (err: any) {
    if (!options.silent) {
      error(`Command failed: ${command}`);
      error(err.message);
    }
    throw err;
  }
}

/**
 * Check if acli is installed and authenticated
 */
function checkPrerequisites(): boolean {
  verbose('Checking prerequisites...');
  
  // Check if acli is installed
  try {
    const version = exec('acli --version', { silent: true });
    verbose(`acli version: ${version}`);
  } catch {
    error('Atlassian CLI (acli) is not installed');
    error('Install from: https://bobswift.atlassian.net/wiki/spaces/ACLI/overview');
    return false;
  }

  // Check if acli is authenticated
  try {
    const authStatus = exec('acli jira auth status', { silent: true });
    if (!authStatus.includes('authenticated') && !authStatus.includes('success')) {
      error('acli is not authenticated');
      error('Run: acli jira auth login');
      return false;
    }
    verbose('acli authentication: OK');
  } catch {
    error('Failed to check acli authentication status');
    error('Run: acli jira auth login');
    return false;
  }

  // Check git repository
  try {
    exec('git rev-parse --git-dir', { silent: true });
    verbose('Git repository: OK');
  } catch {
    error('Not in a git repository');
    return false;
  }

  return true;
}

/**
 * Extract ticket ID from branch name (ESO-XXX)
 */
function extractTicketId(branchName: string): string | null {
  const match = branchName.match(/^(ESO-\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Get all branches with ESO ticket IDs
 */
function getBranches(): BranchInfo[] {
  verbose('Fetching branches...');
  
  // Fetch latest from remote
  try {
    exec('git fetch --all --prune', { silent: true });
  } catch (err) {
    warning('Failed to fetch from remote, using local branches only');
  }

  const branches: BranchInfo[] = [];

  // Get all branches (local and remote)
  const branchOutput = exec('git branch -a --format="%(refname:short)|%(committerdate:iso8601)|%(objectname:short)"');
  const branchLines = branchOutput.split('\n').filter(line => line.trim());

  for (const line of branchLines) {
    const [name, dateStr, hash] = line.split('|');
    const ticketId = extractTicketId(name);
    
    if (!ticketId) continue;

    // Skip origin/HEAD
    if (name.includes('HEAD')) continue;

    // Determine if remote branch
    const isRemote = name.startsWith('origin/');
    const cleanName = isRemote ? name.replace('origin/', '') : name;

    // Check if merged to master
    let isMerged = false;
    try {
      const mergedCheck = exec(
        `git branch -a --merged origin/${DEFAULT_BRANCH} --format="%(refname:short)"`,
        { silent: true }
      );
      isMerged = mergedCheck.includes(name) || mergedCheck.includes(cleanName);
    } catch {
      verbose(`Could not check merge status for ${name}`);
    }

    branches.push({
      name: cleanName,
      ticketId,
      isRemote,
      isMerged,
      lastCommitDate: new Date(dateStr),
      lastCommitHash: hash,
    });
  }

  // Remove duplicates, keeping remote over local
  const uniqueBranches = new Map<string, BranchInfo>();
  for (const branch of branches) {
    const key = `${branch.ticketId}:${branch.name}`;
    const existing = uniqueBranches.get(key);
    
    if (!existing || (branch.isRemote && !existing.isRemote)) {
      uniqueBranches.set(key, branch);
    }
  }

  const result = Array.from(uniqueBranches.values());
  verbose(`Found ${result.length} unique branches with ticket IDs`);
  return result;
}

/**
 * Get Jira ticket information
 */
function getJiraTicket(ticketId: string): JiraTicket | null {
  verbose(`Fetching Jira ticket: ${ticketId}`);
  
  try {
    const output = exec(
      `acli jira issue get ${ticketId} --fields=key,status,summary,assignee,issuetype`,
      { silent: true }
    );

    // Parse acli output (format: "key: value" lines)
    const lines = output.split('\n');
    const ticket: Partial<JiraTicket> = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      if (key.includes('key')) ticket.key = value;
      if (key.includes('status')) ticket.status = value;
      if (key.includes('summary')) ticket.summary = value;
      if (key.includes('assignee')) ticket.assignee = value || null;
      if (key.includes('issuetype') || key.includes('type')) ticket.type = value;
    }

    if (!ticket.key || !ticket.status) {
      verbose(`Incomplete ticket data for ${ticketId}: ${JSON.stringify(ticket)}`);
      return null;
    }

    return ticket as JiraTicket;
  } catch (err) {
    verbose(`Failed to fetch ticket ${ticketId}: ${err}`);
    return null;
  }
}

/**
 * Determine what status change (if any) should be made
 */
function determineStatusChange(
  branch: BranchInfo,
  ticket: JiraTicket
): StatusChange | null {
  const currentStatus = ticket.status;

  // Rule 1: Branch merged to master → Should be "Done"
  if (branch.isMerged) {
    if (currentStatus !== STATUS_TRANSITIONS.DONE) {
      return {
        ticketId: ticket.key,
        currentStatus,
        newStatus: STATUS_TRANSITIONS.DONE,
        reason: `Branch merged to ${DEFAULT_BRANCH}`,
        branchName: branch.name,
      };
    }
  }

  // Rule 2: Remote branch exists → Should be at least "In Progress"
  if (branch.isRemote && !branch.isMerged) {
    if (currentStatus === STATUS_TRANSITIONS.TO_DO) {
      return {
        ticketId: ticket.key,
        currentStatus,
        newStatus: STATUS_TRANSITIONS.IN_PROGRESS,
        reason: 'Remote branch exists',
        branchName: branch.name,
      };
    }
  }

  return null;
}

/**
 * Apply status change to Jira
 */
function applyStatusChange(change: StatusChange): boolean {
  try {
    log(`Transitioning ${change.ticketId}: ${change.currentStatus} → ${change.newStatus}`);
    
    exec(
      `acli jira issue transition ${change.ticketId} --status="${change.newStatus}" --comment="Automated status update: ${change.reason} (branch: ${change.branchName})"`,
      { silent: !VERBOSE }
    );

    success(`Updated ${change.ticketId} to ${change.newStatus}`);
    return true;
  } catch (err) {
    error(`Failed to update ${change.ticketId}: ${err}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  console.log('='.repeat(80));
  console.log('Jira Branch Status Sync');
  console.log('='.repeat(80));
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes will be made)' : 'APPLY CHANGES'}`);
  console.log(`Project: ${PROJECT_KEY}`);
  console.log(`Board: ${JIRA_BOARD_URL}`);
  console.log('='.repeat(80));
  console.log();

  // Check prerequisites
  if (!checkPrerequisites()) {
    process.exit(1);
  }

  // Get all branches
  const branches = getBranches();
  
  if (branches.length === 0) {
    warning('No branches found with ticket IDs');
    return;
  }

  log(`Analyzing ${branches.length} branches...`);
  console.log();

  // Group branches by ticket ID
  const branchesByTicket = new Map<string, BranchInfo[]>();
  for (const branch of branches) {
    const existing = branchesByTicket.get(branch.ticketId) || [];
    existing.push(branch);
    branchesByTicket.set(branch.ticketId, existing);
  }

  // Analyze each ticket
  const changes: StatusChange[] = [];
  const tickets = Array.from(branchesByTicket.keys()).sort();

  for (const ticketId of tickets) {
    const ticketBranches = branchesByTicket.get(ticketId)!;
    
    // Use most recent branch for analysis
    const latestBranch = ticketBranches.sort(
      (a, b) => b.lastCommitDate.getTime() - a.lastCommitDate.getTime()
    )[0];

    verbose(`Analyzing ${ticketId} (${ticketBranches.length} branch(es))`);

    // Fetch Jira ticket
    const ticket = getJiraTicket(ticketId);
    if (!ticket) {
      warning(`Could not fetch ticket ${ticketId}, skipping`);
      continue;
    }

    // Determine if status change needed
    const change = determineStatusChange(latestBranch, ticket);
    if (change) {
      changes.push(change);
    } else {
      verbose(`${ticketId}: No change needed (status: ${ticket.status})`);
    }
  }

  // Report findings
  console.log();
  console.log('='.repeat(80));
  console.log('RESULTS');
  console.log('='.repeat(80));
  console.log();

  if (changes.length === 0) {
    success('All tickets are already in sync! No changes needed.');
    return;
  }

  console.log(`Found ${changes.length} ticket(s) that need status updates:\n`);

  // Display changes
  for (const change of changes) {
    console.log(`  ${change.ticketId}: ${change.currentStatus} → ${change.newStatus}`);
    console.log(`    Branch: ${change.branchName}`);
    console.log(`    Reason: ${change.reason}`);
    console.log();
  }

  // Apply changes if not dry run
  if (!DRY_RUN) {
    console.log('='.repeat(80));
    console.log('APPLYING CHANGES');
    console.log('='.repeat(80));
    console.log();

    let successCount = 0;
    let failCount = 0;

    for (const change of changes) {
      if (applyStatusChange(change)) {
        successCount++;
      } else {
        failCount++;
      }
    }

    console.log();
    console.log('='.repeat(80));
    console.log(`SUMMARY: ${successCount} succeeded, ${failCount} failed`);
    console.log('='.repeat(80));
  } else {
    console.log('='.repeat(80));
    console.log('DRY RUN COMPLETE - No changes made');
    console.log('Run with --apply flag to apply these changes');
    console.log('='.repeat(80));
  }
}

// Execute
main().catch(err => {
  error('Fatal error:', err);
  process.exit(1);
});
