#!/usr/bin/env node

/**
 * Automated Rollback System
 * 
 * This script monitors production deployment metrics and automatically
 * rolls back to a previous version if metrics exceed defined thresholds.
 * 
 * Usage:
 *   node auto-rollback.js [options]
 * 
 * Options:
 *   --monitoring-period=<minutes>   Duration to monitor after deployment (default: 30)
 *   --check-interval=<seconds>      Interval between metric checks (default: 30)
 *   --threshold-error-rate=<rate>   Maximum acceptable error rate (default: 0.02)
 *   --threshold-p95-latency=<ms>    Maximum acceptable P95 latency (default: 500)
 *   --threshold-p99-latency=<ms>    Maximum acceptable P99 latency (default: 1000)
 *   --threshold-cpu=<percent>       Maximum acceptable CPU usage (default: 80)
 *   --threshold-memory=<percent>    Maximum acceptable memory usage (default: 80)
 *   --threshold-5xx=<rate>          Maximum acceptable 5xx error rate (default: 0.01)
 *   --threshold-4xx=<rate>          Maximum acceptable 4xx error rate (default: 0.05)
 *   --auto-rollback                 Automatically roll back without confirmation
 *   --dry-run                       Run monitoring without actual rollback
 *   --verbose                       Show detailed logs
 *   --rollback-to=<version>         Specific version to roll back to (default: latest backup)
 */

const https = require('https');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  monitoringPeriod: 30, // minutes
  checkInterval: 30, // seconds
  thresholds: {
    errorRate: 0.02, // 2%
    p95Latency: 500, // 500ms
    p99Latency: 1000, // 1000ms
    cpu: 80, // 80%
    memory: 80, // 80%
    rate5xx: 0.01, // 1%
    rate4xx: 0.05, // 5%
  },
  autoRollback: false,
  dryRun: false,
  verbose: false,
  rollbackTo: null, // specific version to roll back to
  slackWebhook: process.env.SLACK_WEBHOOK_URL || '',
  datadogApiKey: process.env.DATADOG_API_KEY || '',
  logFile: path.join(__dirname, '../logs/auto-rollback.log'),
  deploymentTimestamp: Date.now(), // timestamp of the deployment being monitored
};

// Parse command line options
args.forEach(arg => {
  if (arg.startsWith('--monitoring-period=')) {
    options.monitoringPeriod = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--check-interval=')) {
    options.checkInterval = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-error-rate=')) {
    options.thresholds.errorRate = parseFloat(arg.split('=')[1]);
  } else if (arg.startsWith('--threshold-p95-latency=')) {
    options.thresholds.p95Latency = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-p99-latency=')) {
    options.thresholds.p99Latency = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-cpu=')) {
    options.thresholds.cpu = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-memory=')) {
    options.thresholds.memory = parseInt(arg.split('=')[1], 10);
  } else if (arg.startsWith('--threshold-5xx=')) {
    options.thresholds.rate5xx = parseFloat(arg.split('=')[1]);
  } else if (arg.startsWith('--threshold-4xx=')) {
    options.thresholds.rate4xx = parseFloat(arg.split('=')[1]);
  } else if (arg === '--auto-rollback') {
    options.autoRollback = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg.startsWith('--rollback-to=')) {
    options.rollbackTo = arg.split('=')[1];
  } else if (arg.startsWith('--deployment-timestamp=')) {
    options.deploymentTimestamp = parseInt(arg.split('=')[1], 10);
  }
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Logger
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    fs.appendFileSync(options.logFile, logMessage + '\n');
  },
  error: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}`;
    console.error(logMessage);
    fs.appendFileSync(options.logFile, logMessage + '\n');
  },
  verbose: (message) => {
    if (options.verbose) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] VERBOSE: ${message}`;
      console.log(logMessage);
      fs.appendFileSync(options.logFile, logMessage + '\n');
    }
  }
};

