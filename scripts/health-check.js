#!/usr/bin/env node

/**
 * Health check script for the development server
 * Waits for the server to be ready before running tests
 */

const http = require('http');

const MAX_RETRIES = 30;
const RETRY_DELAY = 2000; // 2 seconds
const SERVER_URL = 'http://localhost:3000';

function checkHealth(url) {
  return new Promise((resolve, reject) => {
    const request = http.get(url, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Server returned status ${res.statusCode}`));
      }
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(5000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function waitForServer() {
  console.log('🔍 Checking server health...');
  
  for (let i = 1; i <= MAX_RETRIES; i++) {
    try {
      await checkHealth(SERVER_URL);
      console.log(`✅ Server is ready! (attempt ${i}/${MAX_RETRIES})`);
      process.exit(0);
    } catch (error) {
      console.log(`❌ Attempt ${i}/${MAX_RETRIES}: ${error.message}`);
      
      if (i === MAX_RETRIES) {
        console.error('💥 Server health check failed after maximum retries');
        process.exit(1);
      }
      
      console.log(`⏳ Waiting ${RETRY_DELAY}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

if (require.main === module) {
  waitForServer().catch((error) => {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  });
}

module.exports = { checkHealth, waitForServer };
