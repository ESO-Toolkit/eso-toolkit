#!/usr/bin/env node

/**
 * Scribing Shrinkwrap - File Integrity Protection
 * Ensures critical scribing data files haven't been corrupted or modified unexpectedly
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ScribingShrinkwrap {
  constructor() {
    this.shrinkwrapPath = path.join(__dirname, '..', 'data', '.scribing-shrinkwrap.json');
    this.trackedFiles = [
      'data/scribing-complete.json',
      'data/abilities.json'
    ];
  }

  /**
   * Calculate SHA256 hash of a file
   */
  calculateFileHash(filePath) {
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const fileBuffer = fs.readFileSync(absolutePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * Get file statistics
   */
  getFileStats(filePath) {
    const absolutePath = path.resolve(filePath);
    const stats = fs.statSync(absolutePath);
    
    return {
      checksum: this.calculateFileHash(filePath),
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      algorithm: 'sha256'
    };
  }

  /**
   * Create a new shrinkwrap file
   */
  create() {
    console.log('🔒 Creating scribing shrinkwrap...');
    
    const shrinkwrapData = {
      version: '1.0.0',
      description: 'Scribing database integrity protection',
      createdAt: new Date().toISOString(),
      createdBy: 'scribing-shrinkwrap.js',
      files: {}
    };

    // Process each tracked file
    for (const filePath of this.trackedFiles) {
      try {
        console.log(`📄 Processing ${filePath}...`);
        shrinkwrapData.files[filePath] = this.getFileStats(filePath);
        console.log(`✅ ${filePath} - ${shrinkwrapData.files[filePath].size} bytes`);
      } catch (error) {
        console.error(`❌ Failed to process ${filePath}:`, error.message);
        process.exit(1);
      }
    }

    // Create backup if shrinkwrap already exists
    if (fs.existsSync(this.shrinkwrapPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = `${this.shrinkwrapPath}.${timestamp}.backup`;
      fs.copyFileSync(this.shrinkwrapPath, backupPath);
      console.log(`💾 Backup created: ${path.basename(backupPath)}`);
    }

    // Write new shrinkwrap
    fs.writeFileSync(this.shrinkwrapPath, JSON.stringify(shrinkwrapData, null, 2));
    console.log(`✅ Shrinkwrap created: ${this.shrinkwrapPath}`);
    console.log(`📊 Tracking ${this.trackedFiles.length} files`);
  }

  /**
   * Validate current files against shrinkwrap
   */
  validate() {
    console.log('🔍 Validating file integrity...');

    if (!fs.existsSync(this.shrinkwrapPath)) {
      console.error('❌ Shrinkwrap file not found. Run "npm run shrinkwrap:create" first.');
      process.exit(1);
    }

    const shrinkwrapData = JSON.parse(fs.readFileSync(this.shrinkwrapPath, 'utf8'));
    let allValid = true;
    let changedFiles = [];

    for (const [filePath, expectedStats] of Object.entries(shrinkwrapData.files)) {
      try {
        console.log(`🔍 Checking ${filePath}...`);
        const currentStats = this.getFileStats(filePath);

        // Check checksum
        if (currentStats.checksum !== expectedStats.checksum) {
          console.error(`❌ ${filePath} - Checksum mismatch!`);
          console.error(`   Expected: ${expectedStats.checksum}`);
          console.error(`   Current:  ${currentStats.checksum}`);
          allValid = false;
          changedFiles.push(filePath);
        }
        // Check size
        else if (currentStats.size !== expectedStats.size) {
          console.error(`❌ ${filePath} - Size mismatch!`);
          console.error(`   Expected: ${expectedStats.size} bytes`);
          console.error(`   Current:  ${currentStats.size} bytes`);
          allValid = false;
          changedFiles.push(filePath);
        }
        // Check modification time (warning only)
        else if (currentStats.lastModified !== expectedStats.lastModified) {
          console.warn(`⚠️  ${filePath} - Modification time changed`);
          console.warn(`   Expected: ${expectedStats.lastModified}`);
          console.warn(`   Current:  ${currentStats.lastModified}`);
          // Don't mark as invalid for timestamp changes if content matches
          console.log(`✅ ${filePath} - Content integrity verified`);
        } else {
          console.log(`✅ ${filePath} - No changes detected`);
        }
      } catch (error) {
        console.error(`❌ Failed to validate ${filePath}:`, error.message);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('🎉 All files passed integrity validation!');
    } else {
      console.error(`\n❌ Integrity validation failed for ${changedFiles.length} file(s).`);
      console.error('Files with changes:');
      changedFiles.forEach(file => console.error(`  - ${file}`));
      console.error('\nIf changes are expected, run "npm run shrinkwrap:update"');
      process.exit(1);
    }
  }

  /**
   * Update shrinkwrap with current file states
   */
  update() {
    console.log('🔄 Updating scribing shrinkwrap...');

    if (!fs.existsSync(this.shrinkwrapPath)) {
      console.log('📄 No existing shrinkwrap found, creating new one...');
      this.create();
      return;
    }

    const shrinkwrapData = JSON.parse(fs.readFileSync(this.shrinkwrapPath, 'utf8'));
    
    // Update metadata
    shrinkwrapData.updatedAt = new Date().toISOString();
    shrinkwrapData.updatedBy = 'scribing-shrinkwrap.js';

    let updatedCount = 0;

    // Update each tracked file
    for (const filePath of this.trackedFiles) {
      try {
        console.log(`🔄 Updating ${filePath}...`);
        const newStats = this.getFileStats(filePath);
        const oldStats = shrinkwrapData.files[filePath];

        if (!oldStats || newStats.checksum !== oldStats.checksum) {
          shrinkwrapData.files[filePath] = newStats;
          updatedCount++;
          console.log(`✅ ${filePath} - Updated (${newStats.size} bytes)`);
        } else {
          console.log(`ℹ️  ${filePath} - No changes`);
        }
      } catch (error) {
        console.error(`❌ Failed to update ${filePath}:`, error.message);
        process.exit(1);
      }
    }

    // Create backup of old shrinkwrap
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.shrinkwrapPath}.${timestamp}.backup`;
    fs.copyFileSync(this.shrinkwrapPath, backupPath);

    // Write updated shrinkwrap
    fs.writeFileSync(this.shrinkwrapPath, JSON.stringify(shrinkwrapData, null, 2));
    
    console.log(`💾 Backup created: ${path.basename(backupPath)}`);
    console.log(`✅ Shrinkwrap updated: ${updatedCount} file(s) changed`);
  }

  /**
   * Display help information
   */
  help() {
    console.log(`
📦 Scribing Shrinkwrap - File Integrity Protection

Usage: node scripts/scribing-shrinkwrap.js <command>

Commands:
  create     Create a new shrinkwrap file
  validate   Validate current files against shrinkwrap
  update     Update shrinkwrap with current file states
  help       Show this help message

Examples:
  npm run shrinkwrap:create
  npm run shrinkwrap:validate
  npm run shrinkwrap:update

Tracked Files:
${this.trackedFiles.map(file => `  - ${file}`).join('\n')}
`);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  const shrinkwrap = new ScribingShrinkwrap();

  switch (command) {
    case 'create':
      shrinkwrap.create();
      break;
    case 'validate':
      shrinkwrap.validate();
      break;
    case 'update':
      shrinkwrap.update();
      break;
    case 'help':
    case '--help':
    case '-h':
      shrinkwrap.help();
      break;
    default:
      console.error('❌ Unknown command. Use "help" for usage information.');
      process.exit(1);
  }
}

module.exports = ScribingShrinkwrap;