// Send notification to Slack
const sendNotification = (message, color = 'good', fields = []) => {
  if (!options.slackWebhook) return;
  
  const defaultFields = [
    {
      title: 'Monitoring Period',
      value: `${options.monitoringPeriod} minutes`,
      short: true
    },
    {
      title: 'Check Interval',
      value: `${options.checkInterval} seconds`,
      short: true
    }
  ];
  
  const payload = JSON.stringify({
    attachments: [{
      color: color,
      text: message,
      fields: [...defaultFields, ...fields]
    }]
  });
  
  const webhookOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': payload.length
    }
  };
  
  const req = https.request(options.slackWebhook, webhookOptions);
  req.on('error', (error) => logger.error(`Failed to send Slack notification: ${error.message}`));
  req.write(payload);
  req.end();
};

// Get metrics from Datadog
const getMetricsFromDatadog = async () => {
  if (!options.datadogApiKey) {
    logger.error('Datadog API key not provided. Cannot fetch metrics.');
    return null;
  }
  
  logger.log('Fetching metrics from Datadog...');
  
  // Calculate time range for metrics query
  const now = Math.floor(Date.now() / 1000);
  const from = Math.floor(options.deploymentTimestamp / 1000);
  
  // Define metrics to fetch
  const metrics = [
    { name: 'widget.production.error_rate', query: `avg:widget.production.error_rate{env:production}` },
    { name: 'widget.production.latency.p95', query: `avg:widget.production.latency.p95{env:production}` },
    { name: 'widget.production.latency.p99', query: `avg:widget.production.latency.p99{env:production}` },
    { name: 'widget.production.cpu_usage', query: `avg:widget.production.cpu_usage{env:production}` },
    { name: 'widget.production.memory_usage', query: `avg:widget.production.memory_usage{env:production}` },
    { name: 'widget.production.5xx_rate', query: `sum:widget.production.5xx_errors{env:production}.as_rate() / sum:widget.production.requests{env:production}.as_rate()` },
    { name: 'widget.production.4xx_rate', query: `sum:widget.production.4xx_errors{env:production}.as_rate() / sum:widget.production.requests{env:production}.as_rate()` }
  ];
  
  const results = {};
  
  // Fetch each metric
  for (const metric of metrics) {
    try {
      const url = `https://api.datadoghq.com/api/v1/query?from=${from}&to=${now}&query=${encodeURIComponent(metric.query)}`;
      
      const response = await new Promise((resolve, reject) => {
        const options = {
          method: 'GET',
          headers: {
            'DD-API-KEY': options.datadogApiKey,
            'Content-Type': 'application/json'
          }
        };
        
        const req = https.request(url, options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (res.statusCode === 200) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`Datadog API returned status ${res.statusCode}: ${data}`));
            }
          });
        });
        
        req.on('error', (error) => reject(error));
        req.end();
      });
      
      // Extract the average value from the response
      if (response && response.series && response.series.length > 0 && response.series[0].pointlist.length > 0) {
        const values = response.series[0].pointlist.map(point => point[1]).filter(value => value !== null);
        if (values.length > 0) {
          const average = values.reduce((sum, value) => sum + value, 0) / values.length;
          results[metric.name] = average;
          logger.verbose(`${metric.name}: ${average}`);
        } else {
          logger.error(`No valid data points for ${metric.name}`);
          results[metric.name] = null;
        }
      } else {
        logger.error(`No data returned for ${metric.name}`);
        results[metric.name] = null;
      }
    } catch (error) {
      logger.error(`Failed to fetch ${metric.name}: ${error.message}`);
      results[metric.name] = null;
    }
  }
  
  return results;
};

