#!/usr/bin/env node

/**
 * Cross-platform colorization utility for Makefile output
 * Works on Windows, macOS, and Linux
 */

const colors = {
  // Text colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Bright colors
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
  
  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  strikethrough: '\x1b[9m',
  
  // Reset
  reset: '\x1b[0m'
};

// Enable color support on Windows
if (process.platform === 'win32') {
  // Enable ANSI colors in Windows Command Prompt and PowerShell
  try {
    const { execSync } = require('child_process');
    
    // For Command Prompt - enable virtual terminal processing
    if (process.env.ComSpec && process.env.ComSpec.includes('cmd.exe')) {
      // This is handled by enabling virtual terminal processing in the registry
      // but Node.js handles it automatically in newer versions
    }
    
    // For PowerShell - colors should work by default in Windows 10+
    process.stdout.write(''); // Trigger color initialization
  } catch (error) {
    // Fallback: if colors don't work, we'll still provide the text
    console.warn('Color support detection failed, falling back to plain text');
  }
}

function colorize(text, colorName) {
  if (!colors[colorName]) {
    return text;
  }
  
  // Check if we're in a terminal that supports colors
  const supportsColor = process.stdout.isTTY && 
    (process.env.COLORTERM || 
     process.env.TERM === 'xterm-256color' || 
     process.env.TERM === 'xterm' ||
     process.platform === 'win32'); // Windows terminals generally support colors now
  
  if (!supportsColor && process.env.FORCE_COLOR !== '1') {
    return text;
  }
  
  return `${colors[colorName]}${text}${colors.reset}`;
}

function printColored(text, colorName = 'white') {
  console.log(colorize(text, colorName));
}

function printSuccess(text) {
  console.log(colorize(`✅ ${text}`, 'brightGreen'));
}

function printError(text) {
  console.log(colorize(`❌ ${text}`, 'brightRed'));
}

function printWarning(text) {
  console.log(colorize(`⚠️  ${text}`, 'brightYellow'));
}

function printInfo(text) {
  console.log(colorize(`ℹ️  ${text}`, 'brightBlue'));
}

function printStep(step, total, text) {
  const stepText = `[${step}/${total}]`;
  console.log(
    colorize(stepText, 'brightCyan') + 
    ' ' + 
    colorize(text, 'white')
  );
}

function printHeader(text) {
  const border = '='.repeat(text.length + 4);
  console.log(colorize(border, 'brightMagenta'));
  console.log(colorize(`  ${text}  `, 'brightMagenta'));
  console.log(colorize(border, 'brightMagenta'));
}

function printSubHeader(text) {
  console.log(colorize(`\n--- ${text} ---`, 'brightCyan'));
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const message = args.slice(1).join(' ');

switch (command) {
  case 'success':
    printSuccess(message);
    break;
  case 'error':
    printError(message);
    break;
  case 'warning':
    printWarning(message);
    break;
  case 'info':
    printInfo(message);
    break;
  case 'step':
    const step = args[1];
    const total = args[2];
    const stepMessage = args.slice(3).join(' ');
    printStep(step, total, stepMessage);
    break;
  case 'header':
    printHeader(message);
    break;
  case 'subheader':
    printSubHeader(message);
    break;
  case 'color':
    const colorName = args[1];
    const colorMessage = args.slice(2).join(' ');
    printColored(colorMessage, colorName);
    break;
  default:
    printColored(message || command, 'white');
}