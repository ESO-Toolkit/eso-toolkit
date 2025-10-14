/**
 * Simple Node.js cache management script
 * Directly implements cache functionality without TypeScript complications
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(process.cwd(), 'cache', 'eso-logs-api');
const CACHE_VERSION = '1.0';

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

async function showStats() {
  console.log('📊 ESO Logs API Cache Statistics\n');
  
  try {
    await ensureCacheDir();
    const files = await fs.readdir(CACHE_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    let totalSize = 0;
    let oldestTimestamp = Infinity;
    let newestTimestamp = 0;
    
    for (const file of jsonFiles) {
      const filePath = path.join(CACHE_DIR, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
      
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const entry = JSON.parse(content);
        
        if (entry.timestamp && typeof entry.timestamp === 'number') {
          if (entry.timestamp < oldestTimestamp) {
            oldestTimestamp = entry.timestamp;
          }
          if (entry.timestamp > newestTimestamp) {
            newestTimestamp = entry.timestamp;
          }
        }
      } catch {
        // Skip invalid cache files
      }
    }
    
    console.log(`📁 Total entries: ${jsonFiles.length}`);
    console.log(`📏 Total size: ${formatBytes(totalSize)}`);
    
    if (oldestTimestamp !== Infinity) {
      console.log(`📅 Oldest entry: ${new Date(oldestTimestamp).toLocaleString()}`);
    }
    
    if (newestTimestamp > 0) {
      console.log(`🆕 Newest entry: ${new Date(newestTimestamp).toLocaleString()}`);
    }
    
    if (jsonFiles.length === 0) {
      console.log('📭 Cache is empty');
    }
    
  } catch (error) {
    console.error('❌ Error reading cache stats:', error.message);
  }
}

async function cleanCache() {
  console.log('🧹 Cleaning expired cache entries...\n');
  
  let cleanedCount = 0;
  
  try {
    await ensureCacheDir();
    const files = await fs.readdir(CACHE_DIR);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      try {
        const filePath = path.join(CACHE_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const entry = JSON.parse(content);
        
        // Check if cache entry is valid (not expired)
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        const isExpired = now - entry.timestamp > maxAge;
        const isCorrectVersion = entry.version === CACHE_VERSION;
        
        if (isExpired || !isCorrectVersion) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      } catch {
        // If we can't parse the file, delete it
        await fs.unlink(path.join(CACHE_DIR, file));
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`✅ Cleaned ${cleanedCount} expired entries`);
    } else {
      console.log('✅ No expired entries found');
    }
    
    // Show updated stats
    console.log('\n📊 Updated cache statistics:');
    await showStats();
    
  } catch (error) {
    console.error('❌ Error cleaning cache:', error.message);
  }
}

async function clearCache() {
  console.log('🗑️ Clearing all cache entries...\n');
  
  try {
    const files = await fs.readdir(CACHE_DIR);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        await fs.unlink(path.join(CACHE_DIR, file));
      }
    }
    
    console.log('✅ Cache cleared successfully');
    
    // Show updated stats
    console.log('\n📊 Cache statistics after clearing:');
    await showStats();
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showHelp() {
  console.log('ESO Logs Cache Management\n');
  console.log('Usage:');
  console.log('  npm run cache:stats    # Show cache statistics');
  console.log('  npm run cache:clean    # Clean expired entries');
  console.log('  npm run cache:clear    # Clear all cache entries');
}

async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'stats':
      await showStats();
      break;
      
    case 'clean':
      await cleanCache();
      break;
      
    case 'clear':
      await clearCache();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command || '(none)'}\n`);
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Script failed:', error.message);
  process.exit(1);
});