// Simulate metrics for testing or when Datadog is not available
const simulateMetrics = () => {
  logger.log('Simulating metrics for evaluation...');
  
  // Generate random metrics within reasonable ranges
  const errorRate = Math.random() * 0.03; // 0-3%
  const p95Latency = 300 + Math.random() * 300; // 300-600ms
  const p99Latency = 600 + Math.random() * 600; // 600-1200ms
  const cpuUsage = 60 + Math.random() * 30; // 60-90%
  const memoryUsage = 60 + Math.random() * 30; // 60-90%
  const rate5xx = Math.random() * 0.02; // 0-2%
  const rate4xx = Math.random() * 0.06; // 0-6%
  
  return {
    'widget.production.error_rate': errorRate,
    'widget.production.latency.p95': p95Latency,
    'widget.production.latency.p99': p99Latency,
    'widget.production.cpu_usage': cpuUsage,
    'widget.production.memory_usage': memoryUsage,
    'widget.production.5xx_rate': rate5xx,
    'widget.production.4xx_rate': rate4xx
  };
};

// Evaluate metrics against thresholds
const evaluateMetrics = (metrics) => {
  if (!metrics) {
    logger.error('No metrics available for evaluation');
    return false;
  }
  
  logger.log('Evaluating metrics against thresholds...');
  
  const results = {
    errorRate: {
      value: metrics['widget.production.error_rate'],
      threshold: options.thresholds.errorRate,
      pass: metrics['widget.production.error_rate'] !== null && metrics['widget.production.error_rate'] <= options.thresholds.errorRate
    },
    p95Latency: {
      value: metrics['widget.production.latency.p95'],
      threshold: options.thresholds.p95Latency,
      pass: metrics['widget.production.latency.p95'] !== null && metrics['widget.production.latency.p95'] <= options.thresholds.p95Latency
    },
    p99Latency: {
      value: metrics['widget.production.latency.p99'],
      threshold: options.thresholds.p99Latency,
      pass: metrics['widget.production.latency.p99'] !== null && metrics['widget.production.latency.p99'] <= options.thresholds.p99Latency
    },
    cpuUsage: {
      value: metrics['widget.production.cpu_usage'],
      threshold: options.thresholds.cpu,
      pass: metrics['widget.production.cpu_usage'] !== null && metrics['widget.production.cpu_usage'] <= options.thresholds.cpu
    },
    memoryUsage: {
      value: metrics['widget.production.memory_usage'],
      threshold: options.thresholds.memory,
      pass: metrics['widget.production.memory_usage'] !== null && metrics['widget.production.memory_usage'] <= options.thresholds.memory
    },
    rate5xx: {
      value: metrics['widget.production.5xx_rate'],
      threshold: options.thresholds.rate5xx,
      pass: metrics['widget.production.5xx_rate'] !== null && metrics['widget.production.5xx_rate'] <= options.thresholds.rate5xx
    },
    rate4xx: {
      value: metrics['widget.production.4xx_rate'],
      threshold: options.thresholds.rate4xx,
      pass: metrics['widget.production.4xx_rate'] !== null && metrics['widget.production.4xx_rate'] <= options.thresholds.rate4xx
    }
  };
  
  // Log evaluation results
  Object.entries(results).forEach(([metric, result]) => {
    const status = result.pass ? 'PASS' : 'FAIL';
    logger.log(`${metric}: ${result.value !== null ? result.value.toFixed(2) : 'N/A'} (threshold: ${result.threshold}) - ${status}`);
  });
  
  // Overall pass/fail
  const overallPass = Object.values(results).every(result => result.pass);
  logger.log(`Overall evaluation: ${overallPass ? 'PASS' : 'FAIL'}`);
  
  return {
    pass: overallPass,
    details: results
  };
};

// Find the latest backup version
const findLatestBackup = () => {
  try {
    logger.log('Finding latest backup version...');
    
    // Check if backups directory exists
    const backupsDir = path.join(process.cwd(), 'backups');
    if (!fs.existsSync(backupsDir)) {
      logger.error('Backups directory not found');
      return null;
    }
    
    // Get all backup files
    const backupFiles = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith('backup_') && file.endsWith('.version'))
      .sort()
      .reverse();
    
    if (backupFiles.length === 0) {
      logger.error('No backup files found');
      return null;
    }
    
    // Get the latest backup file
    const latestBackupFile = backupFiles[0];
    const backupName = latestBackupFile.replace('.version', '');
    
    // Read the version ID from the backup file
    const versionId = fs.readFileSync(path.join(backupsDir, latestBackupFile), 'utf8').trim();
    
    logger.log(`Found latest backup: ${backupName} (${versionId})`);
    return {
      name: backupName,
      versionId: versionId
    };
  } catch (error) {
    logger.error(`Failed to find latest backup: ${error.message}`);
    return null;
  }
};

