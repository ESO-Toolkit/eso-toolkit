#!/usr/bin/env node

/**
 * Test script for dev server management tools
 * 
 * This script tests the dev server management functionality
 * by simulating the MCP server operations.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const DEV_SERVER_PID_PATH = path.resolve('.claude', 'dev-server.pid');

/**
 * Check if a process is running
 */
function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get dev server PID from file
 */
function getDevServerPid() {
  try {
    if (fs.existsSync(DEV_SERVER_PID_PATH)) {
      const pid = parseInt(fs.readFileSync(DEV_SERVER_PID_PATH, 'utf-8').trim(), 10);
      return isProcessRunning(pid) ? pid : null;
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Test dev server status
 */
function testStatus() {
  console.log('Testing dev_server_status...');
  const pid = getDevServerPid();
  const isRunning = !!pid;
  
  console.log({
    running: isRunning,
    pid: pid || null,
    message: isRunning 
      ? 'Dev server is running' 
      : 'Dev server is not running',
  });
  
  console.log('✓ Status check successful\n');
  return isRunning;
}

/**
 * Test starting dev server
 */
function testStart() {
  console.log('Testing start_dev_server...');
  
  const existingPid = getDevServerPid();
  if (existingPid) {
    console.log('✗ Server already running (PID: ' + existingPid + ')');
    console.log('  Use testStop() first\n');
    return false;
  }
  
  const projectRoot = path.resolve('..');
  
  console.log('Starting dev server in background...');
  const devServerProcess = spawn('npm', ['run', 'dev'], {
    cwd: projectRoot,
    detached: true,
    stdio: 'ignore',
    shell: true,
  });
  
  devServerProcess.unref();
  
  // Save PID
  fs.writeFileSync(DEV_SERVER_PID_PATH, devServerProcess.pid.toString());
  
  console.log({
    success: true,
    pid: devServerProcess.pid,
    message: 'Dev server started',
    note: 'Check http://localhost:3000 after a few seconds',
  });
  
  console.log('✓ Server started successfully\n');
  return true;
}

/**
 * Test stopping dev server
 */
function testStop() {
  console.log('Testing stop_dev_server...');
  
  const pid = getDevServerPid();
  if (!pid) {
    console.log('✗ No dev server is running\n');
    return false;
  }
  
  console.log('Stopping server (PID: ' + pid + ')...');
  
  try {
    // Kill process tree on Windows
    spawn('taskkill', ['/pid', pid.toString(), '/T', '/F'], { shell: true });
    
    // Remove PID file
    if (fs.existsSync(DEV_SERVER_PID_PATH)) {
      fs.unlinkSync(DEV_SERVER_PID_PATH);
    }
    
    console.log({
      success: true,
      pid,
      message: 'Dev server stopped',
    });
    
    console.log('✓ Server stopped successfully\n');
    return true;
  } catch (error) {
    console.error('✗ Error stopping server:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('='.repeat(60));
  console.log('Dev Server Management Tools - Test Suite');
  console.log('='.repeat(60));
  console.log();
  
  // Test 1: Check initial status
  console.log('Test 1: Initial Status Check');
  const initiallyRunning = testStatus();
  
  if (initiallyRunning) {
    console.log('⚠ Warning: Dev server is already running');
    console.log('  Stopping it for clean test...\n');
    testStop();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Test 2: Start server
  console.log('Test 2: Start Dev Server');
  const started = testStart();
  
  if (!started) {
    console.error('✗ Failed to start server');
    return;
  }
  
  // Wait for server to initialize
  console.log('Waiting 5 seconds for server to initialize...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Test 3: Check status while running
  console.log('Test 3: Status Check (Running)');
  testStatus();
  
  // Test 4: Try to start again (should fail)
  console.log('Test 4: Attempt Double Start (Should Fail)');
  testStart();
  
  // Test 5: Stop server
  console.log('Test 5: Stop Dev Server');
  testStop();
  
  // Wait for shutdown
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 6: Check status after stop
  console.log('Test 6: Status Check (Stopped)');
  testStatus();
  
  console.log('='.repeat(60));
  console.log('All tests completed!');
  console.log('='.repeat(60));
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { testStart, testStop, testStatus };
