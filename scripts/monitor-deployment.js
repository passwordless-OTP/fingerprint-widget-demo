#!/usr/bin/env node

/**
 * Deployment Monitoring Script
 * 
 * This script monitors a deployment for a specified period of time,
 * collecting metrics and updating the deployment record.
 * 
 * Usage: node scripts/monitor-deployment.js --minutes=1440 --version=1.0.1-canary.1
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define CLI options
const program = new Command();
program
  .option('--minutes <minutes>', 'Duration to monitor in minutes', '60')
  .option('--interval <interval>', 'Check interval in seconds', '60')
  .option('--version <version>', 'Version to monitor (defaults to current package version)')
  .option('--threshold <threshold>', 'Error threshold percentage for automatic rollback', '1')
  .option('--auto-rollback', 'Enable automatic rollback if threshold is exceeded', false)
  .parse(process.argv);

const options = program.opts();

// Get current version if not specified
let monitorVersion = options.version;
if (!monitorVersion) {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  monitorVersion = packageJson.version;
}

const deploymentRecordPath = path.join(process.cwd(), '.deployment-record.json');
let deploymentRecord = {};
if (fs.existsSync(deploymentRecordPath)) {
  deploymentRecord = JSON.parse(fs.readFileSync(deploymentRecordPath, 'utf8'));
}

// Find the deployment to monitor
let deployment = null;
let deploymentType = 'canary';

if (deploymentRecord.deployments?.canary) {
  deployment = deploymentRecord.deployments.canary.find(d => d.version === monitorVersion);
}

if (!deployment && deploymentRecord.deployments?.production) {
  deployment = deploymentRecord.deployments.production.find(d => d.version === monitorVersion);
  if (deployment) {
    deploymentType = 'production';
  }
}

if (!deployment) {
  console.error(`❌ Deployment for version ${monitorVersion} not found in the deployment record.`);
  process.exit(1);
}

// Initialize monitoring state
const startTime = Date.now();
const endTime = startTime + (parseInt(options.minutes) * 60 * 1000);
const checkInterval = parseInt(options.interval) * 1000;
const errorThreshold = parseFloat(options.threshold);

// Mock metrics collection for demonstration
function collectMetrics() {
  // In a real system, these would be collected from monitoring systems, logs, etc.
  const errors = Math.random() * 0.5; // 0-0.5% error rate
  const performance = 90 + (Math.random() * 10); // 90-100% performance
  const userSatisfaction = 4 + (Math.random() * 1); // 4-5 satisfaction rating
  
  return {
    timestamp: new Date().toISOString(),
    errors,
    performance,
    userSatisfaction,
    botDetectionAccuracy: 90 + (Math.random() * 10), // 90-100% accuracy
    fingerprint: {
      generationTime: 50 + (Math.random() * 50), // 50-100ms
      uniqueCount: Math.floor(100 + (Math.random() * 900)) // 100-1000 unique fingerprints
    },
    security: {
      blockedAttempts: Math.floor(Math.random() * 10), // 0-10 blocked attempts
      suspiciousActivities: Math.floor(Math.random() * 5) // 0-5 suspicious activities
    }
  };
}

// Update deployment record with latest metrics
function updateDeploymentMetrics(metrics) {
  // Find the deployment again (in case the file changed)
  let updatedRecord = JSON.parse(fs.readFileSync(deploymentRecordPath, 'utf8'));
  let updatedDeployment = null;
  
  if (updatedRecord.deployments?.[deploymentType]) {
    updatedDeployment = updatedRecord.deployments[deploymentType].find(d => d.version === monitorVersion);
  }
  
  if (updatedDeployment) {
    updatedDeployment.metrics = {
      errors: metrics.errors,
      performance: metrics.performance,
      userSatisfaction: metrics.userSatisfaction,
      botDetectionAccuracy: metrics.botDetectionAccuracy,
      fingerprintGenerationTime: metrics.fingerprint.generationTime,
      blockedAttempts: metrics.security.blockedAttempts
    };
    
    // Update status if previously pending
    if (updatedDeployment.status === 'pending') {
      updatedDeployment.status = 'monitoring';
    }
    
    fs.writeFileSync(deploymentRecordPath, JSON.stringify(updatedRecord, null, 2) + '\n');
  }
}

// Check if metrics exceed thresholds for rollback
function checkRollbackConditions(metrics) {
  if (metrics.errors > errorThreshold) {
    console.error(`⚠️ Error rate (${metrics.errors.toFixed(2)}%) exceeds threshold (${errorThreshold}%)`);
    return true;
  }
  
  if (metrics.performance < 80) {
    console.error(`⚠️ Performance (${metrics.performance.toFixed(2)}%) below acceptable threshold (80%)`);
    return true;
  }
  
  return false;
}

// Perform rollback if needed
function performRollback() {
  console.error('🔄 Initiating automatic rollback...');
  
  // In a real system, this would call the rollback script
  console.log('Executing: npm run rollback -- --version=1.0.0');
  
  // Update deployment record
  let updatedRecord = JSON.parse(fs.readFileSync(deploymentRecordPath, 'utf8'));
  let updatedDeployment = null;
  
  if (updatedRecord.deployments?.[deploymentType]) {
    updatedDeployment = updatedRecord.deployments[deploymentType].find(d => d.version === monitorVersion);
  }
  
  if (updatedDeployment) {
    updatedDeployment.status = 'rolled back';
    fs.writeFileSync(deploymentRecordPath, JSON.stringify(updatedRecord, null, 2) + '\n');
  }
  
  // Exit the monitoring process
  process.exit(1);
}

// Complete monitoring successfully
function completeMonitoring() {
  // Update deployment record
  let updatedRecord = JSON.parse(fs.readFileSync(deploymentRecordPath, 'utf8'));
  let updatedDeployment = null;
  
  if (updatedRecord.deployments?.[deploymentType]) {
    updatedDeployment = updatedRecord.deployments[deploymentType].find(d => d.version === monitorVersion);
  }
  
  if (updatedDeployment) {
    updatedDeployment.status = 'success';
    fs.writeFileSync(deploymentRecordPath, JSON.stringify(updatedRecord, null, 2) + '\n');
  }
  
  console.log(`✅ Monitoring completed successfully for ${monitorVersion}`);
  
  if (deploymentType === 'canary') {
    console.log('\nNext steps:');
    console.log(`1. Promote to production: node scripts/prepare-release.js --version=${monitorVersion.split('-')[0]} --type=production`);
  }
  
  process.exit(0);
}

// Main monitoring loop
console.log(`🔍 Starting deployment monitoring for ${monitorVersion} (${deploymentType})`);
console.log(`📊 Duration: ${options.minutes} minutes (until ${new Date(endTime).toLocaleString()})`);
console.log(`⚠️ Error threshold: ${errorThreshold}%`);
console.log(`🔄 Auto-rollback: ${options.autoRollback ? 'Enabled' : 'Disabled'}`);
console.log('\nPress Ctrl+C to stop monitoring\n');

const monitoringInterval = setInterval(() => {
  const currentTime = Date.now();
  const elapsedMinutes = Math.floor((currentTime - startTime) / 60000);
  const remainingMinutes = Math.max(0, Math.floor((endTime - currentTime) / 60000));
  
  // Collect metrics
  const metrics = collectMetrics();
  console.log(`[${new Date().toLocaleTimeString()}] Elapsed: ${elapsedMinutes}m, Remaining: ${remainingMinutes}m`);
  console.log(`  Errors: ${metrics.errors.toFixed(2)}%, Performance: ${metrics.performance.toFixed(2)}%, User satisfaction: ${metrics.userSatisfaction.toFixed(2)}/5`);
  
  // Update deployment record
  updateDeploymentMetrics(metrics);
  
  // Check for rollback conditions
  if (checkRollbackConditions(metrics)) {
    if (options.autoRollback) {
      clearInterval(monitoringInterval);
      performRollback();
    } else {
      console.warn('  ⚠️ Rollback conditions met, but auto-rollback is disabled.');
    }
  }
  
  // Check if monitoring period has ended
  if (currentTime >= endTime) {
    clearInterval(monitoringInterval);
    completeMonitoring();
  }
}, checkInterval);

// Handle Ctrl+C
process.on('SIGINT', () => {
  clearInterval(monitoringInterval);
  console.log('\n🛑 Monitoring stopped by user');
  process.exit(0);
}); 