// Roll back to a previous version
const rollbackToVersion = async (versionId, versionName) => {
  if (options.dryRun) {
    logger.log(`DRY RUN: Would roll back to version ${versionName} (${versionId})`);
    return true;
  }
  
  logger.log(`Rolling back to version ${versionName} (${versionId})...`);
  
  try {
    // Create a backup of the current production before rolling back
    logger.log('Creating backup of current production before rollback...');
    execSync('bash scripts/create-production-backup.sh');
    
    // Roll back to the specified version
    logger.log(`Deploying version ${versionId} to production...`);
    execSync(`firebase hosting:clone ${versionId} live 100`);
    
    logger.log('Rollback completed successfully');
    return true;
  } catch (error) {
    logger.error(`Failed to roll back: ${error.message}`);
    return false;
  }
};

// Ask for confirmation
const askForConfirmation = async (message) => {
  if (options.autoRollback) {
    return true;
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

// Create a health check function
const checkEndpoints = async () => {
  logger.log('Performing health checks on endpoints...');
  
  const endpoints = [
    { url: 'https://widget.passwordless-otp.com/health', name: 'Health Check' },
    { url: 'https://widget.passwordless-otp.com/api/status', name: 'API Status' },
    { url: 'https://widget.passwordless-otp.com/api/auth/check', name: 'Auth Check' }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      
      const response = await new Promise((resolve, reject) => {
        const req = https.get(endpoint.url, (res) => {
          const latency = Date.now() - startTime;
          
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              latency: latency,
              data: data
            });
          });
        });
        
        req.on('error', (error) => reject(error));
        req.setTimeout(10000, () => reject(new Error('Request timed out')));
        req.end();
      });
      
      const success = response.statusCode >= 200 && response.statusCode < 300;
      
      results[endpoint.name] = {
        success: success,
        statusCode: response.statusCode,
        latency: response.latency
      };
      
      logger.log(`${endpoint.name}: ${success ? 'SUCCESS' : 'FAIL'} (${response.statusCode}, ${response.latency}ms)`);
    } catch (error) {
      results[endpoint.name] = {
        success: false,
        error: error.message
      };
      
      logger.error(`${endpoint.name}: FAIL (${error.message})`);
    }
  }
  
  // Overall health check result
  const overallSuccess = Object.values(results).every(result => result.success);
  logger.log(`Overall health check: ${overallSuccess ? 'PASS' : 'FAIL'}`);
  
  return {
    pass: overallSuccess,
    details: results
  };
};

