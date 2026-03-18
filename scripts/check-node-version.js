#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const nvmrcPath = path.join(__dirname, '..', '.nvmrc');
const packageJsonPath = path.join(__dirname, '..', 'package.json');

// Read expected versions
const expectedNodeVersion = fs.readFileSync(nvmrcPath, 'utf8').trim();
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const engines = packageJson.engines || {};

// Get current versions
const currentNodeVersion = process.version.slice(1); // Remove 'v' prefix
const currentNpmVersion = require('child_process')
  .execSync('npm --version', { encoding: 'utf8' })
  .trim();

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

// Check npm version if specified
if (engines.npm) {
  const npmPattern = engines.npm.replace(/\.\*\.\*/g, '');
  const npmMajor = parseInt(npmPattern.split('.')[0], 10);
  const npmMinor = parseInt(npmPattern.split('.')[1], 10);

  const currentNpmMajor = parseInt(currentNpmVersion.split('.')[0], 10);
  const currentNpmMinor = parseInt(currentNpmVersion.split('.')[1], 10);

  if (currentNpmMajor !== npmMajor || currentNpmMinor < npmMinor) {
    console.error('\n❌ npm version mismatch!\n');
    console.error(`Expected: npm ${engines.npm} (from package.json engines)`);
    console.error(`Current:  npm ${currentNpmVersion}\n`);
    console.error('Please run: nvm use\n');
    console.error('(nvm will install the correct npm version automatically)\n');
    process.exit(1);
  }
}

console.log(`✅ Node ${currentNodeVersion} and npm ${currentNpmVersion} are correct`);
