/**
 * Debug script to test food buff detection with authentication
 * Run with: node test-food-buff-debug.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runTest() {
  // Load auth state
  const authStatePath = path.join(__dirname, 'tests', 'auth-state.json');
  
  if (!fs.existsSync(authStatePath)) {
    console.error('❌ auth-state.json not found at:', authStatePath);
    console.log('Please ensure you have run authentication setup first.');
    process.exit(1);
  }
  
  const authState = JSON.parse(fs.readFileSync(authStatePath, 'utf-8'));
  console.log('✅ Loaded authentication state');
  
  // Launch browser with auth
  console.log('🚀 Launching browser...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ storageState: authState });
  const page = await context.newPage();
  
  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push({ type: msg.type(), text });
    
    // Print food buff related logs immediately
    if (text.includes('[isBuffActiveOnTarget]') || 
        text.includes('[MissingFoodWidget]') ||
        text.includes('food buff') ||
        text.includes('DEBUG FIGHT') ||
        text.includes('DEBUG MIDPOINT') ||
        text.includes('CODE VERSION')) {
      console.log(`[${msg.type().toUpperCase()}]`, text);
    }
  });
  
  try {
    console.log('📍 Navigating to dashboard...');
    await page.goto('http://localhost:3000/report/k9rM7hRLgWVt6vNa/dashboard', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Page loaded, waiting for widget to process...');
    
    // Wait for the widget to finish processing (look for specific log)
    await page.waitForFunction(() => {
      return window.console.logs?.some(log => 
        log.includes('Total players missing food')
      ) || true; // Always resolve after timeout
    }, { timeout: 30000 }).catch(() => {
      console.log('⏱️ Timeout waiting for completion, continuing...');
    });
    
    // Wait a bit more for all async operations
    await page.waitForTimeout(5000);
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total console logs captured: ${consoleLogs.length}`);
    
    // Filter and display relevant logs
    const relevantLogs = consoleLogs.filter(log => 
      log.text.includes('[isBuffActiveOnTarget]') ||
      log.text.includes('[MissingFoodWidget]') ||
      log.text.includes('food buff')
    );
    
    console.log(`\nRelevant logs (${relevantLogs.length}):`);
    relevantLogs.forEach(log => {
      console.log(`[${log.type}]`, log.text);
    });
    
    // Save all logs to file
    const logFile = path.join(__dirname, 'debug-console-logs.json');
    fs.writeFileSync(logFile, JSON.stringify(consoleLogs, null, 2));
    console.log(`\n💾 All logs saved to: ${logFile}`);
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will stay open for inspection. Press Ctrl+C to close.');
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

runTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