// Main monitoring function
const monitorDeployment = async () => {
  logger.log('Starting automated rollback monitoring');
  logger.log(`Monitoring period: ${options.monitoringPeriod} minutes`);
  logger.log(`Check interval: ${options.checkInterval} seconds`);
  
  // Send notification about starting the monitoring
  sendNotification('🔍 Starting post-deployment monitoring for potential rollback', 'warning');
  
  // Calculate end time
  const startTime = Date.now();
  const endTime = startTime + (options.monitoringPeriod * 60 * 1000);
  
  // Monitoring loop
  let consecutiveFailures = 0;
  const MAX_CONSECUTIVE_FAILURES = 3; // Number of consecutive failures before triggering rollback
  
  while (Date.now() < endTime) {
    // Perform health checks
    const healthCheck = await checkEndpoints();
    
    // Get metrics
    let metrics;
    if (options.datadogApiKey) {
      metrics = await getMetricsFromDatadog();
    } else {
      logger.log('No Datadog API key provided, simulating metrics');
      metrics = simulateMetrics();
    }
    
    // Evaluate metrics
    const evaluation = evaluateMetrics(metrics);
    
    // Create monitoring report
    const report = {
      timestamp: new Date().toISOString(),
      metrics: evaluation.details,
      healthCheck: healthCheck.details,
      result: evaluation.pass && healthCheck.pass ? 'PASS' : 'FAIL'
    };
    
    // Save report
    const reportPath = path.join(__dirname, '../logs', `rollback-monitoring-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    logger.log(`Monitoring report saved to ${reportPath}`);
    
    // Check if rollback is needed
    if (!evaluation.pass || !healthCheck.pass) {
      consecutiveFailures++;
      logger.error(`Monitoring check failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);
      
      // Send notification about the failure
      const failedMetrics = Object.entries(evaluation.details)
        .filter(([_, result]) => !result.pass)
        .map(([metric, result]) => ({
          title: metric,
          value: `${result.value !== null ? result.value.toFixed(2) : 'N/A'} (threshold: ${result.threshold})`,
          short: true
        }));
      
      const failedEndpoints = Object.entries(healthCheck.details)
        .filter(([_, result]) => !result.success)
        .map(([endpoint, result]) => ({
          title: endpoint,
          value: result.error || `Status: ${result.statusCode}`,
          short: true
        }));
      
      sendNotification(
        `⚠️ Deployment monitoring check failed (${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`,
        'danger',
        [...failedMetrics, ...failedEndpoints]
      );
      
      // Check if we need to roll back
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        logger.error(`${MAX_CONSECUTIVE_FAILURES} consecutive failures detected, initiating rollback process`);
        
        // Determine which version to roll back to
        let rollbackVersion;
        let rollbackName;
        
        if (options.rollbackTo) {
          rollbackVersion = options.rollbackTo;
          rollbackName = 'specified version';
        } else {
          const latestBackup = findLatestBackup();
          if (latestBackup) {
            rollbackVersion = latestBackup.versionId;
            rollbackName = latestBackup.name;
          } else {
            logger.error('No rollback version available');
            sendNotification('❌ Rollback failed: No rollback version available', 'danger');
            break;
          }
        }
        
        // Ask for confirmation if not auto-rollback
        const rollbackMessage = `Deployment has failed ${MAX_CONSECUTIVE_FAILURES} consecutive checks. Roll back to ${rollbackName}?`;
        const confirmed = await askForConfirmation(rollbackMessage);
        
        if (confirmed) {
          // Perform the rollback
          const success = await rollbackToVersion(rollbackVersion, rollbackName);
          
          if (success) {
            sendNotification(`✅ Successfully rolled back to ${rollbackName}`, 'good');
            logger.log('Rollback completed successfully');
            break;
          } else {
            sendNotification('❌ Rollback failed', 'danger');
            logger.error('Rollback failed');
            break;
          }
        } else {
          logger.log('Rollback cancelled by user');
          sendNotification('⚠️ Rollback cancelled by user despite consecutive failures', 'warning');
          // Reset consecutive failures counter after user decides not to roll back
          consecutiveFailures = 0;
        }
      }
    } else {
      // Reset consecutive failures counter on success
      if (consecutiveFailures > 0) {
        logger.log(`Monitoring check passed, resetting consecutive failures counter (was ${consecutiveFailures})`);
        consecutiveFailures = 0;
      } else {
        logger.log('Monitoring check passed');
      }
    }
    
    // Wait for next check
    logger.log(`Waiting ${options.checkInterval} seconds until next check...`);
    await new Promise(resolve => setTimeout(resolve, options.checkInterval * 1000));
  }
  
  // Monitoring completed without triggering rollback
  if (consecutiveFailures < MAX_CONSECUTIVE_FAILURES) {
    logger.log('Monitoring period completed without triggering rollback');
    sendNotification('✅ Deployment monitoring completed successfully', 'good');
  }
};

// Main function
const main = async () => {
  try {
    await monitorDeployment();
  } catch (error) {
    logger.error(`Monitoring failed: ${error.message}`);
    sendNotification(`❌ Deployment monitoring failed: ${error.message}`, 'danger');
    process.exit(1);
  }
};

// Run the main function
main(); 