#!/usr/bin/env node

/**
 * Release Preparation Script
 * 
 * This script prepares a new release version by:
 * 1. Updating package.json version
 * 2. Creating git tag
 * 3. Updating deployment records
 * 4. Generating release notes
 * 
 * Usage: node scripts/prepare-release.js --version=1.0.1 --type=canary|production
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { Command } from 'commander';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define CLI options
const program = new Command();
program
  .option('--version <version>', 'Release version (e.g., 1.0.1)')
  .option('--type <type>', 'Release type (canary or production)', 'canary')
  .option('--canary-number <number>', 'Canary release number (e.g., 1)', '1')
  .option('--notes <notes>', 'Path to release notes', 'docs/release-plan-1.0.1.md')
  .parse(process.argv);

const options = program.opts();
const today = new Date().toISOString().split('T')[0];
const canaryVersion = options.type === 'canary' 
  ? `${options.version}-canary.${options.canaryNumber}`
  : options.version;

console.log(`🚀 Preparing ${options.type} release: ${canaryVersion}`);

// Step 1: Update package.json
function updatePackageVersion() {
  console.log('📦 Updating package.json version...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  packageJson.version = canaryVersion;
  
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log(`✅ Updated package.json version to ${canaryVersion}`);
}

// Step 2: Update deployment record
function updateDeploymentRecord() {
  console.log('📝 Updating deployment record...');
  
  const deploymentRecordPath = path.join(process.cwd(), '.deployment-record.json');
  
  let deploymentRecord = {};
  if (fs.existsSync(deploymentRecordPath)) {
    deploymentRecord = JSON.parse(fs.readFileSync(deploymentRecordPath, 'utf8'));
  }
  
  // Initialize deployments structure if not present
  if (!deploymentRecord.deployments) {
    deploymentRecord.deployments = {
      canary: [],
      production: []
    };
  }
  
  const newDeployment = {
    version: canaryVersion,
    date: today,
    status: 'pending',
    metrics: {
      errors: null,
      performance: null,
      userSatisfaction: null
    }
  };
  
  if (options.type === 'canary') {
    deploymentRecord.deployments.canary.push(newDeployment);
  } else {
    deploymentRecord.deployments.production.push(newDeployment);
  }
  
  fs.writeFileSync(deploymentRecordPath, JSON.stringify(deploymentRecord, null, 2) + '\n');
  
  console.log(`✅ Updated deployment record with ${options.type} release ${canaryVersion}`);
}

// Step 3: Create git commit and tag
function createGitTagAndCommit() {
  console.log('🏷️  Creating git commit and tag...');
  
  // Stage package.json and deployment record
  execSync('git add package.json .deployment-record.json');
  
  // Create commit
  const commitMessage = `chore(release): ${canaryVersion}`;
  execSync(`git commit -m "${commitMessage}"`);
  
  // Create annotated tag with release notes
  let tagMessage = '';
  if (fs.existsSync(options.notes)) {
    tagMessage = fs.readFileSync(options.notes, 'utf8');
  } else {
    tagMessage = `Release ${canaryVersion}`;
  }
  
  const tempNotesPath = path.join(process.cwd(), '.temp-release-notes.md');
  fs.writeFileSync(tempNotesPath, tagMessage);
  
  try {
    execSync(`git tag -a v${canaryVersion} -F .temp-release-notes.md`);
  } finally {
    fs.unlinkSync(tempNotesPath);
  }
  
  console.log(`✅ Created git tag v${canaryVersion}`);
}

// Step 4: Generate deployment script
function generateDeploymentScript() {
  console.log('📜 Generating deployment script...');
  
  const deployScriptPath = path.join(process.cwd(), `deploy-${canaryVersion}.sh`);
  
  const deploymentCommands = options.type === 'canary' 
    ? [
        '#!/bin/bash',
        '# Canary Deployment Script',
        `# Version: ${canaryVersion}`,
        `# Generated: ${today}`,
        '',
        '# Build the application',
        'npm run build',
        '',
        '# Run tests',
        'npm test',
        '',
        '# Deploy to canary environment',
        `echo "Deploying version ${canaryVersion} to canary environment..."`,
        'npm run deploy:canary',
        '',
        '# Start monitoring',
        'node scripts/monitor-deployment.js --minutes=1440', // Monitor for 24 hours
        '',
        'echo "Canary deployment completed. Monitor the application for 24 hours."',
        'echo "If all metrics are satisfactory, proceed with production deployment."'
      ]
    : [
        '#!/bin/bash',
        '# Production Deployment Script',
        `# Version: ${canaryVersion}`,
        `# Generated: ${today}`,
        '',
        '# Promote canary to production',
        'echo "Promoting canary to production..."',
        'npm run promote:production',
        '',
        '# Start monitoring',
        'node scripts/monitor-deployment.js --minutes=4320', // Monitor for 72 hours
        '',
        'echo "Production deployment completed. Monitor the application for 72 hours."'
      ];
  
  fs.writeFileSync(deployScriptPath, deploymentCommands.join('\n'));
  execSync(`chmod +x ${deployScriptPath}`);
  
  console.log(`✅ Generated deployment script: ${deployScriptPath}`);
}

// Step 5: Print completion message
function printCompletionMessage() {
  console.log('\n=== Release Preparation Complete ===');
  console.log(`Version: ${canaryVersion}`);
  console.log(`Type: ${options.type}`);
  console.log(`Date: ${today}`);
  console.log('\nNext steps:');
  console.log(`1. Review changes: git show v${canaryVersion}`);
  console.log(`2. Push changes: git push && git push --tags`);
  console.log(`3. Deploy to ${options.type}: ./deploy-${canaryVersion}.sh`);
  console.log('\nTo monitor the deployment:');
  console.log('  node scripts/monitor-deployment.js');
  console.log('\nTo rollback if needed:');
  console.log('  npm run rollback -- --version=1.0.0');
}

// Run all steps
try {
  updatePackageVersion();
  updateDeploymentRecord();
  createGitTagAndCommit();
  generateDeploymentScript();
  printCompletionMessage();
} catch (error) {
  console.error('❌ Error preparing release:', error.message);
  process.exit(1);
} 