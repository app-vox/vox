#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read expected versions
const expectedNodeVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const engines = packageJson.engines || {};

// Get current version
const currentNodeVersion = process.version.slice(1); // Remove 'v' prefix

// Check Node version
const nodeMajor = parseInt(expectedNodeVersion.split('.')[0], 10);
const currentNodeMajor = parseInt(currentNodeVersion.split('.')[0], 10);

if (currentNodeMajor !== nodeMajor) {
  console.error('\n❌ Node version mismatch!\n');
  console.error(`Expected: Node ${expectedNodeVersion} (from .nvmrc)`);
  console.error(`Current:  Node ${currentNodeVersion}\n`);
  console.error('Please run: nvm use\n');
  process.exit(1);
}

console.log(`✅ Node ${currentNodeVersion} is correct`);
