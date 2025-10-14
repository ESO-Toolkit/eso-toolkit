#!/usr/bin/env node

/**
 * Merge Queue Management Script
 * 
 * Provides utilities to manage the merge queue system:
 * - Add/remove PRs from queue
 * - Check queue status
 * - Process queue manually
 * - Configure queue settings
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  MERGE_QUEUE_LABEL: 'merge-queue',
  AUTO_MERGE_LABEL: 'auto-merge',
  PRIORITY_LABELS: ['priority', 'hotfix', 'critical'],
  BLOCK_LABELS: ['do not merge', 'do-not-merge', 'wip', 'work in progress', 'needs review'],
  REQUIRED_REVIEWS: 1,
  REQUIRED_CHECKS: [
    'build',
    'lint', 
    'format',
    'test',
    'typecheck',
    'build-storybook',
    'playwright-smoke',
    'check-do-not-merge-label'
  ]
};

class MergeQueueManager {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });
    
    // Parse repository info from git remote or environment
    this.owner = process.env.GITHUB_REPOSITORY_OWNER || this.getRepoOwner();
    this.repo = process.env.GITHUB_REPOSITORY_NAME || this.getRepoName();
    
    if (!this.owner || !this.repo) {
      throw new Error('Could not determine repository owner/name. Set GITHUB_REPOSITORY_OWNER and GITHUB_REPOSITORY_NAME environment variables.');
    }
  }

  getRepoOwner() {
    try {
      const remoteUrl = require('child_process').execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\//);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  getRepoName() {
    try {
      const remoteUrl = require('child_process').execSync('git remote get-url origin', { encoding: 'utf8' }).trim();
      const match = remoteUrl.match(/github\.com[:/][^/]+\/([^/.]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }

  async getPR(prNumber) {
    const { data } = await this.octokit.rest.pulls.get({
      owner: this.owner,
      repo: this.repo,
      pull_number: prNumber
    });
    return data;
  }

  async addToQueue(prNumber, priority = false) {
    await this.log(`Adding PR #${prNumber} to merge queue...`);
    
    const label = priority ? CONFIG.AUTO_MERGE_LABEL : CONFIG.MERGE_QUEUE_LABEL;
    
    await this.octokit.rest.issues.addLabels({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      labels: [label]
    });

    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body: `🎯 **Added to Merge Queue**\n\nThis PR has been added to the merge queue${priority ? ' with priority' : ''}. The merge queue will automatically click the merge button when all requirements are met:\n\n- ✅ All required checks pass\n- ✅ Required approvals received\n- ✅ No merge conflicts\n- ✅ No blocking labels\n- ✅ Branch protection rules satisfied\n\n*The merge will respect all repository settings and branch protection rules.*\n\n*Use \`npm run queue:status\` to check the current queue status.*`
    });

    await this.log(`✅ PR #${prNumber} added to merge queue`);
  }

  async removeFromQueue(prNumber) {
    await this.log(`Removing PR #${prNumber} from merge queue...`);
    
    // Remove both possible labels
    try {
      await this.octokit.rest.issues.removeLabel({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        name: CONFIG.MERGE_QUEUE_LABEL
      });
    } catch (error) {
      // Label might not exist
    }

    try {
      await this.octokit.rest.issues.removeLabel({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
        name: CONFIG.AUTO_MERGE_LABEL
      });
    } catch (error) {
      // Label might not exist
    }

    await this.octokit.rest.issues.createComment({
      owner: this.owner,
      repo: this.repo,
      issue_number: prNumber,
      body: `🚫 **Removed from Merge Queue**\n\nThis PR has been removed from the merge queue and will not be automatically merged.`
    });

    await this.log(`✅ PR #${prNumber} removed from merge queue`);
  }

  async getQueueStatus() {
    await this.log('Fetching merge queue status...');
    
    const { data: prs } = await this.octokit.rest.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      base: 'master',
      sort: 'created',
      direction: 'asc',
      per_page: 100
    });

    const queuedPRs = prs.filter(pr => {
      const labels = pr.labels.map(label => label.name.toLowerCase());
      return labels.includes(CONFIG.MERGE_QUEUE_LABEL.toLowerCase()) || 
             labels.includes(CONFIG.AUTO_MERGE_LABEL.toLowerCase());
    });

    const status = [];
    for (const pr of queuedPRs) {
      const prStatus = await this.checkPRStatus(pr);
      status.push({
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        created: pr.created_at,
        mergeable: prStatus.mergeable,
        reason: prStatus.reason,
        priority: this.hasPriorityLabel(pr),
        labels: pr.labels.map(l => l.name)
      });
    }

    return status.sort((a, b) => {
      // Priority first, then by creation date
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      return new Date(a.created) - new Date(b.created);
    });
  }

  hasPriorityLabel(pr) {
    const labels = pr.labels.map(label => label.name.toLowerCase());
    return CONFIG.PRIORITY_LABELS.some(priorityLabel => 
      labels.some(prLabel => prLabel.includes(priorityLabel.toLowerCase()))
    );
  }

  async checkPRStatus(pr) {
    // Implementation similar to the GitHub Action script
    if (pr.state !== 'open') {
      return { mergeable: false, reason: 'PR is not open' };
    }
    
    // Check for blocking labels
    const labels = pr.labels.map(label => label.name.toLowerCase());
    const hasBlockingLabels = CONFIG.BLOCK_LABELS.some(blockLabel => 
      labels.some(prLabel => prLabel.includes(blockLabel.toLowerCase()))
    );
    
    if (hasBlockingLabels) {
      return { mergeable: false, reason: 'PR has blocking labels' };
    }
    
    // Check merge conflicts
    if (pr.mergeable === false) {
      return { mergeable: false, reason: 'PR has merge conflicts' };
    }
    
    // Note: For full status check, we'd need to implement the same logic as the GitHub Action
    // This is a simplified version for the CLI tool
    return { mergeable: true, reason: 'Ready for merge queue processing' };
  }

  async triggerProcessing() {
    await this.log('Triggering merge queue processing...');
    
    try {
      await this.octokit.rest.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: 'merge-queue.yml',
        ref: 'master',
        inputs: {
          force_process: true
        }
      });
      
      await this.log('✅ Merge queue processing triggered');
    } catch (error) {
      await this.log(`❌ Failed to trigger processing: ${error.message}`);
      throw error;
    }
  }

  async printQueueStatus() {
    const status = await this.getQueueStatus();
    
    console.log('\n📋 MERGE QUEUE STATUS');
    console.log('='.repeat(50));
    
    if (status.length === 0) {
      console.log('Queue is empty');
      return;
    }

    status.forEach((pr, index) => {
      const position = index + 1;
      const priorityFlag = pr.priority ? ' 🔥 PRIORITY' : '';
      const statusIcon = pr.mergeable ? '✅' : '❌';
      
      console.log(`\n${position}. ${statusIcon} PR #${pr.number}${priorityFlag}`);
      console.log(`   Title: ${pr.title}`);
      console.log(`   Author: ${pr.author}`);
      console.log(`   Status: ${pr.reason}`);
      console.log(`   Labels: ${pr.labels.join(', ')}`);
    });
    
    console.log('\n' + '='.repeat(50));
  }

  async showHelp() {
    console.log(`
🎯 Merge Queue Manager

Usage:
  npm run queue:add <pr_number>         Add PR to merge queue
  npm run queue:add <pr_number> --priority  Add PR with priority
  npm run queue:remove <pr_number>      Remove PR from merge queue  
  npm run queue:status                  Show queue status
  npm run queue:process                 Trigger queue processing
  npm run queue:help                    Show this help

Examples:
  npm run queue:add 123                 # Add PR #123 to queue
  npm run queue:add 456 --priority      # Add PR #456 with priority
  npm run queue:remove 123              # Remove PR #123 from queue
  npm run queue:status                  # Show current queue

Labels:
  ${CONFIG.MERGE_QUEUE_LABEL}           - Standard merge queue
  ${CONFIG.AUTO_MERGE_LABEL}            - High priority auto-merge
  
Priority Labels: ${CONFIG.PRIORITY_LABELS.join(', ')}
Blocking Labels: ${CONFIG.BLOCK_LABELS.join(', ')}

Required Checks:
${CONFIG.REQUIRED_CHECKS.map(check => `  - ${check}`).join('\n')}
`);
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  try {
    const manager = new MergeQueueManager();
    
    switch (command) {
      case 'add':
        const prNumber = parseInt(args[1]);
        if (!prNumber) {
          console.error('❌ PR number is required');
          process.exit(1);
        }
        const priority = args.includes('--priority');
        await manager.addToQueue(prNumber, priority);
        break;
        
      case 'remove':
        const prToRemove = parseInt(args[1]);
        if (!prToRemove) {
          console.error('❌ PR number is required');
          process.exit(1);
        }
        await manager.removeFromQueue(prToRemove);
        break;
        
      case 'status':
        await manager.printQueueStatus();
        break;
        
      case 'process':
        await manager.triggerProcessing();
        break;
        
      case 'help':
      case '--help':
      case '-h':
        await manager.showHelp();
        break;
        
      default:
        console.error('❌ Unknown command. Use "help" to see available commands.');
        process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MergeQueueManager, CONFIG };